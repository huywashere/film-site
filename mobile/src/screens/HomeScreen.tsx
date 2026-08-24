import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, FontSize, FontWeight } from '../theme';
import { useLatestMovies, useMoviesByType } from '../hooks/useMovies';
import { HeroBanner } from '../components/HeroBanner';
import { HorizontalList } from '../components/HorizontalList';
import { Movie } from '../lib/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList>;

const SECTIONS = [
  { title: 'Phim Bộ', type: 'phim-bo' },
  { title: 'Phim Lẻ', type: 'phim-le' },
  { title: 'Anime', type: 'hoat-hinh' },
  { title: 'TV Shows', type: 'tv-shows' },
];

export function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const { data: latestMovies, isLoading, refetch, isRefetching } = useLatestMovies();
  const { data: seriesMovies } = useMoviesByType('phim-bo');
  const { data: singleMovies } = useMoviesByType('phim-le');
  const { data: animeMovies } = useMoviesByType('hoat-hinh');

  const heroMovies = (latestMovies || []).slice(0, 6);

  const goToDetail = (movie: Movie) => {
    navigation.navigate('FilmDetail', { slug: movie.slug, name: movie.name });
  };

  const goToFilms = (type: string, title: string) => {
    navigation.navigate('Films', { type, title });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.logo}>NetPhim</Text>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => navigation.navigate('Search')}
            activeOpacity={0.7}
          >
            <Text style={styles.searchIcon}>🔍</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
      >
        {/* Hero Banner */}
        <HeroBanner movies={heroMovies} onMoviePress={goToDetail} />

        {/* Phim mới cập nhật */}
        <HorizontalList
          title="Mới Cập Nhật"
          movies={latestMovies}
          isLoading={isLoading}
          onMoviePress={goToDetail}
          onSeeAllPress={() => goToFilms('phim-moi-cap-nhat', 'Mới Cập Nhật')}
        />

        {/* Phim bộ */}
        <HorizontalList
          title="Phim Bộ"
          movies={seriesMovies}
          onMoviePress={goToDetail}
          onSeeAllPress={() => goToFilms('phim-bo', 'Phim Bộ')}
        />

        {/* Phim lẻ */}
        <HorizontalList
          title="Phim Lẻ"
          movies={singleMovies}
          onMoviePress={goToDetail}
          onSeeAllPress={() => goToFilms('phim-le', 'Phim Lẻ')}
        />

        {/* Anime */}
        <HorizontalList
          title="Anime / Hoạt Hình"
          movies={animeMovies}
          onMoviePress={goToDetail}
          onSeeAllPress={() => goToFilms('hoat-hinh', 'Anime')}
        />

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  logo: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.accent,
    letterSpacing: -0.5,
  },
  searchButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    fontSize: 16,
  },
  scrollContent: {
    paddingTop: 0,
  },
});
