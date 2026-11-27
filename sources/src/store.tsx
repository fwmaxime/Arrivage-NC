import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { CATEGORIES, Product, Merchant, norm, catById, COMMUNES } from "./data";
import { DEFAULT_INPUTS, FinInputs } from "./finance";
import type { Reservation } from "./reservations";
import type { Review } from "./reviews";
import type { Staff } from "./staff";
import { sb, stable, idToEmail, authError } from "./backend";
import { dealWords, dealEnded } from "./deals";
import { markBlockedDevice } from "./blocked";

export interface Alert { id: string; query: string; brand: string; category: string; maxBudget: number | null; commune: string; features: string; active: boolean; createdAt: string; lastMatchAt?: string | null }
export interface Notif { id: string; kind: "alert" | "follow" | "system" | "order"; title: string; body: string; productId?: string; read: boolean; at: string }
export interface Activity { id: string; at: string; text: string; space: "consommateur" | "commerçant" | "admin" }
export type ReportStatus = "open" | "waiting" | "fixed" | "resolved" | "removed";
export interface ReportEvent { at: string; by: "admin" | "boutique" | "client" | "système"; kind: "created" | "message" | "call" | "edit" | "status" | "reply"; text: string }
export interface Report { id: string; productId: string; reason: string; at: string; status: ReportStatus; history: ReportEvent[]; reporterId?: string; merchantUnread?: boolean; adminUnread?: boolean }
export type Role = "client" | "merchant" | "admin";
export interface Me { id: string; email: string; username?: string | null; displayName: string; role: Role; blocked: boolean; createdAt?: string }
export interface UserRow { id: string; label: string; email: string; role: Role; commune: string; joinedAt: string; alerts: number; favorites: number; status: "active" | "blocked" }

export interface State {
  v: number;
  products: Product[];
  merchants: Merchant[];
  favorites: string[];
  follows: string[];
  alerts: Alert[];
  notifications: Notif[];
  searchLog: Record<string, number>;
  users: UserRow[];
  reports: Report[];
  categories: { id: string; active: boolean }[];
  activity: Activity[];
  fin: FinInputs;
  savedScenarios: { id: string; name: string; inputs: FinInputs }[];
  profile: { commune: string; interests: string[]; blocked?: boolean };
  currentMerchant: string;
  settings: { manualApproval: boolean; moderateReviews?: boolean; standby?: boolean };
  reservations: Reservation[];
  reviews: Review[];
  staff: Staff[];
  actAs?: string | null;
  lastSeen?: string | null;
  me: Me | null;
  ready: boolean;
}

const LOCAL_KEY = "arrivage-local-v1";
const USER_KEYS = ["favorites", "follows", "alerts", "notifications", "profile", "searchLog", "fin", "savedScenarios", "currentMerchant", "actAs", "lastSeen"] as const;
const COLLS = ["merchants", "products", "reservations", "reviews", "reports", "staff", "activity"] as const;
type Coll = typeof COLLS[number];
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const nowIso = () => new Date().toISOString();

function userDefaults() {
  return {
    favorites: [] as string[], follows: [] as string[], alerts: [] as Alert[],
    notifications: [{ id: "welcome", kind: "system", title: "Bienvenue sur ARRIVAGE", body: "Suivez vos commerces préférés et créez des alertes : vous serez prévenu ici dès qu'un produit recherché arrive.", read: false, at: nowIso() }] as Notif[],
    profile: { commune: "", interests: [] as string[] }, searchLog: {} as Record<string, number>,
    fin: structuredClone(DEFAULT_INPUTS), savedScenarios: [] as State["savedScenarios"], currentMerchant: "", actAs: null as string | null, lastSeen: null as string | null,
  };
}

export function initialState(): State {
  return {
    v: 5, products: [], merchants: [], users: [], reports: [], activity: [], reservations: [], reviews: [], staff: [],
    categories: CATEGORIES.map((c) => ({ id: c.id, active: true })),
    settings: { manualApproval: true, moderateReviews: true },
    me: null, ready: false,
    ...userDefaults(),
  };
}

function pickUser(s: any) { const o: any = {}; for (const k of USER_KEYS) o[k] = s[k]; return o; }
function mergeUser(base: any, saved: any) {
  const d = userDefaults() as any;
  const out: any = { ...d };
  if (saved && typeof saved === "object") for (const k of USER_KEYS) if (saved[k] !== undefined && saved[k] !== null) out[k] = saved[k];
  out.profile = { ...d.profile, ...(out.profile || {}) };
  out.fin = { ...d.fin, ...(out.fin || {}) };
  return { ...base, ...out };
}
function loadLocal(): any { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "null"); } catch { return null; } }

// ---- Correspondance alertes ----
const STOP = new Set(["de", "du", "des", "la", "le", "les", "et", "sur", "pour", "en", "a", "taille", "edition", "pack", "the", "un", "une"]);
export const tokens = (s: string) => norm(s).split(/[^a-z0-9/]+/).filter((t) => t.length >= 2 && !STOP.has(t));

export function productHay(p: Product, m?: Merchant) {
  return norm([p.name, p.brand, p.tags.join(" "), p.description, catById(p.category).label, m?.name || "", dealWords(p)].join(" "));
}

export function alertMatches(a: Alert, p: Product, m?: Merchant) {
  if (p.state !== "published" || p.status === "out" || dealEnded(p)) return false;
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

// Qui peut écrire quoi (miroir des règles du serveur, pour éviter des envois refusés)
function owns(s: State, mid: string) { return !!s.me && s.merchants.some((m) => m.id === mid && (m as any).ownerId === s.me!.id); }
// Comptes employés : la fiche « staff » active de la personne connectée pour ce commerce (rôle gérant ou vendeur)
export function myStaffRow(s: State, mid: string): Staff | undefined { return s.me ? s.staff.find((x) => x.merchantId === mid && x.userId === s.me!.id && x.status === "active") : undefined; }
const manages = (s: State, mid: string) => owns(s, mid) || myStaffRow(s, mid)?.role === "manager";
function canWrite(s: State, c: Coll, row: any): boolean {
  const me = s.me; if (!me) return false;
  const admin = me.role === "admin";
  switch (c) {
    case "merchants": return admin || row.ownerId === me.id || myStaffRow(s, row.id)?.role === "manager";
    case "products": return admin || manages(s, row.merchantId) || !!myStaffRow(s, row.merchantId);
    case "reservations": return admin || row.buyerId === me.id || manages(s, row.merchantId);
    case "reviews": return admin || row.authorId === me.id || manages(s, row.merchantId);
    case "reports": { const p = s.products.find((x) => x.id === row.productId); return admin || row.reporterId === me.id || (!!p && manages(s, p.merchantId)); }
    case "staff": return admin || owns(s, row.merchantId);
    case "activity": return true;
  }
}

export function myId(s: State) { return s.me?.id || "anonyme"; }
export const isAdmin = (s: State) => s.me?.role === "admin";
// Commerces que la personne connectée gère : les siens, et ceux où elle est employée (invitation acceptée)
export const myMerchants = (s: State) => s.me ? s.merchants.filter((m) => (m as any).ownerId === s.me!.id || !!myStaffRow(s, m.id)) : [];

export interface DemandRaw { alerts: { q: string; c: string; b: number | null; m: string | null }[]; searches: Record<string, number>; prev: Record<string, number>; users: number }

// ---- Contexte ----
interface AuthPrompt { reason?: string; tab?: "login" | "signup" | "forgot" | "reset" }
interface Ctx {
  s: State;
  storageOk: boolean;
  mutate: (fn: (d: State) => void) => void;
  toast: (msg: string, tone?: "ok" | "info" | "warn") => void;
  toasts: { id: string; msg: string; tone: string }[];
  log: (d: State, text: string, space: Activity["space"]) => void;
  publish: (d: State, p: Product) => number;
  online: boolean;
  auth: AuthPrompt | null;
  openAuth: (reason?: string, tab?: AuthPrompt["tab"]) => void;
  closeAuth: () => void;
  requireAccount: (reason: string) => boolean;
  signIn: (id: string, pw: string) => Promise<string | null>;
  signUp: (email: string, pw: string, name: string) => Promise<{ error: string | null; confirm?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
  updatePassword: (pw: string) => Promise<string | null>;
  updateName: (name: string) => Promise<string | null>;
  demand: () => Promise<DemandRaw | null>;
  merchantStats: (mid: string) => Promise<{ d: string; m: string; c: string; n: number }[]>;
  reload: () => Promise<void>;
}
const C = createContext<Ctx>(null as any);
export const StoreCtx = C;
export const useStore = () => useContext(C);

async function fetchColl(t: string, opts?: { order?: boolean }) {
  let q: any = sb!.from(t).select("id,data");
  if (opts?.order) q = q.order("created_at", { ascending: false }).limit(200);
  else q = q.limit(10000);
  const { data, error } = await q;
  if (error) { console.warn("Lecture", t, error.message); return []; }
  return (data || []).map((r: any) => ({ ...r.data, id: r.id }));
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<State>(() => mergeUser(initialState(), loadLocal()));
  const [storageOk] = useState(true);
  const [toasts, setToasts] = useState<{ id: string; msg: string; tone: string }[]>([]);
  const [auth, setAuth] = useState<AuthPrompt | null>(null);
  const synced = useRef<Record<string, Map<string, string>>>({});
  const syncedUser = useRef<string>("");
  const syncedCfg = useRef<string>("");
  const syncedUsers = useRef<Map<string, string>>(new Map());
  const prevFav = useRef<{ favorites: string[]; follows: string[]; searchLog: Record<string, number> } | null>(null);
  const cur = useRef(s); cur.current = s;
  const warned = useRef(false);

  const toast = useCallback((msg: string, tone: "ok" | "info" | "warn" = "ok") => {
    const id = uid();
    setToasts((t) => [...t.slice(-2), { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const mutate = useCallback((fn: (d: State) => void) => {
    setS((prev) => { const d = structuredClone(prev); fn(d); return d; });
  }, []);

  // ---------- Chargement depuis le serveur ----------
  const loadAll = useCallback(async (me: Me | null, savedUser?: any) => {
    if (!sb) { setS((x) => ({ ...x, ready: true })); return; }
    const admin = me?.role === "admin";
    const [merchants, products, reviews, cfg, reservations, reports, staff, activity, profiles, states] = await Promise.all([
      fetchColl("merchants"), fetchColl("products"), fetchColl("reviews"),
      sb.from("config").select("data").eq("id", "main").maybeSingle().then((r) => r.data?.data || {}),
      me ? fetchColl("reservations") : [], me ? fetchColl("reports") : [], me ? fetchColl("staff") : [],
      admin ? fetchColl("activity", { order: true }) : [],
      admin ? sb.from("profiles").select("*").then((r) => r.data || []) : [],
      admin ? sb.from("user_state").select("id,data").then((r) => r.data || []) : [],
    ]);
    const snap: Record<string, Map<string, string>> = {};
    const all: Record<Coll, any[]> = { merchants, products, reviews, reservations, reports, staff, activity } as any;
    for (const c of COLLS) snap[c] = new Map(all[c].map((r: any) => [r.id, stable(r)]));
    synced.current = snap;
    const st: any = new Map((states as any[]).map((x) => [x.id, x.data || {}]));
    const users: UserRow[] = (profiles as any[]).map((p) => {
      const d = st.get(p.id) || {};
      return { id: p.id, label: p.display_name || p.username || p.email, email: p.email || "", role: p.role, commune: d.profile?.commune || "", joinedAt: p.created_at, alerts: (d.alerts || []).length, favorites: (d.favorites || []).length, status: p.blocked ? "blocked" : "active" };
    });
    syncedUsers.current = new Map(users.map((u) => [u.id, u.status]));
    const settings = { manualApproval: true, moderateReviews: true, ...(cfg.settings || {}) };
    const categories = CATEGORIES.map((c) => ({ id: c.id, active: (cfg.categories || []).find((x: any) => x.id === c.id)?.active ?? true }));
    syncedCfg.current = stable({ settings, categories });

    setS((prev) => {
      let next: State = { ...prev, merchants, products, reviews, reservations, reports, staff, activity, users, settings, categories, me, ready: true };
      if (savedUser !== undefined) {
        next = mergeUser(next, savedUser);
        // première connexion : on garde favoris et alertes faits sans compte
        const local = loadLocal();
        if (local && !savedUser) {
          next.favorites = Array.from(new Set([...(local.favorites || [])]));
          next.follows = Array.from(new Set([...(local.follows || [])]));
          next.alerts = local.alerts || [];
          next.profile = { ...next.profile, ...(local.profile || {}) };
        }
        syncedUser.current = savedUser ? stable(pickUser(mergeUser({}, savedUser))) : "";
      }
      if (me) next.profile = { ...next.profile, blocked: me.blocked };
      // compteurs : la valeur serveur inclut déjà mon favori / abonnement
      next.products = next.products.map((p) => next.favorites.includes(p.id) && p.favBase > 0 ? { ...p, favBase: p.favBase - 1 } : p);
      next.merchants = next.merchants.map((m) => next.follows.includes(m.id) && m.followersBase > 0 ? { ...m, followersBase: m.followersBase - 1 } : m);
      for (const p of next.products) synced.current.products.set(p.id, stable(p));
      for (const m of next.merchants) synced.current.merchants.set(m.id, stable(m));
      // commerce courant
      const mine = me ? myMerchants({ ...next, me }) : [];
      if (me && !(me.role === "admin" ? next.merchants : mine).some((m) => m.id === next.currentMerchant)) next.currentMerchant = (mine[0] || (me.role === "admin" ? next.merchants[0] : undefined))?.id || "";
      // arrivages programmés arrivés à échéance
      next.products = next.products.map((p) => p.state === "scheduled" && p.scheduledAt && new Date(p.scheduledAt).getTime() <= Date.now() ? { ...p, state: "published", publishedAt: p.scheduledAt, scheduledAt: null } : p);
      next = checkAlerts(next);
      prevFav.current = { favorites: next.favorites, follows: next.follows, searchLog: next.searchLog };
      return next;
    });
  }, []);

  // Alertes et abonnements : nouveaux produits depuis la dernière visite
  function checkAlerts(d: State): State {
    d = { ...d, alerts: d.alerts.map((a) => ({ ...a })), notifications: [...d.notifications] };
    const since = d.lastSeen ? new Date(d.lastSeen).getTime() : Date.now();
    for (const p of d.products) {
      if (p.state !== "published") continue;
      const m = d.merchants.find((x) => x.id === p.merchantId);
      const at = new Date(p.publishedAt).getTime();
      for (const a of d.alerts) {
        const from = new Date(a.lastMatchAt || a.createdAt).getTime();
        if (a.active && at > from && (!d.me || p.merchantId === "" || !owns(d, p.merchantId)) && alertMatches(a, p, m) && !d.notifications.some((n) => n.kind === "alert" && n.productId === p.id)) {
          d.notifications.unshift({ id: uid(), kind: "alert", title: `Votre alerte « ${a.query} » a trouvé un produit`, body: `${m?.name || ""} · ${p.name} · ${p.price.toLocaleString("fr-FR")} F`, productId: p.id, read: false, at: nowIso() });
          a.lastMatchAt = nowIso();
          sb?.rpc("bump", { t: "products", rid: p.id, field: "alertHits", delta: 1, com: d.profile.commune || "" }).then(() => {}, () => {});
        }
      }
      if (d.lastSeen && at > since && d.follows.includes(p.merchantId) && !d.notifications.some((n) => n.kind === "follow" && n.productId === p.id)) {
        d.notifications.unshift({ id: uid(), kind: "follow", title: `${m?.name || "Un commerce suivi"} a publié un arrivage`, body: `${p.name} · ${p.price.toLocaleString("fr-FR")} F`, productId: p.id, read: false, at: nowIso() });
      }
    }
    d.notifications = d.notifications.slice(0, 80);
    d.lastSeen = nowIso();
    return d;
  }

  const fetchMe = async (userId: string, email: string): Promise<{ me: Me; saved: any }> => {
    const [{ data: p }, { data: us }] = await Promise.all([
      sb!.from("profiles").select("*").eq("id", userId).maybeSingle(),
      sb!.from("user_state").select("data").eq("id", userId).maybeSingle(),
    ]);
    const me: Me = { id: userId, email: p?.email || email, username: p?.username, displayName: p?.display_name || p?.username || email.split("@")[0], role: (p?.role || "client") as Role, blocked: !!p?.blocked, createdAt: p?.created_at };
    return { me, saved: us?.data || null };
  };

  // Session au démarrage + changements de connexion
  useEffect(() => {
    if (!sb) { setS((x) => ({ ...x, ready: true })); return; }
    let lastUser: string | null | undefined;
    const handle = async (session: any) => {
      const u = session?.user;
      const id = u?.id || null;
      if (id === lastUser) return;
      lastUser = id;
      if (u) {
        const { me, saved } = await fetchMe(u.id, u.email || "");
        if (me.blocked && me.role !== "admin") { markBlockedDevice(me.id); setS((x) => ({ ...x, me })); try { localStorage.removeItem(LOCAL_KEY); } catch {} await sb!.auth.signOut().catch(() => {}); return; }
        await loadAll(me, saved);
      }
      else {
        if (cur.current.me) setS((x) => mergeUser({ ...x, me: null }, loadLocal()));
        syncedUser.current = "";
        await loadAll(null);
      }
    };
    sb.auth.getSession().then(({ data }) => handle(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((e, session) => { if (e === "PASSWORD_RECOVERY") setAuth({ tab: "reset" }); setTimeout(() => handle(session), 0); });
    // Blocage par la modération : vérifié toutes les 20 s et au retour sur l'onglet. Dès qu'il est constaté, l'appareil est marqué et la session fermée.
    const checkBlocked = async () => {
      const me = cur.current.me;
      if (!me || me.role === "admin" || document.visibilityState !== "visible") return;
      const { data } = await sb!.from("profiles").select("blocked").eq("id", me.id).maybeSingle();
      if (!data?.blocked) return;
      markBlockedDevice(me.id);
      setS((x) => (x.me ? { ...x, me: { ...x.me, blocked: true } } : x));
      try { localStorage.removeItem(LOCAL_KEY); } catch {}
      await sb!.auth.signOut().catch(() => {});
    };
    const tb = setInterval(checkBlocked, 20000);
    document.addEventListener("visibilitychange", checkBlocked);
    // rafraîchissement régulier (nouvelles réservations, signalements…)
    const t = setInterval(() => { if (document.visibilityState === "visible" && cur.current.me) loadAll(cur.current.me); }, 90000);
    return () => { sub.subscription.unsubscribe(); clearInterval(t); clearInterval(tb); document.removeEventListener("visibilitychange", checkBlocked); };
  }, []);

  // ---------- Envoi des modifications au serveur ----------
  const userTimer = useRef<any>(null);
  useEffect(() => {
    if (!s.ready) return;
    // données personnelles
    const u = pickUser(s);
    if (s.me) {
      const str = stable(u);
      if (str !== syncedUser.current && sb) {
        clearTimeout(userTimer.current);
        const meId = s.me.id;
        userTimer.current = setTimeout(() => {
          syncedUser.current = str;
          sb!.from("user_state").upsert({ id: meId, data: u }).then(({ error }) => { if (error) console.warn("user_state", error.message); });
        }, 700);
      }
    } else {
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(u)); } catch {}
    }
    if (!sb) return;
    // compteurs publics : favoris, abonnements, recherches
    const pf = prevFav.current;
    if (pf) {
      for (const id of s.favorites) if (!pf.favorites.includes(id)) bump("products", id, "favBase", 1);
      for (const id of pf.favorites) if (!s.favorites.includes(id)) bump("products", id, "favBase", -1);
      for (const id of s.follows) if (!pf.follows.includes(id)) bump("merchants", id, "followersBase", 1);
      for (const id of pf.follows) if (!s.follows.includes(id)) bump("merchants", id, "followersBase", -1);
      for (const [k, n] of Object.entries(s.searchLog)) if (n > (pf.searchLog[k] || 0)) sb.rpc("log_search", { q: k }).then(() => {}, () => {});
    }
    prevFav.current = { favorites: s.favorites, follows: s.follows, searchLog: s.searchLog };

    // réglages admin
    if (s.me?.role === "admin") {
      const cfg = stable({ settings: s.settings, categories: s.categories });
      if (cfg !== syncedCfg.current) { syncedCfg.current = cfg; sb.from("config").upsert({ id: "main", data: { settings: s.settings, categories: s.categories } }).then(({ error }) => error && warn(error.message)); }
      for (const usr of s.users) if (syncedUsers.current.get(usr.id) !== usr.status) {
        syncedUsers.current.set(usr.id, usr.status);
        sb.from("profiles").update({ blocked: usr.status === "blocked" }).eq("id", usr.id).then(({ error }) => error && warn(error.message));
      }
    }

    // collections
    for (const c of COLLS) {
      const map = synced.current[c] || (synced.current[c] = new Map());
      const rows: any[] = (s as any)[c];
      const ups: any[] = [];
      const seen = new Set<string>();
      for (const r of rows) {
        seen.add(r.id);
        const str = stable(r);
        const old = map.get(r.id);
        if (old === str) continue;
        if (c === "activity" && old !== undefined) { map.set(r.id, str); continue; }
        if (canWrite(s, c, r)) ups.push(r);
        else if (old && (c === "products")) {
          const o = JSON.parse(old);
          for (const f of ["views", "contacts"]) if ((r[f] || 0) > (o[f] || 0)) bump("products", r.id, f, 1);
        }
        map.set(r.id, str);
      }
      if (c !== "activity") {
        const dels: string[] = [];
        for (const [id, str] of map) if (!seen.has(id)) { if (canWrite(s, c, JSON.parse(str))) dels.push(id); map.delete(id); }
        if (dels.length) sb.from(c).delete().in("id", dels).then(({ error }) => error && warn(error.message));
      }
      if (ups.length) push(c, ups);
    }
  }, [s]);

  function warn(m: string) {
    console.warn(m);
    if (!warned.current) { warned.current = true; toast("Une modification n'a pas pu être enregistrée sur le serveur", "warn"); setTimeout(() => (warned.current = false), 8000); }
  }
  function bump(t: string, rid: string, field: string, delta: number) {
    sb?.rpc("bump", { t, rid, field, delta, com: cur.current.profile.commune || "" }).then(({ error }) => { if (error) console.warn("bump", error.message); });
  }
  async function push(c: Coll, rows: any[]) {
    const payload = rows.map((r) => ({ id: r.id, data: r }));
    const q = c === "activity" ? sb!.from(c).insert(payload) : sb!.from(c).upsert(payload).select("id,data");
    const { data, error } = await (q as any);
    if (error) { warn(`${c}: ${error.message}`); return; }
    if (c === "activity" || !data) return;
    // le serveur a pu corriger des champs protégés (statut, forfait, compteurs…)
    const fixed = (data as any[]).map((x) => ({ ...x.data, id: x.id })).filter((x) => stable(x) !== stable(rows.find((r) => r.id === x.id)));
    if (!fixed.length) return;
    for (const x of fixed) synced.current[c].set(x.id, stable(x));
    setS((prev) => ({ ...prev, [c]: (prev as any)[c].map((r: any) => fixed.find((x) => x.id === r.id) || r) }));
  }

  const log = (d: State, text: string, space: Activity["space"]) => {
    if (!d.me) return;
    d.activity.unshift({ id: uid(), at: nowIso(), text, space });
    d.activity = d.activity.slice(0, 200);
  };

  const publish = (d: State, p: Product) => {
    // Les alertes des clients sont vérifiées sur leur appareil à leur prochaine visite.
    p.alertHits = p.alertHits || 0;
    return 0;
  };

  // Programmation : publie les arrivages programmés dont l'heure est passée
  useEffect(() => {
    const t = setInterval(() => {
      const due = s.products.filter((p) => p.state === "scheduled" && p.scheduledAt && new Date(p.scheduledAt).getTime() <= Date.now());
      if (!due.length) return;
      mutate((d) => {
        for (const p of d.products) {
          if (p.state === "scheduled" && p.scheduledAt && new Date(p.scheduledAt).getTime() <= Date.now()) {
            p.state = "published"; p.publishedAt = p.scheduledAt; p.updatedAt = nowIso(); p.scheduledAt = null;
          }
        }
      });
    }, 15000);
    return () => clearInterval(t);
  }, [s.products]);

  // ---------- Comptes ----------
  const openAuth = (reason?: string, tab?: AuthPrompt["tab"]) => setAuth({ reason, tab });
  const closeAuth = () => setAuth(null);
  const requireAccount = (reason: string) => { if (cur.current.me) return true; openAuth(reason); return false; };
  const signIn = async (id: string, pw: string) => {
    if (!sb) return "Service de connexion indisponible.";
    const { error } = await sb.auth.signInWithPassword({ email: idToEmail(id), password: pw });
    if (error) return authError(error.message);
    setAuth(null); toast("Vous êtes connecté");
    return null;
  };
  const signUp = async (email: string, pw: string, name: string) => {
    if (!sb) return { error: "Service d'inscription indisponible." };
    const { data, error } = await sb.auth.signUp({ email: email.trim().toLowerCase(), password: pw, options: { data: { display_name: name.trim() }, emailRedirectTo: location.origin + location.pathname } });
    if (error) return { error: authError(error.message) };
    if (!data.session) return { error: null, confirm: true };
    setAuth(null); toast("Compte créé, bienvenue sur ARRIVAGE");
    return { error: null };
  };
  const signOut = async () => {
    if (!sb) return;
    clearTimeout(userTimer.current);
    if (cur.current.me) { const u = pickUser(cur.current); await sb.from("user_state").upsert({ id: cur.current.me.id, data: u }); }
    try { localStorage.removeItem(LOCAL_KEY); } catch {}
    await sb.auth.signOut();
    setS((x) => ({ ...mergeUser({ ...x, me: null }, null) }));
    toast("Vous êtes déconnecté", "info");
  };
  const resetPassword = async (email: string) => {
    if (!sb) return "Service indisponible.";
    const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: location.origin + location.pathname });
    return error ? authError(error.message) : null;
  };
  const updatePassword = async (pw: string) => {
    if (!sb) return "Service indisponible.";
    const { error } = await sb.auth.updateUser({ password: pw });
    return error ? authError(error.message) : null;
  };
  const updateName = async (name: string) => {
    if (!sb || !cur.current.me) return "Service indisponible.";
    const { error } = await sb.from("profiles").update({ display_name: name.trim() }).eq("id", cur.current.me.id);
    if (error) return authError(error.message);
    setS((x) => ({ ...x, me: x.me ? { ...x.me, displayName: name.trim() } : x.me }));
    return null;
  };
  const demand = async () => {
    if (!sb) return null;
    const { data, error } = await sb.rpc("demand_stats");
    if (error) { console.warn(error.message); return null; }
    return data as DemandRaw;
  };
  const merchantStats = async (mid: string) => {
    if (!sb) return [];
    const { data, error } = await sb.rpc("merchant_stats", { mid, days: 90 });
    if (error) return [];
    return (data || []) as any[];
  };
  const reload = async () => { await loadAll(cur.current.me); };

  return <C.Provider value={{ s, storageOk, mutate, toast, toasts, log, publish, online: !!sb, auth, openAuth, closeAuth, requireAccount, signIn, signUp, signOut, resetPassword, updatePassword, updateName, demand, merchantStats, reload }}>{children}</C.Provider>;
}

export const newId = uid;
export { COMMUNES };
