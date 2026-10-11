import { LEGACY_PRESET_AVATARS } from "./legacy-default-avatars";
import { decorativeAssetUrl } from "./decorative-asset-cdn";

export interface PresetAvatar {
  id: string;
  name: string;
  category:
    | "male"
    | "female"
    | "style"
    | "character"
    | "animal"
    | "robot"
    | "cosmic"
    | "system"
    | "mascot";
  url: string;
  /** CDN preview only; `url` remains local so saved profiles never depend on it. */
  previewUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────
// DiceBear v9 NFT-style avatar collection (OKX inspired)
// Pixel Art (CryptoPunks-like) + Adventurer (BAYC-like) + Illustrated
// ─────────────────────────────────────────────────────────────────────

const NFT_PUNK_01 = "https://api.dicebear.com/9.x/pixel-art/svg?seed=punk_neon_blue_42&backgroundColor=0a0f2e&backgroundType=solid&radius=50&size=200";
const NFT_PUNK_02 = "https://api.dicebear.com/9.x/pixel-art/svg?seed=gold_punk_miami_88&backgroundColor=1a0e00&backgroundType=solid&radius=50&size=200";
const NFT_PUNK_03 = "https://api.dicebear.com/9.x/pixel-art/svg?seed=red_mohawk_punk_77&backgroundColor=1a0000&backgroundType=solid&radius=50&size=200";
const NFT_PUNK_04 = "https://api.dicebear.com/9.x/pixel-art/svg?seed=zombie_punk_green_09&backgroundColor=041a04&backgroundType=solid&radius=50&size=200";
const NFT_PUNK_05 = "https://api.dicebear.com/9.x/pixel-art/svg?seed=alien_beanie_rare_01&backgroundColor=001a14&backgroundType=solid&radius=50&size=200";
const NFT_PUNK_06 = "https://api.dicebear.com/9.x/pixel-art/svg?seed=ape_punk_sunglasses_55&backgroundColor=0d0500&backgroundType=solid&radius=50&size=200";
const NFT_APE_01 = "https://api.dicebear.com/9.x/adventurer/svg?seed=bayc_ape_laser_eyes_01&backgroundColor=130a00&backgroundType=solid&radius=50&size=200";
const NFT_APE_02 = "https://api.dicebear.com/9.x/adventurer/svg?seed=bayc_ape_sailor_hat_02&backgroundColor=001519&backgroundType=solid&radius=50&size=200";
const NFT_APE_03 = "https://api.dicebear.com/9.x/adventurer/svg?seed=bayc_ape_cowboy_hat_03&backgroundColor=140a00&backgroundType=solid&radius=50&size=200";
const NFT_APE_04 = "https://api.dicebear.com/9.x/adventurer/svg?seed=bayc_ape_mohawk_pink_04&backgroundColor=190010&backgroundType=solid&radius=50&size=200";
const NFT_APE_05 = "https://api.dicebear.com/9.x/adventurer/svg?seed=bayc_ape_rainbow_fur_05&backgroundColor=001a0f&backgroundType=solid&radius=50&size=200";
const NFT_APE_06 = "https://api.dicebear.com/9.x/adventurer/svg?seed=bayc_ape_on_fire_666&backgroundColor=160400&backgroundType=solid&radius=50&size=200";
const NFT_APE_07 = "https://api.dicebear.com/9.x/adventurer/svg?seed=bayc_diamond_hands_77&backgroundColor=00100d&backgroundType=solid&radius=50&size=200";
const NFT_CHAR_01 = "https://api.dicebear.com/9.x/notionists/svg?seed=notion_nft_portrait_01&backgroundColor=0d0d0d&backgroundType=solid&radius=50&size=200";
const NFT_CHAR_02 = "https://api.dicebear.com/9.x/notionists/svg?seed=notion_nft_portrait_02&backgroundColor=0a001a&backgroundType=solid&radius=50&size=200";
const NFT_CHAR_03 = "https://api.dicebear.com/9.x/notionists/svg?seed=notion_nft_portrait_03&backgroundColor=001a14&backgroundType=solid&radius=50&size=200";
const NFT_FACE_01 = "https://api.dicebear.com/9.x/lorelei/svg?seed=lorelei_nft_face_07&backgroundColor=0f0520&backgroundType=solid&radius=50&size=200";
const NFT_FACE_02 = "https://api.dicebear.com/9.x/lorelei/svg?seed=lorelei_nft_face_12&backgroundColor=001214&backgroundType=solid&radius=50&size=200";
const NFT_PEEP_01 = "https://api.dicebear.com/9.x/open-peeps/svg?seed=openpeep_nft_style_01&backgroundColor=0a0a0a&backgroundType=solid&radius=50&size=200";
const NFT_PEEP_02 = "https://api.dicebear.com/9.x/open-peeps/svg?seed=openpeep_nft_style_02&backgroundColor=190005&backgroundType=solid&radius=50&size=200";

// Original FlexPhim collectible avatars. These are local assets so the picker
// keeps working even when a third-party avatar service is unavailable.
const COLLECTIBLE_ROBOT = "/avatars/collectibles/orbit-robot.webp";
const COLLECTIBLE_CAT = "/avatars/collectibles/neon-cat.webp";
const COLLECTIBLE_OWL = "/avatars/collectibles/violet-owl.webp";
const COLLECTIBLE_WANDERER = "/avatars/collectibles/noir-wanderer.webp";
const COLLECTIBLE_ECLIPSE = "/avatars/collectibles/eclipse-orb.webp";
const COLLECTIBLE_APE = "/avatars/collectibles/cinema-ape.webp";

// ─────────────────────────────────────────────────────────────────────
// 3D Cinema Mascots Collection (FlexPhim 3D Universe)
// ─────────────────────────────────────────────────────────────────────
export const CINEMA_POPCORN_AVATAR: PresetAvatar = {
  id: "mascot_cinema_popcorn",
  name: "Popcorn 3D 🍿",
  category: "mascot",
  url: "/avatars/mascots/cinema-popcorn.jpg",
  previewUrl: decorativeAssetUrl("/avatars/mascots/cinema-popcorn.jpg"),
};

export const SPACE_CAT_AVATAR: PresetAvatar = {
  id: "mascot_space_cat",
  name: "Mèo Vũ Trụ 🚀",
  category: "mascot",
  url: "/avatars/mascots/space-cat.jpg",
  previewUrl: decorativeAssetUrl("/avatars/mascots/space-cat.jpg"),
};

export const CYBER_SHIBA_AVATAR: PresetAvatar = {
  id: "mascot_cyber_shiba",
  name: "Shiba Cyberpunk 🎧",
  category: "mascot",
  url: "/avatars/mascots/cyber-shiba.jpg",
  previewUrl: decorativeAssetUrl("/avatars/mascots/cyber-shiba.jpg"),
};

export const BOBA_PANDA_AVATAR: PresetAvatar = {
  id: "mascot_boba_panda",
  name: "Gấu Trúc Cinema 🧋",
  category: "mascot",
  url: "/avatars/mascots/boba-panda.jpg",
  previewUrl: decorativeAssetUrl("/avatars/mascots/boba-panda.jpg"),
};

export const MECHA_DRAGON_AVATAR: PresetAvatar = {
  id: "mascot_mecha_dragon",
  name: "Rồng Pha Lê 🐉",
  category: "mascot",
  url: "/avatars/mascots/mecha-dragon.jpg",
  previewUrl: decorativeAssetUrl("/avatars/mascots/mecha-dragon.jpg"),
};

export const CYBER_BUNNY_AVATAR: PresetAvatar = {
  id: "mascot_cyber_bunny",
  name: "Thỏ Neon 🐰",
  category: "mascot",
  url: "/avatars/mascots/cyber-bunny.jpg",
  previewUrl: decorativeAssetUrl("/avatars/mascots/cyber-bunny.jpg"),
};

// ─────────────────────────────────────────────────────────────────────
// Bottts Futuristic Mascot Robots (DiceBear)
// ─────────────────────────────────────────────────────────────────────
const BOT_CYBER_01 = "https://api.dicebear.com/9.x/bottts/svg?seed=flex_cyber_bot_01&backgroundColor=0a0f2e&backgroundType=solid&radius=50&size=200";
const BOT_NEON_02 = "https://api.dicebear.com/9.x/bottts/svg?seed=flex_neon_droid_02&backgroundColor=1a0026&backgroundType=solid&radius=50&size=200";
const BOT_GOLD_03 = "https://api.dicebear.com/9.x/bottts/svg?seed=flex_gold_mecha_03&backgroundColor=1f1400&backgroundType=solid&radius=50&size=200";
const BOT_EMERALD_04 = "https://api.dicebear.com/9.x/bottts/svg?seed=flex_emerald_spark_04&backgroundColor=021a0f&backgroundType=solid&radius=50&size=200";
const BOT_CRIMSON_05 = "https://api.dicebear.com/9.x/bottts/svg?seed=flex_crimson_unit_05&backgroundColor=1f0005&backgroundType=solid&radius=50&size=200";
const BOT_COSMO_06 = "https://api.dicebear.com/9.x/bottts/svg?seed=flex_cosmo_scout_06&backgroundColor=001824&backgroundType=solid&radius=50&size=200";

export const ADMIN_RISO_FOX_AVATAR: PresetAvatar = {
  id: "admin_riso_fox",
  name: "Mascot Riso Cáo (Admin)",
  category: "system",
  url: "/avatars/admin-mascot-riso.png",
  previewUrl: decorativeAssetUrl("/avatars/admin-mascot-riso.png"),
};

export const PRESET_AVATARS: PresetAvatar[] = [
  ADMIN_RISO_FOX_AVATAR,
  CINEMA_POPCORN_AVATAR,
  SPACE_CAT_AVATAR,
  CYBER_SHIBA_AVATAR,
  BOBA_PANDA_AVATAR,
  MECHA_DRAGON_AVATAR,
  CYBER_BUNNY_AVATAR,
  { id: "mascot_bot_01", name: "Cyber Bot 🤖", category: "robot", url: BOT_CYBER_01 },
  { id: "mascot_bot_02", name: "Neon Droid ⚡", category: "robot", url: BOT_NEON_02 },
  { id: "mascot_bot_03", name: "Gold Mecha 👑", category: "robot", url: BOT_GOLD_03 },
  { id: "mascot_bot_04", name: "Emerald Bot 💎", category: "robot", url: BOT_EMERALD_04 },
  { id: "mascot_bot_05", name: "Crimson Unit 🔥", category: "robot", url: BOT_CRIMSON_05 },
  { id: "mascot_bot_06", name: "Cosmo Scout 🌌", category: "robot", url: BOT_COSMO_06 },
  ...LEGACY_PRESET_AVATARS,
  { id: "nft_punk_01", name: "Punk Xanh #01", category: "character", url: NFT_PUNK_01 },
  { id: "nft_punk_02", name: "Punk Vàng #02", category: "character", url: NFT_PUNK_02 },
  { id: "nft_punk_03", name: "Punk Đỏ #03", category: "character", url: NFT_PUNK_03 },
  { id: "nft_punk_04", name: "Punk Zombie #04", category: "character", url: NFT_PUNK_04 },
  { id: "nft_punk_05", name: "Punk Alien #05", category: "character", url: NFT_PUNK_05 },
  { id: "nft_punk_06", name: "Punk Ape #06", category: "character", url: NFT_PUNK_06 },
  { id: "nft_ape_01", name: "Ape #01 🎩", category: "animal", url: NFT_APE_01 },
  { id: "nft_ape_02", name: "Ape #02 🕶️", category: "animal", url: NFT_APE_02 },
  { id: "nft_ape_03", name: "Ape #03 🤠", category: "animal", url: NFT_APE_03 },
  { id: "nft_ape_04", name: "Ape #04 🎸", category: "animal", url: NFT_APE_04 },
  { id: "nft_ape_05", name: "Ape #05 🌈", category: "animal", url: NFT_APE_05 },
  { id: "nft_ape_06", name: "Ape #06 🔥", category: "animal", url: NFT_APE_06 },
  { id: "nft_ape_07", name: "Ape #07 💎", category: "animal", url: NFT_APE_07 },
  { id: "nft_char_01", name: "NFT #01", category: "character", url: NFT_CHAR_01 },
  { id: "nft_char_02", name: "NFT #02", category: "character", url: NFT_CHAR_02 },
  { id: "nft_char_03", name: "NFT #03", category: "character", url: NFT_CHAR_03 },
  { id: "nft_face_01", name: "Portrait #01", category: "character", url: NFT_FACE_01 },
  { id: "nft_face_02", name: "Portrait #02", category: "character", url: NFT_FACE_02 },
  { id: "nft_peep_01", name: "Character #01", category: "character", url: NFT_PEEP_01 },
  { id: "nft_peep_02", name: "Character #02", category: "character", url: NFT_PEEP_02 },
  { id: "collectible_robot", name: "Orbit Robot", category: "robot", url: COLLECTIBLE_ROBOT, previewUrl: decorativeAssetUrl(COLLECTIBLE_ROBOT) },
  { id: "collectible_cat", name: "Neon Cat", category: "animal", url: COLLECTIBLE_CAT, previewUrl: decorativeAssetUrl(COLLECTIBLE_CAT) },
  { id: "collectible_owl", name: "Violet Owl", category: "animal", url: COLLECTIBLE_OWL, previewUrl: decorativeAssetUrl(COLLECTIBLE_OWL) },
  { id: "collectible_wanderer", name: "Noir Wanderer", category: "character", url: COLLECTIBLE_WANDERER, previewUrl: decorativeAssetUrl(COLLECTIBLE_WANDERER) },
  { id: "collectible_eclipse", name: "Eclipse", category: "cosmic", url: COLLECTIBLE_ECLIPSE, previewUrl: decorativeAssetUrl(COLLECTIBLE_ECLIPSE) },
  { id: "collectible_ape", name: "Cinema Ape", category: "animal", url: COLLECTIBLE_APE, previewUrl: decorativeAssetUrl(COLLECTIBLE_APE) },
];

