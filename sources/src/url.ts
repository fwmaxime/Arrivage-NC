// Adresses des pages : chaque écran a une adresse du type #/produit/<id>, #/commerce/<id>, #/pro/publications, #/admin/signalements…
// Le « # » permet de fonctionner sur GitHub Pages sans configuration serveur, et sert aussi quand le site est installé comme une application
// (lien partagé, notification, bouton retour du téléphone).
import type { Mode, Route } from "./nav";

const PREFIX: Record<Mode, string> = { consumer: "", merchant: "pro", admin: "admin" };

// Nom interne de la page → mot affiché dans l'adresse (en français). Les pages absentes gardent leur nom interne.
const SLUGS: Record<Mode, Record<string, string>> = {
  consumer: { home: "", explore: "recherche", product: "produit", merchant: "commerce", merchants: "commerces", alerts: "alertes", favorites: "favoris", profile: "profil", signup: "inscrire-mon-commerce", orders: "mes-reservations", theme: "theme" },
  merchant: { dashboard: "", posts: "publications", publish: "publier", import: "import", demand: "demande", plans: "forfaits", shop: "ma-fiche", moderation: "moderation", reservations: "reservations", reviews: "avis", team: "equipe", theme: "theme" },
  admin: { overview: "", finance: "finances", merchants: "commercants", merchant: "commercant", users: "utilisateurs", posts: "publications", categories: "categories", reports: "signalements", reviews: "avis", theme: "theme" },
};

const unslug = (mode: Mode, slug: string) => {
  for (const [name, s] of Object.entries(SLUGS[mode])) if (s === slug) return name;
  return slug;
};

export function toHash(mode: Mode, route: Route): string {
  const parts: string[] = [];
  if (PREFIX[mode]) parts.push(PREFIX[mode]);
  const slug = SLUGS[mode][route.name] ?? route.name;
  if (slug) parts.push(slug);
  const params = { ...(route.params || {}) };
  if (params.id != null && slug) { parts.push(encodeURIComponent(String(params.id))); delete params.id; }
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === "" || v === false) continue;
    qs.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  const q = qs.toString();
  return "#/" + parts.join("/") + (q ? "?" + q : "");
}

export function fromHash(hash: string): { mode: Mode; route: Route } | null {
  if (!hash || !hash.startsWith("#/")) return null;
  const [path, query = ""] = hash.slice(2).split("?");
  let segs = path.split("/").filter(Boolean).map((x) => { try { return decodeURIComponent(x); } catch { return x; } });
  let mode: Mode = "consumer";
  if (segs[0] === "pro") { mode = "merchant"; segs = segs.slice(1); }
  else if (segs[0] === "admin") { mode = "admin"; segs = segs.slice(1); }
  const name = unslug(mode, segs[0] || "");
  const params: any = {};
  if (segs[1]) params.id = segs[1];
  new URLSearchParams(query).forEach((v, k) => {
    if (v.startsWith("{")) { try { params[k] = JSON.parse(v); return; } catch {} }
    params[k] = v;
  });
  const DEFAULT: Record<Mode, string> = { consumer: "home", merchant: "dashboard", admin: "overview" };
  return { mode, route: { name: name || DEFAULT[mode], ...(Object.keys(params).length ? { params } : {}) } };
}

// Adresse complète à partager pour une page de l'espace client
export const shareUrl = (route: Route) => location.origin + location.pathname + toHash("consumer", route);
