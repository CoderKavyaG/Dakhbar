const protectedReaderPrefixes = ['/for-you', '/brief'];

export function isReaderProtectedPath(pathname: string) {
  return protectedReaderPrefixes.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
}

export function readerRouteStatus(pathname: string, userId: string | null): 200 | 307 {
  return isReaderProtectedPath(pathname) && !userId ? 307 : 200;
}
