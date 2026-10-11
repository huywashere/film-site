import React from "react";

export type ProfileColorType = "solid" | "animated";

export type ProfileColorOption = {
  id: string;
  label: string;
  value: string;
  type?: ProfileColorType;
  badge?: string;
  description?: string;
  className?: string;
  previewBg?: string;
};

/* ── 1. CÁC HIỆU ỨNG TÊN ĐỘNG & NHẤP NHÁY ── */
export const NAME_EFFECT_OPTIONS: ProfileColorOption[] = [
  {
    id: "name-rainbow-flow",
    label: "Cầu Vồng Tốc Độ",
    value: "name-rainbow-flow",
    type: "animated",
    badge: "Cầu Vồng",
    description: "Dải gradient 7 sắc cầu vồng chuyển động trôi mượt mà",
    className: "anim-name-rainbow",
    previewBg: "linear-gradient(90deg, #ff007f, #ffff00, #00ffff)",
  },
  {
    id: "name-neon-blink",
    label: "Neon Nhấp Nháy",
    value: "name-neon-blink",
    type: "animated",
    badge: "Nhấp Nháy",
    description: "Đèn neon Tokyo đổi màu chớp sáng theo nhịp đập",
    className: "anim-name-neon-blink",
    previewBg: "linear-gradient(135deg, #38bdf8, #f472b6)",
  },
  {
    id: "name-fire-burn",
    label: "Hỏa Long Rực Cháy",
    value: "name-fire-burn",
    type: "animated",
    badge: "Lửa Đỏ",
    description: "Ngọn lửa vàng cam bập bùng với vệt sáng rực rỡ",
    className: "anim-name-fire",
    previewBg: "linear-gradient(135deg, #fb923c, #ea580c)",
  },
  {
    id: "name-gold-shimmer",
    label: "Hoàng Kim Lấp Lánh",
    value: "name-gold-shimmer",
    type: "animated",
    badge: "Vương Giả",
    description: "Vàng kim 24K lấp lánh phản chiếu ánh sáng sang trọng",
    className: "anim-name-gold-shimmer",
    previewBg: "linear-gradient(135deg, #f59e0b, #fef08a)",
  },
  {
    id: "name-cosmic-glow",
    label: "Ngân Hà Tinh Vân",
    value: "name-cosmic-glow",
    type: "animated",
    badge: "Vũ Trụ",
    description: "Hào quang tím vũ trụ phát quang thở nhẹ huyền ảo",
    className: "anim-name-cosmic",
    previewBg: "linear-gradient(135deg, #c084fc, #6366f1)",
  },
  {
    id: "name-ice-glacier",
    label: "Băng Tuyết Bắc Cực",
    value: "name-ice-glacier",
    type: "animated",
    badge: "Băng Lam",
    description: "Băng tuyết phát sáng tinh khiết lấp lánh",
    className: "anim-name-ice",
    previewBg: "linear-gradient(135deg, #7dd3fc, #0284c7)",
  },
  {
    id: "name-emerald-aurora",
    label: "Cực Quang Lục Bảo",
    value: "name-emerald-aurora",
    type: "animated",
    badge: "Cực Quang",
    description: "Sóng xanh lục bảo ngọc ngà huyền bí",
    className: "anim-name-emerald",
    previewBg: "linear-gradient(135deg, #6ee7b7, #059669)",
  },
  {
    id: "name-cyber-glitch",
    label: "Ma Trận Glitch",
    value: "name-cyber-glitch",
    type: "animated",
    badge: "Hacker",
    description: "Chữ xanh lơ nhấp nháy đa sắc phong cách hacker",
    className: "anim-name-glitch",
    previewBg: "linear-gradient(135deg, #22d3ee, #f43f5e)",
  },
];

/* ── 2. BẢNG MÀU TÊN ĐƠN SẮC CƠ BẢN ── */
export const NAME_SOLID_OPTIONS: ProfileColorOption[] = [
  { id: "snow", label: "Trắng tuyết", value: "#F5F5F5", type: "solid" },
  { id: "silver", label: "Bạc Titan", value: "#CBD5E1", type: "solid" },
  { id: "violet", label: "Tím FlexPhim", value: "#A78BFA", type: "solid" },
  { id: "lavender", label: "Oải hương", value: "#C4B5FD", type: "solid" },
  { id: "pink", label: "Hồng neon", value: "#F472B6", type: "solid" },
  { id: "rose", label: "Đỏ hồng", value: "#FB7185", type: "solid" },
  { id: "red", label: "Đỏ điện ảnh", value: "#F87171", type: "solid" },
  { id: "orange", label: "Cam hoàng hôn", value: "#FB923C", type: "solid" },
  { id: "gold", label: "Vàng Oscar", value: "#FACC15", type: "solid" },
  { id: "lime", label: "Xanh chanh", value: "#A3E635", type: "solid" },
  { id: "emerald", label: "Ngọc lục bảo", value: "#34D399", type: "solid" },
  { id: "cyan", label: "Xanh cyan", value: "#22D3EE", type: "solid" },
  { id: "sky", label: "Xanh trời", value: "#38BDF8", type: "solid" },
  { id: "blue", label: "Xanh dương", value: "#60A5FA", type: "solid" },
  { id: "indigo", label: "Chàm", value: "#818CF8", type: "solid" },
];

export const ALL_NAME_COLOR_OPTIONS: ProfileColorOption[] = [
  ...NAME_EFFECT_OPTIONS,
  ...NAME_SOLID_OPTIONS,
];

/* ── 3. CÁC DẠNG KHUNG AVATAR ĐỘNG & HÀO QUANG ── */
export const AVATAR_FRAME_ANIMATED_OPTIONS: ProfileColorOption[] = [
  {
    id: "frame-rainbow-spin",
    label: "Cầu Vồng Xoay RGB",
    value: "frame-rainbow-spin",
    type: "animated",
    badge: "RGB 360°",
    description: "Vòng xoay cầu vồng 360 độ liên tục chuẩn Gaming Nitro",
    className: "anim-frame-rainbow-wrap",
    previewBg: "conic-gradient(from 0deg, #ff007f, #ffff00, #00ffff, #8b00ff, #ff007f)",
  },
  {
    id: "frame-neon-cyber",
    label: "Neon Cyberpunk",
    value: "frame-neon-cyber",
    type: "animated",
    badge: "Chớp Sáng",
    description: "Viền neon xanh cyan và hồng nhấp nháy phát quang tương lai",
    className: "anim-frame-neon",
    previewBg: "linear-gradient(135deg, #22d3ee, #f472b6)",
  },
  {
    id: "frame-fire-flame",
    label: "Hỏa Ngục Rực Cháy",
    value: "frame-fire-flame",
    type: "animated",
    badge: "Lửa Đỏ",
    description: "Hào quang cam đỏ bập bùng với ánh lửa rực sáng",
    className: "anim-frame-fire",
    previewBg: "linear-gradient(135deg, #f97316, #facc15)",
  },
  {
    id: "frame-gold-shimmer",
    label: "Hoàng Gia Kim Sa",
    value: "frame-gold-shimmer",
    type: "animated",
    badge: "Vàng 24K",
    description: "Viền vàng kim 24K vương giả lấp lánh ánh hào quang",
    className: "anim-frame-gold",
    previewBg: "linear-gradient(135deg, #fbbf24, #fef08a)",
  },
  {
    id: "frame-cosmic-galaxy",
    label: "Ngân Hà Tinh Vân",
    value: "frame-cosmic-galaxy",
    type: "animated",
    badge: "Vũ Trụ",
    description: "Hào quang tím - lam ngân hà chuyển động sâu lắng",
    className: "anim-frame-cosmic",
    previewBg: "linear-gradient(135deg, #a855f7, #6366f1)",
  },
  {
    id: "frame-electric-storm",
    label: "Sấm Sét Điện Tử",
    value: "frame-electric-storm",
    type: "animated",
    badge: "Xung Điện",
    description: "Viền xanh điện tử lóe sáng giật nhịp sống động",
    className: "anim-frame-electric",
    previewBg: "linear-gradient(135deg, #38bdf8, #818cf8)",
  },
  {
    id: "frame-emerald-mystic",
    label: "Ngọc Lục Thần Bí",
    value: "frame-emerald-mystic",
    type: "animated",
    badge: "Chiêm Tinh",
    description: "Viền ngọc lục bảo phát sáng theo nhịp thở êm ái",
    className: "anim-frame-emerald",
    previewBg: "linear-gradient(135deg, #34d399, #10b981)",
  },
  {
    id: "frame-sakura-bloom",
    label: "Hoa Anh Đào Nở",
    value: "frame-sakura-bloom",
    type: "animated",
    badge: "Anime",
    description: "Hồng anh đào ngọt ngào tỏa sáng dịu dàng",
    className: "anim-frame-sakura",
    previewBg: "linear-gradient(135deg, #f472b6, #fbcfe8)",
  },
  {
    id: "frame-glitch-matrix",
    label: "Ma Trận Glitch",
    value: "frame-glitch-matrix",
    type: "animated",
    badge: "Hacker",
    description: "Viền hacker ma trận nhấp nháy đa sắc kỹ thuật số",
    className: "anim-frame-glitch",
    previewBg: "linear-gradient(135deg, #22c55e, #06b6d4)",
  },
  {
    id: "frame-ice-frost",
    label: "Băng Lam Vĩnh Cửu",
    value: "frame-ice-frost",
    type: "animated",
    badge: "Băng Tuyết",
    description: "Tinh thể băng lam buốt lạnh phát quang tinh khiết",
    className: "anim-frame-ice",
    previewBg: "linear-gradient(135deg, #38bdf8, #bae6fd)",
  },
];

/* ── 4. BẢNG MÀU KHUNG AVATAR ĐƠN SẮC ── */
export const AVATAR_FRAME_SOLID_OPTIONS: ProfileColorOption[] = [
  ...NAME_SOLID_OPTIONS,
];

export const ALL_AVATAR_FRAME_OPTIONS: ProfileColorOption[] = [
  ...AVATAR_FRAME_ANIMATED_OPTIONS,
  ...AVATAR_FRAME_SOLID_OPTIONS,
];

// Giữ lại để tương thích ngược 100%
export const PROFILE_COLOR_OPTIONS = ALL_NAME_COLOR_OPTIONS;

export const DEFAULT_NAME_COLOR = NAME_SOLID_OPTIONS[0].value;
export const DEFAULT_AVATAR_FRAME_COLOR = NAME_SOLID_OPTIONS[2].value;

/**
 * Helper lấy style & class cho màu tên (hỗ trợ cả mã HEX tĩnh và hiệu ứng động)
 */
export function getNameColorProps(nameColorValue?: string | null): {
  className: string;
  style?: React.CSSProperties;
} {
  if (!nameColorValue) {
    return { className: "", style: { color: DEFAULT_NAME_COLOR } };
  }

  const effect = NAME_EFFECT_OPTIONS.find((opt) => opt.value === nameColorValue);
  if (effect && effect.className) {
    return { className: effect.className };
  }

  // Mặc định hoặc mã HEX
  return { className: "", style: { color: nameColorValue } };
}

/**
 * Helper lấy cấu hình render cho khung avatar (hỗ trợ cả khung động và viền tĩnh)
 */
export function getAvatarFrameConfig(frameValue?: string | null): {
  isAnimated: boolean;
  isRainbowWrap: boolean;
  className: string;
  style?: React.CSSProperties;
  label: string;
} {
  const val = frameValue || DEFAULT_AVATAR_FRAME_COLOR;
  const animatedOpt = AVATAR_FRAME_ANIMATED_OPTIONS.find((opt) => opt.value === val);

  if (animatedOpt) {
    if (animatedOpt.id === "frame-rainbow-spin") {
      return {
        isAnimated: true,
        isRainbowWrap: true,
        className: "anim-frame-rainbow-wrap",
        label: animatedOpt.label,
      };
    }
    return {
      isAnimated: true,
      isRainbowWrap: false,
      className: animatedOpt.className || "",
      label: animatedOpt.label,
    };
  }

  // Viền đơn sắc
  const solidOpt = AVATAR_FRAME_SOLID_OPTIONS.find((opt) => opt.value === val);
  return {
    isAnimated: false,
    isRainbowWrap: false,
    className: "border-[3px]",
    style: {
      borderColor: val,
      boxShadow: `0 0 0 4px ${val}22, 0 16px 36px rgba(0,0,0,.45)`,
    },
    label: solidOpt?.label || "Màu tùy chỉnh",
  };
}

