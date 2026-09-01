const SAFE_ARTICLE_ROUTE_ID = /^[A-Za-z0-9._~-]+$/;

export function isSafeArticleRouteId(value: unknown): value is string {
  return typeof value === "string"
    && value !== "."
    && value !== ".."
    && SAFE_ARTICLE_ROUTE_ID.test(value);
}

export function normalizeArticleRouteId(value: unknown, label = "article route id"): string {
  if (!isSafeArticleRouteId(value)) {
    throw new Error(`${label} must be a safe single URL path segment`);
  }
  return value;
}

export function articlePath(value: unknown): string {
  return `/article/${normalizeArticleRouteId(value)}/`;
}
