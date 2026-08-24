# NetPhim Mobile App

React Native (Expo) mobile app cho [NetPhim](https://github.com/huywashere/film-site).

## Setup

### Yêu cầu
- Node.js 18+
- npm hoặc pnpm
- [Expo Go](https://expo.dev/client) trên điện thoại (để test nhanh)

### Cài đặt

```bash
cd apps/mobile
npm install --legacy-peer-deps
```

### Chạy dev (dùng Expo Go trên điện thoại)

```bash
npm start
```

Quét QR code bằng app **Expo Go** trên điện thoại.

### Cấu hình API URL

Mở file `src/lib/config.ts` và cập nhật `API_BASE_URL` với domain production của bạn:

```ts
export const API_BASE_URL = 'https://your-domain.com';
```

## Build APK (Android)

Cần cài [EAS CLI](https://docs.expo.dev/eas/):

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

## Cấu trúc

```
src/
├── components/      # UI components (MovieCard, HeroBanner, ...)
├── hooks/           # React Query hooks
├── lib/             # API client, config
├── navigation/      # React Navigation setup
├── screens/         # Màn hình
└── theme/           # Design tokens (màu sắc, spacing, ...)
```
