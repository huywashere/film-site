import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const POSTERS = [
  '8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', // Oppenheimer
  'ji3ecJphATlVgWNY0B0RVXZizdf.jpg', // The Revenant
  'kW9LmvYHAaS9iA0tHmZVq8hQYoq.jpg', // The Wolf of Wall Street
  '8j58iEBw9pOXFD2L0nt0ZXeHviB.jpg', // Once Upon a Time in Hollywood
  'mbm8k3GFhXS0ROd9AD1gqYbIFbM.jpg', // The Irishman
  'nT97ifVT2J1yMQmeq20Qblg61T.jpg', // The Departed
  'umSVjVdbVwtx5ryCA2QXL44Durm.jpg', // Heat
  'iQ5ztdjvteGeboxtmRdXEChJOHh.jpg', // Scarface
  '9OkCLM73MIU2CrKZbqiT8Ln1wY2.jpg', // Goodfellas
  '3bhkrj58Vtu7enYsRolD1fZdja1.jpg', // The Godfather
  'sSuQTCZwqKrNBNIsksO9IAUoWP9.jpg', // The Godfather Part II
  'sX9idXDqRUxE5ffww3n3RV5gL55.jpg', // American Gangster
];

async function downloadPoster(filename) {
  const url = `https://image.tmdb.org/t/p/w780/${filename}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function run() {
  console.log('Downloading 12 high-res posters from TMDB...');
  const buffers = await Promise.all(POSTERS.map(downloadPoster));
  console.log('Downloaded all 12 posters successfully.');

  // 1. Desktop Grid: 6 columns x 2 rows
  // Dimensions: 2400 x 1200 (each cell 400 x 600)
  const dCols = 6;
  const dRows = 2;
  const dCellW = 400;
  const dCellH = 600;
  const dTotalW = dCols * dCellW;
  const dTotalH = dRows * dCellH;

  const desktopComposites = [];
  for (let i = 0; i < POSTERS.length; i++) {
    const col = i % dCols;
    const row = Math.floor(i / dCols);
    const left = col * dCellW;
    const top = row * dCellH;

    const resized = await sharp(buffers[i])
      .resize(dCellW, dCellH, { fit: 'cover', position: 'center' })
      .toBuffer();

    desktopComposites.push({
      input: resized,
      left,
      top,
    });
  }

  const desktopOutput = path.resolve('apps/web/public/images/splash/poster-grid-desktop.webp');
  await sharp({
    create: {
      width: dTotalW,
      height: dTotalH,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite(desktopComposites)
    .webp({ quality: 86, effort: 6 })
    .toFile(desktopOutput);

  const dStat = await fs.stat(desktopOutput);
  console.log(`Created HD desktop grid: ${dTotalW}x${dTotalH}, size: ${(dStat.size / 1024).toFixed(1)} KB`);

  // 2. Mobile Grid: 3 columns x 4 rows
  // Dimensions: 1080 x 2160 (each cell 360 x 540)
  const mCols = 3;
  const mRows = 4;
  const mCellW = 360;
  const mCellH = 540;
  const mTotalW = mCols * mCellW;
  const mTotalH = mRows * mCellH;

  const mobileComposites = [];
  for (let i = 0; i < POSTERS.length; i++) {
    const col = i % mCols;
    const row = Math.floor(i / mCols);
    const left = col * mCellW;
    const top = row * mCellH;

    const resized = await sharp(buffers[i])
      .resize(mCellW, mCellH, { fit: 'cover', position: 'center' })
      .toBuffer();

    mobileComposites.push({
      input: resized,
      left,
      top,
    });
  }

  const mobileOutput = path.resolve('apps/web/public/images/splash/poster-grid-mobile.webp');
  await sharp({
    create: {
      width: mTotalW,
      height: mTotalH,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite(mobileComposites)
    .webp({ quality: 86, effort: 6 })
    .toFile(mobileOutput);

  const mStat = await fs.stat(mobileOutput);
  console.log(`Created HD mobile grid: ${mTotalW}x${mTotalH}, size: ${(mStat.size / 1024).toFixed(1)} KB`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
