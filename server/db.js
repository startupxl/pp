import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, "data", "db.json");

// Note: no `users` collection here — accounts and passwords live entirely
// in Firebase Authentication. Sessions/documents are tagged with the
// Firebase UID string directly (see server/auth.js).
function defaultData() {
  return {
    frameworks: [],
    sessions: [],
    analyses: [],
    documents: [],
  };
}

export function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    writeDB(defaultData());
  }
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.documents) parsed.documents = [];
    return parsed;
  } catch {
    return defaultData();
  }
}

export function writeDB(data) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

export function nextId(collection) {
  return collection.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
}
