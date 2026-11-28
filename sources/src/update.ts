// Nouvelle version du site : quand on publie, les visiteurs déjà sur la page la reçoivent sans rafraîchir eux-mêmes.
// La page compare son numéro de version (<meta name="build">, mis par build.sh) à celui du serveur toutes les 2 min et au retour sur l'onglet.
// Si une version plus récente existe, elle se recharge discrètement au prochain changement de page, ou dès que le visiteur revient sur l'onglet.
const mine = document.querySelector('meta[name="build"]')?.getAttribute("content") || "";
let stale = false;

async function check() {
  if (stale || !mine || !/^https?:/.test(location.protocol) || document.visibilityState !== "visible") return;
  try {
    const r = await fetch(location.pathname + "?v=" + Date.now(), { cache: "no-store" });
    if (!r.ok) return;
    const html = await r.text();
    const theirs = html.match(/<meta name="build" content="([^"]+)"/)?.[1];
    if (theirs && theirs !== mine) stale = true;
  } catch {}
}

if (mine) {
  setTimeout(check, 30000);
  setInterval(check, 120000);
  addEventListener("popstate", () => reloadIfStale());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (stale) location.reload(); else check();
  });
}

// Appelé à chaque changement de page (app.tsx), une fois la nouvelle adresse écrite : la nouvelle version s'ouvre directement sur la bonne page.
export function reloadIfStale() { if (stale) location.reload(); }
