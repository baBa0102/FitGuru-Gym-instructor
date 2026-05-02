/**
 * Dev-only: probe ExerciseDB RapidAPI URLs used by Workout. Run: node scripts/probe-rapidapi.mjs
 * Reads EXPO_PUBLIC_RAPID_API_KEY from process.env or .env in project root.
 *
 * Diet does not call RapidAPI (on-device TDEE only). Do not add gym-calculations here — that
 * marketplace route was removed from the app after `POST /daily_calories` proved nonexistent (404).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");

function loadDotEnv() {
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

loadDotEnv();
const KEY = process.env.EXPO_PUBLIC_RAPID_API_KEY;
if (!KEY) {
  console.error("Missing EXPO_PUBLIC_RAPID_API_KEY (.env or env)");
  process.exit(1);
}

async function main() {
  const rows = [];

  const edb = "https://exercisedb.p.rapidapi.com";

  for (const muscle of ["chest", "upper legs", "waist", "cardio"]) {
    const url = `${edb}/exercises/bodyPart/${encodeURIComponent(muscle)}?limit=10`;
    const r = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": KEY,
        "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
      },
    });
    rows.push({ tag: `bodyPart:${muscle}`, status: r.status, url });
  }

  const imgUrl = `${edb}/image?exerciseId=${encodeURIComponent("0001")}&resolution=180`;
  const rImgHeader = await fetch(imgUrl, {
    headers: {
      "X-RapidAPI-Key": KEY,
      "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
    },
  });
  rows.push({ tag: "image(headers)", status: rImgHeader.status, url: imgUrl });

  const imgUrlQ = `${edb}/image?exerciseId=0001&resolution=180&rapidapi-key=${encodeURIComponent(KEY)}`;
  const rImgQ = await fetch(imgUrlQ);
  rows.push({ tag: "image(query)", status: rImgQ.status, url: "image?...rapidapi-key=(redacted)" });

  console.log(JSON.stringify({ probe: "rapidapi", results: rows }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
