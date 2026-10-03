'use client';

import { useParams } from 'next/navigation';
import {
  CenteredCatalogSkeleton,
  CinematicTopicSkeleton,
} from '@/components/loading/CatalogPageSkeletons';

export default function GenrePageLoading() {
  const params = useParams<{ slug?: string }>();
  const slug =
    params?.slug ||
    (typeof window !== 'undefined'
      ? window.location.pathname.split('/')[2]
      : undefined);

  if (
    slug === 'vien-tuong' ||
    slug === 'khoa-hoc-vien-tuong' ||
    slug === 'chien-tranh' ||
    slug === 'lich-su'
  ) {
    return <CinematicTopicSkeleton />;
  }

  return <CenteredCatalogSkeleton eyebrow columns="seven" count={21} />;
}
