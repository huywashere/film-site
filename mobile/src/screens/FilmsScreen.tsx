import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Colors, Spacing, FontSize, FontWeight } from '../theme';
import { useInfiniteMovies } from '../hooks/useMovies';
import { MovieCard } from '../components/MovieCard';
import { Movie } from '../lib/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type FilmsRoute = RouteProp<RootStackParamList, 'Films'>;
type FilmsNavProp = NativeStackNavigationProp<RootStackParamList>;

export function FilmsScreen() {
  const route = useRoute<FilmsRoute>();
  const navigation = useNavigation<FilmsNavProp>();
  const { type, title } = route.params;

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteMovies(type);

  const movies = data?.pages.flat() ?? [];

  const goToDetail = (movie: Movie) => {
    navigation.navigate('FilmDetail', { slug: movie.slug, name: movie.name });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={movies}
          numColumns={3}
          keyExtractor={(item, idx) => item._id || item.slug || String(idx)}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <MovieCard movie={item} size="sm" onPress={goToDetail} />
          )}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={Colors.accent} style={{ marginVertical: 20 }} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backText: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  title: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: 'center' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  grid: { padding: Spacing.lg, paddingBottom: 40 },
  row: { justifyContent: 'space-between', marginBottom: Spacing.md },
});
