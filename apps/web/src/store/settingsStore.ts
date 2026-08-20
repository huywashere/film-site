import { create } from "zustand";
import { persist } from "zustand/middleware";

export type QualitySetting = "auto" | "2160p" | "1080p" | "720p" | "480p";
export type ServerSetting = "vip1" | "backup2" | "cdn3";
export type SubtitleLangSetting = "vi" | "en" | "off";
export type SubtitleSizeSetting = "small" | "medium" | "large";
export type SubtitleColorSetting = "white" | "yellow" | "cyan";
export type AudioModeSetting = "vietsub" | "thuyetminh" | "longtieng";

export interface SettingsState {
  autoplay: boolean;
  autoNextEpisode: boolean;
  theaterMode: boolean;
  defaultQuality: QualitySetting;
  defaultServer: ServerSetting;
  subtitleLang: SubtitleLangSetting;
  subtitleSize: SubtitleSizeSetting;
  subtitleColor: SubtitleColorSetting;
  audioMode: AudioModeSetting;
  autoSkipIntro: boolean;
  newMovieNotifications: boolean;
  commentNotifications: boolean;

  setAutoplay: (val: boolean) => void;
  setAutoNextEpisode: (val: boolean) => void;
  setAutoSkipIntro: (val: boolean) => void;
  setTheaterMode: (val: boolean) => void;
  setDefaultQuality: (val: QualitySetting) => void;
  setDefaultServer: (val: ServerSetting) => void;
  setSubtitleLang: (val: SubtitleLangSetting) => void;
  setSubtitleSize: (val: SubtitleSizeSetting) => void;
  setSubtitleColor: (val: SubtitleColorSetting) => void;
  setAudioMode: (val: AudioModeSetting) => void;
  setNewMovieNotifications: (val: boolean) => void;
  setCommentNotifications: (val: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoplay: true,
      autoNextEpisode: true,
      autoSkipIntro: true,
      theaterMode: false,
      defaultQuality: "auto",
      defaultServer: "vip1",
      subtitleLang: "vi",
      subtitleSize: "medium",
      subtitleColor: "white",
      audioMode: "vietsub",
      newMovieNotifications: true,
      commentNotifications: true,

      setAutoplay: (val) => set({ autoplay: val }),
      setAutoNextEpisode: (val) => set({ autoNextEpisode: val }),
      setAutoSkipIntro: (val) => set({ autoSkipIntro: val }),
      setTheaterMode: (val) => set({ theaterMode: val }),
      setDefaultQuality: (val) => set({ defaultQuality: val }),
      setDefaultServer: (val) => set({ defaultServer: val }),
      setSubtitleLang: (val) => set({ subtitleLang: val }),
      setSubtitleSize: (val) => set({ subtitleSize: val }),
      setSubtitleColor: (val) => set({ subtitleColor: val }),
      setAudioMode: (val) => set({ audioMode: val }),
      setNewMovieNotifications: (val) => set({ newMovieNotifications: val }),
      setCommentNotifications: (val) => set({ commentNotifications: val }),
    }),
    {
      name: "cineverse_user_settings",
    },
  ),
);
