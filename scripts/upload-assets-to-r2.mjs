import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

// Load environment variables from .env
function loadEnv() {
  const envPath = path.resolve(".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = (match[2] || "").trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (!process.env[match[1]]) process.env[match[1]] = val;
      }
    }
  }
}
loadEnv();

const accountId = process.env.R2_ACCOUNT_ID || "762ecc77741adcab1119e8cece4da0a4";
const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || "";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const BUCKET = process.env.R2_ASSETS_BUCKET || "flexphim-assets";
const PUBLIC_DIR = path.resolve("apps/web/public");

const FOLDERS_TO_UPLOAD = [
  "Folder-Background",
  "img-backtop",
  "images",
  "mascots",
  "og-img",
  "avatars",
];

const MIME_MAP = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  }
  return arrayOfFiles;
}

async function uploadFile(filePath) {
  const relativePath = path.relative(PUBLIC_DIR, filePath).replace(/\\/g, "/");
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_MAP[ext] || "application/octet-stream";
  const fileContent = fs.readFileSync(filePath);

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: relativePath,
    Body: fileContent,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  await s3.send(command);
  console.log(`[OK] Uploaded: ${relativePath} (${(fileContent.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  console.log(`Starting upload to Cloudflare R2 bucket: ${BUCKET}...`);
  let allFiles = [];

  for (const folder of FOLDERS_TO_UPLOAD) {
    const folderPath = path.join(PUBLIC_DIR, folder);
    if (fs.existsSync(folderPath)) {
      const files = getAllFiles(folderPath);
      allFiles = allFiles.concat(files);
      console.log(`Found ${files.length} files in ${folder}`);
    }
  }

  console.log(`Total files to upload: ${allFiles.length}`);

  // Concurrency limit: 8 parallel uploads
  const CONCURRENCY = 8;
  let index = 0;
  let successCount = 0;
  let failCount = 0;

  async function worker() {
    while (index < allFiles.length) {
      const currentIndex = index++;
      const file = allFiles[currentIndex];
      try {
        await uploadFile(file);
        successCount++;
      } catch (err) {
        console.error(`[FAIL] ${file}:`, err.message);
        failCount++;
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  console.log(`\n========================================`);
  console.log(`Upload Complete!`);
  console.log(`Successfully uploaded: ${successCount} files`);
  if (failCount > 0) {
    console.log(`Failed: ${failCount} files`);
  }
  console.log(`========================================`);
}

main().catch(console.error);

