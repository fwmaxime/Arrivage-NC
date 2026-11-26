import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { TRYON_SEED, PENDING_MERCHANTS, MERCHANTS, PRODUCTS, USERS, REPORTS, CATEGORIES, Product, Merchant, norm, catById, COMMUNES } from "./data";
import { DEFAULT_INPUTS, FinInputs } from "./finance";
import { Reservation, seedReservations, extraSeeds, visitorSeed } from "./reservations";
import { Review, seedReviews } from "./reviews";
import { Staff, seedStaff } from "./staff";

export interface Alert { id: string; query: string; brand: string; category: string; maxBudget: number | null; commune: string; features: string; active: boolean; createdAt: string; lastMatchAt?: string | null }
export interface Notif { id: string; kind: "alert" | "follow" | "system" | "order"; title: string; body: string; productId?: string; read: boolean; at: string }
export interface Activity { id: string; at: string; text: string; space: "consommateur" | "commerçant" | "admin" }
export type ReportStatus = "open" | "waiting" | "fixed" | "resolved" | "removed";
export interface ReportEvent { at: string; by: "admin" | "boutique" | "client" | "système"; kind: "created" | "message" | "call" | "edit" | "status" | "reply"; text: string }
export interface Report { id: string; productId: string; reason: string; at: string; status: ReportStatus; history: ReportEvent[]; reporterId?: string; merchantUnread?: boolean; adminUnread?: boolean }

export interface State {
  v: number;
  products: Product[];
  merchants: Merchant[];
  favorites: string[];
  follows: string[];
  alerts: Alert[];
  notifications: Notif[];
  searchLog: Record<string, number>;
  users: typeof USERS;
  reports: Report[];
  categories: { id: string; active: boolean }[];
  activity: Activity[];
  fin: FinInputs;
  savedScenarios: { id: string; name: string; inputs: FinInputs }[];
  profile: { commune: string; interests: string[]; blocked?: boolean };
  currentMerchant: string;
  settings: { manualApproval: boolean; moderateReviews?: boolean };
  reservations: Reservation[];
  reviews: Review[];
  staff: Staff[];
  actAs?: string | null;
}

const KEY = "arrivage-v1-state";
const VERSION = 4;
const uid = () => Math.random().toString(36).slice(2, 9);
const nowIso = () => new Date().toISOString();

export function initialState(): State {
  return {
    v: VERSION,
    products: structuredClone(PRODUCTS),
    merchants: structuredClone([...MERCHANTS, ...PENDING_MERCHANTS]),
    favorites: ["p011", "p036"],
    follows: ["m-pixel", "m-recif"],
    alerts: [
      { id: "a1", query: "GTA VI", brand: "", category: "gaming", maxBudget: 12000, commune: "", features: "Édition standard, PS5", active: true, createdAt: new Date(Date.now() - 5 * 864e5).toISOString() },
      { id: "a2", query: "Pneus 265/65 R17", brand: "", category: "auto", maxBudget: 32000, commune: "", features: "Tout-terrain", active: true, createdAt: new Date(Date.now() - 9 * 864e5).toISOString() },
      { id: "a3", query: "RTX 5070", brand: "", category: "hightech", maxBudget: 100000, commune: "Nouméa", features: "", active: false, createdAt: new Date(Date.now() - 15 * 864e5).toISOString() },
    ],
    notifications: [
      { id: "n1", kind: "alert", title: "Votre alerte « Pneus 265/65 R17 » a trouvé un produit", body: "Brousse Auto Pièces · Pneus 4x4 tout-terrain 265/65 R17 · 29 900 F", productId: "p028", read: false, at: new Date(Date.now() - 9 * 36e5).toISOString() },
      { id: "n2", kind: "follow", title: "Pixel Lagon a publié un arrivage", body: "PlayStation 5 Pro · 109 990 F", productId: "p001", read: false, at: new Date(Date.now() - 3 * 36e5).toISOString() },
      { id: "n3", kind: "system", title: "Bienvenue sur ARRIVAGE", body: "Ceci est une version de démonstration. Les notifications sont simulées dans l'application.", read: true, at: new Date(Date.now() - 6 * 864e5).toISOString() },
    ],
    searchLog: {},
    users: structuredClone(USERS),
    reports: REPORTS.map((r) => ({ ...r, history: [{ at: r.at, by: "client" as const, kind: "created" as const, text: "Signalement : " + r.reason }] })),
    categories: CATEGORIES.map((c) => ({ id: c.id, active: true })),
    activity: [
      { id: "ac1", at: new Date(Date.now() - 2 * 36e5).toISOString(), text: "Baie Sneakers a publié « Nike Air Max 95 »", space: "commerçant" },
      { id: "ac2", at: new Date(Date.now() - 3 * 36e5).toISOString(), text: "Pixel Lagon a publié « PlayStation 5 Pro »", space: "commerçant" },
      { id: "ac3", at: new Date(Date.now() - 14 * 36e5).toISOString(), text: "Nouveau signalement sur « Boissons énergisantes importées »", space: "consommateur" },
    ],
    fin: structuredClone(DEFAULT_INPUTS),
    savedScenarios: [],
    profile: { commune: "Nouméa", interests: ["gaming", "nautisme", "sneakers"] },
    currentMerchant: "m-pixel",
    settings: { manualApproval: true, moderateReviews: true },
    reservations: [...seedReservations(), visitorSeed()],
    reviews: seedReviews(),
    staff: seedStaff(),
    actAs: null,
  };
}

function load(): { state: State; storage: boolean } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.v === 3) { // migration sans perte depuis la V1
        s.reports = (s.reports || []).map((r: any) => ({ ...r, history: r.history || [{ at: r.at, by: "client", kind: "created", text: "Signalement : " + r.reason }] }));
        s.v = VERSION;
      }
      if (s && s.v === VERSION) {
        const seedRep: Record<string, string> = { r1: "u1047", r2: "u1061", r3: "u1047" };
        (s.reports || []).forEach((r: any) => { if (!r.reporterId) r.reporterId = seedRep[r.id] || "visitor"; });
        if (!s.settings) { s.settings = { manualApproval: true }; for (const m of PENDING_MERCHANTS) if (!s.merchants.find((x: any) => x.id === m.id)) s.merchants.push(structuredClone(m)); }
        (s.products || []).forEach((p: any) => { if (p.tryOn === undefined) p.tryOn = TRYON_SEED.has(p.id); });
        if (!s.reservations) s.reservations = seedReservations();
        if (!s.reservations.find((r: any) => r.id === "rs4")) s.reservations.push(...extraSeeds());
        if (!s.reviews) { s.reviews = seedReviews(); s.settings.moderateReviews = true; if (!s.reservations.find((r: any) => r.id === "rs12")) s.reservations.push(visitorSeed()); }
        if (!s.staff) { s.staff = seedStaff(); s.actAs = null; }
        return { state: s, storage: true };
      }
    }
    return { state: initialState(), storage: true };
  } catch {
    return { state: initialState(), storage: false };
  }
}

// ---- Correspondance alertes ----
const STOP = new Set(["de", "du", "des", "la", "le", "les", "et", "sur", "pour", "en", "a", "taille", "edition", "pack", "the", "un", "une"]);
export const tokens = (s: string) => norm(s).split(/[^a-z0-9/]+/).filter((t) => t.length >= 2 && !STOP.has(t));

export function productHay(p: Product, m?: Merchant) {
  return norm([p.name, p.brand, p.tags.join(" "), p.description, catById(p.category).label, m?.name || ""].join(" "));
}

export function alertMatches(a: Alert, p: Product, m?: Merchant) {
  if (p.state !== "published" || p.status === "out") return false;
  if (a.category && a.category !== p.category) return false;
  if (a.maxBudget && p.price > a.maxBudget) return false;
  if (a.commune && m && m.commune !== a.commune) return false;
  const hay = productHay(p, m);
  if (a.brand && !hay.includes(norm(a.brand))) return false;
  const t = tokens(a.query);
  if (!t.length) return false;
  const hits = t.filter((x) => hay.includes(x)).length;
  return hits / t.length >= 0.6;
}

// ---- Contexte ----
interface Ctx {
  s: State;
  storageOk: boolean;
  mutate: (fn: (d: State) => void) => void;
  toast: (msg: string, tone?: "ok" | "info" | "warn") => void;
  toasts: { id: string; msg: string; tone: string }[];
  log: (d: State, text: string, space: Activity["space"]) => void;
  publish: (d: State, p: Product) => number; // déclenche alertes + abonnés, renvoie le nb d'alertes déclenchées
  reset: () => void;
}
const C = createContext<Ctx>(null as any);
export const useStore = () => useContext(C);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const first = useRef(load());
  const [s, setS] = useState<State>(first.current.state);
  const [storageOk, setStorageOk] = useState(first.current.storage);
  const [toasts, setToasts] = useState<{ id: string; msg: string; tone: string }[]>([]);

  const toast = useCallback((msg: string, tone: "ok" | "info" | "warn" = "ok") => {
    const id = uid();
    setToasts((t) => [...t.slice(-2), { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const mutate = useCallback((fn: (d: State) => void) => {
    setS((prev) => { const d = structuredClone(prev); fn(d); return d; });
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(s)); if (!storageOk) setStorageOk(true); }
    catch { if (storageOk) { setStorageOk(false); } }
  }, [s]);

  const log = (d: State, text: string, space: Activity["space"]) => {
    d.activity.unshift({ id: uid(), at: nowIso(), text, space });
    d.activity = d.activity.slice(0, 60);
  };

  const publish = (d: State, p: Product) => {
    const m = d.merchants.find((x) => x.id === p.merchantId);
    let hits = 0;
    for (const a of d.alerts) {
      if (a.active && alertMatches(a, p, m)) {
        hits++;
        a.lastMatchAt = nowIso();
        d.notifications.unshift({ id: uid(), kind: "alert", title: `Votre alerte « ${a.query} » a trouvé un produit`, body: `${m?.name} · ${p.name} · ${p.price.toLocaleString("fr-FR")} F`, productId: p.id, read: false, at: nowIso() });
      }
    }
    if (d.follows.includes(p.merchantId)) {
      d.notifications.unshift({ id: uid(), kind: "follow", title: `${m?.name} a publié un arrivage`, body: `${p.name} · ${p.price.toLocaleString("fr-FR")} F`, productId: p.id, read: false, at: nowIso() });
    }
    // alertes de la communauté simulée (agrégées) : incrémente le compteur côté commerçant
    p.alertHits = (p.alertHits || 0) + hits;
    return hits;
  };

  const reset = () => {
    try { localStorage.removeItem(KEY); } catch {}
    setS(initialState());
    toast("Données de démonstration réinitialisées", "info");
  };

  // Programmation simulée : publie les arrivages programmés dont l'heure est passée
  useEffect(() => {
    const t = setInterval(() => {
      const due = s.products.filter((p) => p.state === "scheduled" && p.scheduledAt && new Date(p.scheduledAt).getTime() <= Date.now());
      if (!due.length) return;
      let total = 0;
      mutate((d) => {
        for (const p of d.products) {
          if (p.state === "scheduled" && p.scheduledAt && new Date(p.scheduledAt).getTime() <= Date.now()) {
            p.state = "published"; p.publishedAt = nowIso(); p.updatedAt = nowIso(); p.scheduledAt = null;
            total += publish(d, p);
            log(d, `Publication programmée mise en ligne : « ${p.name} »`, "commerçant");
          }
        }
      });
      toast(`${due.length} publication(s) programmée(s) mise(s) en ligne`, "info");
    }, 5000);
    return () => clearInterval(t);
  }, [s.products]);

  return <C.Provider value={{ s, storageOk, mutate, toast, toasts, log, publish, reset }}>{children}</C.Provider>;
}

export const newId = uid;
export { COMMUNES };
