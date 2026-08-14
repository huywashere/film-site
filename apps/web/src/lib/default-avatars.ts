export interface PresetAvatar {
  id: string;
  name: string;
  category: "crypto" | "cats" | "cinema" | "cyber";
  url: string;
}

// Binance Style Golden Diamond Avatar (High-Resolution SVG)
const BINANCE_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e2329"/>
      <stop offset="100%" stop-color="#0b0e11"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD535"/>
      <stop offset="100%" stop-color="#F0B90B"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#bg)"/>
  <circle cx="100" cy="100" r="92" fill="none" stroke="url(#gold)" stroke-width="3" opacity="0.4"/>
  <g transform="translate(100,100) scale(1.4)" filter="url(#glow)">
    <path fill="url(#gold)" d="M0-35 L12-23 L0-11 L-12-23 Z"/>
    <path fill="url(#gold)" d="M-23-12 L-11 0 L-23 12 L-35 0 Z"/>
    <path fill="url(#gold)" d="M23-12 L35 0 L23 12 L11 0 Z"/>
    <path fill="url(#gold)" d="M0 11 L12 23 L0 35 L-12 23 Z"/>
    <path fill="url(#gold)" d="M0-8 L8 0 L0 8 L-8 0 Z"/>
  </g>
</svg>
`)}`;

// OKX Style Matrix Block Avatar (High-Resolution SVG)
const OKX_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="okxbg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#141416"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>
    <linearGradient id="neon" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00FF66"/>
      <stop offset="100%" stop-color="#00E0FF"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#okxbg)"/>
  <circle cx="100" cy="100" r="92" fill="none" stroke="url(#neon)" stroke-width="2.5" opacity="0.5"/>
  <g transform="translate(48,48) scale(1.05)">
    <!-- OKX 3x3 signature matrix -->
    <rect x="0" y="0" width="28" height="28" rx="6" fill="#FFFFFF"/>
    <rect x="72" y="0" width="28" height="28" rx="6" fill="#FFFFFF"/>
    <rect x="36" y="36" width="28" height="28" rx="6" fill="url(#neon)"/>
    <rect x="0" y="72" width="28" height="28" rx="6" fill="#FFFFFF"/>
    <rect x="72" y="72" width="28" height="28" rx="6" fill="#FFFFFF"/>
  </g>
</svg>
`)}`;

// Bitcoin Gold VIP Avatar
const BITCOIN_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="btcbg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#2a1805"/>
      <stop offset="100%" stop-color="#0d0802"/>
    </radialGradient>
    <linearGradient id="btcgold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFA800"/>
      <stop offset="100%" stop-color="#F7931A"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#btcbg)"/>
  <circle cx="100" cy="100" r="80" fill="url(#btcgold)"/>
  <circle cx="100" cy="100" r="72" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.3"/>
  <text x="100" y="132" font-family="Arial, Helvetica, sans-serif" font-size="95" font-weight="900" fill="#FFFFFF" text-anchor="middle">₿</text>
</svg>
`)}`;

// Ethereum Crystal Avatar
const ETHEREUM_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="ethbg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1a1c30"/>
      <stop offset="100%" stop-color="#0b0c16"/>
    </radialGradient>
    <linearGradient id="ethgrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A3B8FF"/>
      <stop offset="100%" stop-color="#627EEA"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#ethbg)"/>
  <circle cx="100" cy="100" r="92" fill="none" stroke="#627EEA" stroke-width="2" opacity="0.4"/>
  <g transform="translate(100,100) scale(1.1)">
    <polygon points="0,-60 40,-5 0,16" fill="#8A92B2" opacity="0.8"/>
    <polygon points="0,-60 -40,-5 0,16" fill="#A3B8FF"/>
    <polygon points="0,23 40,3 0,60" fill="#8A92B2" opacity="0.8"/>
    <polygon points="0,23 -40,3 0,60" fill="#A3B8FF"/>
    <polygon points="0,16 40,-5 0,-25" fill="#627EEA" opacity="0.9"/>
    <polygon points="0,16 -40,-5 0,-25" fill="#C4D1FF"/>
  </g>
</svg>
`)}`;

// Solana Aurora Neon Avatar
const SOLANA_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="solbg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#170d24"/>
      <stop offset="100%" stop-color="#08030e"/>
    </radialGradient>
    <linearGradient id="solgrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9945FF"/>
      <stop offset="50%" stop-color="#14F195"/>
      <stop offset="100%" stop-color="#00FFA3"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#solbg)"/>
  <circle cx="100" cy="100" r="92" fill="none" stroke="url(#solgrad)" stroke-width="2.5" opacity="0.5"/>
  <g transform="translate(45,55)">
    <path fill="url(#solgrad)" d="M100 0 L10 0 L0 18 L90 18 Z"/>
    <path fill="url(#solgrad)" d="M0 36 L90 36 L100 54 L10 54 Z"/>
    <path fill="url(#solgrad)" d="M100 72 L10 72 L0 90 L90 90 Z"/>
  </g>
</svg>
`)}`;

// Cinema 3D Popcorn VIP Avatar
const POPCORN_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="popbg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#2d1537"/>
      <stop offset="100%" stop-color="#110517"/>
    </radialGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#popbg)"/>
  <circle cx="100" cy="100" r="92" fill="none" stroke="#e50914" stroke-width="2" opacity="0.4"/>
  <text x="100" y="130" font-size="80" text-anchor="middle">🍿</text>
</svg>
`)}`;

// Royal VIP Gold Crown Avatar
const CROWN_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="crownbg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#2b2006"/>
      <stop offset="100%" stop-color="#0d0a02"/>
    </radialGradient>
    <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFE259"/>
      <stop offset="100%" stop-color="#FFA751"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#crownbg)"/>
  <circle cx="100" cy="100" r="92" fill="none" stroke="url(#crownGrad)" stroke-width="3" opacity="0.6"/>
  <g transform="translate(100,105) scale(1.3)">
    <path fill="url(#crownGrad)" d="M-35 15 L35 15 L40 -20 L15 -5 L0 -35 L-15 -5 L-40 -20 Z"/>
    <circle cx="-40" cy="-22" r="4" fill="#FFFFFF"/>
    <circle cx="0" cy="-37" r="4.5" fill="#FFFFFF"/>
    <circle cx="40" cy="-22" r="4" fill="#FFFFFF"/>
    <circle cx="-18" cy="8" r="3" fill="#e50914"/>
    <circle cx="0" cy="8" r="3" fill="#3b82f6"/>
    <circle cx="18" cy="8" r="3" fill="#10b981"/>
  </g>
</svg>
`)}`;

// Cyberpunk Neon Samurai Avatar
const CYBERPUNK_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="cybbg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0f2027"/>
      <stop offset="50%" stop-color="#203a43"/>
      <stop offset="100%" stop-color="#2c5364"/>
    </radialGradient>
    <linearGradient id="cybgrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF007A"/>
      <stop offset="100%" stop-color="#00F0FF"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#cybbg)"/>
  <circle cx="100" cy="100" r="92" fill="none" stroke="url(#cybgrad)" stroke-width="3"/>
  <g transform="translate(100,100)">
    <!-- Helmet / Visor -->
    <path d="M-40 -20 C-40 -50, 40 -50, 40 -20 L35 30 L0 45 L-35 30 Z" fill="#12161A" stroke="url(#cybgrad)" stroke-width="3"/>
    <!-- Glowing Visor -->
    <path d="M-30 -5 L30 -5 L25 15 L-25 15 Z" fill="url(#cybgrad)"/>
    <line x1="-35" y1="22" x2="35" y2="22" stroke="#00F0FF" stroke-width="2"/>
  </g>
</svg>
`)}`;

export const PRESET_AVATARS: PresetAvatar[] = [
  // Crypto & Web3 Style
  { id: "binance", name: "Binance VIP", category: "crypto", url: BINANCE_AVATAR },
  { id: "okx", name: "OKX Matrix", category: "crypto", url: OKX_AVATAR },
  { id: "bitcoin", name: "Bitcoin Gold", category: "crypto", url: BITCOIN_AVATAR },
  { id: "ethereum", name: "Ethereum Crystal", category: "crypto", url: ETHEREUM_AVATAR },
  { id: "solana", name: "Solana Neon", category: "crypto", url: SOLANA_AVATAR },

  // Cat Mascots
  { id: "cat1", name: "Mèo NetPhim 1", category: "cats", url: "/images/cat1.gif" },
  { id: "cat2", name: "Mèo NetPhim 2", category: "cats", url: "/images/cat2.gif" },
  { id: "cat3", name: "Mèo NetPhim 3", category: "cats", url: "/images/cat3.gif" },
  { id: "cat4", name: "Mèo NetPhim 4", category: "cats", url: "/images/cat4.gif" },

  // Cinema & Special
  { id: "crown", name: "VIP Hoàng Gia", category: "cinema", url: CROWN_AVATAR },
  { id: "popcorn", name: "Bỏng Ngô 3D", category: "cinema", url: POPCORN_AVATAR },
  { id: "cyber", name: "Cyber Samurai", category: "cyber", url: CYBERPUNK_AVATAR },
];
