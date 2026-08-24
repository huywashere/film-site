import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../theme';
import { useSearch } from '../hooks/useMovies';
import { MovieCard, CARD_SIZE } from '../components/MovieCard';
import { Movie } from '../lib/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type SearchNavProp = NativeStackNavigationProp<RootStackParamList>;

export function SearchScreen() {
  const navigation = useNavigation<SearchNavProp>();
  const [query, setQuery] = useState('');
  const { data: results, isLoading, isFetching } = useSearch(query);

  const goToDetail = (movie: Movie) => {
    Keyboard.dismiss();
    navigation.navigate('FilmDetail', { slug: movie.slug, name: movie.name });
  };

  const numColumns = 3;
  const cardWidth = CARD_SIZE.sm.width;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="Tìm phim, diễn viên..."
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {query.trim().length < 2 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎬</Text>
          <Text style={styles.emptyTitle}>Tìm kiếm phim</Text>
          <Text style={styles.emptySubtitle}>Nhập tên phim hoặc diễn viên để tìm kiếm</Text>
        </View>
      ) : isLoading || isFetching ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      ) : results && results.length > 0 ? (
        <FlatList
          data={results}
          numColumns={numColumns}
          keyExtractor={(item, idx) => item._id || item.slug || String(idx)}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <MovieCard
              movie={item}
              size="sm"
              onPress={goToDetail}
              showEpisode={false}
            />
          )}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>😔</Text>
          <Text style={styles.emptyTitle}>Không tìm thấy</Text>
          <Text style={styles.emptySubtitle}>
            Không tìm thấy phim với từ khóa "{query}"
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: FontSize.base,
    padding: 0,
  },
  clearIcon: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: Colors.textMuted,
    fontSize: FontSize.base,
    textAlign: 'center',
    lineHeight: 22,
  },
});
