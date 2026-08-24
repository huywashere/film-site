import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Colors, BorderRadius, FontSize, FontWeight } from '../theme';
import { Movie, getPosterUrl, getEpisodeCurrent } from '../lib/api';

const { width: SCREEN_W } = Dimensions.get('window');

// Card size variants
export const CARD_SIZE = {
  sm: { width: 100, height: 150 },
  md: { width: 130, height: 194 },
  lg: { width: 160, height: 238 },
  wide: { width: (SCREEN_W - 48) / 2, height: ((SCREEN_W - 48) / 2) * 1.48 },
} as const;

interface MovieCardProps {
  movie: Movie;
  size?: keyof typeof CARD_SIZE;
  onPress?: (movie: Movie) => void;
  showEpisode?: boolean;
  showYear?: boolean;
}

export function MovieCard({
  movie,
  size = 'md',
  onPress,
  showEpisode = true,
  showYear = false,
}: MovieCardProps) {
  const { width, height } = CARD_SIZE[size];
  const posterUrl = getPosterUrl(movie);
  const episodeCurrent = getEpisodeCurrent(movie);
  const isNew = episodeCurrent && episodeCurrent !== 'Full';

  return (
    <TouchableOpacity
      style={[styles.container, { width }]}
      onPress={() => onPress?.(movie)}
      activeOpacity={0.75}
    >
      {/* Poster */}
      <View style={[styles.poster, { width, height }]}>
        {posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={200}
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterPlaceholderText}>
              {movie.name?.[0] ?? '?'}
            </Text>
          </View>
        )}

        {/* Quality badge */}
        {movie.quality && (
          <View style={styles.qualityBadge}>
            <Text style={styles.qualityText}>{movie.quality}</Text>
          </View>
        )}

        {/* Episode badge */}
        {showEpisode && isNew && (
          <View style={styles.episodeBadge}>
            <Text style={styles.episodeText} numberOfLines={1}>
              {episodeCurrent}
            </Text>
          </View>
        )}

        {/* Gradient overlay at bottom */}
        <View style={styles.gradientOverlay} />
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {movie.name}
      </Text>
      {showYear && movie.year && (
        <Text style={styles.year}>{movie.year}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 10,
  },
  poster: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundCard,
    marginBottom: 6,
  },
  posterPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterPlaceholderText: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'transparent',
    // Native gradient workaround via opacity
  },
  qualityBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: Colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  qualityText: {
    color: '#fff',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
  },
  episodeBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    maxWidth: '80%',
  },
  episodeText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    lineHeight: 18,
  },
  year: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
