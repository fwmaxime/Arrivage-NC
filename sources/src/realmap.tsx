import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Merchant } from "./data";

// Carte réelle vectorielle (MapLibre) : plan OpenFreeMap (données OpenStreetMap) ou satellite Esri.
// Les fonds viennent d'Internet : s'ils ne chargent pas (aperçu Claude, hors ligne), onFail bascule sur la carte dessinée.
export type RealRow = { m: Merchant; g: [number, number]; match: boolean; prods: unknown[] };
type Props = {
  rows: RealRow[]; sel: string | null; onSelect: (id: string) => void;
  origin: [number, number]; radius: number; counts: boolean; view: { id: string; n: number } | null;
  focus: { g: [number, number]; n: number } | null; onFail: () => void;
};
type Bounds = [[number, number], [number, number]];
export const REAL_VIEWS: Record<string, Bounds> = {
  all: [[163.9, -22.75], [168.15, -20.05]],
  sud: [[166.2, -22.36], [166.68, -22.0]],
  noumea: [[166.405, -22.315], [166.49, -22.235]],
};
const PLAN = "https://tiles.openfreemap.org/styles/liberty";
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
const SATELLITE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    sat: { type: "raster", tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`], tileSize: 256, maxzoom: 19, attribution: "Imagerie © Esri, Maxar, Earthstar Geographics" },
    roads: { type: "raster", tiles: [`${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`], tileSize: 256, maxzoom: 19 },
    places: { type: "raster", tiles: [`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`], tileSize: 256, maxzoom: 19 },
  },
  layers: [
    { id: "sat", type: "raster", source: "sat" },
    { id: "roads", type: "raster", source: "roads", paint: { "raster-opacity": 0.75 } },
    { id: "places", type: "raster", source: "places" },
  ],
};
type Kind = "plan" | "sat";
const KEY = "arrivage-map-kind";
const readKind = (): Kind => { try { return localStorage.getItem(KEY) === "sat" ? "sat" : "plan"; } catch { return "plan"; } };
const saveKind = (k: Kind) => { try { localStorage.setItem(KEY, k); } catch { /* stockage indisponible */ } };

const initials = (m: Merchant) => m.name.split(/\s+/).filter((w) => w.length > 2 || /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
const circle = (c: [number, number], km: number) => {
  const pts: [number, number][] = []; const lat = c[1] * Math.PI / 180;
  for (let i = 0; i <= 72; i++) { const a = (i / 72) * 2 * Math.PI; pts.push([c[0] + (km / (111.32 * Math.cos(lat))) * Math.cos(a), c[1] + (km / 110.57) * Math.sin(a)]); }
  return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [pts] } };
};

export function RealMap({ rows, sel, onSelect, origin, radius, counts, view, focus, onFail }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const me = useRef<maplibregl.Marker | null>(null);
  const failRef = useRef(onFail); failRef.current = onFail;
  const selRef = useRef(onSelect); selRef.current = onSelect;
  const ring = useRef({ origin, radius }); ring.current = { origin, radius };
  const [kind, setKind] = useState<Kind>(readKind);
  const [ready, setReady] = useState(false);

  const drawRing = () => {
    const mp = map.current; if (!mp || !mp.isStyleLoaded()) return;
    const { origin: o, radius: r } = ring.current;
    const data: any = r > 0 ? circle(o, r) : { type: "FeatureCollection", features: [] };
    const src = mp.getSource("ring") as maplibregl.GeoJSONSource | undefined;
    if (src) { src.setData(data); return; }
    mp.addSource("ring", { type: "geojson", data });
    mp.addLayer({ id: "ring-fill", type: "fill", source: "ring", paint: { "fill-color": "#2F7AD9", "fill-opacity": 0.08 } });
    mp.addLayer({ id: "ring-line", type: "line", source: "ring", paint: { "line-color": "#2F7AD9", "line-width": 1.8, "line-dasharray": [3, 2] } });
  };

  useEffect(() => {
    const el = box.current; if (!el) return;
    let ok = false; let mp: maplibregl.Map;
    try {
      mp = new maplibregl.Map({
        container: el, style: readKind() === "sat" ? SATELLITE : PLAN, bounds: REAL_VIEWS.all, fitBoundsOptions: { padding: 16 },
        attributionControl: false, dragRotate: false, pitchWithRotate: false, maxZoom: 19, minZoom: 4,
      });
    } catch { failRef.current(); return; }
    mp.touchZoomRotate.disableRotation();
    mp.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mp.addControl(new maplibregl.ScaleControl({ unit: "metric", maxWidth: 90 }), "bottom-left");
    mp.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mp.on("load", () => { ok = true; setReady(true); drawRing(); });
    mp.on("style.load", drawRing);
    mp.on("error", () => { if (!ok) failRef.current(); });
    const names = () => el.classList.toggle("z-names", mp.getZoom() >= 12.5); mp.on("zoom", names); names();
    const t = window.setTimeout(() => { if (!ok) failRef.current(); }, 9000);
    map.current = mp; setReady(true);
    return () => { window.clearTimeout(t); markers.current.forEach((m) => m.remove()); markers.current = []; me.current = null; mp.remove(); map.current = null; };
  }, []);

  const switchKind = (k: Kind) => { setKind(k); saveKind(k); map.current?.setStyle(k === "sat" ? SATELLITE : PLAN); };

  // Marqueurs des commerces
  useEffect(() => {
    const mp = map.current; if (!mp) return;
    markers.current.forEach((mk) => mk.remove()); markers.current = [];
    const list = [...rows].sort((a, b) => (a.match ? 1 : 0) - (b.match ? 1 : 0) || (a.m.id === sel ? 1 : 0) - (b.m.id === sel ? 1 : 0));
    for (const r of list) {
      const el = document.createElement("div");
      el.className = "rpin" + (r.m.id === sel ? " is-on" : "") + (r.match ? "" : " is-dim");
      el.style.setProperty("--c", r.m.color); el.style.setProperty("--t", lum(r.m.color) > 0.55 ? "#3A3328" : r.m.color);
      el.setAttribute("role", "button"); el.setAttribute("tabindex", "0"); el.setAttribute("aria-label", `${r.m.name}, ${r.m.commune}`); el.dataset.mid = r.m.id;
      el.innerHTML = `<span class="rpin-head"><b>${esc(counts ? String(r.prods.length) : initials(r.m))}</b></span><span class="rpin-name">${esc(r.m.name)}</span>`;
      el.addEventListener("click", (e) => { e.stopPropagation(); selRef.current(r.m.id); });
      el.addEventListener("keydown", (e) => { if (e.key === "Enter") selRef.current(r.m.id); });
      markers.current.push(new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat(r.g).addTo(mp));
    }
  }, [rows, sel, counts, ready]);

  // Ma position et rayon
  useEffect(() => {
    const mp = map.current; if (!mp) return;
    if (!me.current) { const el = document.createElement("div"); el.className = "rme"; el.innerHTML = "<i></i>"; me.current = new maplibregl.Marker({ element: el }).setLngLat(origin).addTo(mp); }
    else me.current.setLngLat(origin);
    drawRing();
  }, [origin[0], origin[1], radius, ready]);

  useEffect(() => { if (view && map.current) map.current.fitBounds(REAL_VIEWS[view.id], { padding: 16, duration: 900 }); }, [view?.n]);
  useEffect(() => {
    const mp = map.current; if (!focus || !mp) return;
    if (radius > 0 && focus.g === origin) { const c = circle(origin, radius).geometry.coordinates[0]; const xs = c.map((p) => p[0]), ys = c.map((p) => p[1]); mp.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: 24, duration: 900 }); return; }
    mp.flyTo({ center: focus.g, zoom: Math.max(mp.getZoom(), 15), duration: 1000 });
  }, [focus?.n]);

  return (
    <>
      <div ref={box} className="map-leaflet" />
      <button className={`map-ui map-layer is-${kind}`} onClick={() => switchKind(kind === "sat" ? "plan" : "sat")} aria-label={kind === "sat" ? "Afficher le plan" : "Afficher la vue satellite"}>
        <span className="map-layer-thumb" /><span className="map-layer-l">{kind === "sat" ? "Plan" : "Satellite"}</span>
      </button>
    </>
  );
}
