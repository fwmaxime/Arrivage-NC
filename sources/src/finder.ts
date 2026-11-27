// Moteur de suggestions de la recherche (accueil + en-tête) : complétions, produits, marques, commerces, catégories.
import { CATEGORIES, Merchant, Product, catById, norm } from "./data";
import { productHay } from "./store";
import { matchScore, correct, termScore, indexOf, words } from "./search";

export type Scope = "all" | "products" | "brands" | "shops";
export const SCOPES: { v: Scope; l: string; ph: string }[] = [
  { v: "all", l: "Tout", ph: "Produit, marque ou commerce…" },
  { v: "products", l: "Produits", ph: "Ex. PS5, climatiseur, pneus 4x4…" },
  { v: "brands", l: "Marques", ph: "Ex. Nike, Samsung, Makita…" },
  { v: "shops", l: "Commerces", ph: "Nom d'une boutique, d'un magasin…" },
];

export interface Brand { name: string; prods: Product[]; shops: number }
export function brandsOf(cat: Product[]): Brand[] {
  const map = new Map<string, Product[]>();
  for (const p of cat) if (p.brand && p.brand !== "Sans marque" && p.brand !== "Producteur local") map.set(p.brand, [...(map.get(p.brand) || []), p]);
  return Array.from(map, ([name, prods]) => ({ name, prods, shops: new Set(prods.map((p) => p.merchantId)).size }))
    .sort((a, b) => b.prods.length - a.prods.length || a.name.localeCompare(b.name));
}

export const inStock = (p: Product) => p.status !== "out" && p.status !== "soon";

// Complétions façon moteur de recherche : « pla » → « playstation 5 pro »
function completions(nq: string, cat: Product[], limit = 4) {
  const qw = words(nq); if (!qw.length) return [];
  const last = qw[qw.length - 1], head = qw.slice(0, -1);
  const seen = new Map<string, number>();
  const add = (phrase: string, w: number) => {
    const k = norm(phrase).replace(/\s+/g, " ").trim();
    if (!k || k === nq) return;
    seen.set(k, (seen.get(k) || 0) + w);
  };
  for (const p of cat) {
    const pop = 1 + (p.views || 0) / 500;
    for (const src of [p.name, p.brand, ...p.tags]) {
      const ws = norm(src).split(/\s+/).filter(Boolean);
      const i = ws.findIndex((w) => w.startsWith(last) && w.length > last.length - 1);
      if (i < 0) continue;
      const hay = norm(src);
      if (head.some((h) => !hay.includes(h) && !norm(p.name + " " + p.brand).includes(h))) continue;
      // phrase : le mot complété + jusqu'à 2 mots suivants
      const tail = ws.slice(i, i + 3).join(" ").replace(/[,.;:()]+$/g, "");
      add([...head, tail].join(" "), pop * (src === p.brand ? 1.4 : 1));
      if (i + 1 < ws.length) add([...head, ws[i]].join(" "), pop * 0.6);
    }
  }
  return Array.from(seen).sort((a, b) => b[1] - a[1] || a[0].length - b[0].length).slice(0, limit).map(([k]) => k);
}

export function suggest(q: string, cat: Product[], merchants: Merchant[], scope: Scope) {
  const nq = norm(q.trim());
  if (nq.length < 1) return null;
  const mOf = (id: string) => merchants.find((m) => m.id === id);
  const one = words(nq).length === 1 ? words(nq)[0] : null;
  const fuzzy = (t: string) => norm(t).includes(nq) || (!!one && one.length >= 3 && termScore(one, indexOf(t)).s >= 0.7);
  const products = scope === "all" || scope === "products"
    ? cat.map((p) => { const sc = matchScore(nq, productHay(p, mOf(p.merchantId))); return { p, sc: sc && sc + 0.4 * matchScore(nq, `${p.name} ${p.brand || ""}`) + (inStock(p) ? 0.05 : 0) }; })
      .filter((x) => x.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, scope === "products" ? 6 : 4).map((x) => x.p)
    : [];
  const brands = scope === "all" || scope === "brands"
    ? brandsOf(cat).filter((b) => fuzzy(b.name)).slice(0, scope === "brands" ? 8 : 3)
    : [];
  const shops = scope === "all" || scope === "shops"
    ? merchants.filter((m) => m.status === "active").map((m) => ({ m, sc: Math.max(matchScore(nq, m.name) * 1.2, fuzzy(m.name) ? 0.8 : 0, scope === "shops" ? matchScore(nq, `${m.name} ${m.tagline} ${m.commune} ${m.categories.map((c) => catById(c).label).join(" ")}`) * 0.7 : 0) }))
      .filter((x) => x.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, scope === "shops" ? 6 : 3).map((x) => x.m)
    : [];
  const cats = scope === "all" ? CATEGORIES.filter((c) => fuzzy(c.label)).slice(0, 2) : [];
  const queries = scope === "shops" || scope === "brands" ? [] : completions(nq, cat);
  const fix = nq.length >= 3 ? correct(nq, scope === "shops" ? merchants.map((m) => m.name) : cat.map((p) => productHay(p, mOf(p.merchantId)))) : null;
  return { nq, queries, products, brands, shops, cats, fix: fix && !queries.some((x) => x.startsWith(nq)) ? fix : null };
}

// Recherches récentes (confort par appareil)
const RKEY = "arrivage-recent-searches";
export function recentSearches(): string[] {
  try { const x = JSON.parse(localStorage.getItem(RKEY) || "[]"); return Array.isArray(x) ? x.filter((s) => typeof s === "string").slice(0, 6) : []; } catch { return []; }
}
export function pushRecent(q: string) {
  const v = q.trim(); if (!v) return;
  try { localStorage.setItem(RKEY, JSON.stringify([v, ...recentSearches().filter((x) => norm(x) !== norm(v))].slice(0, 6))); } catch {}
}
export function clearRecent() { try { localStorage.removeItem(RKEY); } catch {} }

// Découpe un texte en morceaux surlignés là où il correspond aux mots tapés (sans tenir compte des accents)
export function highlight(text: string, q: string): { t: string; on: boolean }[] {
  const qw = words(q).filter((w) => w.length >= 1);
  if (!qw.length) return [{ t: text, on: false }];
  const n = Array.from(text).map((ch) => norm(ch)[0] || ch.toLowerCase()).join("");
  const mark = new Array(n.length).fill(false);
  for (const w of qw) {
    let i = n.indexOf(w);
    while (i >= 0) { for (let k = i; k < i + w.length; k++) mark[k] = true; i = n.indexOf(w, i + w.length); }
  }
  const chars = Array.from(text);
  const out: { t: string; on: boolean }[] = [];
  chars.forEach((ch, i) => { const on = !!mark[i]; if (out.length && out[out.length - 1].on === on) out[out.length - 1].t += ch; else out.push({ t: ch, on }); });
  return out;
}
