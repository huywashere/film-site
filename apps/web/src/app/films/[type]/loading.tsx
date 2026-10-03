'use client';

import { useParams } from 'next/navigation';
import {
  FilmTypeSkeleton,
  CinematicTopicSkeleton,
} from '@/components/loading/CatalogPageSkeletons';

export default function FilmTypeLoading() {
  const params = useParams<{ type?: string }>();
  const type =
    params?.type ||
    (typeof window !== 'undefined'
      ? window.location.pathname.split('/')[2]
      : undefined);

  if (
    type === 'anime' ||
    type === 'hoat-hinh' ||
    type === 'thuyet-minh-ai' ||
    type === 'thuyetminhai' ||
    type === 'song-ngu-ai' ||
    type === 'song-ngu'
  ) {
    return <CinematicTopicSkeleton />;
  }

  return <FilmTypeSkeleton />;
}
