// Promotions flash et offres limitées (restaurants et commerces).
// Une offre est une publication (Product) qui porte un champ `deal` avec des dates de début et de fin :
// elle apparaît côté client entre ces dates (annoncée « à venir » avant), puis disparaît d'elle-même.
import type { Merchant, Product } from "./data";

export type DealKind = "promo" | "plat" | "weekend" | "menu" | "limited";
export interface Deal {
  kind: DealKind;
  occasion?: string;      // « Black Friday », « Week-end », « Noël »…
  was?: number | null;    // prix habituel (prix barré)
  discount?: string;      // remise affichée librement : « -30 % », « 2 achetés = 1 offert »
  startAt: string;        // ISO
  endAt: string;          // ISO
}

export const DEAL_KINDS: { id: DealKind; label: string; short: string; resto: boolean; shop: boolean; hint: string }[] = [
  { id: "promo", label: "Promotion flash", short: "Promo", resto: true, shop: true, hint: "Prix réduit ou remise pendant une période courte" },
  { id: "plat", label: "Plat du jour", short: "Plat du jour", resto: true, shop: false, hint: "Le plat proposé aujourd'hui" },
  { id: "weekend", label: "Suggestion du week-end", short: "Week-end", resto: true, shop: false, hint: "Le plat ou le menu spécial du week-end" },
  { id: "menu", label: "Menu ou formule", short: "Menu", resto: true, shop: false, hint: "Formule entrée-plat-dessert, menu de fête…" },
  { id: "limited", label: "Offre limitée", short: "Offre limitée", resto: true, shop: true, hint: "Édition limitée, quantité limitée, offre spéciale" },
];
export const dealKind = (k?: string) => DEAL_KINDS.find((x) => x.id === k) || DEAL_KINDS[0];
export const OCCASIONS = ["Black Friday", "Week-end", "Fête des mères", "Fête des pères", "Noël", "Nouvel An", "Soldes", "Rentrée", "Anniversaire du magasin"];

export const RESTO_CAT = "restauration";
export const isResto = (m?: Merchant | null) => !!m && (m.categories as string[]).includes(RESTO_CAT);
export const isRestoProduct = (p: Product) => (p.category as string) === RESTO_CAT;

export type DealState = "upcoming" | "live" | "ended";
export function dealState(p: Product, now = Date.now()): DealState | null {
  const d = p.deal; if (!d) return null;
  if (+new Date(d.endAt) <= now) return "ended";
  if (+new Date(d.startAt) > now) return "upcoming";
  return "live";
}
export const dealLive = (p: Product) => dealState(p) === "live";
export const dealEnded = (p: Product) => dealState(p) === "ended";
// Une offre n'est montrée aux clients que si elle est en cours ou annoncée pour les 14 prochains jours
export const dealVisible = (p: Product, now = Date.now()) => { const st = dealState(p, now); return st === null || st === "live" || (st === "upcoming" && +new Date(p.deal!.startAt) - now < 14 * 864e5); };

export function pctOff(p: Product) {
  const w = p.deal?.was;
  if (!w || !p.price || w <= p.price) return 0;
  return Math.round((1 - p.price / w) * 100);
}
// Badge court : « -20 % », « 2 achetés = 1 offert », ou le type d'offre
export function dealBadge(p: Product) {
  if (!p.deal) return "";
  const pc = pctOff(p);
  if (p.deal.discount?.trim()) return p.deal.discount.trim();
  if (pc >= 1) return `-${pc} %`;
  return dealKind(p.deal.kind).short;
}
export function dealTitle(p: Product) {
  if (!p.deal) return "";
  const k = dealKind(p.deal.kind);
  const occ = p.deal.occasion?.trim();
  // pas de doublon « Week-end · Week-end » quand l'occasion porte le même nom que le type d'offre
  if (occ && occ.toLowerCase() !== k.short.toLowerCase() && occ.toLowerCase() !== k.label.toLowerCase()) return `${k.short} · ${occ}`;
  return k.label;
}

const fmtDay = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const fmtHour = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

// « Se termine dans 3 h », « Jusqu'à dim. 30 nov. », « Dès sam. 28 nov. 8h00 »
export function dealWhen(p: Product, now = Date.now()) {
  const st = dealState(p, now); if (!st || !p.deal) return "";
  const s = new Date(p.deal.startAt), e = new Date(p.deal.endAt);
  if (st === "ended") return `Terminée le ${fmtDay(e)}`;
  if (st === "upcoming") {
    const ms = +s - now;
    if (ms < 3600e3) return `Commence dans ${Math.max(1, Math.round(ms / 60e3))} min`;
    if (sameDay(s, new Date(now))) return `Dès ${fmtHour(s)} aujourd'hui`;
    return `Dès ${fmtDay(s)}${s.getHours() || s.getMinutes() ? " " + fmtHour(s) : ""}`;
  }
  const left = +e - now;
  if (left < 3600e3) return `Plus que ${Math.max(1, Math.round(left / 60e3))} min`;
  if (left < 24 * 3600e3) return sameDay(e, new Date(now)) ? `Jusqu'à ${fmtHour(e)} aujourd'hui` : `Se termine dans ${Math.round(left / 3600e3)} h`;
  return `Jusqu'au ${fmtDay(e)}`;
}
export const dealPeriod = (d: Deal) => {
  const s = new Date(d.startAt), e = new Date(d.endAt);
  return sameDay(s, e) ? `${fmtDay(s)}, ${fmtHour(s)} – ${fmtHour(e)}` : `Du ${fmtDay(s)} ${fmtHour(s)} au ${fmtDay(e)} ${fmtHour(e)}`;
};

// Mots ajoutés à la recherche pour qu'on trouve les offres avec « promo », « plat du jour », « black friday »…
export function dealWords(p: Product) {
  if (!p.deal) return "";
  const k = dealKind(p.deal.kind);
  return [k.label, k.short, p.deal.occasion || "", p.deal.discount || "", "promo promotion promos offre offres bon plan reduction", isRestoProduct(p) ? "restaurant resto manger repas" : ""].join(" ");
}

// ---------- Périodes rapides pour le formulaire ----------
// Valeurs au format des champs datetime-local (heure locale de l'appareil)
export const toLocalInput = (d: Date) => new Date(+d - d.getTimezoneOffset() * 60e3).toISOString().slice(0, 16);
const at = (base: Date, addDays: number, h: number, m = 0) => { const d = new Date(base); d.setDate(d.getDate() + addDays); d.setHours(h, m, 0, 0); return d; };
function blackFriday(year: number) {
  // 4e jeudi de novembre + 1 jour
  const d = new Date(year, 10, 1);
  const firstThu = (4 - d.getDay() + 7) % 7 + 1;
  return new Date(year, 10, firstThu + 21 + 1);
}
export function presets(kind: DealKind, now = new Date()): { l: string; start: Date; end: Date; occasion?: string }[] {
  const dow = now.getDay(); // 0 = dimanche
  const satIn = dow === 6 ? 0 : dow === 0 ? -1 : 6 - dow;
  const wkStart = satIn <= 0 ? now : at(now, satIn, 0);
  const wkEnd = at(now, dow === 0 ? 0 : 7 - dow, 23, 59);
  let bf = blackFriday(now.getFullYear());
  if (+at(bf, 2, 23, 59) < +now) bf = blackFriday(now.getFullYear() + 1);
  const bfStart = +bf <= +now ? now : at(bf, 0, 0);
  const list = [
    { l: "Aujourd'hui", start: now, end: at(now, 0, 23, 59) },
    { l: "Ce week-end", start: wkStart, end: wkEnd, occasion: kind === "promo" ? "Week-end" : undefined },
    { l: "24 h", start: now, end: new Date(+now + 24 * 3600e3) },
    { l: "7 jours", start: now, end: at(now, 7, 23, 59) },
  ];
  if (kind === "plat") return [list[0], { l: "Midi seulement", start: +at(now, 0, 14) < +now ? at(now, 1, 10, 30) : (+at(now, 0, 10, 30) < +now ? now : at(now, 0, 10, 30)), end: +at(now, 0, 14) < +now ? at(now, 1, 14) : at(now, 0, 14) }, { l: "Demain", start: at(now, 1, 0), end: at(now, 1, 23, 59) }];
  if (kind === "weekend") return [list[1]];
  if (kind === "promo") return [{ l: `Black Friday (${fmtDay(bf)} → dim.)`, start: bfStart, end: at(bf, 2, 23, 59), occasion: "Black Friday" }, ...list];
  return list;
}
// Libellé court du type d'offre (« Plat du jour », « Promo »…) : sert à ne pas l'afficher deux fois sur une carte
export const dealKindShort = (p: Product) => (p.deal ? dealKind(p.deal.kind).short : "");
