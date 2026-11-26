set -e
cd /tmp/claude-0/arr
npx esbuild src/app.tsx --bundle --minify --format=iife --define:process.env.NODE_ENV='"production"' --outfile=dist/app.js --jsx=automatic --log-level=warning
node -e '
const fs=require("fs");
let js=fs.readFileSync("dist/app.js","utf8").replace(/<\/script/gi,"<\\/script").replace(/<!--/g,"<\\!--");
const css=fs.readFileSync("src/styles.css","utf8");
const html=`<title>ARRIVAGE</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Nunito:wght@400;500;600;700;800&display=swap">
<style>${css}</style>
<div id="root"></div>
<script>${js}</script>
`;
fs.mkdirSync("/tmp/claude-0/arr/out",{recursive:true});
fs.writeFileSync("/tmp/claude-0/arr/out/arrivage.html",html);
console.log("bytes",html.length);
'
