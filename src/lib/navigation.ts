export type NavItem = {
  href: string;
  label: string;
  icon: 'newspaper' | 'layers' | 'search' | 'heart' | 'book' | 'bookmark' | 'compass' | 'gem';
};

export function navigationItems(signedIn: boolean): NavItem[] {
  return [
    { href: '/', label: 'Today', icon: 'newspaper' },
    { href: '/topics', label: 'Topics', icon: 'layers' },
    { href: '/search', label: 'Archive', icon: 'search' },
    ...(signedIn
      ? [
          { href: '/for-you', label: 'Following', icon: 'heart' },
          { href: '/brief', label: 'Brief', icon: 'book' },
          { href: '/saved', label: 'Saved', icon: 'bookmark' },
        ] as NavItem[]
      : []),
    { href: '/methodology', label: 'Methodology', icon: 'compass' },
    { href: '/pricing', label: 'Desk', icon: 'gem' },
  ];
}

export function mobileNavigationItems(signedIn: boolean) {
  const items = navigationItems(signedIn);
  const primaryHrefs = signedIn
    ? ['/', '/search', '/brief', '/saved']
    : ['/', '/topics', '/search', '/pricing'];
  const primary = items.filter(item => primaryHrefs.includes(item.href));
  return { primary, more: items.filter(item => !primaryHrefs.includes(item.href)) };
}
