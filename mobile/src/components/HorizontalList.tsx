import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, FontSize, FontWeight } from '../theme';
import { Movie } from '../lib/api';
import { MovieCard, CARD_SIZE } from './MovieCard';

interface HorizontalListProps {
  title: string;
  movies?: Movie[];
  isLoading?: boolean;
  cardSize?: 'sm' | 'md' | 'lg';
  onMoviePress?: (movie: Movie) => void;
  onSeeAllPress?: () => void;
  emptyText?: string;
}

export function HorizontalList({
  title,
  movies,
  isLoading,
  cardSize = 'md',
  onMoviePress,
  onSeeAllPress,
  emptyText = 'Không có phim',
}: HorizontalListProps) {
  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleAccent} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {onSeeAllPress && (
          <TouchableOpacity onPress={onSeeAllPress} activeOpacity={0.7}>
            <Text style={styles.seeAll}>Xem tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.accent} size="small" />
        </View>
      ) : movies && movies.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          {movies.map((movie, idx) => (
            <MovieCard
              key={movie._id || movie.slug || idx}
              movie={movie}
              size={cardSize}
              onPress={onMoviePress}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  seeAll: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  list: {
    paddingHorizontal: Spacing.lg,
  },
  loading: {
    height: CARD_SIZE.md.height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.base,
  },
});
