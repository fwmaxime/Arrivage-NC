// Génère les icônes et les écrans de lancement de l'application installable (dossier /icons à la racine du site).
// Usage : node sources/pwa/make-icons.js   (nécessite Playwright et Chromium, déjà présents dans les sessions Claude)
// À relancer seulement si le logo ou les couleurs changent.
// Identité du 28/11/2026 : marine, crème, orange ; logo « a. » et mot-symbole « arrivage. » en Inter Tight (vectorisés).
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const OUT = path.join(__dirname, "..", "..", "icons");
const FONTS = "file://" + path.join(__dirname, "fonts");
const NAVY = "#0C253F", CREAM = "#FCF0DC", ORANGE = "#FF7A1F";

// « a. » du logo (fond transparent, même fichier que arrivage-logo-transparent.svg)
const LOGO_A = fs.readFileSync(path.join(__dirname, "logo-a.svg"), "utf8").replace(/ width="1024" height="1024"/, "");
// Mot-symbole « arrivage. » partagé avec le site (src/brand.ts)
const brand = fs.readFileSync(path.join(__dirname, "..", "src", "brand.ts"), "utf8");
const vb = brand.match(/viewBox: "([^"]+)"/)[1], d = brand.match(/ d: "([^"]+)"/)[1];
const [, cx, cy, r] = brand.match(/dot: \{ cx: ([\d.-]+), cy: ([\d.-]+), r: ([\d.-]+) \}/);
const WORDMARK = `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg"><path d="${d}" fill="${CREAM}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${ORANGE}"/></svg>`;

const head = `<style>
@font-face{font-family:IT;font-weight:700;src:url(${FONTS}/InterTight-700.ttf) format('truetype')}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:${NAVY}}
body{display:grid;place-items:center;-webkit-font-smoothing:antialiased}
svg{display:block}
</style>`;

// Icône carrée : le « a. » du logo. zoom = agrandissement du dessin (plus petit pour l'icône « maskable » d'Android, rognée en cercle ; plus grand pour le favicon de 32 px).
const icon = (zoom) => `<html><head>${head}<style>.m svg{width:${zoom * 100}vmin;height:${zoom * 100}vmin}</style></head>
<body><div class="m">${LOGO_A}</div></body></html>`;

// Écran de lancement iPhone : mot-symbole « arrivage. » + slogan.
const splash = `<html><head>${head}<style>
.w{display:flex;flex-direction:column;align-items:center;gap:5vw;transform:translateY(-2vh)}
.w svg{width:68vw;height:auto}
.s{font-family:IT;font-weight:700;font-size:4.6vw;color:${CREAM};letter-spacing:-.01em}
</style></head><body><div class="w">${WORDMARK}<div class="s">Trouvez qui l’a, où et à quel prix.</div></div></body></html>`;

const ICONS = [
  ["icon-192.png", 192, 1],
  ["icon-512.png", 512, 1],
  ["icon-maskable-512.png", 512, 0.85],
  ["apple-touch-icon.png", 180, 1],
  ["favicon-32.png", 32, 1.5],
];

// Tailles d'écran des iPhone (points CSS × densité), en portrait. Voir build.sh pour les balises correspondantes.
const SPLASH = require("./splash-sizes.json");

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const shot = async (html, w, h, dpr, file) => {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    const tmp = path.join(__dirname, "_tmp.html");
    fs.writeFileSync(tmp, html);
    await p.goto("file://" + tmp); // via un fichier : sinon les polices locales ne se chargent pas
    fs.unlinkSync(tmp);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(OUT, file) });
    await p.close();
    console.log("OK", file);
  };
  for (const [f, s, zoom] of ICONS) await shot(icon(zoom), s, s, 1, f);
  for (const [w, h, r] of SPLASH) await shot(splash, w, h, r, `splash-${w * r}x${h * r}.png`);
  await b.close();
})();
