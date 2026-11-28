// ARRIVAGE : service worker minimal de l'application installable.
// Il ne garde AUCUNE page en cache : le site est toujours chargé depuis le réseau, et la page est revalidée à chaque ouverture
// (cache: "no-cache"), sinon l'appli installée peut garder une ancienne version jusqu'à 10 minutes (cache de GitHub Pages).
// Son seul rôle : afficher une page « Pas de connexion » propre (au lieu de l'écran d'erreur du téléphone) quand on ouvre l'appli hors ligne.
// Copié tel quel à la racine du site et dans demo-x7q4/ par build.sh.
const OFFLINE = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#0C253F">
<title>ARRIVAGE · Hors connexion</title><style>
html,body{margin:0;height:100%;background:#0C253F;color:#FCF0DC;font-family:-apple-system,system-ui,"Segoe UI",Roboto,sans-serif}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;box-sizing:border-box}
.l{font-weight:900;font-size:44px;letter-spacing:-.02em}.l span{color:#FF7A1F}
p{color:#CBD0D0;max-width:300px;line-height:1.5;margin:14px 0 26px}
button{font:inherit;font-weight:600;background:#FF7A1F;color:#0C253F;border:0;border-radius:12px;padding:12px 22px}
</style></head><body><div class="l">arrivage<span>.</span></div>
<p>Pas de connexion internet pour le moment. Vérifiez le Wi-Fi ou les données mobiles, puis réessayez.</p>
<button onclick="location.reload()">Réessayer</button></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return; // photos, Supabase, polices… : le navigateur s'en occupe normalement
  // Toujours la dernière version : on redemande la page au serveur (réponse 304 rapide si rien n'a changé).
  // redirect "manual" : le navigateur suit lui-même les redirections (exigé par Safari).
  e.respondWith(fetch(e.request.url, { cache: "no-cache", credentials: "include", redirect: "manual" }).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
