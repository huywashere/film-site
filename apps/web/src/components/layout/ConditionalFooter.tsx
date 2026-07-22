'use client';

import { usePathname } from 'next/navigation';
import { Footer } from './Footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // Hide footer on authentication pages, film detail pages, and watch pages
  if (
    pathname === '/login' || 
    pathname === '/register' ||
    pathname.startsWith('/film/') ||
    pathname.startsWith('/watch/')
  ) {
    return null;
  }
  
  return <Footer />;
}
