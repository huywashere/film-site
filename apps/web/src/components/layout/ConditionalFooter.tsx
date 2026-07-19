'use client';

import { usePathname } from 'next/navigation';
import { Footer } from './Footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // Hide footer on authentication pages
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }
  
  return <Footer />;
}
