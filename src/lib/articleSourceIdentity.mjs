// URL is a global in browsers, Node and Bun. Importing it from node:url breaks client bundles,
// where that module is stubbed and every identity silently became an empty string.

export function articleSourceIdentity(value) {
  try {
    const url = new URL(value);
    for (const key of url.searchParams.keys()) {
      if (/^utm_/i.test(key) || /^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return `${url.hostname.toLowerCase().replace(/^www\./, '')}${url.pathname.replace(/\/+$/, '')}${url.search}`;
  } catch {
    return '';
  }
}
