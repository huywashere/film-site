'use client';

import { useParams } from 'next/navigation';
import {
  CenteredCatalogSkeleton,
  CinematicTopicSkeleton,
} from '@/components/loading/CatalogPageSkeletons';

export default function GenrePageLoading() {
  const { slug } = useParams<{ slug: string }>();

  if (slug === 'vien-tuong' || slug === 'chien-tranh') {
    return <CinematicTopicSkeleton />;
  }

  return <CenteredCatalogSkeleton eyebrow />;
}
