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
const html=`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>ARRIVAGE · Tout ce qui débarque, au même endroit</title>
<meta name="description" content="ARRIVAGE : les arrivages des commerces de Nouvelle-Calédonie, alertes produits, réservation en magasin.">
<meta name="theme-color" content="#203C31">
<meta property="og:title" content="ARRIVAGE">
<meta property="og:description" content="Tout ce qui débarque en Nouvelle-Calédonie, au même endroit.">
${icon}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Nunito:wght@400;500;600;700;800&display=swap">
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${js}</script>
</body>
</html>
`;
fs.mkdirSync(require("path").dirname(process.env.OUT),{recursive:true});
fs.writeFileSync(process.env.OUT,html);
console.log("OK", process.env.OUT, html.length, "octets");
'
