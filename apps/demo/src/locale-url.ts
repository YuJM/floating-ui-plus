import type {Locale} from './i18n';

function normalizePath(path: string) {
  const normalized = path.trim().replace(/^\/+|\/+$/g, '');
  return normalized ? `/${normalized}` : '';
}

export function getRelativeLocaleUrl(locale: Locale, path = '') {
  const suffix = normalizePath(path);
  return locale === 'en' ? suffix || '/' : `/${locale}${suffix}`;
}

export function getAbsoluteLocaleUrl(site: URL, locale: Locale, path = '') {
  return new URL(getRelativeLocaleUrl(locale, path), site);
}
