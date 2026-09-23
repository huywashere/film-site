'use client';

import { useParams } from 'next/navigation';
import {
  CinematicTopicSkeleton,
  FilmTypeSkeleton,
} from '@/components/loading/CatalogPageSkeletons';

export default function FilmTypeLoading() {
  const { type } = useParams<{ type: string }>();
  const isCinematicTopic = [
    'anime',
    'hoat-hinh',
    'thuyet-minh-ai',
    'thuyetminhai',
    'song-ngu-ai',
  ].includes(type);

  if (isCinematicTopic) {
    return <CinematicTopicSkeleton />;
  }

  return <FilmTypeSkeleton />;
}
