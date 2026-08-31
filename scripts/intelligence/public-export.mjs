import { writeReceipt } from './receipt.mjs';
import {
  admittedHttpsUrl,
  fetchAdmittedResponse,
  fetchExactOriginResponse,
  readBoundedText,
} from './source-policy.mjs';

const DEFAULT_SITE = 'https://ai-news.helloworldfirm.com/';
const MAX_ASSETS = 50;
const MAX_DISCOVERY_BYTES = 2 * 1024 * 1024;
const MAX_EXPORT_PAGE_BYTES = 8 * 1024 * 1024;
const MAX_EXPORT_ROWS = 100_000;

function discoveryPolicy(siteUrl) {
  return {
    sourceKey: 'public-site-discovery',
    officialUrl: siteUrl,
    endpointUrl: siteUrl,
    allowedHosts: [],
  };
}

function publicCredential(source) {
  return source.match(/sb_publishable_[A-Za-z0-9_-]+/)?.[0]
    ?? source.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0]
    ?? null;
}

export async function discoverPublicSupabaseConfig(siteUrl, fetchImpl = globalThis.fetch) {
  const normalizedSite = new URL(siteUrl).toString();
  const policy = discoveryPolicy(normalizedSite);
  const pageResponse = await fetchAdmittedResponse(policy, normalizedSite, { fetchImpl });
  if (!pageResponse.ok) throw new Error(`site discovery failed with HTTP ${pageResponse.status}`);
  const html = await readBoundedText(pageResponse, MAX_DISCOVERY_BYTES);
  const assetPaths = [...html.matchAll(/(?:src|href|component-url)=["']([^"']+\.js(?:\?[^"']*)?)["']/g)]
    .map((match) => match[1]);
  const assetUrls = [...new Set(assetPaths.map((path) => {
    try {
      return admittedHttpsUrl(policy, path, normalizedSite).toString();
    } catch {
      return null;
    }
  }).filter(Boolean))]
    .slice(0, MAX_ASSETS);
  const sources = [];
  for (const assetUrl of assetUrls) {
    const response = await fetchAdmittedResponse(policy, assetUrl, { fetchImpl });
    if (response.ok) sources.push(await readBoundedText(response, MAX_DISCOVERY_BYTES));
  }
  const combined = sources.join('\n');
  const url = combined.match(/https:\/\/[a-z0-9-]+\.supabase\.co/i)?.[0] ?? null;
  const credential = publicCredential(combined);
  if (!url || !credential) throw new Error('public Supabase configuration was not found');
  const projectRef = new URL(url).hostname.split('.')[0];
  return {
    url,
    credential,
    receipt: {
      projectRef,
      credentialKind: credential.startsWith('sb_publishable_') ? 'publishable' : 'legacy-anon-jwt',
      assetCount: assetUrls.length,
    },
  };
}

export async function fetchAllLegacyRows({
  url,
  credential,
  fetchImpl = globalThis.fetch,
  pageSize = 1000,
}) {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) {
    throw new Error('pageSize must be an integer between 1 and 1000');
  }
  const headers = { apikey: credential, Authorization: `Bearer ${credential}` };
  const countResponse = await fetchExactOriginResponse(
    url,
    `${url}/rest/v1/ai_company_news?select=id`,
    {
      fetchImpl,
    method: 'HEAD',
    headers: { ...headers, Prefer: 'count=exact', Range: '0-0', 'Range-Unit': 'items' },
    },
  );
  if (!countResponse.ok) throw new Error(`public count failed with HTTP ${countResponse.status}`);
  const exactCount = Number(countResponse.headers.get('content-range')?.split('/')[1]);
  if (!Number.isInteger(exactCount) || exactCount < 0) throw new Error('public count was unavailable');
  if (exactCount > MAX_EXPORT_ROWS) throw new Error('public export row count exceeds safety limit');
  const rows = [];

  for (let start = 0; start < exactCount; start += pageSize) {
    const end = Math.min(exactCount - 1, start + pageSize - 1);
    const response = await fetchExactOriginResponse(
      url,
      `${url}/rest/v1/ai_company_news?select=id,company,title,url,content,summary,published_at,source_type,source_url,created_at&order=published_at.desc,id.desc`,
      {
        fetchImpl,
        headers: { ...headers, Range: `${start}-${end}`, 'Range-Unit': 'items' },
      },
    );
    if (!response.ok) throw new Error(`public export failed with HTTP ${response.status}`);
    const body = await readBoundedText(response, MAX_EXPORT_PAGE_BYTES);
    let page;
    try {
      page = JSON.parse(body);
    } catch {
      throw new Error('public export returned invalid JSON');
    }
    if (!Array.isArray(page)) throw new Error('public export returned an invalid page');
    rows.push(...page);
  }

  if (rows.length !== exactCount) {
    throw new Error(`public export row count mismatch: expected ${exactCount}, received ${rows.length}`);
  }
  return rows;
}

if (import.meta.main) {
  const siteUrl = globalThis.process.argv[2] ?? DEFAULT_SITE;
  const discovered = await discoverPublicSupabaseConfig(siteUrl);
  const rows = await fetchAllLegacyRows(discovered);
  const timestamp = new Date().toISOString().replaceAll(':', '-');
  const rowsPath = `docs/operations/receipts/public-ai-company-news-${timestamp}.json`;
  const storedRows = await writeReceipt(rows, rowsPath);
  const metadata = {
    ...discovered.receipt,
    capturedAt: new Date().toISOString(),
    rowCount: rows.length,
    rowsFile: rowsPath.split('/').at(-1),
    rowsSha256: storedRows.sha256,
  };
  const metadataPath = `docs/operations/receipts/public-ai-company-news-${timestamp}.receipt.json`;
  const storedMetadata = await writeReceipt(metadata, metadataPath);
  globalThis.console.log(JSON.stringify({ metadata, receiptSha256: storedMetadata.sha256 }));
}
