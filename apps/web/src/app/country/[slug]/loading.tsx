'use client';

import { useParams } from 'next/navigation';
import {
  CenteredCatalogSkeleton,
  CinematicTopicSkeleton,
} from '@/components/loading/CatalogPageSkeletons';

export default function CountryPageLoading() {
  const { slug } = useParams<{ slug: string }>();

  if (slug === 'han-quoc' || slug === 'trung-quoc') {
    return <CinematicTopicSkeleton background="#141414" />;
  }

  return <CenteredCatalogSkeleton columns="six" count={18} />;
}
