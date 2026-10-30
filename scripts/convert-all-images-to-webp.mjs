import fs from "fs";
import path from "path";
import sharp from "sharp";

const TARGET_DIR = path.resolve("apps/web/public");
const EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

// Directories to process
const FOLDERS = [
  "Folder-Background",
  "img-backtop",
  "images",
  "mascots",
  "og-img",
  "avatars"
];

function getAllImages(dirPath, result = []) {
  if (!fs.existsSync(dirPath)) return result;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      getAllImages(fullPath, result);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (EXTENSIONS.has(ext)) {
        result.push(fullPath);
      }
    }
  }
  return result;
}

async function convertImage(filePath) {
  const ext = path.extname(filePath);
  const webpPath = filePath.slice(0, -ext.length) + ".webp";
  
  // If webp already exists and is newer than source, skip
  if (fs.existsSync(webpPath)) {
    const srcMtime = fs.statSync(filePath).mtimeMs;
    const webpMtime = fs.statSync(webpPath).mtimeMs;
    if (webpMtime >= srcMtime) {
      return { skipped: true, srcSize: fs.statSync(filePath).size, webpSize: fs.statSync(webpPath).size };
    }
  }

  const srcSize = fs.statSync(filePath).size;
  const pipeline = sharp(filePath);
  const metadata = await pipeline.metadata();

  // If excessively large (e.g. 4K/8K wallpapers > 2560px), cap to 2560px max width/height
  const MAX_DIMENSION = 2560;
  if (metadata.width && metadata.width > MAX_DIMENSION) {
    pipeline.resize({ width: MAX_DIMENSION, withoutEnlargement: true });
  } else if (metadata.height && metadata.height > MAX_DIMENSION) {
    pipeline.resize({ height: MAX_DIMENSION, withoutEnlargement: true });
  }

  // Convert to WebP with good quality and reasonable compression
  await pipeline
    .webp({ quality: 82, effort: 4 })
    .toFile(webpPath);

  const webpSize = fs.statSync(webpPath).size;
  return { skipped: false, srcSize, webpSize, webpPath, relPath: path.relative(TARGET_DIR, webpPath).replace(/\\/g, "/") };
}

async function main() {
  console.log("Scanning images in apps/web/public...");
  let imageFiles = [];
  for (const folder of FOLDERS) {
    const folderPath = path.join(TARGET_DIR, folder);
    imageFiles = imageFiles.concat(getAllImages(folderPath));
  }

  console.log(`Found ${imageFiles.length} PNG/JPG images to process.`);

  let totalSrcBytes = 0;
  let totalWebpBytes = 0;
  let convertedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    try {
      const res = await convertImage(file);
      totalSrcBytes += res.srcSize;
      totalWebpBytes += res.webpSize;
      if (res.skipped) {
        skippedCount++;
      } else {
        convertedCount++;
        const pct = Math.round((1 - res.webpSize / res.srcSize) * 100);
        console.log(`[${i + 1}/${imageFiles.length}] Converted: ${res.relPath} (${Math.round(res.srcSize / 1024)} KB -> ${Math.round(res.webpSize / 1024)} KB, -${pct}%)`);
      }
    } catch (err) {
      console.error(`[FAIL] ${file}:`, err.message);
    }
  }

  console.log("\n========================================");
  console.log(`BATCH WEBP CONVERSION SUMMARY:`);
  console.log(`Converted: ${convertedCount} files`);
  console.log(`Already up-to-date: ${skippedCount} files`);
  console.log(`Original total size: ${(totalSrcBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`WebP total size:     ${(totalWebpBytes / (1024 * 1024)).toFixed(2)} MB`);
  const savedMB = ((totalSrcBytes - totalWebpBytes) / (1024 * 1024)).toFixed(2);
  const totalPct = Math.round((1 - totalWebpBytes / totalSrcBytes) * 100);
  console.log(`Total data saved:    ${savedMB} MB (-${totalPct}%)`);
  console.log("========================================\n");
}

main().catch(console.error);

