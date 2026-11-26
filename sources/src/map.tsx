import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MapPin, Navigation, Store, Plus, Minus, Search, LocateFixed, X, ChevronRight, BadgeCheck, Hand } from "lucide-react";
import { COMMUNES, CATEGORIES, Merchant, fmtXPF, norm, catById } from "./data";
import { useStore, productHay } from "./store";
import { useNav } from "./nav";
import { Btn, Chip, MerchantLogo, cx, ProductVisual } from "./ui";
import { RatingBadge } from "./reviews";
import { RealMap } from "./realmap";

// Coordonnées approximatives (lon, lat). Contour simplifié, à but illustratif.
export const COMMUNE_GEO: Record<string, [number, number]> = {
  "Nouméa": [166.448, -22.276], "Dumbéa": [166.47, -22.17], "Païta": [166.37, -22.13], "Mont-Dore": [166.58, -22.26],
  "Boulouparis": [166.05, -21.87], "La Foa": [165.83, -21.71], "Bourail": [165.5, -21.57], "Koné": [164.86, -21.06],
  "Koumac": [164.28, -20.56], "Poindimié": [165.33, -20.94], "Lifou": [167.25, -20.92], "Maré": [167.88, -21.5], "Ouvéa": [166.55, -20.6],
};
// Positions des boutiques (lon, lat). Commerces fictifs : emplacements plausibles, à remplacer par l'adresse réelle de chaque commerçant.
const MERCHANT_GEO: Record<string, [number, number]> = {
  "m-pixel": [166.4515, -22.2795], "m-baie": [166.441, -22.2955], "m-recif": [166.4175, -22.2725], "m-lumiere": [166.45, -22.2745], "m-froid": [166.447, -22.2485],
  "m-vague": [166.4475, -22.301], "m-niaouli": [166.46, -22.184], "m-alize": [166.469, -22.212], "m-epices": [166.474, -22.209], "m-kaori": [166.564, -22.227],
  "m-comptoir": [166.218, -22.02], "m-promo": [166.36, -22.133], "m-boulou": [166.05, -21.865], "m-brousse": [165.496, -21.568], "m-nord": [164.865, -21.059],
  "m-koumac": [164.281, -20.563], "m-lifou": [167.264, -20.917],
};
export const geoOf = (m: Merchant): [number, number] => MERCHANT_GEO[m.id] || (() => { const c = COMMUNE_GEO[m.commune] || COMMUNE_GEO["Nouméa"]; let h = 0; for (const ch of m.id) h = (h * 31 + ch.charCodeAt(0)) % 997; return [c[0] + ((h % 20) - 10) / 1500, c[1] + (((h / 20) | 0) % 20 - 10) / 1500] as [number, number]; })();

const GRANDE_TERRE: [number, number][] = [
  [163.98, -20.05], [164.15, -20.1], [164.58, -20.4], [164.94, -20.69], [165.24, -20.78], [165.33, -20.94], [165.4, -21.07], [165.62, -21.28], [165.83, -21.39],
  [165.95, -21.5], [166.2, -21.6], [166.5, -21.8], [166.75, -21.98], [166.95, -22.15], [167.02, -22.33], [166.95, -22.42], [166.82, -22.37], [166.65, -22.33],
  [166.6, -22.3], [166.55, -22.29], [166.5, -22.28], [166.47, -22.305], [166.44, -22.315], [166.415, -22.3], [166.4, -22.265], [166.415, -22.225], [166.4, -22.19], [166.36, -22.165], [166.3, -22.12], [166.22, -22.03], [166.05, -21.9], [165.82, -21.78], [165.68, -21.7],
  [165.49, -21.6], [165.15, -21.37], [164.9, -21.15], [164.69, -20.97], [164.4, -20.69], [164.28, -20.58], [164.02, -20.25],
];
const ISLANDS: { name: string; pts: [number, number][] }[] = [
  { name: "Ouvéa", pts: [[166.42, -20.45], [166.5, -20.55], [166.58, -20.68], [166.55, -20.72], [166.47, -20.62], [166.4, -20.5]] },
  { name: "Lifou", pts: [[167.0, -20.8], [167.2, -20.7], [167.42, -20.82], [167.45, -21.0], [167.3, -21.15], [167.08, -21.08], [166.98, -20.95]] },
  { name: "Maré", pts: [[167.78, -21.38], [167.98, -21.4], [168.08, -21.55], [167.95, -21.66], [167.8, -21.6], [167.75, -21.48]] },
  { name: "Île des Pins", pts: [[167.4, -22.53], [167.52, -22.55], [167.55, -22.66], [167.45, -22.7], [167.38, -22.62]] },
];
const LON0 = 163.6, LAT0 = -19.85, K = 100, COS = 0.93;
const px = ([lon, lat]: [number, number]) => [(lon - LON0) * K * COS, (LAT0 - lat) * K] as [number, number];
const path = (pts: [number, number][]) => pts.map((p, i) => (i ? "L" : "M") + px(p).map((v) => v.toFixed(1)).join(" ")).join(" ") + " Z";
export function distKm(a: [number, number], b: [number, number]) {
  const R = 6371, r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Côte lissée (Catmull-Rom → Bézier) pour un rendu plus naturel
const smooth = (pts: [number, number][], closed = true) => {
  const P = pts.map(px); const n = P.length; const at = (i: number) => P[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = `M${P[0][0].toFixed(2)} ${P[0][1].toFixed(2)}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d + (closed ? " Z" : "");
};
const LAND_D = smooth(GRANDE_TERRE);
const ISLES_D = ISLANDS.map((i) => ({ name: i.name, d: smooth(i.pts) }));
const LAGOONS = [
  smooth([[163.5, -19.5], [163.78, -19.55], [164.12, -19.92], [164.25, -20.18], [164.05, -20.36], [163.8, -20.1], [163.6, -19.8]]),
  smooth([[166.05, -20.33], [166.43, -20.38], [166.62, -20.7], [166.3, -20.78], [166.02, -20.58]]),
  smooth([[167.3, -22.45], [167.62, -22.48], [167.66, -22.72], [167.42, -22.78], [167.28, -22.64]]),
  smooth([[166.5, -22.3], [166.95, -22.44], [167.1, -22.62], [166.85, -22.68], [166.55, -22.5]]),
];
const RIDGE_D = smooth([[164.25, -20.36], [164.6, -20.6], [165.0, -20.92], [165.4, -21.22], [165.8, -21.5], [166.2, -21.8], [166.6, -22.06], [166.86, -22.24]], false);
const ROADS = [
  smooth([[166.45, -22.262], [166.47, -22.17], [166.37, -22.13], [166.22, -22.02], [166.06, -21.86], [165.84, -21.7], [165.68, -21.67], [165.5, -21.56], [165.17, -21.33], [164.92, -21.12], [164.86, -21.06], [164.71, -20.94], [164.42, -20.66], [164.29, -20.55]], false),
  smooth([[164.86, -21.06], [165.03, -21.0], [165.2, -20.96], [165.33, -20.94]], false),
  smooth([[166.45, -22.262], [166.52, -22.27], [166.58, -22.258], [166.62, -22.27]], false),
];
const LABELS_MAJOR = ["Nouméa", "Koné", "Koumac", "Bourail", "Poindimié", "Lifou", "Maré", "Ouvéa", "La Foa"];
const QUARTIERS: [string, [number, number]][] = [
  ["Centre-ville", [166.441, -22.271]], ["Quartier Latin", [166.446, -22.279]], ["Baie-des-Citrons", [166.433, -22.296]], ["Anse Vata", [166.447, -22.305]],
  ["Nouville", [166.414, -22.282]], ["Ducos", [166.434, -22.247]], ["Magenta", [166.47, -22.267]], ["Vallée-des-Colons", [166.458, -22.284]],
];
const SEA_LABELS: [string, [number, number], number][] = [["Mer de Corail", [163.9, -21.9], 1], ["Océan Pacifique", [167.4, -20.15], 1], ["Lagon sud", [166.78, -22.55], 3]];

const W0 = 450, H0 = 300;
type Cam = { x: number; y: number; z: number }; // centre de la vue (unités carte) et zoom (pixels par unité)
const VIEWS = { all: { c: [225, 150], w: 450 }, sud: { c: [252, 216], w: 108 }, noumea: { c: [268, 240], w: 34 } } as const;
type ViewId = keyof typeof VIEWS;
const PIN = "M0 0C-2.6-7.4-12-12.4-12-22A12 12 0 1 1 12-22C12-12.4 2.6-7.4 0 0Z";
const initialsOf = (m: Merchant) => m.name.split(/\s+/).filter((w) => w.length > 2 || /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function MapView() {
  const { s, mutate } = useStore();
  const { go } = useNav();
  const [sel, setSel] = useState<string | null>(null);
  const [radius, setRadius] = useState<number>(0);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [hint, setHint] = useState(true);
  const [engine, setEngine] = useState<"real" | "svg">("real");
  const [rView, setRView] = useState<{ id: string; n: number } | null>(null);
  const [rFocus, setRFocus] = useState<{ g: [number, number]; n: number } | null>(null);
  const origin = COMMUNE_GEO[s.profile.commune || "Nouméa"] || COMMUNE_GEO["Nouméa"];

  // ---- caméra ----
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ W: 800, H: 533 });
  const sizeRef = useRef(size); sizeRef.current = size;
  const fitZ = (sz = sizeRef.current) => Math.min(sz.W / W0, sz.H / H0);
  const viewCam = (v: ViewId, sz = sizeRef.current): Cam => { const V = VIEWS[v]; const fit = Math.min(sz.W / V.w, sz.H / (V.w * 2 / 3)); return { x: V.c[0], y: V.c[1], z: v === "all" ? fit : Math.max(fit, Math.min(sz.W, sz.H) / (V.w * 2 / 3)) }; };
  const [cam, setCam] = useState<Cam>(() => viewCam("all"));
  const camRef = useRef(cam);
  const ready = useRef(false);
  const anim = useRef<number | null>(null);
  const clampCam = (c: Cam): Cam => { const f = fitZ(); const z = Math.max(f * 0.85, Math.min(f * 48, c.z)); return { z, x: Math.max(-10, Math.min(W0 + 10, c.x)), y: Math.max(-10, Math.min(H0 + 10, c.y)) }; };
  const put = (c: Cam) => { const k = clampCam(c); camRef.current = k; setCam(k); };
  const stopAnim = () => { if (anim.current != null) cancelAnimationFrame(anim.current); anim.current = null; };
  const flyTo = (t: Cam, ms = 520) => {
    stopAnim(); const a = camRef.current, b = clampCam(t); const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms), e = ease(k);
      put({ x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, z: Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * e) });
      anim.current = k < 1 ? requestAnimationFrame(step) : null;
    };
    anim.current = requestAnimationFrame(step);
  };
  const zoomAt = (sx: number, sy: number, f: number, animate: boolean) => {
    const { W, H } = sizeRef.current; const c = camRef.current; const z = clampCam({ ...c, z: c.z * f }).z;
    const wx = c.x + (sx - W / 2) / c.z, wy = c.y + (sy - H / 2) / c.z;
    const t = { x: wx - (sx - W / 2) / z, y: wy - (sy - H / 2) / z, z };
    animate ? flyTo(t, 320) : put(t);
  };
  const zoomBy = (f: number) => { const { W, H } = sizeRef.current; zoomAt(W / 2, H / 2, f, true); };

  useLayoutEffect(() => {
    const el = boxRef.current; if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
      const sz = { W: r.width, H: r.height }; const prev = sizeRef.current; sizeRef.current = sz; setSize(sz);
      if (!ready.current) { ready.current = true; put(viewCam("all", sz)); }
      else { const c = camRef.current; put({ ...c, z: c.z * Math.min(sz.W / prev.W, sz.H / prev.H) }); }
    };
    measure(); const ro = new ResizeObserver(measure); ro.observe(el); return () => ro.disconnect();
  }, [engine]);

  // Sélection / regroupement, lus depuis les gestes
  const onPin = useRef<(id: string) => void>(() => {});
  const onCluster = useRef<(i: number) => void>(() => {});

  // ---- gestes : glisser, pincer, molette, double-tap, inertie ----
  useEffect(() => {
    const el = boxRef.current; if (!el) return;
    const pts = new Map<number, { x: number; y: number }>();
    let start: { cam: Cam; mid: { x: number; y: number }; dist: number } | null = null;
    let moved = 0, downAt = 0, downTarget: Element | null = null, multi = false;
    let samples: { t: number; x: number; y: number }[] = [];
    let lastTap = { t: 0, x: 0, y: 0 };
    const local = (e: { clientX: number; clientY: number }) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const snap = () => {
      const a = [...pts.values()]; if (!a.length) { start = null; return; }
      const mid = a.length > 1 ? { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 } : a[0];
      start = { cam: camRef.current, mid, dist: a.length > 1 ? Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) : 0 };
    };
    const down = (e: PointerEvent) => {
      if ((e.target as Element).closest(".map-ui")) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      stopAnim(); setHint(false);
      pts.set(e.pointerId, local(e));
      if (pts.size === 1) { moved = 0; multi = false; downAt = performance.now(); downTarget = e.target as Element; samples = []; } else { multi = true; }
      snap(); el.classList.add("is-grab");
    };
    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId) || !start) return;
      const p = local(e); pts.set(e.pointerId, p);
      const a = [...pts.values()]; const { W, H } = sizeRef.current; const c0 = start.cam;
      if (a.length === 1) {
        const dx = p.x - start.mid.x, dy = p.y - start.mid.y; moved = Math.max(moved, Math.hypot(dx, dy));
        if (moved < 4 && !multi) return;
        put({ x: c0.x - dx / c0.z, y: c0.y - dy / c0.z, z: c0.z });
        samples.push({ t: performance.now(), x: p.x, y: p.y }); if (samples.length > 6) samples.shift();
      } else {
        const mid = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 }; const dist = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
        const z = clampCam({ ...c0, z: c0.z * dist / Math.max(start.dist, 1) }).z;
        const wx = c0.x + (start.mid.x - W / 2) / c0.z, wy = c0.y + (start.mid.y - H / 2) / c0.z;
        put({ x: wx - (mid.x - W / 2) / z, y: wy - (mid.y - H / 2) / z, z });
      }
    };
    const up = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size) { snap(); samples = []; return; }
      el.classList.remove("is-grab"); start = null;
      const p = local(e); const now = performance.now();
      if (!multi && moved < 6 && now - downAt < 600) {
        const dbl = now - lastTap.t < 330 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 32;
        lastTap = { t: dbl ? 0 : now, x: p.x, y: p.y };
        if (dbl) { zoomAt(p.x, p.y, 2.2, true); return; }
        const pin = downTarget?.closest("[data-mid]"); const cl = downTarget?.closest("[data-cluster]");
        if (pin) onPin.current(pin.getAttribute("data-mid")!); else if (cl) onCluster.current(+cl.getAttribute("data-cluster")!);
        return;
      }
      // inertie après un glissé rapide
      if (!multi && samples.length >= 2 && now - samples[samples.length - 1].t < 80) {
        const f = samples[0], l = samples[samples.length - 1]; const dt = Math.max(1, l.t - f.t);
        let vx = (l.x - f.x) / dt, vy = (l.y - f.y) / dt;
        if (Math.hypot(vx, vy) < 0.25) return;
        let last = now;
        const step = (t: number) => {
          const d = t - last; last = t; const c = camRef.current;
          put({ x: c.x - vx * d / c.z, y: c.y - vy * d / c.z, z: c.z });
          const decay = Math.pow(0.93, d / 16); vx *= decay; vy *= decay;
          anim.current = Math.hypot(vx, vy) > 0.02 ? requestAnimationFrame(step) : null;
        };
        stopAnim(); anim.current = requestAnimationFrame(step);
      }
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault(); stopAnim(); setHint(false);
      const p = local(e); const dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      zoomAt(p.x, p.y, Math.exp(-dy * (e.ctrlKey ? 0.012 : 0.0024)), false);
    };
    const noGesture = (e: Event) => e.preventDefault(); // Safari iOS : empêche le zoom de la page
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("gesturestart", noGesture); el.addEventListener("gesturechange", noGesture);
    return () => {
      el.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel); el.removeEventListener("gesturestart", noGesture); el.removeEventListener("gesturechange", noGesture); stopAnim();
    };
  }, [engine]);
  useEffect(() => { const t = setTimeout(() => setHint(false), 6000); return () => clearTimeout(t); }, []);

  // ---- données ----
  const rows = useMemo(() => s.merchants.filter((m) => m.status === "active").map((m) => {
    const g = geoOf(m);
    const prods = s.products.filter((p) => p.merchantId === m.id && p.state === "published" && p.status !== "out" && (!cat || p.category === cat) && (!q || productHay(p, m).includes(norm(q))));
    return { m, g, d: distKm(origin, g), prods, match: (!q && !cat) || prods.length > 0 };
  }).filter((r) => (!radius || r.d <= radius)).sort((a, b) => a.d - b.d), [s.merchants, s.products, q, cat, radius, origin[0], origin[1]]);
  const shown = rows.filter((r) => r.match);
  const selected = rows.find((r) => r.m.id === sel);

  const { W, H } = size; const z = cam.z; const inv = 1 / z;
  const vb = [cam.x - W / 2 / z, cam.y - H / 2 / z, W / z, H / z];
  const zr = z / fitZ(size); // niveau de zoom relatif (1 = toute la Calédonie)

  // Regroupe les commerces trop proches à l'écran (comme sur une vraie carte)
  const clusters = useMemo(() => {
    const out: { items: typeof rows; x: number; y: number }[] = [];
    const list = [...shown].sort((a, b) => (a.m.id === sel ? -1 : b.m.id === sel ? 1 : 0));
    for (const r of list) {
      const [x, y] = px(r.g);
      const hit = r.m.id !== sel && out.find((c) => !c.items.some((i) => i.m.id === sel) && Math.hypot((c.x - x) * z, (c.y - y) * z) < 28);
      if (hit) { hit.items.push(r); hit.x = hit.items.reduce((s2, i) => s2 + px(i.g)[0], 0) / hit.items.length; hit.y = hit.items.reduce((s2, i) => s2 + px(i.g)[1], 0) / hit.items.length; }
      else out.push({ items: [r], x, y });
    }
    return out;
  }, [shown, z, sel]);
  onPin.current = (id) => setSel(id);
  onCluster.current = (i) => {
    const c = clusters[i]; if (!c) return;
    const xs = c.items.map((r) => px(r.g)[0]), ys = c.items.map((r) => px(r.g)[1]);
    const span = Math.max(Math.max(...xs) - Math.min(...xs), (Math.max(...ys) - Math.min(...ys)) * 1.5, 0.5);
    flyTo({ x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2, z: Math.max(camRef.current.z * 2.2, Math.min(W, H) / (span * 2.4)) });
  };
  const showNames = zr >= 7;
  const nearMarker = (g: [number, number]) => { const [x, y] = px(g); return clusters.reduce((d, c) => Math.min(d, Math.hypot(c.x - x, c.y - y) * z), 1e9); };
  const focusOn = (g: [number, number]) => { if (engine === "real") return setRFocus({ g, n: Date.now() }); const [x, y] = px(g); flyTo({ x, y, z: Math.max(camRef.current.z, viewCam("sud").z * 1.6) }); };
  const fitRadius = (km: number) => {
    if (engine === "real") return km ? setRFocus({ g: origin, n: Date.now() }) : setRView({ id: "all", n: Date.now() });
    if (!km) return flyTo(viewCam("all"));
    const [x, y] = px(origin); const r = km * 100 / 111; flyTo({ x, y, z: Math.min(W, H) / (r * 2.5) });
  };
  const activeView = (Object.keys(VIEWS) as ViewId[]).find((v) => { const c = viewCam(v); return Math.abs(Math.log(c.z / z)) < 0.2 && Math.hypot(c.x - cam.x, c.y - cam.y) * z < 60; });

  // Barre d'échelle : 1 unité = 1,11 km
  const kmPerPx = 1.11 / z; const nice = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200].find((k) => k / kmPerPx >= 56) || 200;
  const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  const [ox, oy] = px(origin);
  const label = (txt: string, g: [number, number], cls: string, dx = 0, dy = 0, anchor: "start" | "middle" = "middle") => {
    const [x, y] = px(g);
    return <g key={cls + txt} transform={`translate(${x} ${y}) scale(${inv})`}><text x={dx} y={dy} textAnchor={anchor} className={cls}>{txt}</text></g>;
  };

  const dirUrl = (g: [number, number]) => `https://www.google.com/maps/dir/?api=1&destination=${g[1].toFixed(5)},${g[0].toFixed(5)}`;
  const popCard = selected && (
    <div className="map-ui map-pop">
      <MerchantLogo m={selected.m} size={38} />
      <span className="map-pop-id"><b>{selected.m.name}</b><span className="micro">{fmtKm(selected.d)} · {selected.m.commune}</span></span>
      <a className="btn btn-sm btn-ghost" href={dirUrl(selected.g)} target="_blank" rel="noopener noreferrer" aria-label="Itinéraire"><Navigation size={15} /></a>
      <button className="btn btn-sm btn-primary" onClick={() => go("merchant", { id: selected.m.id })}>Voir</button>
      <button className="map-pop-x" onClick={() => setSel(null)} aria-label="Fermer"><X size={15} /></button>
    </div>
  );

  return (
    <div className="map-wrap">
      <div className="map-tools">
        <div className="search search-inline map-search"><Search size={16} className="search-ico" /><input id="map-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Un produit ? ex. PS5, pneus, clim" aria-label="Rechercher un produit sur la carte" />{q && <button className="map-clear" onClick={() => setQ("")} aria-label="Effacer"><X size={14} /></button>}</div>
        <select id="map-cat" className="select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Catégorie"><option value="">Toutes les catégories</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        <select id="map-from" className="select" value={s.profile.commune || "Nouméa"} onChange={(e) => mutate((d) => { d.profile.commune = e.target.value; })} aria-label="Ma position"><>{COMMUNES.map((c) => <option key={c} value={c}>Depuis {c}</option>)}</></select>
      </div>
      <div className="chips-wrap map-radius">
        <span className="micro">Distance :</span>
        {[[0, "Toute la Calédonie"], [5, "5 km"], [15, "15 km"], [50, "50 km"], [150, "150 km"]].map(([v, l]) => <Chip key={v} active={radius === v} onClick={() => { setRadius(v as number); fitRadius(v as number); }}>{l as string}</Chip>)}
      </div>

      <div className="map-grid">
        {engine === "real" ? (
          <div className="map-canvas map-real">
            <RealMap rows={rows} sel={sel} onSelect={setSel} origin={origin} radius={radius} counts={!!(q || cat)} view={rView} focus={rFocus} onFail={() => setEngine("svg")} />
            <div className="map-ui map-views" role="group" aria-label="Vues rapides">
              {([["all", "Calédonie"], ["sud", "Grand Nouméa"], ["noumea", "Nouméa"]] as [ViewId, string][]).map(([v, l]) => <button key={v} className={cx(rView?.id === v && "is-on")} onClick={() => setRView({ id: v, n: Date.now() })}>{l}</button>)}
            </div>
            <button className="map-ui map-locate" onClick={() => setRFocus({ g: origin, n: Date.now() })} aria-label="Centrer sur ma position" title={`Centrer sur ${s.profile.commune || "Nouméa"}`}><LocateFixed size={17} /></button>
            {selected && popCard}
          </div>
        ) : (
        <div className="map-canvas" ref={boxRef} tabIndex={0} aria-label="Carte interactive : glissez pour vous déplacer, pincez ou utilisez la molette pour zoomer"
          onKeyDown={(e) => {
            const c = camRef.current, st = 80 / c.z;
            const k: Record<string, () => void> = { ArrowLeft: () => flyTo({ ...c, x: c.x - st }, 200), ArrowRight: () => flyTo({ ...c, x: c.x + st }, 200), ArrowUp: () => flyTo({ ...c, y: c.y - st }, 200), ArrowDown: () => flyTo({ ...c, y: c.y + st }, 200), "+": () => zoomBy(1.6), "=": () => zoomBy(1.6), "-": () => zoomBy(1 / 1.6) };
            if (k[e.key] && e.target === e.currentTarget) { e.preventDefault(); k[e.key](); }
          }}>
          <svg viewBox={vb.map((v) => v.toFixed(3)).join(" ")} preserveAspectRatio="none" role="img" aria-label="Carte de la Nouvelle-Calédonie avec les commerces">
            <defs>
              <radialGradient id="mseaG" gradientUnits="userSpaceOnUse" cx="270" cy="200" r="420"><stop offset="0" className="map-sea-1" /><stop offset="1" className="map-sea-2" /></radialGradient>
              <linearGradient id="mlandG" gradientUnits="userSpaceOnUse" x1="40" y1="20" x2="330" y2="260"><stop offset="0" className="map-land-1" /><stop offset="1" className="map-land-2" /></linearGradient>
              <clipPath id="mclip"><path d={LAND_D} /></clipPath>
              <filter id="mblur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" /></filter>
            </defs>
            <rect x={-400} y={-400} width={1250} height={1100} fill="url(#mseaG)" />
            {/* lagon et récif */}
            {LAGOONS.map((d, i) => <path key={i} d={d} className="map-lagoon" strokeWidth={1.2} />)}
            <path d={LAND_D} className="map-reef" strokeWidth={21} />
            <path d={LAND_D} className="map-lagoon-band" strokeWidth={18} />
            {ISLES_D.map((i) => <path key={i.name} d={i.d} className="map-reef" strokeWidth={7} />)}
            {ISLES_D.map((i) => <path key={i.name + "l"} d={i.d} className="map-lagoon-band" strokeWidth={5.5} />)}
            {/* terres */}
            <path d={LAND_D} className="map-beach" vectorEffect="non-scaling-stroke" strokeWidth={zr > 3 ? 7 : 3} />
            <path d={LAND_D} fill="url(#mlandG)" />
            {ISLES_D.map((i) => <path key={i.name + "t"} d={i.d} className="map-beach" vectorEffect="non-scaling-stroke" strokeWidth={zr > 3 ? 7 : 3} />)}
            {ISLES_D.map((i) => <path key={i.name + "f"} d={i.d} fill="url(#mlandG)" />)}
            {zr < 4 && <g clipPath="url(#mclip)"><g className="map-ridge" opacity={Math.min(1, (4 - zr) / 1.5) * 0.55}>
              <path d={RIDGE_D} strokeWidth={22} opacity={0.5} /><path d={RIDGE_D} strokeWidth={9} />
            </g></g>}
            {/* routes */}
            <g className="map-roads">
              {ROADS.map((d, i) => <path key={"c" + i} d={d} className="map-road-case" vectorEffect="non-scaling-stroke" strokeWidth={zr > 3 ? 5 : 3.2} />)}
              {ROADS.map((d, i) => <path key={"r" + i} d={d} className="map-road" vectorEffect="non-scaling-stroke" strokeWidth={zr > 3 ? 3 : 1.6} />)}
            </g>
            {radius > 0 && <circle cx={ox} cy={oy} r={radius * 100 / 111} className="map-radius-ring" vectorEffect="non-scaling-stroke" strokeWidth={1.6} />}

            {/* libellés */}
            {SEA_LABELS.filter(([, , t]) => zr >= t && zr < t * 6).map(([n, g]) => label(n, g, "map-sea-label"))}
            {Object.entries(COMMUNE_GEO).filter(([n]) => LABELS_MAJOR.includes(n) || zr >= 2.2).map(([n, g]) => {
              const near = nearMarker(g);
              if (showNames && near < 72) return null;
              return label(n, g, cx("map-label", n === "Nouméa" && "is-big"), near < 30 ? 30 - near * 0.3 : 8, near < 30 ? 5 : -6, "start");
            })}
            {label("Île des Pins", [167.47, -22.62], "map-label is-isle", 0, 22)}
            {zr >= 18 && QUARTIERS.filter(([, g]) => nearMarker(g) > 26).map(([n, g]) => label(n, g, "map-label is-q"))}

            {/* ma position */}
            <g transform={`translate(${ox} ${oy}) scale(${inv})`} className="map-me"><circle r={16} className="map-me-pulse" /><circle r={7.5} className="map-me-dot" /></g>

            {/* commerces hors filtre, discrets */}
            {rows.filter((r) => !r.match).map((r) => { const [x, y] = px(r.g); return <circle key={r.m.id} cx={x} cy={y} r={3.2 * inv} className="map-dim" />; })}

            {/* marqueurs et regroupements */}
            {clusters.map((c, i) => [c, i] as const).sort(([a], [b]) => (a.items.some((r) => r.m.id === sel) ? 1 : 0) - (b.items.some((r) => r.m.id === sel) ? 1 : 0)).map(([c, i]) => {
              if (c.items.length > 1) return (
                <g key={"cl" + c.items[0].m.id} data-cluster={i} className="map-cluster" transform={`translate(${c.x} ${c.y}) scale(${inv})`} role="button" tabIndex={0} aria-label={`${c.items.length} commerces, zoomer`} onKeyDown={(e) => e.key === "Enter" && onCluster.current(i)}>
                  <circle r={24} className="map-cluster-halo" /><circle r={17} className="map-cluster-core" /><text y={5} textAnchor="middle">{c.items.length}</text>
                </g>
              );
              const { m, prods } = c.items[0]; const on = sel === m.id;
              return (
                <g key={m.id} data-mid={m.id} className={cx("map-pin", on && "is-on")} transform={`translate(${c.x} ${c.y}) scale(${inv})`} role="button" tabIndex={0} aria-label={`${m.name}, ${m.commune}`} onKeyDown={(e) => e.key === "Enter" && setSel(m.id)}>
                  <ellipse rx={7} ry={2.6} className="map-pin-shadow" />
                  <g className="map-pin-body">
                    <path d={PIN} style={{ fill: m.color }} />
                    <circle cy={-22} r={8.6} className="map-pin-face" />
                    <text y={-18.6} textAnchor="middle" className="map-pin-t" style={{ fill: lum(m.color) > 0.55 ? "#3A3328" : m.color }}>{(q || cat) ? prods.length : initialsOf(m)}</text>
                  </g>
                  {(showNames || on) && <text y={16} textAnchor="middle" className="map-pin-name">{m.name}</text>}
                </g>
              );
            })}
          </svg>

          <div className="map-ui map-views" role="group" aria-label="Vues rapides">
            {([["all", "Calédonie"], ["sud", "Grand Nouméa"], ["noumea", "Nouméa"]] as [ViewId, string][]).map(([v, l]) => <button key={v} className={cx(activeView === v && "is-on")} onClick={() => flyTo(viewCam(v))}>{l}</button>)}
          </div>
          <div className="map-ui map-zoom">
            <button onClick={() => zoomBy(1.8)} disabled={zr >= 47.5} aria-label="Zoomer"><Plus size={17} /></button>
            <button onClick={() => zoomBy(1 / 1.8)} disabled={zr <= 0.86} aria-label="Dézoomer"><Minus size={17} /></button>
          </div>
          <button className="map-ui map-locate" onClick={() => radius ? fitRadius(radius) : flyTo({ x: ox, y: oy, z: Math.max(z, viewCam("sud").z) })} aria-label="Centrer sur ma position" title={`Centrer sur ${s.profile.commune || "Nouméa"}`}><LocateFixed size={17} /></button>
          <div className="map-scale" aria-hidden><span style={{ width: nice / kmPerPx }} />{nice < 1 ? `${nice * 1000} m` : `${nice} km`}</div>
          <span className="map-legal">Carte stylisée (carte réelle indisponible ici) · commerces fictifs</span>
          <div className={cx("map-hint", !hint && "is-off")} aria-hidden><Hand size={15} /> {coarse ? "Pincez pour zoomer, glissez pour vous déplacer" : "Molette ou double-clic pour zoomer, glissez pour vous déplacer"}</div>
          {selected && popCard}
        </div>
        )}

        <div className="map-side">
          {selected ? (
            <div className="map-card">
              <button className="map-close" onClick={() => setSel(null)} aria-label="Fermer"><X size={16} /></button>
              <div className="row"><MerchantLogo m={selected.m} size={44} /><div className="map-card-id"><strong>{selected.m.name}{selected.m.verified && <BadgeCheck size={14} className="verified" />}</strong><span className="muted small">{selected.m.tagline}</span></div></div>
              <div className="map-meta"><span><Navigation size={13} /> {fmtKm(selected.d)} depuis {s.profile.commune || "Nouméa"}</span><RatingBadge merchantId={selected.m.id} /></div>
              <div className="micro"><MapPin size={12} style={{ verticalAlign: -2 }} /> {selected.m.address}, {selected.m.commune} · {selected.m.hours[0]}</div>
              <div className="map-prods">
                {(selected.prods.length ? selected.prods : s.products.filter((p) => p.merchantId === selected.m.id && p.state === "published")).slice(0, 4).map((p) => (
                  <button key={p.id} className="map-prod" onClick={() => go("product", { id: p.id })}><ProductVisual p={p} className="map-pv" /><span><b>{p.name}</b><em>{fmtXPF(p.price)}</em></span><ChevronRight size={15} /></button>
                ))}
              </div>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <Btn size="sm" icon={Store} onClick={() => go("merchant", { id: selected.m.id })}>Voir la boutique</Btn>
                <Btn size="sm" variant="ghost" icon={LocateFixed} onClick={() => focusOn(selected.g)}>Centrer</Btn>
                <a className="btn btn-sm btn-ghost" href={dirUrl(selected.g)} target="_blank" rel="noopener noreferrer"><Navigation size={15} /> Itinéraire</a>
              </div>
            </div>
          ) : (
            <>
              <div className="map-count"><strong>{shown.length} commerce{shown.length > 1 ? "s" : ""}</strong> <span className="muted small">{q || cat ? "avec des produits correspondants" : radius ? `à moins de ${radius} km` : "sur la carte"} · du plus proche au plus loin</span></div>
              <div className="map-list">
                {shown.map(({ m, d, prods, g }) => (
                  <button key={m.id} className="map-row" onClick={() => { setSel(m.id); focusOn(g); }}>
                    <MerchantLogo m={m} size={36} />
                    <span className="map-row-id"><b>{m.name}</b><span className="micro">{m.commune} · {m.categories.slice(0, 2).map((c) => catById(c).label).join(", ")}</span><RatingBadge merchantId={m.id} compact /></span>
                    <span className="map-row-r"><b>{fmtKm(d)}</b><span className="micro">{(q || cat) ? `${prods.length} produit${prods.length > 1 ? "s" : ""}` : ""}</span></span>
                  </button>
                ))}
                {!shown.length && <p className="muted small" style={{ padding: 12 }}>Aucun commerce dans ce rayon. Élargissez la distance.</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
const fmtKm = (d: number) => d < 1 ? "< 1 km" : d < 10 ? d.toFixed(1).replace(".", ",") + " km" : Math.round(d) + " km";
