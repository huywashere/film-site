export type ProfileColorOption = {
  id: string;
  label: string;
  value: string;
};

export const PROFILE_COLOR_OPTIONS: ProfileColorOption[] = [
  { id: "snow", label: "Trắng tuyết", value: "#F5F5F5" },
  { id: "silver", label: "Bạc", value: "#CBD5E1" },
  { id: "violet", label: "Tím NetPhim", value: "#A78BFA" },
  { id: "lavender", label: "Oải hương", value: "#C4B5FD" },
  { id: "pink", label: "Hồng neon", value: "#F472B6" },
  { id: "rose", label: "Đỏ hồng", value: "#FB7185" },
  { id: "red", label: "Đỏ điện ảnh", value: "#F87171" },
  { id: "orange", label: "Cam", value: "#FB923C" },
  { id: "gold", label: "Vàng Oscar", value: "#FACC15" },
  { id: "lime", label: "Xanh chanh", value: "#A3E635" },
  { id: "emerald", label: "Ngọc lục bảo", value: "#34D399" },
  { id: "cyan", label: "Xanh cyan", value: "#22D3EE" },
  { id: "sky", label: "Xanh trời", value: "#38BDF8" },
  { id: "blue", label: "Xanh dương", value: "#60A5FA" },
  { id: "indigo", label: "Chàm", value: "#818CF8" },
];

export const DEFAULT_NAME_COLOR = PROFILE_COLOR_OPTIONS[0].value;
export const DEFAULT_AVATAR_FRAME_COLOR = PROFILE_COLOR_OPTIONS[2].value;
