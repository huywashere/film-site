import { Episode } from '../lib/api';

export type RootStackParamList = {
  // Bottom tabs
  Main: undefined;
  // Stack screens
  FilmDetail: { slug: string; name: string };
  Watch: { episode: Episode; movieName: string; slug: string };
  Films: { type: string; title: string };
};

export type TabParamList = {
  Home: undefined;
  FilmsList: undefined;
  Search: undefined;
  Profile: undefined;
};
