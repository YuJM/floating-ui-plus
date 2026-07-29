export function getPlatform(): string {
  return typeof navigator !== 'undefined' ? navigator.platform : '';
}

export function getUserAgent(): string {
  return typeof navigator !== 'undefined' ? navigator.userAgent : '';
}

export function isSafari() {
  return /Apple/.test(typeof navigator !== 'undefined' ? navigator.vendor : '');
}

export function isAndroid() {
  return /android/i.test(getUserAgent());
}

export function isMac() {
  return getPlatform().toLowerCase().startsWith('mac');
}

export function isJSDOM() {
  return getUserAgent().includes('jsdom');
}
