const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ENTRIES_DIR = path.join(ROOT, "content", "entries");
const OUT_FILE = path.join(ROOT, "site", "data.json");

const files = fs.readdirSync(ENTRIES_DIR).filter((f) => f.endsWith(".json"));

const entries = files.map((file) => {
  const raw = fs.readFileSync(path.join(ENTRIES_DIR, file), "utf-8");
  const data = JSON.parse(raw);
  return {
    id: path.basename(file, ".json"),
    ...data,
  };
});

entries.sort((a, b) => {
  const da = a.date || "0000-00-00";
  const db = b.date || "0000-00-00";
  return db.localeCompare(da);
});

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(entries, null, 2));

console.log(`Built ${entries.length} entries -> ${path.relative(ROOT, OUT_FILE)}`);
