export type NavItem = {
  href: string;
  label: string;
  icon: 'newspaper' | 'layers' | 'search' | 'heart' | 'book' | 'bookmark' | 'compass' | 'gem';
};

export function navigationItems(signedIn: boolean): NavItem[] {
  return [
    { href: '/', label: 'Today', icon: 'newspaper' },
    ...(signedIn
      ? [
          { href: '/?tab=following', label: 'Following', icon: 'heart' },
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
    ? ['/', '/?tab=following', '/saved', '/pricing']
    : ['/', '/methodology', '/pricing'];
  const primary = items.filter(item => primaryHrefs.includes(item.href));
  return { primary, more: items.filter(item => !primaryHrefs.includes(item.href)) };
}
