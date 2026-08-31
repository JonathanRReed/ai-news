/* global AbortSignal, TextDecoder */
import { URL } from 'node:url';

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_REDIRECTS = 3;

export class SourceUrlPolicyError extends Error {
  constructor(message = 'source URL is outside declared HTTPS hosts') {
    super(message);
    this.name = 'SourceUrlPolicyError';
  }
}

export class SourceResponseSizeError extends Error {
  constructor() {
    super('source response exceeded size limit');
    this.name = 'SourceResponseSizeError';
  }
}

export function sourceAdmissionHosts(source) {
  const hosts = new Set();
  if (Array.isArray(source?.allowedHosts)) {
    for (const host of source.allowedHosts) {
      if (typeof host === 'string') hosts.add(host.toLowerCase());
    }
  }
  for (const value of [source?.officialUrl, source?.endpointUrl]) {
    try {
      const url = new URL(value);
      if (url.protocol === 'https:') hosts.add(url.hostname.toLowerCase());
    } catch {
      // The manifest validator reports malformed declared URLs.
    }
  }
  return [...hosts].sort();
}

export function admittedHttpsUrl(source, value, baseUrl) {
  let url;
  try {
    url = baseUrl ? new URL(value, baseUrl) : new URL(value);
  } catch {
    throw new SourceUrlPolicyError();
  }
  const host = url.hostname.toLowerCase();
  const defaultHttpsPort = url.port === '' || url.port === '443';
  if (
    url.protocol !== 'https:'
    || url.username
    || url.password
    || !defaultHttpsPort
    || !sourceAdmissionHosts(source).includes(host)
  ) {
    throw new SourceUrlPolicyError();
  }
  return url;
}

function parsedConfiguredOrigin(value) {
  let origin;
  try {
    origin = new URL(value);
  } catch {
    throw new SourceUrlPolicyError('configured origin must be a valid URL');
  }
  const loopback = origin.hostname === 'localhost'
    || origin.hostname === '127.0.0.1'
    || origin.hostname === '[::1]';
  if (
    origin.username
    || origin.password
    || (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && loopback))
  ) {
    throw new SourceUrlPolicyError('configured origin must use HTTPS or loopback HTTP');
  }
  return origin;
}

export function admittedExactOriginUrl(originValue, value) {
  const origin = parsedConfiguredOrigin(originValue);
  let url;
  try {
    url = new URL(value, origin);
  } catch {
    throw new SourceUrlPolicyError('URL is outside the configured origin');
  }
  if (url.username || url.password || url.origin !== origin.origin) {
    throw new SourceUrlPolicyError('URL is outside the configured origin');
  }
  return url;
}

async function fetchWithRedirectPolicy(initialUrl, validateUrl, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('network fetch is unavailable');
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const signal = options.signal ?? AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let currentUrl = initialUrl;

  for (let redirectCount = 0; ; redirectCount += 1) {
    const response = await fetchImpl(currentUrl.toString(), {
      method: options.method,
      headers: options.headers,
      body: options.body,
      redirect: 'manual',
      signal,
    });
    if (!REDIRECT_STATUSES.has(response.status)) return response;
    const location = response.headers.get('location');
    if (!location) throw new SourceUrlPolicyError('redirect was missing a location');
    const nextUrl = validateUrl(location, currentUrl);
    if (redirectCount >= maxRedirects) {
      throw new SourceUrlPolicyError('redirect limit exceeded');
    }
    currentUrl = nextUrl;
  }
}

export async function fetchAdmittedResponse(source, value, options = {}) {
  const initialUrl = admittedHttpsUrl(source, value, options.baseUrl);
  return fetchWithRedirectPolicy(
    initialUrl,
    (location, currentUrl) => admittedHttpsUrl(source, location, currentUrl),
    options,
  );
}

export async function fetchExactOriginResponse(originValue, value, options = {}) {
  const initialUrl = admittedExactOriginUrl(originValue, value);
  return fetchWithRedirectPolicy(
    initialUrl,
    (location, currentUrl) => admittedExactOriginUrl(originValue, new URL(location, currentUrl)),
    options,
  );
}

export async function readBoundedText(response, maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new TypeError('maxBytes must be a positive safe integer');
  }
  const declaredLength = response.headers.get('content-length');
  if (/^\d+$/.test(declaredLength ?? '') && Number(declaredLength) > maxBytes) {
    throw new SourceResponseSizeError();
  }
  if (!response.body) return '';

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      try {
        await reader.cancel();
      } catch {
        // The size failure remains authoritative if stream cancellation also fails.
      }
      throw new SourceResponseSizeError();
    }
    chunks.push(decoder.decode(value, { stream: true }));
  }
  chunks.push(decoder.decode());
  return chunks.join('');
}
