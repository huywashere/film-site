import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, FontWeight } from '../theme';
import type { RootStackParamList } from '../navigation/types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type WatchRoute = RouteProp<RootStackParamList, 'Watch'>;

export function WatchScreen() {
  const route = useRoute<WatchRoute>();
  const navigation = useNavigation();
  const { episode, movieName } = route.params;

  const [isReady, setIsReady] = useState(false);
  const [isError, setIsError] = useState(false);

  // Prefer m3u8 > embed link
  const videoUrl = episode?.link_m3u8 || episode?.embed || episode?.link_embed || '';
  const isEmbed = !episode?.link_m3u8 && (episode?.embed || episode?.link_embed);

  const player = useVideoPlayer(videoUrl && !isEmbed ? { uri: videoUrl } : null, (p) => {
    p.loop = false;
    p.play();
  });

  if (isEmbed || !videoUrl) {
    // Use WebView for embed links
    const { WebView } = require('react-native-webview');
    const embedUrl = episode?.embed || episode?.link_embed || '';

    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <SafeAreaView edges={['top']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{movieName}</Text>
          <View style={{ width: 36 }} />
        </SafeAreaView>
        <WebView
          source={{ uri: embedUrl }}
          style={styles.webview}
          allowsFullscreenVideo
          javaScriptEnabled
          domStorageEnabled
          mediaPlaybackRequiresUserAction={false}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {episode.name ? `${movieName} - ${episode.name}` : movieName}
        </Text>
        <View style={{ width: 36 }} />
      </SafeAreaView>

      {/* Video */}
      <View style={styles.playerContainer}>
        {!isReady && !isError && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={Colors.playerBlue} size="large" />
            <Text style={styles.loadingText}>Đang tải phim...</Text>
          </View>
        )}
        {isError && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>Không thể phát video này</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.errorBtn}>
              <Text style={styles.errorBtnText}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        )}
        <VideoView
          style={styles.video}
          player={player}
          allowsFullscreen
          allowsPictureInPicture
          nativeControls
          onLayout={() => setIsReady(true)}
        />
      </View>

      {/* Episode info */}
      <View style={styles.info}>
        <Text style={styles.movieName}>{movieName}</Text>
        {episode.name && (
          <Text style={styles.episodeName}>{episode.name}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.medium,
  },
  headerTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  playerContainer: {
    width: SCREEN_W,
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 1,
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.base,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 1,
    gap: Spacing.md,
  },
  errorIcon: { fontSize: 48 },
  errorText: { color: Colors.textSecondary, fontSize: FontSize.base, textAlign: 'center' },
  errorBtn: { backgroundColor: Colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  errorBtnText: { color: '#fff', fontWeight: FontWeight.bold },
  info: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  movieName: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  episodeName: {
    color: Colors.textMuted,
    fontSize: FontSize.base,
    marginTop: 4,
  },
});
