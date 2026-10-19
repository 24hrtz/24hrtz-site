// Builds the site into dist/.
// Reads projects.yml and the photos folders, makes web-sized copies of every
// photo (full size + small for the grid and Cover Flow), records each photo's
// shape, and writes dist/projects.json for the page to load.
//
// Netlify runs this automatically on every upload (see netlify.toml).
// Locally: npm install, then npm run build.

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import YAML from "yaml";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const DIST = path.join(ROOT, "dist");
const PHOTOS = path.join(ROOT, "photos");
const FULL_EDGE = 2400;
const SMALL_EDGE = 900;
const IMAGE = /\.(jpe?g|png|webp|heic|tiff?)$/i;
const CATEGORIES = ["Editorial", "Campaigns", "Portraits"];
const FOCUS = { top: "50% 20%", center: "50% 50%", bottom: "50% 80%", left: "25% 50%", right: "75% 50%" };

const warn = (msg) => console.warn("  ! " + msg);
const titleCase = (s) => s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function sizeOf(file) {
  const m = await sharp(file).rotate().metadata();
  // .rotate() with no args applies EXIF orientation; metadata reports pre-rotation size
  const swap = m.orientation && m.orientation >= 5;
  return swap ? { w: m.height, h: m.width } : { w: m.width, h: m.height };
}

async function writeVersion(src, dest, edge, quality) {
  const out = await sharp(src)
    .rotate()
    .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality, progressive: true, mozjpeg: true })
    .toFile(dest);
  return { w: out.width, h: out.height };
}

async function main() {
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(DIST, { recursive: true });

  // page and static files
  let html = await fs.readFile(path.join(ROOT, "index.html"), "utf8");
  html = html.replace("window.SITE_LIVE=false", "window.SITE_LIVE=true");
  await fs.writeFile(path.join(DIST, "index.html"), html);
  await fs.cp(path.join(ROOT, "assets"), path.join(DIST, "assets"), { recursive: true });

  const listed = YAML.parse(await fs.readFile(path.join(ROOT, "projects.yml"), "utf8")) || [];
  const folders = (await fs.readdir(PHOTOS, { withFileTypes: true }))
    .filter((d) => d.isDirectory()).map((d) => d.name);

  // anything uploaded but not in projects.yml still shows up, at the end
  const entries = [...listed];
  for (const f of folders) {
    if (!listed.some((p) => p && p.folder === f)) {
      warn(`"${f}" isn't in projects.yml yet, adding it at the end as "${titleCase(f)}"`);
      entries.push({ name: titleCase(f), folder: f });
    }
  }

  const projects = [];
  for (const p of entries) {
    if (!p || !p.folder) { warn("skipped an entry with no folder"); continue; }
    const dir = path.join(PHOTOS, p.folder);
    if (!(await exists(dir))) { warn(`no folder named "${p.folder}" in photos, skipping "${p.name}"`); continue; }

    const files = (await fs.readdir(dir)).filter((f) => IMAGE.test(f) && !f.startsWith("."));
    files.sort((a, b) => {
      const ca = /^cover\./i.test(a), cb = /^cover\./i.test(b);
      if (ca !== cb) return ca ? -1 : 1;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
    });
    if (!files.length) { warn(`"${p.folder}" has no photos, skipping`); continue; }

    const outDir = path.join(DIST, "photos", p.folder);
    await fs.mkdir(path.join(outDir, "sm"), { recursive: true });
    const photos = [];
    for (const f of files) {
      const src = path.join(dir, f);
      const name = f.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "-") + ".jpg";
      const full = await writeVersion(src, path.join(outDir, name), FULL_EDGE, 82);
      await writeVersion(src, path.join(outDir, "sm", name), SMALL_EDGE, 78);
      photos.push({ src: `photos/${p.folder}/${name}`, sm: `photos/${p.folder}/sm/${name}`, w: full.w, h: full.h });
    }

    let category = p.category || "Editorial";
    if (!CATEGORIES.includes(category)) {
      warn(`"${p.name}" has category "${category}", expected ${CATEGORIES.join(", ")}`);
    }
    projects.push({
      name: String(p.name || titleCase(p.folder)),
      tag: String(p.tag || ""),
      category,
      focus: FOCUS[String(p.focus || "center").toLowerCase()] || FOCUS.center,
      photos,
    });
    console.log(`  ${p.name}: ${photos.length} photos`);
  }

  await fs.writeFile(path.join(DIST, "projects.json"), JSON.stringify({ projects }));
  console.log(`Built ${projects.length} projects into dist/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
