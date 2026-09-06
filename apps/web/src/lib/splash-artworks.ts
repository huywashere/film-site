/**
 * Curated Pool of High-Quality, Resilient Posters for Splash & Intro Screen
 * Spanning Hollywood Blockbusters, Anime Masterpieces, and Asian Cinema Hits.
 * Uses Cloudflare-accelerated wsrv.nl CDN with direct TMDB fallback for 0ms edge delivery in VN.
 */

export const SPLASH_POSTER_FILENAMES = [
  "8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg", // Oppenheimer
  "ji3ecJphATlVgWNY0B0RVXZizdf.jpg", // The Revenant
  "kW9LmvYHAaS9iA0tHmZVq8hQYoq.jpg", // The Wolf of Wall Street
  "8j58iEBw9pOXFD2L0nt0ZXeHviB.jpg", // Once Upon a Time in Hollywood
  "mbm8k3GFhXS0ROd9AD1gqYbIFbM.jpg", // The Irishman
  "nT97ifVT2J1yMQmeq20Qblg61T.jpg", // The Departed
  "umSVjVdbVwtx5ryCA2QXL44Durm.jpg", // Heat
  "iQ5ztdjvteGeboxtmRdXEChJOHh.jpg", // Scarface
  "9OkCLM73MIU2CrKZbqiT8Ln1wY2.jpg", // Goodfellas
  "3bhkrj58Vtu7enYsRolD1fZdja1.jpg", // The Godfather
  "sSuQTCZwqKrNBNIsksO9IAUoWP9.jpg", // The Godfather Part II
  "sX9idXDqRUxE5ffww3n3RV5gL55.jpg", // American Gangster
  "lz8vNyXeidqqOdJW9ZjnDAMb5Vr.jpg", // Sicario
  "uhviyknTT5cEQXbn6vWIqfM4vGm.jpg", // Prisoners
  "ts996lKsxvjkO2yiYG0ht4qAicO.jpg", // Gone Girl
  "nrmXQ0zcZUL8jFLrakWc90IR8z9.jpg", // Shutter Island
  "gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", // Interstellar
  "oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg", // Inception
  "qJ2tW6WMUDux911r6m7haRef0WH.jpg", // The Dark Knight
  "or06FN3Dka5tukK1e9sl16pB3iy.jpg", // Avengers Endgame
  "8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg", // Spider-Man Across the Spider-Verse
  "czembW0Rk1Ke7lCJGzyAi8Fscgt.jpg", // Dune Part Two
  "7IiTTgloJzvGI1TAYymCfbfl3vT.jpg", // Parasite
  "q719jXXEzOoYaps6qFsVoMe0qtn.jpg", // Your Name
  "39wmItIWsg5sZMyRUHLkWBcuVCM.jpg", // Spirited Away
  "vIeu8WysZrTS7vxbtipRMQ0SSap.jpg", // Suzume
  "h8Rb9gBr48ODIwYUtZv5C9W0xRi.jpg", // Demon Slayer Mugen Train
  "fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg", // Arcane
  "hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg", // Attack on Titan
  "7jswQA9409iA9j5v079m19vN4mH.jpg", // Cyberpunk Edgerunners
  "62HCnUTziyWcpDaBO2i1DX17ljH.jpg", // Top Gun Maverick
  "muAuXW31r18aN5fX5zY8bF1BqN8.jpg", // Exhuma
  "vZloFAK7NmvMGKE7VkF5UHaz0I.jpg", // John Wick 4
  "ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg", // Gladiator
  "f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg", // The Matrix
  "pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", // Fight Club
];

export function getTmdbPosterDirect(filename: string): string {
  return `https://image.tmdb.org/t/p/w342/${filename}`;
}

export function getSplashPosterUrl(filename: string): string {
  const tmdbUrl = `https://image.tmdb.org/t/p/w300/${filename}`;
  return `https://wsrv.nl/?url=${encodeURIComponent(tmdbUrl)}&w=300&q=75&output=webp`;
}

/**
 * Trả về 18 poster ngẫu nhiên đã được xáo trộn cho màn hình Splash Intro
 */
export function getShuffledSplashPosters(count = 18): string[] {
  const pool = [...SPLASH_POSTER_FILENAMES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).map(getSplashPosterUrl);
}
