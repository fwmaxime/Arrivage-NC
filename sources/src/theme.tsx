import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Palette, RotateCcw, Shuffle, Check, Sun, Moon, MonitorSmartphone, TriangleAlert, Link2 } from "lucide-react";
import { NavCtx, Mode } from "./nav";
import { Btn, cx, Logo, Segmented } from "./ui";

// ---------- Modèle ----------
export type ThemeMode = "light" | "dark" | "auto";
export type FontId = "arrivage" | "moderne" | "editorial" | "doux" | "systeme";
export type RadiusId = "net" | "standard" | "arrondi";
export interface Theme { preset: string; mode: ThemeMode; brand: string; accent: string; paper: string; font: FontId; radius: RadiusId }
interface ThemeStore { linked: boolean; themes: Record<Mode, Theme> }

export const PRESETS: { id: string; name: string; desc: string; brand: string; accent: string; paper: string; mode?: ThemeMode; font?: FontId }[] = [
  { id: "lagon", name: "ARRIVAGE", desc: "Vert profond et orange, le thème d'origine", brand: "#203C31", accent: "#E77938", paper: "#F5F5F1" },
  { id: "corail", name: "Corail", desc: "Bleu marine et corail", brand: "#1F2F4A", accent: "#F06B5B", paper: "#F6F4F0" },
  { id: "lagon-bleu", name: "Lagon bleu", desc: "Bleu canard et jaune soleil", brand: "#0F5C6E", accent: "#F2B53A", paper: "#F1F6F5" },
  { id: "niaouli", name: "Niaouli", desc: "Olive et moutarde, ton naturel", brand: "#4A5A2C", accent: "#D9A629", paper: "#F4F2E9" },
  { id: "flamboyant", name: "Flamboyant", desc: "Bordeaux et rouge orangé", brand: "#6B1E2E", accent: "#E4572E", paper: "#F8F3EF" },
  { id: "hibiscus", name: "Hibiscus", desc: "Prune et mandarine", brand: "#5E1F54", accent: "#F28C28", paper: "#FBF5F7" },
  { id: "graphite", name: "Graphite", desc: "Sobre, gris anthracite et bleu", brand: "#26282B", accent: "#3D7BF2", paper: "#F4F4F5", font: "moderne" },
  { id: "nuit", name: "Nuit", desc: "Mode sombre, vert et orange", brand: "#203C31", accent: "#E77938", paper: "#F5F5F1", mode: "dark" },
];

export const FONTS: { id: FontId; name: string; display: string; body: string }[] = [
  { id: "arrivage", name: "ARRIVAGE", display: '"Bricolage Grotesque", "Inter", ui-sans-serif, system-ui, sans-serif', body: '"Inter", ui-sans-serif, system-ui, sans-serif' },
  { id: "moderne", name: "Moderne", display: '"Manrope", ui-sans-serif, system-ui, sans-serif', body: '"Manrope", ui-sans-serif, system-ui, sans-serif' },
  { id: "editorial", name: "Éditorial", display: '"Fraunces", Georgia, serif', body: '"Inter", ui-sans-serif, system-ui, sans-serif' },
  { id: "doux", name: "Doux", display: '"Nunito", ui-rounded, ui-sans-serif, system-ui, sans-serif', body: '"Nunito", ui-rounded, ui-sans-serif, system-ui, sans-serif' },
  { id: "systeme", name: "Système", display: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', body: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
];
const RADII: Record<RadiusId, number> = { net: 0.35, standard: 1, arrondi: 1.45 };

const DEFAULT: Theme = { preset: "lagon", mode: "auto", brand: "#203C31", accent: "#E77938", paper: "#F5F5F1", font: "arrivage", radius: "standard" };
const KEY = "arrivage-v1-theme";
const SPACES: Mode[] = ["consumer", "merchant", "admin"];
export const SPACE_LABEL: Record<Mode, string> = { consumer: "Consommateur", merchant: "Commerçant", admin: "Admin et finances" };

function loadThemes(): ThemeStore {
  const base: ThemeStore = { linked: false, themes: { consumer: { ...DEFAULT }, merchant: { ...DEFAULT }, admin: { ...DEFAULT } } };
  try {
    const x = JSON.parse(localStorage.getItem(KEY) || "null");
    if (x && x.themes) for (const k of SPACES) if (x.themes[k]) base.themes[k] = sanitize({ ...DEFAULT, ...x.themes[k] });
    if (x && typeof x.linked === "boolean") base.linked = x.linked;
  } catch {}
  return base;
}
function sanitize(t: Theme): Theme {
  for (const k of ["brand", "accent", "paper"] as const) if (!isHex(t[k])) t[k] = DEFAULT[k];
  if (!["light", "dark", "auto"].includes(t.mode)) t.mode = "auto";
  if (!FONTS.find((f) => f.id === t.font)) t.font = "arrivage";
  if (!(t.radius in RADII)) t.radius = "standard";
  return t;
}

// ---------- Couleurs ----------
export const isHex = (h: any) => typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h);
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c: number[]) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
/** Mélange a vers b : t = 0 donne a, t = 1 donne b */
export const mix = (a: string, b: string, t: number) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
export const lum = (h: string) => { const [r, g, b] = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function toHsl(h: string) {
  const [r, g, b] = rgb(h).map((v) => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const l = (mx + mn) / 2; let s = 0, hu = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); hu = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hu *= 60; }
  return [hu, s, l];
}
function fromHsl(hu: number, s: number, l: number) {
  const k = (n: number) => (n + hu / 30) % 12; const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return hex([f(0) * 255, f(8) * 255, f(4) * 255]);
}
const withL = (h: string, l: number, sMin = 0) => { const [hu, s] = toHsl(h); return fromHsl(hu, Math.max(s, sMin), l); };
const LIGHT_INK = "#F5F5F1", DARK_INK = "#202720";
/** Texte lisible sur un fond donné (préférence au clair tant que le contraste reste correct) */
export const onColor = (bg: string, prefLight = 2.6) => (contrast(bg, LIGHT_INK) >= prefLight ? LIGHT_INK : DARK_INK);

export function computeVars(t: Theme, dark: boolean): Record<string, string> {
  const { brand: B, accent: A, paper: P } = t;
  const f = FONTS.find((x) => x.id === t.font) || FONTS[0];
  const v: Record<string, string> = { "--f-display": f.display, "--f-body": f.body, "--rs": String(RADII[t.radius] ?? 1) };
  const greenFg = onColor(B, 3);
  v["--green"] = B; v["--green-fg"] = greenFg; v["--green-fg-2"] = mix(greenFg, B, 0.18);
  v["--orange"] = A; v["--orange-fg"] = onColor(A) === LIGHT_INK ? "#FFFFFF" : DARK_INK;
  if (!dark) {
    const c1 = contrast(B, "#FFFFFF") < 2.2 ? mix(B, "#000000", 0.45) : B;
    Object.assign(v, {
      "--paper": P, "--bg": P, "--surface-2": mix(P, "#FFFFFF", 0.55), "--soft": mix(P, DARK_INK, 0.05), "--line": mix(P, DARK_INK, 0.08), "--line-2": mix(P, DARK_INK, 0.15),
      "--primary": B, "--primary-fg": greenFg, "--accent": A, "--accent-fg": onColor(A) === LIGHT_INK ? "#FFFFFF" : DARK_INK,
      "--side": B, "--side-fg": mix(greenFg, B, 0.14), "--side-strong": greenFg === LIGHT_INK ? "#FFFFFF" : DARK_INK, "--c1": c1,
    });
    const ink = mix(c1, P, 0);
    Object.assign(v, { "--ch-a": mix(ink, P, 0.2), "--ch-b": mix(ink, P, 0.38), "--ch-c": mix(ink, P, 0.58), "--ch-acc": A, "--ch-acc2": mix(A, P, 0.38), "--hero-ring": mix(A, B, 0.6) });
  } else {
    const base = (hexv: string, t2: number) => mix(hexv, B, t2);
    const c1 = withL(B, 0.72, 0.3);
    const acc = toHsl(A)[2] < 0.6 ? withL(A, 0.62) : A;
    Object.assign(v, {
      "--bg": base("#121614", 0.1), "--surface": base("#191E1B", 0.12), "--surface-2": base("#1D231F", 0.13), "--soft": base("#232A25", 0.15), "--line": base("#2A322D", 0.16), "--line-2": base("#36403A", 0.18),
      "--primary": mix("#ECEFE8", c1, 0.12), "--primary-fg": base("#111512", 0.25), "--accent": acc, "--accent-fg": "#1A120C",
      "--side": base("#0E1210", 0.22), "--side-fg": "#CBD3CD", "--side-strong": "#FFFFFF", "--c1": c1,
      "--ch-a": mix(c1, "#1A1F1C", 0.22), "--ch-b": mix(c1, "#1A1F1C", 0.4), "--ch-c": mix(c1, "#1A1F1C", 0.58), "--ch-acc": acc, "--ch-acc2": mix(acc, "#1A1F1C", 0.4), "--hero-ring": mix(acc, B, 0.6),
    });
  }
  return v;
}

// ---------- Contexte ----------
interface Ctx { store: ThemeStore; theme: (m: Mode) => Theme; set: (m: Mode, patch: Partial<Theme>) => void; setLinked: (on: boolean, from: Mode) => void; resetSpace: (m: Mode) => void; resetAll: () => void }
const TC = createContext<Ctx>(null as any);
export const useTheme = () => useContext(TC);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<ThemeStore>(loadThemes);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {} }, [store]);
  const api = useMemo<Ctx>(() => ({
    store,
    theme: (m) => store.themes[m],
    set: (m, patch) => setStore((s) => {
      const next = { ...s.themes[m], ...patch };
      const themes = { ...s.themes };
      for (const k of s.linked ? SPACES : [m]) themes[k] = { ...next };
      return { ...s, themes };
    }),
    setLinked: (on, from) => setStore((s) => ({ linked: on, themes: on ? { consumer: { ...s.themes[from] }, merchant: { ...s.themes[from] }, admin: { ...s.themes[from] } } : s.themes })),
    resetSpace: (m) => setStore((s) => { const themes = { ...s.themes }; for (const k of s.linked ? SPACES : [m]) themes[k] = { ...DEFAULT }; return { ...s, themes }; }),
    resetAll: () => setStore({ linked: false, themes: { consumer: { ...DEFAULT }, merchant: { ...DEFAULT }, admin: { ...DEFAULT } } }),
  }), [store]);
  return <TC.Provider value={api}>{children}</TC.Provider>;
}

// Attribut data-theme d'origine (fourni par l'hôte), restauré en mode automatique
const HOST_ATTR = typeof document !== "undefined" ? document.documentElement.getAttribute("data-theme") : null;
const APPLIED = new Set<string>();
const prefersDark = () => { try { return window.matchMedia("(prefers-color-scheme: dark)").matches; } catch { return false; } };

/** Applique le thème de l'espace courant sur :root */
export function useApplyTheme(mode: Mode) {
  const { theme } = useTheme();
  const t = theme(mode);
  const [sys, setSys] = useState(prefersDark);
  useEffect(() => {
    let mq: MediaQueryList | null = null;
    try { mq = window.matchMedia("(prefers-color-scheme: dark)"); } catch {}
    const h = () => setSys(prefersDark());
    mq?.addEventListener?.("change", h);
    return () => mq?.removeEventListener?.("change", h);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    let dark: boolean;
    if (t.mode === "auto") {
      if (HOST_ATTR) root.setAttribute("data-theme", HOST_ATTR); else root.removeAttribute("data-theme");
      dark = HOST_ATTR ? HOST_ATTR === "dark" : sys;
    } else { root.setAttribute("data-theme", t.mode); dark = t.mode === "dark"; }
    const vars = computeVars(t, dark);
    for (const k of APPLIED) if (!(k in vars)) root.style.removeProperty(k);
    APPLIED.clear();
    for (const [k, val] of Object.entries(vars)) { root.style.setProperty(k, val); APPLIED.add(k); }
    root.style.colorScheme = dark ? "dark" : "light";
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.appendChild(meta); }
    meta.content = vars["--green"];
  }, [t.mode, t.brand, t.accent, t.paper, t.font, t.radius, sys]);
}

// ---------- Page Personnalisation ----------
const SUGGEST = {
  brand: ["#203C31", "#1F2F4A", "#0F5C6E", "#4A5A2C", "#6B1E2E", "#5E1F54", "#26282B", "#2C4C7C"],
  accent: ["#E77938", "#F06B5B", "#F2B53A", "#D9A629", "#E4572E", "#F28C28", "#3D7BF2", "#2BB39A"],
  paper: ["#F5F5F1", "#FFFFFF", "#F6F4F0", "#F1F6F5", "#F4F2E9", "#F8F3EF", "#FBF5F7", "#F4F4F5"],
};

function ColorRow({ id, label, hint, value, onChange, suggestions }: { id: string; label: string; hint: string; value: string; onChange: (v: string) => void; suggestions: string[] }) {
  const [txt, setTxt] = useState(value);
  useEffect(() => setTxt(value), [value]);
  const commit = (raw: string) => {
    let x = raw.trim(); if (!x.startsWith("#")) x = "#" + x;
    if (/^#[0-9a-f]{3}$/i.test(x)) x = "#" + x.slice(1).split("").map((c) => c + c).join("");
    if (isHex(x)) onChange(x.toUpperCase()); else setTxt(value);
  };
  return (
    <div className="th-color">
      <div className="th-color-top">
        <label className="th-swatch-pick" style={{ background: value }} title="Ouvrir le sélecteur de couleur">
          <input id={id} type="color" value={value.toLowerCase()} onChange={(e) => onChange(e.target.value.toUpperCase())} aria-label={label} />
        </label>
        <div className="th-color-txt"><strong>{label}</strong><span className="micro">{hint}</span></div>
        <input className="th-hex" value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={(e) => commit(e.target.value)} onKeyDown={(e) => e.key === "Enter" && commit((e.target as HTMLInputElement).value)} aria-label={label + " (code hexadécimal)"} maxLength={7} spellCheck={false} />
      </div>
      <div className="th-sugg">{suggestions.map((c) => <button key={c} className={cx(c.toUpperCase() === value.toUpperCase() && "is-on")} style={{ background: c }} onClick={() => onChange(c)} aria-label={`${label} ${c}`} title={c} />)}</div>
    </div>
  );
}

function randomTheme(): Partial<Theme> {
  const h = Math.floor(Math.random() * 360);
  const brand = fromHsl(h, 0.35 + Math.random() * 0.3, 0.18 + Math.random() * 0.08);
  const ah = (h + 150 + Math.random() * 60) % 360;
  const accent = fromHsl(ah, 0.7 + Math.random() * 0.2, 0.52 + Math.random() * 0.08);
  const paper = fromHsl(h, 0.2, 0.955);
  return { preset: "custom", brand, accent, paper };
}

export function ThemeSettings() {
  const { mode } = useContext(NavCtx);
  const { store, theme, set, setLinked, resetSpace } = useTheme();
  const t = theme(mode);
  const preset = PRESETS.find((p) => p.id === t.preset);
  const warnings: string[] = [];
  if (t.mode !== "dark" && contrast(t.brand, t.paper) < 3) warnings.push("La couleur principale ressort peu sur le fond : les boutons et titres en couleur seront difficiles à lire.");
  if (contrast(t.accent, t.paper) < 1.8 && t.mode !== "dark") warnings.push("La couleur d'accent est très proche du fond.");
  if (lum(t.paper) < 0.6) warnings.push("Le fond choisi est sombre. Pour une interface sombre, préférez le mode Sombre, qui adapte aussi les textes.");
  const applyPreset = (p: typeof PRESETS[number]) => set(mode, { preset: p.id, brand: p.brand, accent: p.accent, paper: p.paper, ...(p.mode ? { mode: p.mode } : t.preset === "nuit" ? { mode: "auto" as ThemeMode } : {}), ...(p.font ? { font: p.font } : {}) });
  const custom = (patch: Partial<Theme>) => set(mode, { ...patch, preset: "custom" });
  return (
    <div className="page narrow th-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Personnalisation</h1>
          <p className="muted">Choisissez l'apparence de l'espace {SPACE_LABEL[mode].toLowerCase()}. Les changements s'appliquent tout de suite et restent enregistrés sur cet appareil.</p>
        </div>
        <Btn variant="ghost" icon={RotateCcw} onClick={() => resetSpace(mode)}>Thème d'origine</Btn>
      </div>

      <div className="approval-setting">
        <Link2 size={18} />
        <div><strong>Même thème pour les trois espaces</strong><span className="micro">{store.linked ? "Consommateur, commerçant et admin partagent ce thème." : `Chaque espace garde son propre thème. Vous modifiez : ${SPACE_LABEL[mode]}.`}</span></div>
        <label className="switch-row"><input type="checkbox" checked={store.linked} onChange={() => setLinked(!store.linked, mode)} aria-label="Même thème pour les trois espaces" /><span className="switch" /></label>
      </div>

      <section className="th-sec">
        <div className="row-between"><h3>Thèmes proposés</h3><Btn variant="outline" size="sm" icon={Shuffle} onClick={() => custom(randomTheme())}>Surprenez-moi</Btn></div>
        <div className="th-presets">
          {PRESETS.map((p) => {
            const on = t.preset === p.id;
            return (
              <button key={p.id} className={cx("th-preset", on && "is-on")} onClick={() => applyPreset(p)} aria-pressed={on}>
                <span className="th-mini" style={{ background: p.mode === "dark" ? "#141A16" : p.paper }}>
                  <span style={{ background: p.brand }} /><i style={{ background: p.accent }} /><b style={{ background: p.mode === "dark" ? "#1F2822" : "#FFFFFF" }} />
                </span>
                <span className="th-preset-txt"><strong>{p.name}{on && <Check size={14} />}</strong><span className="micro">{p.desc}</span></span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="th-sec">
        <h3>Mode d'affichage</h3>
        <div className="th-modes">
          {([{ v: "light", l: "Clair", i: Sun }, { v: "dark", l: "Sombre", i: Moon }, { v: "auto", l: "Automatique", i: MonitorSmartphone }] as const).map((o) => (
            <button key={o.v} className={cx("th-opt", t.mode === o.v && "is-on")} onClick={() => set(mode, { mode: o.v })} aria-pressed={t.mode === o.v}><o.i size={18} /><span>{o.l}</span></button>
          ))}
        </div>
        {t.mode === "auto" && <p className="micro" style={{ marginTop: 8 }}>Suit le réglage clair ou sombre de votre appareil.</p>}
      </section>

      <section className="th-sec">
        <div className="row-between"><h3>Mes couleurs</h3><span className="micro">{preset ? `Basé sur « ${preset.name} »` : "Thème personnalisé"}</span></div>
        <div className="th-colors">
          <ColorRow id="th-brand" label="Couleur principale" hint="Barres, menus, boutons principaux, graphiques" value={t.brand} onChange={(v) => custom({ brand: v })} suggestions={SUGGEST.brand} />
          <ColorRow id="th-accent" label="Couleur d'accent" hint="Point du logo, appels à l'action, alertes" value={t.accent} onChange={(v) => custom({ accent: v })} suggestions={SUGGEST.accent} />
          <ColorRow id="th-paper" label="Couleur de fond" hint="Fond des pages en mode clair" value={t.paper} onChange={(v) => custom({ paper: v })} suggestions={SUGGEST.paper} />
        </div>
        {warnings.length > 0 && <div className="th-warn">{warnings.map((w) => <p key={w}><TriangleAlert size={15} />{w}</p>)}</div>}
      </section>

      <section className="th-sec">
        <h3>Typographie</h3>
        <div className="th-fonts">
          {FONTS.map((f) => (
            <button key={f.id} className={cx("th-opt th-font", t.font === f.id && "is-on")} onClick={() => set(mode, { font: f.id })} aria-pressed={t.font === f.id}>
              <span className="th-aa" style={{ fontFamily: f.display }}>Aa</span><span>{f.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="th-sec">
        <h3>Arrondis</h3>
        <Segmented value={t.radius} onChange={(v) => set(mode, { radius: v as RadiusId })} options={[{ v: "net", l: "Nets" }, { v: "standard", l: "Standard" }, { v: "arrondi", l: "Très arrondis" }]} />
      </section>

      <section className="th-sec">
        <h3>Aperçu</h3>
        <div className="th-preview" aria-label="Aperçu du thème">
          <div className="th-pv-bar"><Logo size={18} light={onColor(t.brand, 3) === LIGHT_INK} /><span>Nouveaux arrivages</span></div>
          <div className="th-pv-body">
            <div className="th-pv-card">
              <span className="pill pill-orange"><i />Arrivé aujourd'hui</span>
              <strong>PlayStation 5 Pro</strong>
              <span className="muted small">Pixel Lagon · Nouméa</span>
              <span className="th-pv-price">109 990 F</span>
            </div>
            <div className="th-pv-actions">
              <Btn>Bouton principal</Btn>
              <Btn variant="accent">Créer une alerte</Btn>
              <Btn variant="outline">Secondaire</Btn>
            </div>
          </div>
        </div>
      </section>
      <p className="micro" style={{ marginTop: 18 }}><Palette size={12} style={{ verticalAlign: -2 }} /> Les couleurs des catégories et des statuts restent fixes pour rester reconnaissables d'un espace à l'autre.</p>
    </div>
  );
}
