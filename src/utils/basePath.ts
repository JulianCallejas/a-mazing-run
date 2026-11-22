/**
 * Normalizes a deploy base path to `/` or `/segment/` (leading and trailing slash).
 * Only sub-paths are supported: relative bases ('./') and absolute URLs would
 * produce wrong asset URLs and a wrong PWA scope, so they fail the build loudly.
 */
export function normalizeBase(raw: string | undefined): string {
  const value = raw ?? '';
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
  const trimmed = value.replace(/^\/+|\/+$/g, '');
  const dotSegment = trimmed.split('/').some((segment) => segment === '.' || segment === '..');
  if (hasScheme || value.startsWith('//') || dotSegment) {
    throw new Error(
      `Invalid BASE_PATH "${value}": use '/' or a sub-path such as '/my-repo/' (no './', '..' or full URLs).`,
    );
  }
  return trimmed ? `/${trimmed}/` : '/';
}

/** Production origin used for canonical and social-preview URLs unless SITE_ORIGIN overrides it. */
export const DEFAULT_SITE_ORIGIN = 'https://juliancallejas.github.io';

/**
 * Absolute, trailing-slash URL of the deployed app. Canonical, Open Graph and
 * Twitter tags must be absolute: crawlers do not resolve them against the base.
 */
export function siteUrl(origin: string | undefined, base: string): string {
  const value = (origin || DEFAULT_SITE_ORIGIN).replace(/\/+$/, '');
  if (!/^https?:\/\/[^/\s]+$/i.test(value)) {
    throw new Error(`Invalid SITE_ORIGIN "${origin}": use an origin such as 'https://example.com' (no path).`);
  }
  return `${value}${base}`;
}

/** Matches robots.txt at the app base only, so the SPA shell never answers it. */
export function robotsDenylistPattern(base: string): RegExp {
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}robots\\.txt$`);
}

/** Every PWA option that depends on the deploy base, derived from one normalized value. */
export function pwaBaseOptions(base: string) {
  return {
    manifest: { start_url: base, scope: base, id: base },
    navigateFallback: `${base}index.html`,
    navigateFallbackDenylist: [robotsDenylistPattern(base)],
  };
}
