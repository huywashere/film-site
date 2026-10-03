'use client';

import { useParams } from 'next/navigation';
import {
  CenteredCatalogSkeleton,
  CinematicTopicSkeleton,
} from '@/components/loading/CatalogPageSkeletons';

export default function CountryPageLoading() {
  const params = useParams<{ slug?: string }>();
  const slug =
    params?.slug ||
    (typeof window !== 'undefined'
      ? window.location.pathname.split('/')[2]
      : undefined);

  if (slug === 'han-quoc' || slug === 'trung-quoc') {
    return <CinematicTopicSkeleton background="#141414" />;
  }

  return <CenteredCatalogSkeleton columns="seven" count={21} />;
}
