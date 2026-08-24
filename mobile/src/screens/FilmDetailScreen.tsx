import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../theme';
import { useMovieDetail } from '../hooks/useMovies';
import { getPosterUrl, getThumbUrl, EpisodeServer, Episode } from '../lib/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

const { width: SCREEN_W } = Dimensions.get('window');
const BACKDROP_HEIGHT = SCREEN_W * 0.6;

type DetailRoute = RouteProp<RootStackParamList, 'FilmDetail'>;
type DetailNavProp = NativeStackNavigationProp<RootStackParamList>;

export function FilmDetailScreen() {
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation<DetailNavProp>();
  const { slug, name } = route.params;
  const [selectedServer, setSelectedServer] = useState(0);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);

  const { data: movie, isLoading, isError } = useMovieDetail(slug);

  const handleWatch = (ep?: Episode) => {
    const episode = ep || selectedEpisode || movie?.episodes?.[selectedServer]?.server_data?.[0];
    if (!episode) return;
    navigation.navigate('Watch', {
      episode,
      movieName: movie?.name || name,
      slug,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (isError || !movie) {
    return (
      <SafeAreaView style={styles.errorContainer} edges={['top']}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.errorText}>Không tải được thông tin phim</Text>
      </SafeAreaView>
    );
  }

  const backdropUrl = getThumbUrl(movie);
  const firstEpisode = movie.episodes?.[selectedServer]?.server_data?.[0];
  const episodes = movie.episodes?.[selectedServer]?.server_data ?? [];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Backdrop */}
        <View style={styles.backdrop}>
          {backdropUrl && (
            <Image
              source={{ uri: backdropUrl }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(10,10,10,1)']}
            locations={[0.3, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Back button */}
          <SafeAreaView edges={['top']}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{movie.name}</Text>
          {(movie.origin_name || movie.original_name) && (
            <Text style={styles.originName}>
              {movie.origin_name || movie.original_name}
            </Text>
          )}

          {/* Meta chips */}
          <View style={styles.metaRow}>
            {movie.year && <MetaChip text={String(movie.year)} />}
            {movie.quality && <MetaChip text={movie.quality} highlight />}
            {movie.lang && <MetaChip text={movie.lang} />}
            {(movie.episode_current || movie.current_episode) && (
              <MetaChip text={movie.episode_current || movie.current_episode || ''} />
            )}
          </View>

          {/* Categories */}
          {movie.category && movie.category.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
              {movie.category.map((cat, i) => (
                <View key={i} style={styles.categoryTag}>
                  <Text style={styles.categoryText}>{cat.name}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Watch button */}
          <TouchableOpacity style={styles.watchButton} onPress={() => handleWatch()} activeOpacity={0.85}>
            <Text style={styles.watchButtonText}>▶  Xem Phim</Text>
          </TouchableOpacity>

          {/* Description */}
          {(movie.description || movie.content) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nội dung</Text>
              <Text style={styles.description} numberOfLines={5}>
                {(movie.description || movie.content || '').replace(/<[^>]*>/g, '')}
              </Text>
            </View>
          )}

          {/* Cast */}
          {(movie.casts || (movie.actor && movie.actor.length > 0)) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Diễn viên</Text>
              <Text style={styles.castText}>
                {movie.casts || (Array.isArray(movie.actor) ? movie.actor.join(', ') : movie.actor)}
              </Text>
            </View>
          )}

          {/* Server selector */}
          {movie.episodes && movie.episodes.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Máy chủ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.serverRow}>
                  {movie.episodes.map((server: EpisodeServer, idx: number) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.serverButton,
                        selectedServer === idx && styles.serverButtonActive,
                      ]}
                      onPress={() => setSelectedServer(idx)}
                    >
                      <Text
                        style={[
                          styles.serverText,
                          selectedServer === idx && styles.serverTextActive,
                        ]}
                      >
                        {server.server_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Episode list */}
          {episodes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Danh sách tập ({episodes.length} tập)
              </Text>
              <View style={styles.episodeGrid}>
                {episodes.map((ep: Episode, idx: number) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.episodeButton,
                      selectedEpisode === ep && styles.episodeButtonActive,
                    ]}
                    onPress={() => handleWatch(ep)}
                  >
                    <Text
                      style={[
                        styles.episodeText,
                        selectedEpisode === ep && styles.episodeTextActive,
                      ]}
                    >
                      {ep.name || `Tập ${idx + 1}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

function MetaChip({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <View style={[styles.chip, highlight && styles.chipHighlight]}>
      <Text style={[styles.chipText, highlight && styles.chipTextHighlight]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  errorText: { color: Colors.textMuted, fontSize: FontSize.base, textAlign: 'center', marginTop: 40 },
  backdrop: { height: BACKDROP_HEIGHT },
  backBtn: { margin: Spacing.lg, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  backText: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  content: { padding: Spacing.lg },
  title: { color: Colors.textPrimary, fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold, marginBottom: 4 },
  originName: { color: Colors.textMuted, fontSize: FontSize.base, marginBottom: Spacing.md },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md },
  chip: { backgroundColor: Colors.backgroundElevated, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border },
  chipHighlight: { backgroundColor: Colors.accentLight, borderColor: Colors.accent },
  chipText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  chipTextHighlight: { color: Colors.accent },
  categories: { marginBottom: Spacing.lg },
  categoryTag: { borderWidth: 1, borderColor: Colors.borderStrong, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full, marginRight: 6 },
  categoryText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  watchButton: { backgroundColor: Colors.accent, padding: Spacing.lg, borderRadius: BorderRadius.lg, alignItems: 'center', marginBottom: Spacing.xl, ...Shadow.glow },
  watchButtonText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  description: { color: Colors.textSecondary, fontSize: FontSize.base, lineHeight: 24 },
  castText: { color: Colors.textSecondary, fontSize: FontSize.base, lineHeight: 22 },
  serverRow: { flexDirection: 'row', gap: 8 },
  serverButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.md, backgroundColor: Colors.backgroundCard, borderWidth: 1, borderColor: Colors.border },
  serverButtonActive: { backgroundColor: Colors.accentLight, borderColor: Colors.accent },
  serverText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  serverTextActive: { color: Colors.accent },
  episodeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  episodeButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.sm, backgroundColor: Colors.backgroundCard, borderWidth: 1, borderColor: Colors.border, minWidth: 52, alignItems: 'center' },
  episodeButtonActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  episodeText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  episodeTextActive: { color: '#fff', fontWeight: FontWeight.bold },
});
