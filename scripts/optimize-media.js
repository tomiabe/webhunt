const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const SRC_DIR = path.join(ROOT, "media");
const OUT_DIR = path.join(ROOT, "media-optimized");
const MAP_FILE = path.join(OUT_DIR, ".map.json");

const MAX_WIDTH = 1280;
const QUALITY = 80;
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"]);

async function main() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs.readdirSync(SRC_DIR).filter((f) => !f.startsWith("."));
  const map = {};
  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    const srcPath = path.join(SRC_DIR, file);
    const ext = path.extname(file).toLowerCase();
    const before = fs.statSync(srcPath).size;
    totalBefore += before;

    if (!IMAGE_EXT.has(ext)) {
      const outPath = path.join(OUT_DIR, file);
      fs.copyFileSync(srcPath, outPath);
      map[file] = file;
      totalAfter += before;
      continue;
    }

    const base = path.basename(file, ext);
    const outName = `${base}.webp`;
    const outPath = path.join(OUT_DIR, outName);

    try {
      const image = sharp(srcPath);
      const meta = await image.metadata();

      if (ext === ".webp" && meta.width && meta.width <= MAX_WIDTH && before < 400 * 1024) {
        fs.copyFileSync(srcPath, outPath);
      } else {
        let pipeline = image.rotate();
        if (meta.width && meta.width > MAX_WIDTH) {
          pipeline = pipeline.resize({ width: MAX_WIDTH });
        }
        await pipeline.webp({ quality: QUALITY }).toFile(outPath);
      }
      map[file] = outName;
      totalAfter += fs.statSync(outPath).size;
    } catch (err) {
      console.error(`Failed to optimize ${file}, copying as-is:`, err.message);
      fs.copyFileSync(srcPath, path.join(OUT_DIR, file));
      map[file] = file;
      totalAfter += before;
    }
  }

  fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2));

  console.log(`Optimized ${files.length} media files`);
  console.log(`Before: ${(totalBefore / 1024 / 1024).toFixed(1)} MB`);
  console.log(`After:  ${(totalAfter / 1024 / 1024).toFixed(1)} MB`);
}

main();
