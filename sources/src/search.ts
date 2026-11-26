// Recherche tolérante aux fautes : accents, pluriels, fautes de frappe, orthographe approximative, mots collés ou séparés.
import { norm } from "./data";

const STOP = new Set(["de", "du", "des", "la", "le", "les", "et", "pour", "en", "a", "au", "aux", "un", "une", "avec", "sur", "d", "l"]);
// Mots familiers → mots du catalogue
const SYN: Record<string, string[]> = {
  tele: ["tv", "televiseur"], tv: ["televiseur"], frigo: ["refrigerateur"], clim: ["climatiseur", "climatisation"], ordi: ["ordinateur", "pc", "portable"],
  pc: ["ordinateur"], portable: ["smartphone", "telephone"], tel: ["telephone", "smartphone"], basket: ["sneakers"], baskets: ["sneakers"], tennis: ["sneakers"],
  play: ["playstation"], ps: ["playstation"], switch: ["nintendo"], velo: ["vtt"], appareil: ["camera"], perceuse: ["visseuse"], canne: ["peche"],
};
export const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w));
// Simplification phonétique (français) : « plaistation » ≈ « playstation », « filtre » ≈ « philtre »
export function phon(w: string) {
  let x = w.replace(/ph/g, "f").replace(/qu/g, "k").replace(/ck/g, "k").replace(/c(?=[aoulr])/g, "k").replace(/q/g, "k").replace(/y/g, "i").replace(/z/g, "s").replace(/w/g, "v").replace(/h/g, "")
    .replace(/ai|ei|e[tr]$/g, "e").replace(/eau|au/g, "o").replace(/(.)\1+/g, "$1");
  if (x.length > 4) x = x.replace(/[sxe]$/, "");
  return x;
}
// Distance d'édition avec inversion de deux lettres (Damerau-Levenshtein restreinte)
export function dist(a: string, b: string, max = 3) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let best = max + 1;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      best = Math.min(best, d[i][j]);
    }
    if (best > max) return max + 1;
  }
  return d[a.length][b.length];
}
const allowed = (n: number) => (n <= 3 ? 0 : n <= 6 ? 1 : n <= 9 ? 2 : 3);

type Index = { text: string; list: string[]; ph: string[] };
const cache = new Map<string, Index>();
export function indexOf(hay: string): Index {
  let ix = cache.get(hay);
  if (!ix) {
    const list = Array.from(new Set(words(hay)));
    // mots collés : « play station » ↔ « playstation »
    const w = words(hay); for (let i = 0; i < w.length - 1; i++) list.push(w[i] + w[i + 1]);
    ix = { text: norm(hay), list, ph: list.map(phon) };
    if (cache.size > 4000) cache.clear();
    cache.set(hay, ix);
  }
  return ix;
}
// Score d'un mot de la recherche dans un texte (0 = absent, 1 = exact) et mot du texte retenu
export function termScore(t: string, ix: Index, whole = false): { s: number; w?: string } {
  if (!whole && ix.text.includes(t)) return { s: 1, w: t };
  const pt = phon(t);
  let best = { s: 0, w: undefined as string | undefined };
  ix.list.forEach((w, i) => {
    let s = 0;
    if (t.length >= 3 && w.startsWith(t)) s = 0.95;
    else if (pt.length >= 3 && (ix.ph[i] === pt || (pt.length >= 4 && ix.ph[i].startsWith(pt)))) s = 0.88;
    else {
      // fautes tolérées selon la longueur du mot le plus court : « red » ne doit pas répondre à « fraize »
      const lim = allowed(Math.min(t.length, w.length));
      if (lim) {
        // la première lettre doit correspondre (les confusions c/k, ph/f… sont déjà gérées par la phonétique)
        const p = ix.ph[i], lp = allowed(Math.min(pt.length, p.length));
        const d = Math.min(
          w[0] === t[0] ? Math.min(dist(t, w, lim), w.length > t.length ? dist(t, w.slice(0, t.length), lim) + 0.5 : 99) : 99,
          lp > 0 && p[0] === pt[0] && dist(pt, p, lp) <= lp ? dist(pt, p, lp) : 99,
        );
        if (d <= lim) s = 0.82 - d * 0.1;
      }
    }
    if (s > best.s) best = { s, w };
  });
  if (best.s) return best;
  for (const alt of SYN[t] || SYN[pt] || []) if (ix.text.includes(alt)) return { s: 0.8, w: alt };
  return best;
}
// Score global d'une recherche (0 = ne correspond pas). Tous les mots doivent être trouvés,
// sauf un mot sur 4 pour les longues recherches.
export function matchScore(q: string, hay: string) {
  const qt = words(q); if (!qt.length) return 1;
  const ix = indexOf(hay);
  const scores: number[] = [];
  for (let i = 0; i < qt.length; i++) {
    let r = termScore(qt[i], ix);
    if (!r.s && i < qt.length - 1) { const j = termScore(qt[i] + qt[i + 1], ix); if (j.s) { scores.push(j.s, j.s); i++; continue; } }
    scores.push(r.s);
  }
  const missing = scores.filter((x) => !x).length;
  if (missing > Math.floor(qt.length / 4)) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length - missing * 0.15;
}
// « Vouliez-vous dire » : remplace chaque mot mal orthographié par le mot le plus proche du catalogue
export function correct(q: string, hays: string[]) {
  const qt = words(q); if (!qt.length) return null;
  const big = indexOf(hays.join(" "));
  let changed = false;
  const fixOne = (t: string) => {
    if (big.list.includes(t) || /\d/.test(t)) return t;
    const r = termScore(t, big, true);
    if (!r.w || r.w === t || r.s < 0.6) return t;
    // un début de mot (« samsun ») n'est corrigé que s'il manque une ou deux lettres et que ce n'est pas un simple pluriel
    if (r.s >= 0.95 && (r.w.length - t.length > 2 || phon(r.w) === phon(t) || r.w === t + "s" || r.w === t + "x")) return t;
    changed = true; return r.w;
  };
  const out: string[] = [];
  for (let i = 0; i < qt.length; i++) {
    const t = qt[i];
    if (!big.list.includes(t) && i < qt.length - 1 && big.list.includes(t + qt[i + 1])) { out.push(t + qt[i + 1]); changed = true; i++; continue; }
    out.push(fixOne(t));
  }
  return changed ? out.join(" ") : null;
}
