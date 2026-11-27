import React, { useEffect, useMemo, useRef, useState } from "react";
// L'outil Excel (≈ 420 Ko) n'est chargé que quand un commerçant ouvre l'import, pour alléger le site des visiteurs.
// Fichier servi par le site lui-même : /assets/xlsx-0.18.5.min.js (copie de node_modules/xlsx/dist/xlsx.full.min.js).
let xlsxP: Promise<any> | null = null;
function loadXLSX(): Promise<any> {
  if ((window as any).XLSX) return Promise.resolve((window as any).XLSX);
  return xlsxP ||= new Promise((ok, ko) => {
    const sc = document.createElement("script");
    sc.src = "/assets/xlsx-0.18.5.min.js";
    sc.onload = () => ok((window as any).XLSX);
    sc.onerror = () => { xlsxP = null; ko(new Error("Chargement de l'outil Excel impossible")); };
    document.head.appendChild(sc);
  });
}
import { FileSpreadsheet, Download, Upload, Check, TriangleAlert, Crown, ArrowLeftRight, ChevronRight, RotateCcw, Package, ClipboardPaste, Sparkles, Info, RefreshCw, Pencil, ImagePlus, Trash2, X } from "lucide-react";
import { CATEGORIES, STATUSES, planById, catById, fmtXPF, norm, Product, Status, CategoryId } from "./data";
import { useStore, alertMatches, newId } from "./store";
import { useNav } from "./nav";
import { Btn, DemoTag, cx, Segmented, Modal, Field } from "./ui";
import { useMe, readImage } from "./merchant";

// ---------- Colonnes du modèle ----------
type Key = "name" | "category" | "brand" | "price" | "qty" | "status" | "arrived" | "store" | "tryOn" | "description";
const COLS: { key: Key; head: string; req?: boolean; help: string; aliases: string[] }[] = [
  { key: "name", head: "Nom du produit", req: true, help: "Ex. PlayStation 5 Pro", aliases: ["nom", "produit", "designation", "libelle", "article", "nom du produit", "name", "intitule"] },
  { key: "category", head: "Catégorie", req: true, help: "Une catégorie de la liste", aliases: ["categorie", "rayon", "famille", "category", "type"] },
  { key: "price", head: "Prix (F CFP)", req: true, help: "Chiffres uniquement, ex. 109990", aliases: ["prix", "prix f cfp", "prix (f cfp)", "prix xpf", "tarif", "price", "pv", "prix de vente", "prix ttc"] },
  { key: "brand", head: "Marque", help: "Facultatif", aliases: ["marque", "brand", "fabricant"] },
  { key: "qty", head: "Quantité", help: "Facultatif, ex. 8", aliases: ["quantite", "qte", "stock", "qty", "nombre"] },
  { key: "status", head: "Statut", help: "En stock, Bientôt disponible, Stock limité…", aliases: ["statut", "etat", "disponibilite", "status"] },
  { key: "arrived", head: "Date d'arrivage", help: "JJ/MM/AAAA, facultatif", aliases: ["date d'arrivage", "date", "arrivage", "date arrivee", "date d arrivage", "arrivee"] },
  { key: "store", head: "Point de vente", help: "Facultatif si un seul magasin", aliases: ["point de vente", "magasin", "boutique", "store"] },
  { key: "tryOn", head: "Essayable en magasin", help: "Oui ou Non", aliases: ["essayable", "essayable en magasin", "essayage"] },
  { key: "description", head: "Description", help: "Facultatif", aliases: ["description", "details", "detail", "infos"] },
];
const SYN: Record<string, CategoryId> = { jeu: "gaming", jeux: "gaming", console: "gaming", "jeux video": "gaming", informatique: "hightech", ordinateur: "hightech", tv: "hightech", telephone: "telephonie", smartphone: "telephonie", vetement: "mode", vetements: "mode", textile: "mode", chaussure: "sneakers", chaussures: "sneakers", basket: "sneakers", baskets: "sneakers", maison: "maison", deco: "maison", mobilier: "maison", meuble: "maison", voiture: "auto", pneus: "auto", pieces: "auto", outillage: "bricolage", outil: "bricolage", epicerie: "alimentation", nourriture: "alimentation", boisson: "alimentation", cosmetique: "beaute", parfum: "beaute", peche: "nautisme", bateau: "nautisme", jouet: "loisirs", jouets: "loisirs", electro: "electromenager", "gros electromenager": "electromenager" };
const n = (v: unknown) => norm(String(v ?? "")).replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
function matchCat(v: string): CategoryId | null {
  const x = n(v); if (!x) return null;
  const c = CATEGORIES.find((c) => n(c.label) === x || c.id === x || n(c.label).startsWith(x) || x.startsWith(n(c.label)));
  if (c) return c.id;
  if (SYN[x]) return SYN[x];
  const w = Object.keys(SYN).find((k) => x.includes(k)); return w ? SYN[w] : null;
}
function matchStatus(v: string, date: Date | null): Status {
  const x = n(v);
  if (!x) return date && date.getTime() > Date.now() + 864e5 ? "soon" : "today";
  if (/bient|prevu|a venir|arrivage prevu|commande/.test(x)) return "soon";
  if (/epuis|rupture/.test(x)) return "out";
  if (/limit|derni/.test(x)) return "limited";
  if (/reappro|retour/.test(x)) return "restock";
  if (/nouv/.test(x)) return "new";
  return "today";
}
function parsePrice(v: unknown): number | null {
  if (typeof v === "number") return Math.round(v);
  const s = String(v ?? "").replace(/[\s  ]/g, "").replace(/(xpf|cfp|fcfp|f)$/i, "").replace(/f\.?cfp/i, "");
  if (!s) return null;
  const x = Number(s.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(x) && x > 0 ? Math.round(x) : null;
}
function parseDate(v: unknown): Date | null {
  if (v instanceof Date && !isNaN(+v)) return v;
  const s = String(v ?? "").trim(); if (!s) return null;
  let m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; const d = new Date(y, +m[2] - 1, +m[1], 8); return isNaN(+d) ? null : d; }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return new Date(+m[1], +m[2] - 1, +m[3], 8);
  return null;
}
// CSV ou texte collé depuis Excel (tabulations)
function parseText(text: string): unknown[][] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (!lines.length) return [];
  const first = lines[0]; const d = (first.match(/\t/g) || []).length ? "\t" : (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ";" : ",";
  return lines.map((l) => { const out: string[] = []; let cur = "", q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (ch === d && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out.map((x) => x.trim()); });
}

type Row = { line: number; name: string; category: CategoryId | null; catRaw: string; brand: string; price: number | null; priceRaw: string; qty: number | null; status: Status; arrived: Date | null; store: string; tryOn: boolean; description: string; images: string[]; include: boolean; dupId?: string; warn: string[] };
const rowErrors = (r: Row) => [!r.name && "Nom manquant", !r.category && (r.catRaw ? `Catégorie inconnue « ${r.catRaw} »` : "Catégorie manquante"), r.price == null && (r.priceRaw ? `Prix illisible « ${r.priceRaw} »` : "Prix manquant")].filter(Boolean) as string[];

function sampleRows(stores: string[]) {
  const st = stores[0];
  return [
    ["PlayStation 5 Pro 2 To", "Gaming", 109990, "Sony", 6, "En stock", "", st, "Non", "Version européenne, garantie 1 an"],
    ["Manette DualSense Edge", "Gaming", "26 990 F", "Sony", 12, "En stock", "", st, "Non", ""],
    ["Casque Pulse Elite", "Jeux vidéo", 24990, "Sony", 4, "Stock limité", "", st, "Non", ""],
    ["Nintendo Switch 2", "Gaming", 74990, "Nintendo", 20, "Bientôt disponible", "15/12/2026", st, "Non", "Arrivage par avion"],
    ["Écran gaming 27 pouces", "High-tech", 34990, "MSI", 3, "", "", st, "Non", ""],
    ["Sac de couchage", "Camping", 8990, "", 10, "En stock", "", st, "Non", ""],
    ["Chaise gaming ergonomique", "Maison", "", "Secretlab", 2, "Bientôt disponible", "20/12/2026", st, "Non", ""],
    ["Carte cadeau 10 000 F", "Loisirs", 10000, "", "", "En stock", "", st, "Non", ""],
  ];
}

export function ImportPage() {
  const { s, mutate, toast, log, publish } = useStore();
  const { go } = useNav();
  const me = useMe();
  const plan = planById(me.plan);
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [mapped, setMapped] = useState<{ key: Key; from: string }[]>([]);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<"publish" | "draft">("publish");
  const [paste, setPaste] = useState(false);
  const [pasted, setPasted] = useState("");
  const [drag, setDrag] = useState(false);
  const [parseErr, setParseErr] = useState("");
  const [done, setDone] = useState<{ created: number; updated: number; skipped: number; hits: number; mode: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const premiumDemo: any = null;
  useEffect(() => { loadXLSX().catch(() => {}); }, []);

  // ---------- Modèle Excel ----------
  const downloadTemplate = async () => {
    let XLSX: any;
    try { XLSX = await loadXLSX(); } catch { toast("Connexion impossible : réessayez dans un instant", "warn"); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([COLS.map((c) => c.head + (c.req ? " *" : "")), ...sampleRows(me.stores).slice(0, 3)]);
    ws["!cols"] = COLS.map((c) => ({ wch: Math.max(14, c.head.length + 4) }));
    XLSX.utils.book_append_sheet(wb, ws, "Produits");
    const help = XLSX.utils.aoa_to_sheet([["Mode d'emploi ARRIVAGE"], ["1 ligne = 1 produit. Les colonnes avec * sont obligatoires. Supprimez les 3 lignes d'exemple."], [], ["Catégories acceptées"], ...CATEGORIES.map((c) => [c.label]), [], ["Statuts acceptés"], ...STATUSES.map((x) => [x.id === "today" ? "En stock" : x.label]), [], ["Points de vente"], ...me.stores.map((x) => [x])]);
    help["!cols"] = [{ wch: 70 }];
    XLSX.utils.book_append_sheet(wb, help, "Aide");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const filename = "modele-import-arrivage.xlsx";
    try {
      const dl = await (window as any).claude?.use?.("downloads");
      if (dl) { await dl.save({ filename, data: blob }); toast("Modèle Excel proposé au téléchargement"); return; }
    } catch (e: any) { if (e?.code === "declined") { toast("Téléchargement annulé", "info"); return; } }
    try { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); toast("Modèle Excel téléchargé"); }
    catch { toast("Téléchargement impossible ici", "warn"); }
  };

  // ---------- Lecture ----------
  const analyse = (aoa: unknown[][], name: string) => {
    setParseErr("");
    const grid = aoa.filter((r) => Array.isArray(r) && r.some((c) => String(c ?? "").trim() !== ""));
    if (grid.length < 2) { setParseErr("Le fichier ne contient pas de produits. Vérifiez qu'il y a une ligne de titres puis une ligne par produit."); return; }
    const head = (grid[0] as unknown[]).map((h) => n(h).replace(/\s*\*$/, "").replace(/[()]/g, "").trim());
    const idx: Partial<Record<Key, number>> = {}; const mp: { key: Key; from: string }[] = [];
    COLS.forEach((c) => { const i = head.findIndex((h, j) => !Object.values(idx).includes(j) && (c.aliases.includes(h) || n(c.head).replace(/[()]/g, "") === h || c.aliases.some((a) => a.length > 4 && h.startsWith(a)))); if (i >= 0) { idx[c.key] = i; mp.push({ key: c.key, from: String((grid[0] as unknown[])[i] ?? "") }); } });
    if (idx.name == null || idx.price == null) { setParseErr("Nous ne trouvons pas les colonnes « Nom du produit » et « Prix ». Utilisez le modèle, ou renommez vos colonnes."); return; }
    const mine = s.products.filter((p) => p.merchantId === me.id);
    const out: Row[] = grid.slice(1).map((r: any, i) => {
      const g = (k: Key) => (idx[k] == null ? "" : r[idx[k]!] ?? "");
      const arrived = parseDate(g("arrived"));
      const name = String(g("name")).trim();
      const storeRaw = String(g("store")).trim(); const store = me.stores.find((x) => n(x) === n(storeRaw)) || me.stores[0];
      const qtyN = g("qty") === "" ? null : Math.round(Number(String(g("qty")).replace(/[^\d.,]/g, "").replace(",", ".")));
      const row: Row = {
        line: i + 2, name, catRaw: String(g("category")).trim(), category: matchCat(String(g("category"))), brand: String(g("brand")).trim(),
        priceRaw: String(g("price")).trim(), price: parsePrice(g("price")), qty: Number.isFinite(qtyN as number) ? qtyN : null, status: matchStatus(String(g("status")), arrived), arrived,
        store, tryOn: /^(oui|yes|x|1|vrai|true)$/i.test(String(g("tryOn")).trim()), description: String(g("description")).trim(), images: [], include: true, warn: [],
      };
      if (storeRaw && n(storeRaw) !== n(store)) row.warn.push(`Point de vente « ${storeRaw} » inconnu : ${store} utilisé`);
      const dup = mine.find((p) => n(p.name) === n(name)); if (dup) { row.dupId = dup.id; row.warn.push("Déjà en ligne : prix et stock seront mis à jour"); }
      row.include = rowErrors(row).length === 0;
      return row;
    });
    setRows(out); setMapped(mp); setFileName(name); setStep(3);
  };
  const readFile = async (file: File) => {
    try {
      if (/\.(csv|txt|tsv)$/i.test(file.name)) { analyse(parseText(await file.text()), file.name); return; }
      const XLSX = await loadXLSX();
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      analyse(XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" }) as unknown[][], file.name);
    } catch { setParseErr("Ce fichier n'a pas pu être lu. Enregistrez-le au format Excel (.xlsx) ou CSV, puis réessayez."); }
  };
  const tryDemo = () => analyse([COLS.map((c) => c.head), ...sampleRows(me.stores)], "exemple-arrivage-decembre.xlsx");

  const upd = (line: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => { if (r.line !== line) return r; const x = { ...r, ...patch }; if (rowErrors(x).length === 0 && rowErrors(r).length > 0) x.include = true; return x; }));
  const ok = rows.filter((r) => rowErrors(r).length === 0);
  const toFix = rows.length - ok.length;
  const selected = ok.filter((r) => r.include);
  const noPhoto = rows.filter((r) => !r.images.length).length;

  const doImport = () => {
    const nowI = new Date().toISOString();
    // Comptes calculés avant la mise à jour (mutate est appliqué plus tard)
    const created = selected.filter((r) => !r.dupId || !s.products.some((p) => p.id === r.dupId)).length;
    const updated = selected.length - created;
    const hits = mode === "publish" ? selected.filter((r) => !r.dupId).reduce((n2, r) => n2 + s.alerts.filter((a) => a.active && alertMatches(a, { name: r.name, brand: r.brand, category: r.category, price: r.price, tags: [], description: r.description, state: "published", status: r.status, merchantId: me.id } as any, me)).length, 0) : 0;
    mutate((d) => {
      const toPublish: string[] = [];
      for (const r of selected) {
        const arrivedAt = (r.arrived ? r.arrived : new Date()).toISOString();
        if (r.dupId) {
          const p = d.products.find((x) => x.id === r.dupId); if (!p) continue;
          p.price = r.price!; if (r.images.length) p.images = r.images; if (r.qty != null) p.qty = r.qty; p.status = r.status; p.updatedAt = nowI; if (r.arrived) p.arrivedAt = arrivedAt; continue;
        }
        const p: Product = {
          id: "p" + newId(), views: 0, favBase: 0, contacts: 0, alertHits: 0, sponsored: false, featured: false, createdAt: nowI, publishedAt: nowI, scheduledAt: null,
          state: mode === "publish" ? "published" : "draft", name: r.name, category: r.category!, brand: r.brand || "Sans marque", description: r.description || "Aucune description fournie.",
          price: r.price!, qty: r.qty, images: r.images, arrivedAt, status: r.status, store: r.store, tags: [], updatedAt: nowI, merchantId: me.id, tryOn: r.tryOn,
        } as any;
        d.products.unshift(p);
        if (mode === "publish") toPublish.push(p.id);
      }
      for (const id of toPublish) publish(d, d.products.find((x) => x.id === id)!);
      log(d, `${me.name} a importé ${created + updated} produit${created + updated > 1 ? "s" : ""} depuis un fichier`, "commerçant");
    });
    setDone({ created, updated, skipped: rows.length - selected.length, hits, mode });
    setStep(4);
    toast(`${created + updated} produit${created + updated > 1 ? "s" : ""} importé${created + updated > 1 ? "s" : ""}`);
  };
  const reset = () => { setRows([]); setMapped([]); setFileName(""); setDone(null); setPasted(""); setPaste(false); setParseErr(""); setStep(2); };

  const stepper = (
    <ol className="imp-steps" aria-label="Étapes">
      {["Préparer le fichier", "Envoyer le fichier", "Vérifier", "Terminé"].map((l, i) => (
        <li key={l} className={cx(step === i + 1 && "is-on", step > i + 1 && "is-done")}><span>{step > i + 1 ? <Check size={13} /> : i + 1}</span>{l}</li>
      ))}
    </ol>
  );

  if (!plan.can.bulkImport) return (
    <div className="page imp-page">
      <div className="page-head"><div><h1 className="page-title">Import du catalogue</h1><p className="muted">Publiez tout un arrivage d'un coup depuis un fichier Excel, au lieu de saisir les produits un par un.</p></div></div>
      <HowItWorks />
      <div className="panel team-upsell">
        <Crown size={22} />
        <div><h3>Import Excel, inclus dans le forfait Premium</h3><p className="muted">Vous êtes actuellement en {plan.name}.</p></div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Btn variant="accent" onClick={() => go("plans")}>Découvrir Premium</Btn>
          {premiumDemo && <Btn variant="outline" icon={ArrowLeftRight} onClick={() => { mutate((d) => { d.currentMerchant = premiumDemo.id; d.actAs = null; }); toast(`Démo : vous êtes maintenant ${premiumDemo.name} (Premium)`, "info"); }}>Essayer avec {premiumDemo.name}</Btn>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="page imp-page">
      <div className="page-head"><div><h1 className="page-title">Import du catalogue</h1><p className="muted">Publiez tout un arrivage d'un coup depuis un fichier Excel.</p></div></div>
      {stepper}

      {step === 1 && (
        <>
          <HowItWorks />
          <section className="panel">
            <div className="panel-head"><h3>Le modèle, en un coup d'œil</h3><span className="muted small">Une ligne = un produit. Les colonnes avec * sont obligatoires.</span></div>
            <div className="imp-sheet" role="table" aria-label="Aperçu du modèle Excel">
              <div className="imp-sheet-row is-head" role="row"><span className="imp-rn" />{COLS.slice(0, 7).map((c) => <span key={c.key} role="columnheader">{c.head}{c.req && <b> *</b>}</span>)}</div>
              {sampleRows(me.stores).slice(0, 3).map((r, i) => <div key={i} className="imp-sheet-row" role="row"><span className="imp-rn">{i + 2}</span>{r.slice(0, 7).map((v, j) => <span key={j} role="cell">{String(v)}</span>)}</div>)}
            </div>
            <div className="imp-hints">
              <div><strong>Catégories acceptées</strong><span className="muted small">{CATEGORIES.map((c) => c.label).join(" · ")}</span></div>
              <div><strong>Statut</strong><span className="muted small">« En stock » par défaut. « Bientôt disponible » + une date pour un arrivage à venir.</span></div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              <Btn icon={Download} onClick={downloadTemplate}>Télécharger le modèle Excel</Btn>
              <Btn variant="outline" icon={ChevronRight} onClick={() => setStep(2)}>J'ai déjà mon fichier</Btn>
            </div>
          </section>
        </>
      )}

      {step === 2 && (
        <section className="panel">
          <div className="panel-head"><h3>Envoyez votre fichier</h3><button className="link-btn" onClick={() => setStep(1)}>Revoir le modèle</button></div>
          {!paste ? (
            <div className={cx("imp-drop", drag && "is-drag")} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) readFile(f); }}>
              <FileSpreadsheet size={34} />
              <strong>Déposez votre fichier Excel ici</strong>
              <span className="muted small">Formats acceptés : .xlsx, .xls, .csv. Sur iPad, touchez le bouton puis choisissez le fichier dans « Fichiers ».</span>
              <Btn icon={Upload} onClick={() => fileRef.current?.click()}>Choisir un fichier</Btn>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ""; }} />
            </div>
          ) : (
            <div className="imp-paste">
              <label className="field-label" htmlFor="imp-paste">Collez vos lignes, titres compris</label>
              <textarea id="imp-paste" rows={7} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder={"Nom du produit\tCatégorie\tPrix (F CFP)\nPS5 Pro\tGaming\t109990"} />
              <div className="row" style={{ gap: 8 }}><Btn icon={Check} onClick={() => analyse(parseText(pasted), "Lignes collées")} disabled={!pasted.trim()}>Analyser</Btn></div>
            </div>
          )}
          {parseErr && <p className="imp-err"><TriangleAlert size={15} /> {parseErr}</p>}
          <div className="imp-alt">
            <button className="link-btn" onClick={() => setPaste(!paste)}><ClipboardPaste size={14} /> {paste ? "Envoyer un fichier à la place" : "Ou copier-coller depuis Excel"}</button>
            <button className="link-btn" onClick={tryDemo}><Sparkles size={14} /> Essayer avec un fichier d'exemple</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <>
          <section className="panel">
            <div className="imp-sum">
              <div><FileSpreadsheet size={18} /> <b>{fileName}</b> · {rows.length} ligne{rows.length > 1 ? "s" : ""}</div>
              <span className="pill pill-sm pill-green"><Check size={11} /> {ok.length} prête{ok.length > 1 ? "s" : ""}</span>
              {toFix > 0 && <span className="pill pill-sm pill-amber"><TriangleAlert size={11} /> {toFix} à corriger</span>}
              {noPhoto > 0 && <span className="pill pill-sm pill-blue"><ImagePlus size={11} /> {noPhoto} sans photo</span>}
              <button className="link-btn" onClick={reset}><RotateCcw size={13} /> Changer de fichier</button>
            </div>
            <p className="micro imp-mapped">Colonnes reconnues : {mapped.map((m) => <span key={m.key} className="imp-tag">{m.from}</span>)}</p>
          </section>
          {noPhoto > 0 && (
            <div className="imp-photo-tip">
              <span className="imp-photo-tip-ico"><ImagePlus size={20} /></span>
              <div><strong>Ajoutez une photo à chaque article</strong><span className="muted small">Un fichier Excel ne contient pas de photos. Les annonces avec une vraie photo sont bien plus consultées : touchez « Ajouter une photo » sous chaque article. Vous pouvez aussi le faire plus tard depuis « Publications ».</span></div>
              <span className="imp-photo-tip-n">{rows.length - noPhoto}/{rows.length}<em>avec photo</em></span>
            </div>
          )}
          <section className="panel imp-table-panel">
            <div className="imp-table">
              <div className="imp-tr is-head"><span /><span>Produit</span><span>Catégorie</span><span>Prix</span><span>Qté</span><span>Statut</span><span>Vérification</span><span /></div>
              {rows.map((r, i) => {
                const errs = rowErrors(r);
                return (
                  <div key={r.line} className={cx("imp-tr", errs.length && "is-err", !r.include && "is-off")}>
                    <span><input type="checkbox" aria-label={`Importer la ligne ${i + 1}`} checked={r.include && !errs.length} disabled={!!errs.length} onChange={(e) => upd(r.line, { include: e.target.checked })} /></span>
                    <span className="imp-name">{r.images[0] && <img src={r.images[0]} alt="" className="imp-thumb" />}<span>{r.name ? <button className="imp-name-btn" onClick={() => setEditing(r.line)}>{r.name}</button> : <input className="imp-fix" placeholder="Nom du produit" onBlur={(e) => upd(r.line, { name: e.target.value.trim() })} />}<em>Ligne {i + 1}{r.brand ? ` · ${r.brand}` : ""}{r.images.length ? ` · ${r.images.length} photo${r.images.length > 1 ? "s" : ""}` : ""}</em></span></span>
                    <span>{r.category ? catById(r.category).label : <select className="imp-fix" aria-label={`Catégorie de la ligne ${i + 1}`} value="" onChange={(e) => upd(r.line, { category: e.target.value as CategoryId })}><option value="">Choisir…</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>}</span>
                    <span className="num">{r.price != null ? fmtXPF(r.price) : <input className="imp-fix" inputMode="numeric" placeholder="Prix" aria-label={`Prix de la ligne ${i + 1}`} onBlur={(e) => upd(r.line, { price: parsePrice(e.target.value), priceRaw: e.target.value })} />}</span>
                    <span className="num">{r.qty ?? "—"}</span>
                    <span className="micro">{r.status === "today" ? "En stock" : STATUSES.find((x) => x.id === r.status)?.label}{r.arrived && r.status === "soon" ? ` · ${r.arrived.toLocaleDateString("fr-FR")}` : ""}</span>
                    <span className="imp-check">{errs.length ? errs.map((e) => <span key={e} className="imp-bad"><TriangleAlert size={12} /> {e}</span>) : <span className="imp-good"><Check size={12} /> Prêt</span>}{!r.images.length && <button className="imp-nophoto" onClick={() => setEditing(r.line)}><ImagePlus size={12} /> Ajouter une photo</button>}{r.warn.map((w) => <span key={w} className="imp-warn">{r.dupId ? <RefreshCw size={11} /> : <Info size={11} />} {w}</span>)}</span>
                    <span className="imp-edit"><Btn size="sm" variant="outline" icon={Pencil} onClick={() => setEditing(r.line)} aria-label={`Modifier la ligne ${i + 1}`}>Modifier</Btn></span>
                  </div>
                );
              })}
            </div>
          </section>
          <p className="note"><Pencil size={14} /> Touchez « Modifier » sur une ligne pour changer n'importe quel champ ou ajouter des photos avant de publier. Rien n'est enregistré tant que vous n'avez pas cliqué sur « Importer ».</p>
          {editing != null && rows.find((r) => r.line === editing) && <RowEditor row={rows.find((r) => r.line === editing)!} num={rows.findIndex((r) => r.line === editing) + 1} stores={me.stores} onClose={() => setEditing(null)}
            onSave={(patch) => { upd(editing, { ...patch, warn: rows.find((r) => r.line === editing)!.warn.filter((w) => !w.startsWith("Point de vente")) }); setEditing(null); toast("Ligne modifiée"); }}
            onRemove={() => { setRows((rs) => rs.filter((r) => r.line !== editing)); setEditing(null); toast("Ligne retirée de l'import", "info"); }} />}
          <section className="panel imp-go">
            <div>
              <strong>Que faire de ces produits ?</strong>
              <Segmented value={mode} onChange={(v) => setMode(v as any)} options={[{ v: "publish", l: "Publier tout de suite" }, { v: "draft", l: "Garder en brouillon" }]} />
              <span className="muted small">{mode === "publish" ? "Visibles immédiatement, et les clients qui ont une alerte correspondante sont prévenus." : "Vous pourrez ajouter des photos puis publier depuis « Publications »."}</span>
            </div>
            <Btn icon={Upload} onClick={doImport} disabled={!selected.length}>Importer {selected.length} produit{selected.length > 1 ? "s" : ""}</Btn>
          </section>
        </>
      )}

      {step === 4 && done && (
        <section className="panel imp-done">
          <span className="imp-done-ico"><Check size={28} /></span>
          <h2>{done.created + done.updated} produit{done.created + done.updated > 1 ? "s" : ""} importé{done.created + done.updated > 1 ? "s" : ""}</h2>
          <ul>
            {done.created > 0 && <li>{done.created} nouveau{done.created > 1 ? "x" : ""} produit{done.created > 1 ? "s" : ""} {done.mode === "publish" ? "publié" + (done.created > 1 ? "s" : "") : "en brouillon"}</li>}
            {done.updated > 0 && <li>{done.updated} produit{done.updated > 1 ? "s" : ""} déjà en ligne mis à jour (prix et stock)</li>}
            {done.skipped > 0 && <li>{done.skipped} ligne{done.skipped > 1 ? "s" : ""} non importée{done.skipped > 1 ? "s" : ""}</li>}
            {done.hits > 0 && <li>{done.hits} alerte{done.hits > 1 ? "s" : ""} client déclenchée{done.hits > 1 ? "s" : ""}</li>}
          </ul>
          <p className="muted small">Astuce : ajoutez une photo aux produits importés pour qu'ils ressortent mieux.</p>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <Btn icon={Package} onClick={() => go("posts")}>Voir mes publications</Btn>
            <Btn variant="outline" icon={RotateCcw} onClick={reset}>Importer un autre fichier</Btn>
          </div>
        </section>
      )}
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="team-steps">
      {[[Download, "1. Téléchargez le modèle", "Un fichier Excel déjà prêt, avec les bonnes colonnes."], [FileSpreadsheet, "2. Remplissez-le", "Une ligne par produit, comme votre bon de livraison."], [Upload, "3. Envoyez-le", "ARRIVAGE vérifie chaque ligne, vous corrigez si besoin, puis vous publiez tout."]].map(([I, t, d]: any) => (
        <div key={t} className="team-step"><span className="team-step-ico"><I size={18} /></span><div><strong>{t}</strong><span className="muted small">{d}</span></div></div>
      ))}
    </div>
  );
}

// Fiche complète d'une ligne, modifiable avant l'import
function RowEditor({ row, num, stores, onSave, onClose, onRemove }: { row: Row; num: number; stores: string[]; onSave: (p: Partial<Row>) => void; onClose: () => void; onRemove: () => void }) {
  const [f, setF] = useState({
    name: row.name, category: row.category || "", brand: row.brand, price: row.price != null ? String(row.price) : "", qty: row.qty != null ? String(row.qty) : "",
    status: row.status, arrived: row.arrived ? new Date(row.arrived.getTime() - row.arrived.getTimezoneOffset() * 6e4).toISOString().slice(0, 10) : "", store: row.store, tryOn: row.tryOn, description: row.description, images: row.images,
  });
  const [err, setErr] = useState<any>({});
  const [imgErr, setImgErr] = useState("");
  const pick = useRef<HTMLInputElement>(null);
  const set = (k: string, v: any) => setF((x) => ({ ...x, [k]: v }));
  const save = () => {
    const e: any = {};
    if (!f.name.trim()) e.name = "Indiquez le nom du produit";
    if (!f.category) e.category = "Choisissez une catégorie";
    const price = parsePrice(f.price); if (price == null) e.price = "Indiquez un prix en F CFP";
    if (f.qty !== "" && !/^\d+$/.test(f.qty.trim())) e.qty = "Nombre entier uniquement";
    if (f.status === "soon" && !f.arrived) e.arrived = "Indiquez la date d'arrivage prévue";
    setErr(e); if (Object.keys(e).length) return;
    onSave({ name: f.name.trim(), category: f.category as CategoryId, catRaw: f.category, brand: f.brand.trim(), price, priceRaw: f.price, qty: f.qty === "" ? null : Number(f.qty), status: f.status, arrived: f.arrived ? new Date(f.arrived + "T08:00:00") : null, store: f.store, tryOn: f.tryOn, description: f.description.trim(), images: f.images });
  };
  const addImgs = async (files: FileList | null) => {
    setImgErr(""); if (!files) return;
    const out = [...f.images];
    for (const file of Array.from(files).slice(0, 4 - out.length)) { try { out.push(await readImage(file)); } catch (e: any) { setImgErr(e.message); } }
    set("images", out);
  };
  return (
    <Modal open onClose={onClose} title={`Modifier la ligne ${num}`} wide>
      <div className="imp-editor">
        <Field label="Nom du produit *" error={err.name} htmlFor="ie-name"><input id="ie-name" value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <div className="form-2">
          <Field label="Catégorie *" error={err.category} htmlFor="ie-cat"><select id="ie-cat" value={f.category} onChange={(e) => set("category", e.target.value)}><option value="">Choisir…</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
          <Field label="Marque" htmlFor="ie-brand"><input id="ie-brand" value={f.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Facultatif" /></Field>
          <Field label="Prix (F CFP) *" error={err.price} htmlFor="ie-price"><input id="ie-price" inputMode="numeric" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="Ex. 109990" /></Field>
          <Field label="Quantité" error={err.qty} htmlFor="ie-qty"><input id="ie-qty" inputMode="numeric" value={f.qty} onChange={(e) => set("qty", e.target.value.replace(/[^\d]/g, ""))} placeholder="Facultatif" /></Field>
          <Field label="Statut" htmlFor="ie-status"><select id="ie-status" value={f.status} onChange={(e) => set("status", e.target.value)}>{STATUSES.map((x) => <option key={x.id} value={x.id}>{x.id === "today" ? "En stock" : x.label}</option>)}</select></Field>
          <Field label={f.status === "soon" ? "Date d'arrivage prévue *" : "Date d'arrivage"} error={err.arrived} htmlFor="ie-date"><input id="ie-date" type="date" value={f.arrived} onChange={(e) => set("arrived", e.target.value)} /></Field>
          {stores.length > 1 && <Field label="Point de vente" htmlFor="ie-store"><select id="ie-store" value={f.store} onChange={(e) => set("store", e.target.value)}>{stores.map((x) => <option key={x}>{x}</option>)}</select></Field>}
        </div>
        <Field label="Description" htmlFor="ie-desc"><textarea id="ie-desc" rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Facultatif : état, garantie, tailles…" /></Field>
        <label className={cx("tryon-opt", f.tryOn && "is-on")}><input type="checkbox" checked={f.tryOn} onChange={(e) => set("tryOn", e.target.checked)} /><span className="tryon-box"><Check size={14} /></span><span className="tryon-txt"><strong>Produit essayable en magasin</strong><span className="muted small">La réservation et le paiement en ligne seront désactivés.</span></span></label>
        <div className="field"><span className="field-label">Photos (jusqu'à 4)</span>
          <div className="imp-photos">
            {f.images.map((src, i) => <span key={i} className="imp-photo"><img src={src} alt={`Photo ${i + 1}`} /><button aria-label="Retirer la photo" onClick={() => set("images", f.images.filter((_, j) => j !== i))}><X size={13} /></button></span>)}
            {f.images.length < 4 && <button type="button" className="imp-photo-add" onClick={() => pick.current?.click()}><ImagePlus size={20} /><span>Ajouter</span></button>}
            <input ref={pick} type="file" accept="image/*" multiple hidden onChange={(e) => { addImgs(e.target.files); e.target.value = ""; }} />
          </div>
          {imgErr && <span className="field-err">{imgErr}</span>}
        </div>
        <div className="imp-editor-foot">
          <Btn variant="ghost" icon={Trash2} onClick={onRemove}>Retirer de l'import</Btn>
          <span style={{ flex: 1 }} />
          <Btn variant="ghost" onClick={onClose}>Annuler</Btn>
          <Btn icon={Check} onClick={save}>Enregistrer</Btn>
        </div>
      </div>
    </Modal>
  );
}
