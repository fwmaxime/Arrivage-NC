#!/bin/bash
# Construit la page du site : bash build.sh [sortie.html]
# Prérequis (une fois) : npm install dans ce dossier.
set -e
cd "$(dirname "$0")"
OUT="${1:-dist/index.html}"
npx esbuild src/app.tsx --bundle --minify --format=iife --define:process.env.NODE_ENV='"production"' --outfile=dist/app.js --jsx=automatic --log-level=warning
OUT="$OUT" node -e '
const fs=require("fs");
let js=fs.readFileSync("dist/app.js","utf8").replace(/<\/script/gi,"<\\/script").replace(/<!--/g,"<\\!--");
const css=fs.readFileSync("src/styles.css","utf8");
const icon=fs.readFileSync("icon.html","utf8").trim();
// Application installable (écran d accueil du téléphone) : manifeste, icônes, écrans de lancement iPhone. Voir pwa/.
const splash=require("./pwa/splash-sizes.json").map(([w,h,r])=>`<link rel="apple-touch-startup-image" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)" href="/icons/splash-${w*r}x${h*r}.png?v=2">`).join("\n");
const pwa=`<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png?v=2">
<link rel="shortcut icon" href="/favicon.ico?v=2">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=2">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="ARRIVAGE">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
${splash}`;
// Écran de lancement affiché pendant le chargement du site (remplacé par l application dès qu elle démarre)
// Logo vectorisé partagé avec l application (src/brand.ts)
const brand=fs.readFileSync("src/brand.ts","utf8");
const vb=brand.match(/viewBox: "([^"]+)"/)[1], d=brand.match(/ d: "([^"]+)"/)[1], dot=brand.match(/dot: \{ cx: ([\d.-]+), cy: ([\d.-]+), r: ([\d.-]+) \}/);
const [,,vw,vh]=vb.split(" ").map(Number);
const boot=`<div class="boot" aria-busy="true"><svg class="wordmark boot-logo" viewBox="${vb}" style="height:clamp(52px,17vw,96px);width:auto;aspect-ratio:${vw} / ${vh}" role="img" aria-label="arrivage."><path d="${d}" fill="currentColor"/><circle cx="${dot[1]}" cy="${dot[2]}" r="${dot[3]}" class="wordmark-dot"/></svg></div>`;
const sw=`<script>if("serviceWorker" in navigator)addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){})});</script>`;
const html=`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="build" content="${Date.now().toString(36)}">
<meta name="robots" content="noindex, nofollow">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>ARRIVAGE · Tout ce qui débarque, au même endroit</title>
<meta name="description" content="ARRIVAGE : les arrivages des commerces de Nouvelle-Calédonie : qui a quoi, où et à quel prix, alertes produits et promos.">
<meta name="theme-color" content="#0C253F">
<meta property="og:title" content="ARRIVAGE">
<meta property="og:description" content="Trouvez qui l’a, où et à quel prix : les arrivages des commerces de Nouvelle-Calédonie.">
<meta property="og:image" content="https://arrivagenc.com/icons/og-arrivage.png?v=2">
<meta property="og:image:width" content="1640">
<meta property="og:image:height" content="624">
${icon}
${pwa}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600;700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Nunito:wght@400;500;600;700;800&display=swap">
<style>${css}</style>
</head>
<body>
<div id="root">${boot}</div>
<script>${js}</script>
${sw}
</body>
</html>
`;
fs.mkdirSync(require("path").dirname(process.env.OUT),{recursive:true});
fs.writeFileSync(process.env.OUT,html);
// Service worker à côté de la page (le manifeste, lui, est propre à chaque dossier : manifest.webmanifest à la racine et dans demo-x7q4/)
const dir=require("path").dirname(process.env.OUT);
fs.copyFileSync("pwa/sw.js",dir+"/sw.js");
console.log("OK", process.env.OUT, html.length, "octets");
'
