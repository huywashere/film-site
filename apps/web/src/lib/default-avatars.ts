export interface PresetAvatar {
  id: string;
  name: string;
  category: "male" | "female" | "style" | "system";
  url: string;
}

// Helper to construct URL-encoded SVG data URIs
function makeSvgDataUri(svgContent: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent.trim())}`;
}

// 1. Chàng trai Năng động (Indigo)
const FLAT_GUY_INDIGO = makeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg_indigo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#4338CA"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#bg_indigo)"/>
  <!-- Body / Shirt -->
  <path d="M40 200 C40 152 70 142 100 142 C130 142 160 152 160 200 Z" fill="#1E1B4B"/>
  <path d="M85 142 L100 162 L115 142 Z" fill="#FBD5C3"/>
  <!-- Neck -->
  <rect x="88" y="118" width="24" height="28" rx="6" fill="#FBD5C3"/>
  <!-- Head -->
  <ellipse cx="100" cy="85" rx="34" ry="38" fill="#FBD5C3"/>
  <!-- Hair (Short modern) -->
  <path d="M64 78 C64 46 80 40 100 40 C120 40 136 46 136 78 C136 82 132 72 124 70 C110 66 90 66 76 70 C68 72 64 82 64 78 Z" fill="#2E1B10"/>
  <!-- Ears -->
  <circle cx="66" cy="86" r="7" fill="#F5C0A7"/>
  <circle cx="134" cy="86" r="7" fill="#F5C0A7"/>
  <!-- Eyes -->
  <circle cx="87" cy="84" r="3.5" fill="#2E1B10"/>
  <circle cx="113" cy="84" r="3.5" fill="#2E1B10"/>
  <!-- Eyebrows -->
  <rect x="80" y="75" width="14" height="2.5" rx="1.25" fill="#2E1B10" transform="rotate(-3 87 76)"/>
  <rect x="106" y="75" width="14" height="2.5" rx="1.25" fill="#2E1B10" transform="rotate(3 113 76)"/>
  <!-- Smile -->
  <path d="M92 98 Q100 105 108 98" stroke="#D0886B" stroke-width="2.5" stroke-linecap="round" fill="none"/>
</svg>
`);

// 2. Cô gái Thanh lịch (Rose)
const FLAT_GIRL_ROSE = makeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg_rose" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FB7185"/>
      <stop offset="100%" stop-color="#E11D48"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#bg_rose)"/>
  <!-- Long Hair Back -->
  <path d="M60 70 C60 40 140 40 140 70 L145 155 C145 165 130 168 125 145 L125 90 L75 90 L75 145 C70 168 55 165 55 155 Z" fill="#1C1917"/>
  <!-- Body / Dress -->
  <path d="M42 200 C42 152 70 142 100 142 C130 142 158 152 158 200 Z" fill="#FFE4E6"/>
  <path d="M82 142 Q100 160 118 142 Z" fill="#FCE7F3"/>
  <!-- Neck -->
  <rect x="89" y="118" width="22" height="26" rx="5" fill="#FDDFCE"/>
  <!-- Head -->
  <ellipse cx="100" cy="85" rx="32" ry="36" fill="#FDDFCE"/>
  <!-- Hair Front Bangs -->
  <path d="M66 75 C66 45 80 42 100 42 C120 42 134 45 134 75 C130 60 118 55 100 55 C82 55 70 60 66 75 Z" fill="#1C1917"/>
  <!-- Ears & Earrings -->
  <circle cx="68" cy="88" r="6" fill="#F9C9B4"/>
  <circle cx="132" cy="88" r="6" fill="#F9C9B4"/>
  <circle cx="68" cy="95" r="2.5" fill="#FBBF24"/>
  <circle cx="132" cy="95" r="2.5" fill="#FBBF24"/>
  <!-- Eyes & Lashes -->
  <circle cx="88" cy="85" r="3.5" fill="#1C1917"/>
  <circle cx="112" cy="85" r="3.5" fill="#1C1917"/>
  <path d="M84 81 Q88 78 92 81" stroke="#1C1917" stroke-width="1.8" fill="none"/>
  <path d="M108 81 Q112 78 116 81" stroke="#1C1917" stroke-width="1.8" fill="none"/>
  <!-- Blush -->
  <circle cx="81" cy="93" r="4.5" fill="#FDA4AF" opacity="0.6"/>
  <circle cx="119" cy="93" r="4.5" fill="#FDA4AF" opacity="0.6"/>
  <!-- Smile -->
  <path d="M93 99 Q100 106 107 99" stroke="#E11D48" stroke-width="2.5" stroke-linecap="round" fill="none"/>
</svg>
`);

// 3. Chàng trai Đeo kính (Emerald)
const FLAT_GUY_GLASSES = makeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg_emerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#bg_emerald)"/>
  <!-- Body / Sweater -->
  <path d="M40 200 C40 152 70 142 100 142 C130 142 160 152 160 200 Z" fill="#064E3B"/>
  <path d="M85 142 C85 152 115 152 115 142 Z" fill="#FBD5C3"/>
  <!-- Neck -->
  <rect x="88" y="118" width="24" height="28" rx="6" fill="#FBD5C3"/>
  <!-- Head -->
  <ellipse cx="100" cy="85" rx="33" ry="37" fill="#FBD5C3"/>
  <!-- Hair (Neat side part) -->
  <path d="M65 75 C65 42 85 38 102 38 C122 38 135 46 135 75 C135 78 128 64 105 64 C82 64 70 70 65 75 Z" fill="#3B2616"/>
  <!-- Ears -->
  <circle cx="67" cy="86" r="6.5" fill="#F5C0A7"/>
  <circle cx="133" cy="86" r="6.5" fill="#F5C0A7"/>
  <!-- Glasses (Round modern frames) -->
  <circle cx="85" cy="84" r="11" fill="none" stroke="#1E293B" stroke-width="2.5"/>
  <circle cx="115" cy="84" r="11" fill="none" stroke="#1E293B" stroke-width="2.5"/>
  <line x1="96" y1="84" x2="104" y2="84" stroke="#1E293B" stroke-width="2.5"/>
  <line x1="68" y1="83" x2="74" y2="83" stroke="#1E293B" stroke-width="2"/>
  <line x1="126" y1="83" x2="132" y2="83" stroke="#1E293B" stroke-width="2"/>
  <!-- Eyes inside glasses -->
  <circle cx="85" cy="84" r="3" fill="#1E293B"/>
  <circle cx="115" cy="84" r="3" fill="#1E293B"/>
  <!-- Smile -->
  <path d="M93 100 Q100 106 107 100" stroke="#C27A5D" stroke-width="2.5" stroke-linecap="round" fill="none"/>
</svg>
`);

// 4. Nữ sinh Buộc tóc Ponytail (Amber)
const FLAT_GIRL_PONYTAIL = makeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg_amber" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBBF24"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#bg_amber)"/>
  <!-- Ponytail side tail -->
  <path d="M125 55 C150 40 165 75 155 110 C150 120 140 115 142 100 C145 80 135 65 125 55 Z" fill="#451A03"/>
  <circle cx="127" cy="55" r="5" fill="#EF4444"/>
  <!-- Body -->
  <path d="M42 200 C42 152 70 142 100 142 C130 142 158 152 158 200 Z" fill="#78350F"/>
  <path d="M85 142 L100 158 L115 142 Z" fill="#FDDFCE"/>
  <!-- Neck -->
  <rect x="89" y="118" width="22" height="26" rx="5" fill="#FDDFCE"/>
  <!-- Head -->
  <ellipse cx="100" cy="85" rx="32" ry="36" fill="#FDDFCE"/>
  <!-- Hair Front -->
  <path d="M68 76 C68 46 82 40 102 40 C122 40 134 48 134 76 C134 76 122 56 102 56 C82 56 68 76 68 76 Z" fill="#451A03"/>
  <!-- Ears -->
  <circle cx="68" cy="88" r="6" fill="#F9C9B4"/>
  <!-- Eyes -->
  <circle cx="87" cy="85" r="3.5" fill="#451A03"/>
  <circle cx="113" cy="85" r="3.5" fill="#451A03"/>
  <!-- Smile -->
  <path d="M92 98 Q100 106 108 98" stroke="#D97706" stroke-width="2.5" stroke-linecap="round" fill="none"/>
</svg>
`);

// 5. Gamer Đeo tai nghe (Violet)
const FLAT_GAMER_VIOLET = makeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg_violet" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A78BFA"/>
      <stop offset="100%" stop-color="#6D28D9"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#bg_violet)"/>
  <!-- Body / Hoodie -->
  <path d="M40 200 C40 150 68 140 100 140 C132 140 160 150 160 200 Z" fill="#2E1065"/>
  <path d="M78 140 C78 165 122 165 122 140 Z" fill="#4C1D95"/>
  <!-- Neck -->
  <rect x="88" y="118" width="24" height="26" rx="6" fill="#FBD5C3"/>
  <!-- Head -->
  <ellipse cx="100" cy="85" rx="33" ry="37" fill="#FBD5C3"/>
  <!-- Hair (Cool spiky) -->
  <path d="M66 72 C66 42 82 36 100 36 C118 36 134 42 134 72 C125 58 112 55 100 55 C88 55 75 58 66 72 Z" fill="#0F172A"/>
  <!-- Headphones Headband -->
  <path d="M62 85 C60 40 140 40 138 85" stroke="#1E1B4B" stroke-width="6" fill="none" stroke-linecap="round"/>
  <!-- Headphone Earcups -->
  <rect x="58" y="73" width="12" height="26" rx="6" fill="#A855F7" stroke="#1E1B4B" stroke-width="2"/>
  <rect x="130" y="73" width="12" height="26" rx="6" fill="#A855F7" stroke="#1E1B4B" stroke-width="2"/>
  <!-- Eyes -->
  <circle cx="87" cy="84" r="3.5" fill="#0F172A"/>
  <circle cx="113" cy="84" r="3.5" fill="#0F172A"/>
  <!-- Smile -->
  <path d="M92 98 Q100 105 108 98" stroke="#7C3AED" stroke-width="2.5" stroke-linecap="round" fill="none"/>
</svg>
`);

// 6. Cô gái Tóc ngắn Bob (Cyan)
const FLAT_GIRL_CYAN = makeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg_cyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22D3EE"/>
      <stop offset="100%" stop-color="#0891B2"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#bg_cyan)"/>
  <!-- Bob Hair Behind -->
  <path d="M60 65 C60 35 140 35 140 65 L144 110 C144 122 135 125 125 115 L125 90 L75 90 L75 115 C65 125 56 122 56 110 Z" fill="#312E81"/>
  <!-- Body -->
  <path d="M42 200 C42 152 70 142 100 142 C130 142 158 152 158 200 Z" fill="#164E63"/>
  <path d="M85 142 L100 160 L115 142 Z" fill="#FDDFCE"/>
  <!-- Neck -->
  <rect x="89" y="118" width="22" height="26" rx="5" fill="#FDDFCE"/>
  <!-- Head -->
  <ellipse cx="100" cy="85" rx="32" ry="36" fill="#FDDFCE"/>
  <!-- Front Bangs -->
  <path d="M64 70 C64 45 80 40 100 40 C120 40 136 45 136 70 C130 55 115 52 100 52 C85 52 70 55 64 70 Z" fill="#312E81"/>
  <!-- Eyes -->
  <circle cx="87" cy="85" r="3.5" fill="#1E1B4B"/>
  <circle cx="113" cy="85" r="3.5" fill="#1E1B4B"/>
  <!-- Blush -->
  <circle cx="80" cy="93" r="4.5" fill="#F472B6" opacity="0.5"/>
  <circle cx="120" cy="93" r="4.5" fill="#F472B6" opacity="0.5"/>
  <!-- Smile -->
  <path d="M93 99 Q100 106 107 99" stroke="#0891B2" stroke-width="2.5" stroke-linecap="round" fill="none"/>
</svg>
`);

// 7. Quý ông Công sở / Vest (Slate)
const FLAT_GUY_SUIT = makeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg_slate" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#64748B"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#bg_slate)"/>
  <!-- Body / Suit -->
  <path d="M40 200 C40 152 70 142 100 142 C130 142 160 152 160 200 Z" fill="#0F172A"/>
  <!-- White Shirt V -->
  <polygon points="100,142 84,142 92,185 108,185 116,142" fill="#F8FAFC"/>
  <!-- Tie -->
  <polygon points="100,146 104,152 100,185 96,152" fill="#DC2626"/>
  <!-- Neck -->
  <rect x="88" y="118" width="24" height="28" rx="6" fill="#FBD5C3"/>
  <!-- Head -->
  <ellipse cx="100" cy="85" rx="33" ry="37" fill="#FBD5C3"/>
  <!-- Slicked Hair -->
  <path d="M66 75 C66 42 85 36 102 36 C124 36 135 44 135 75 C130 62 110 58 98 58 C84 58 72 62 66 75 Z" fill="#18181B"/>
  <!-- Ears -->
  <circle cx="67" cy="86" r="6.5" fill="#F5C0A7"/>
  <circle cx="133" cy="86" r="6.5" fill="#F5C0A7"/>
  <!-- Eyes -->
  <circle cx="87" cy="84" r="3.5" fill="#18181B"/>
  <circle cx="113" cy="84" r="3.5" fill="#18181B"/>
  <!-- Smile -->
  <path d="M93 100 Q100 106 107 100" stroke="#B45309" stroke-width="2.5" stroke-linecap="round" fill="none"/>
</svg>
`);

// 8. Chàng trai Mũ len Beanie (Orange)
const FLAT_GUY_BEANIE = makeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg_orange" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FB923C"/>
      <stop offset="100%" stop-color="#EA580C"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#bg_orange)"/>
  <!-- Body / Street Hoodie -->
  <path d="M40 200 C40 152 70 142 100 142 C130 142 160 152 160 200 Z" fill="#431407"/>
  <path d="M85 142 L100 160 L115 142 Z" fill="#FBD5C3"/>
  <!-- Neck -->
  <rect x="88" y="118" width="24" height="28" rx="6" fill="#FBD5C3"/>
  <!-- Head -->
  <ellipse cx="100" cy="88" rx="33" ry="36" fill="#FBD5C3"/>
  <!-- Beanie Hat -->
  <path d="M64 78 C64 42 80 34 100 34 C120 34 136 42 136 78 Z" fill="#1E293B"/>
  <rect x="62" y="70" width="76" height="14" rx="5" fill="#334155"/>
  <!-- Ears -->
  <circle cx="67" cy="90" r="6.5" fill="#F5C0A7"/>
  <circle cx="133" cy="90" r="6.5" fill="#F5C0A7"/>
  <!-- Eyes -->
  <circle cx="87" cy="88" r="3.5" fill="#1E293B"/>
  <circle cx="113" cy="88" r="3.5" fill="#1E293B"/>
  <!-- Smile -->
  <path d="M92 102 Q100 108 108 102" stroke="#EA580C" stroke-width="2.5" stroke-linecap="round" fill="none"/>
</svg>
`);

// 9. Cô gái Tóc xoăn (Fuchsia)
const FLAT_GIRL_CURLY = makeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg_fuchsia" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E879F9"/>
      <stop offset="100%" stop-color="#C026D3"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#bg_fuchsia)"/>
  <!-- Curly Hair Behind -->
  <circle cx="65" cy="70" r="22" fill="#3B0764"/>
  <circle cx="135" cy="70" r="22" fill="#3B0764"/>
  <circle cx="60" cy="100" r="20" fill="#3B0764"/>
  <circle cx="140" cy="100" r="20" fill="#3B0764"/>
  <circle cx="100" cy="50" r="26" fill="#3B0764"/>
  <!-- Body -->
  <path d="M42 200 C42 152 70 142 100 142 C130 142 158 152 158 200 Z" fill="#701A75"/>
  <path d="M85 142 L100 160 L115 142 Z" fill="#FDDFCE"/>
  <!-- Neck -->
  <rect x="89" y="118" width="22" height="26" rx="5" fill="#FDDFCE"/>
  <!-- Head -->
  <ellipse cx="100" cy="85" rx="32" ry="36" fill="#FDDFCE"/>
  <!-- Eyes -->
  <circle cx="87" cy="85" r="3.5" fill="#3B0764"/>
  <circle cx="113" cy="85" r="3.5" fill="#3B0764"/>
  <!-- Blush -->
  <circle cx="80" cy="93" r="4.5" fill="#F472B6" opacity="0.5"/>
  <circle cx="120" cy="93" r="4.5" fill="#F472B6" opacity="0.5"/>
  <!-- Smile -->
  <path d="M93 99 Q100 106 107 99" stroke="#C026D3" stroke-width="2.5" stroke-linecap="round" fill="none"/>
</svg>
`);

// 10. Chàng trai Thư thái / Chill Blue (Blue)
const FLAT_GUY_BLUE = makeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg_blue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60A5FA"/>
      <stop offset="100%" stop-color="#2563EB"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#bg_blue)"/>
  <!-- Body -->
  <path d="M40 200 C40 152 70 142 100 142 C130 142 160 152 160 200 Z" fill="#172554"/>
  <path d="M85 142 L100 160 L115 142 Z" fill="#FBD5C3"/>
  <!-- Neck -->
  <rect x="88" y="118" width="24" height="28" rx="6" fill="#FBD5C3"/>
  <!-- Head -->
  <ellipse cx="100" cy="85" rx="33" ry="37" fill="#FBD5C3"/>
  <!-- Hair (Messy top) -->
  <path d="M65 75 C65 42 80 38 100 38 C120 38 135 44 135 75 C128 62 115 58 100 58 C85 58 72 62 65 75 Z" fill="#422006"/>
  <!-- Ears -->
  <circle cx="67" cy="86" r="6.5" fill="#F5C0A7"/>
  <circle cx="133" cy="86" r="6.5" fill="#F5C0A7"/>
  <!-- Eyes -->
  <circle cx="87" cy="84" r="3.5" fill="#422006"/>
  <circle cx="113" cy="84" r="3.5" fill="#422006"/>
  <!-- Smile -->
  <path d="M92 98 Q100 105 108 98" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round" fill="none"/>
</svg>
`);

// 11. Người dùng Hệ thống Xanh Dương (Minimalist System Default Blue)
const FLAT_SYSTEM_BLUE = makeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg_sys_blue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#bg_sys_blue)"/>
  <!-- Minimalist Flat Silhouette -->
  <circle cx="100" cy="80" r="36" fill="#FFFFFF" opacity="0.95"/>
  <path d="M38 190 C38 145 68 135 100 135 C132 135 162 145 162 190 Z" fill="#FFFFFF" opacity="0.95"/>
</svg>
`);

// 12. Người dùng Hệ thống Tối giản Than chì (Graphite Dark Minimal)
const FLAT_SYSTEM_DARK = makeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg_sys_dark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#27272A"/>
      <stop offset="100%" stop-color="#18181B"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#bg_sys_dark)"/>
  <circle cx="100" cy="100" r="92" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.12"/>
  <!-- Minimalist Flat Silhouette -->
  <circle cx="100" cy="80" r="36" fill="#A1A1AA"/>
  <path d="M38 190 C38 145 68 135 100 135 C132 135 162 145 162 190 Z" fill="#A1A1AA"/>
</svg>
`);

export const PRESET_AVATARS: PresetAvatar[] = [
  // Flat Human Characters
  { id: "flat_guy_indigo", name: "Chàng trai Indigo", category: "male", url: FLAT_GUY_INDIGO },
  { id: "flat_girl_rose", name: "Cô gái Rose", category: "female", url: FLAT_GIRL_ROSE },
  { id: "flat_guy_glasses", name: "Thư sinh Đeo kính", category: "male", url: FLAT_GUY_GLASSES },
  { id: "flat_girl_ponytail", name: "Nữ sinh Năng động", category: "female", url: FLAT_GIRL_PONYTAIL },
  { id: "flat_gamer_violet", name: "Gamer Tai nghe", category: "style", url: FLAT_GAMER_VIOLET },
  { id: "flat_girl_cyan", name: "Cô gái Tóc ngắn", category: "female", url: FLAT_GIRL_CYAN },
  { id: "flat_guy_suit", name: "Quý ông Công sở", category: "male", url: FLAT_GUY_SUIT },
  { id: "flat_guy_beanie", name: "Chàng trai Mũ len", category: "style", url: FLAT_GUY_BEANIE },
  { id: "flat_girl_curly", name: "Cô gái Tóc xoăn", category: "female", url: FLAT_GIRL_CURLY },
  { id: "flat_guy_blue", name: "Chàng trai Hoodie", category: "male", url: FLAT_GUY_BLUE },

  // System Minimalist Silhouettes
  { id: "flat_system_blue", name: "Hệ thống Tiêu chuẩn", category: "system", url: FLAT_SYSTEM_BLUE },
  { id: "flat_system_dark", name: "Hệ thống Tối giản", category: "system", url: FLAT_SYSTEM_DARK },
];
