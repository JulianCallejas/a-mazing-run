/** Normalizes a deploy base path to `/` or `/segment/` (leading and trailing slash). */
export function normalizeBase(raw: string | undefined): string {
  const trimmed = (raw ?? '').replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}

/** Matches robots.txt at the app base only, so the SPA shell never answers it. */
export function robotsDenylistPattern(base: string): RegExp {
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}robots\\.txt$`);
}
