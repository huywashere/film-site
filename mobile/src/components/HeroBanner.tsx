import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../theme';
import { Movie, getPosterUrl } from '../lib/api';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_H * 0.52;

interface HeroBannerProps {
  movies?: Movie[];
  onMoviePress?: (movie: Movie) => void;
}

export function HeroBanner({ movies = [], onMoviePress }: HeroBannerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const autoplayRef = useRef<ReturnType<typeof setTimeout>>();

  const displayed = movies.slice(0, 6);

  const goNext = useCallback(() => {
    const next = (activeIndex + 1) % displayed.length;
    scrollRef.current?.scrollTo({ x: next * SCREEN_W, animated: true });
    setActiveIndex(next);
  }, [activeIndex, displayed.length]);

  useEffect(() => {
    if (displayed.length <= 1) return;
    autoplayRef.current = setTimeout(goNext, 4500);
    return () => clearTimeout(autoplayRef.current);
  }, [goNext, displayed.length]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / SCREEN_W);
    if (index !== activeIndex) setActiveIndex(index);
  };

  if (!displayed.length) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        decelerationRate="fast"
      >
        {displayed.map((movie, idx) => {
          const posterUrl = getPosterUrl(movie);
          return (
            <TouchableOpacity
              key={movie.slug || idx}
              style={styles.slide}
              onPress={() => onMoviePress?.(movie)}
              activeOpacity={0.92}
            >
              {/* Backdrop */}
              {posterUrl ? (
                <Image
                  source={{ uri: posterUrl }}
                  style={styles.backdrop}
                  contentFit="cover"
                  transition={300}
                />
              ) : (
                <View style={[styles.backdrop, { backgroundColor: Colors.backgroundCard }]} />
              )}

              {/* Gradient overlay */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(10,10,10,0.98)']}
                locations={[0.3, 0.6, 1]}
                style={styles.gradient}
              />

              {/* Content */}
              <View style={styles.content}>
                {/* Type / Categories */}
                {movie.category && movie.category.length > 0 && (
                  <View style={styles.categories}>
                    {movie.category.slice(0, 2).map((cat, i) => (
                      <View key={i} style={styles.categoryTag}>
                        <Text style={styles.categoryText}>{cat.name}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={styles.title} numberOfLines={2}>
                  {movie.name}
                </Text>
                {movie.origin_name || movie.original_name ? (
                  <Text style={styles.originName} numberOfLines={1}>
                    {movie.origin_name || movie.original_name}
                  </Text>
                ) : null}

                {/* Meta row */}
                <View style={styles.meta}>
                  {movie.year && <Text style={styles.metaText}>{movie.year}</Text>}
                  {movie.quality && (
                    <>
                      <View style={styles.dot} />
                      <Text style={[styles.metaText, { color: Colors.accent }]}>
                        {movie.quality}
                      </Text>
                    </>
                  )}
                  {movie.lang && (
                    <>
                      <View style={styles.dot} />
                      <Text style={styles.metaText}>{movie.lang}</Text>
                    </>
                  )}
                </View>

                {/* CTA Button */}
                <TouchableOpacity
                  style={styles.ctaButton}
                  onPress={() => onMoviePress?.(movie)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.ctaText}>▶  Xem ngay</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Dot indicators */}
      {displayed.length > 1 && (
        <View style={styles.dots}>
          {displayed.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dotItem,
                i === activeIndex && styles.dotItemActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: HERO_HEIGHT,
    marginBottom: Spacing.xxl,
  },
  slide: {
    width: SCREEN_W,
    height: HERO_HEIGHT,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  categories: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  categoryTag: {
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    lineHeight: 30,
    marginBottom: 4,
  },
  originName: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginBottom: Spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.md,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    marginHorizontal: 2,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
  },
  ctaText: {
    color: '#fff',
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.3,
  },
  dots: {
    position: 'absolute',
    bottom: Spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  dotItem: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
  },
  dotItemActive: {
    width: 18,
    backgroundColor: Colors.accent,
  },
});
