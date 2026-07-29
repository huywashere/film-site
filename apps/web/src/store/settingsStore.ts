import { create } from "zustand";
import { persist } from "zustand/middleware";

export type QualitySetting = "auto" | "360p" | "480p" | "720p" | "1080p";

export interface SettingsState {
  autoplay: boolean;
  autoNextEpisode: boolean;
  theaterMode: boolean;
  newMovieNotifications: boolean;
  defaultQuality: QualitySetting;

  setAutoplay: (val: boolean) => void;
  setAutoNextEpisode: (val: boolean) => void;
  setTheaterMode: (val: boolean) => void;
  setNewMovieNotifications: (val: boolean) => void;
  setDefaultQuality: (val: QualitySetting) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoplay: true,
      autoNextEpisode: true,
      theaterMode: false,
      newMovieNotifications: true,
      defaultQuality: "auto",

      setAutoplay: (val) => set({ autoplay: val }),
      setAutoNextEpisode: (val) => set({ autoNextEpisode: val }),
      setTheaterMode: (val) => set({ theaterMode: val }),
      setNewMovieNotifications: (val) => set({ newMovieNotifications: val }),
      setDefaultQuality: (val) => set({ defaultQuality: val }),
    }),
    {
      name: "cineverse_user_settings",
    },
  ),
);
