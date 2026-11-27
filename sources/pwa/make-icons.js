// Génère les icônes et les écrans de lancement de l'application installable (dossier /icons à la racine du site).
// Usage : node sources/pwa/make-icons.js   (nécessite Playwright et Chromium, déjà présents dans les sessions Claude)
// À relancer seulement si le logo ou les couleurs changent.
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const OUT = path.join(__dirname, "..", "..", "icons");
const FONTS = "file://" + path.join(__dirname, "fonts");
const GREEN = "#203C31", PAPER = "#F5F5F1", ORANGE = "#E77938", MINT = "#C5D1C9";

const head = `<style>
@font-face{font-family:B;font-weight:200 800;src:url(${FONTS}/bricolage-latin.woff2) format('woff2')}
@font-face{font-family:I;font-weight:100 900;src:url(${FONTS}/inter-latin.woff2) format('woff2')}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:${GREEN}}
body{display:grid;place-items:center;-webkit-font-smoothing:antialiased}
.logo{font-family:B;font-weight:800;letter-spacing:-.045em;line-height:1;color:${PAPER}}
.dot{color:${ORANGE}}
</style>`;

// Icône carrée : le « a. » du logo (même dessin que la photo de profil Facebook).
// scale = taille de la lettre par rapport au côté (plus petite pour l'icône « maskable » d'Android, qui peut être rognée en cercle).
const icon = (scale) => `<html><head>${head}<style>.m{font-size:${scale * 100}vmin;transform:translate(-1.25vmin,-3.9vmin)}</style></head>
<body><div class="logo m">a<span class="dot">.</span></div></body></html>`;

// Écran de lancement iPhone : mot-symbole « arrivage. » + slogan.
const splash = `<html><head>${head}<style>
.w{display:flex;flex-direction:column;align-items:center;gap:4.2vw;transform:translateY(-2vh)}
.logo{font-size:17vw}
.s{font-family:I;font-weight:500;font-size:4.1vw;color:${MINT};letter-spacing:-.01em}
</style></head><body><div class="w"><div class="logo">arrivage<span class="dot">.</span></div><div class="s">Tout ce qui débarque, au même endroit.</div></div></body></html>`;

const ICONS = [
  ["icon-192.png", 192, 0.653],
  ["icon-512.png", 512, 0.653],
  ["icon-maskable-512.png", 512, 0.5],
  ["apple-touch-icon.png", 180, 0.62],
  ["favicon-32.png", 32, 0.7],
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
  for (const [f, s, scale] of ICONS) await shot(icon(scale), s, s, 1, f);
  for (const [w, h, r] of SPLASH) await shot(splash, w, h, r, `splash-${w * r}x${h * r}.png`);
  await b.close();
})();
