import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FileSpreadsheet,
  Eye, Heart, MousePointerClick, Users, BellRing, Package, Plus, Pencil, Copy, Trash2, Zap, Ban, Lock, Crown, Check, ImagePlus,
  Calendar, Save, Send, Clock, TrendingUp, Info, Search, RotateCcw, Megaphone, Store, Timer, MapPin, Wand2, Target, ShoppingBag, Shirt,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell, PieChart, Pie } from "recharts";
import { CATEGORIES, COMMUNES, STATUSES, PLANS, DEMAND, catById, planById, fmtXPF, fmtNum, fmtRel, fmtDate, norm, Product, Merchant, Status, PlanId } from "./data";
import { useStore, alertMatches, newId, tokens, productHay } from "./store";
import { useNav } from "./nav";
import { Btn, IconBtn, StatusPill, Chip, ProductVisual, MerchantLogo, Modal, Empty, SectionHead, Segmented, Field, Stat, DemoTag, cx, Confirm } from "./ui";

export const useMe = () => {
  const { s } = useStore();
  return s.merchants.find((m) => m.id === s.currentMerchant) || s.merchants[0];
};

const monthCount = (products: Product[], mid: string) => {
  const n = new Date();
  return products.filter((p) => p.merchantId === mid && (p.state === "published" || p.state === "scheduled") && new Date(p.createdAt).getMonth() === n.getMonth() && new Date(p.createdAt).getFullYear() === n.getFullYear()).length;
};

function seeded(seed: number) { let x = seed % 2147483647; return () => (x = (x * 16807) % 2147483647) / 2147483647; }

const tipStyle = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, fontSize: 12, color: "var(--fg)" };

// ---------- Tableau de bord ----------
export function MerchantDashboard() {
  const { s } = useStore();
  const { go } = useNav();
  const me = useMe();
  const plan = planById(me.plan);
  const [period, setPeriod] = useState("30");
  const [metric, setMetric] = useState("views");
  const mine = s.products.filter((p) => p.merchantId === me.id);
  const active = mine.filter((p) => p.state === "published" && p.status !== "out");
  const views = mine.reduce((a, p) => a + p.views, 0);
  const favs = mine.reduce((a, p) => a + p.favBase + (s.favorites.includes(p.id) ? 1 : 0), 0);
  const contacts = mine.reduce((a, p) => a + (p.contacts || 0), 0);
  const followers = me.followersBase + (s.follows.includes(me.id) ? 1 : 0);
  const alertHits = mine.reduce((a, p) => a + (p.alertHits || 0), 0);
  const used = monthCount(s.products, me.id);

  const canPeriod = plan.can.stats === "advanced" || plan.can.stats === "detailed";
  const days = canPeriod ? Number(period) : 30;
  const series = useMemo(() => {
    const r = seeded(me.id.length * 131 + days);
    const tot = { views, favs, contacts }[metric as "views"] || views;
    const base = tot / 45;
    return Array.from({ length: days }, (_, i) => {
      const dt = new Date(Date.now() - (days - 1 - i) * 864e5);
      const wk = [0.7, 1, 1, 1.05, 1.15, 1.35, 1.2][dt.getDay()];
      const trend = 0.75 + (i / days) * 0.5;
      return { d: dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), v: Math.max(0, Math.round(base * wk * trend * (0.7 + r() * 0.6))) };
    });
  }, [days, metric, views, favs, contacts, me.id]);
  const top = mine.filter((p) => p.state === "published").sort((a, b) => b.views - a.views).slice(0, 5);
  const byCommune = useMemo(() => {
    const r = seeded(me.id.length * 17);
    const w = COMMUNES.slice(0, 7).map((c) => ({ name: c, value: Math.round((c === me.commune ? 40 : 6) + r() * 18) }));
    const t = w.reduce((a, b) => a + b.value, 0);
    return w.map((x) => ({ ...x, pct: Math.round((x.value / t) * 100) })).sort((a, b) => b.value - a.value);
  }, [me.id]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Bonjour, {me.name}</h1>
          <p className="muted">Vue d'ensemble de vos arrivages · <DemoTag>Statistiques simulées</DemoTag></p>
        </div>
        <Btn icon={Plus} onClick={() => go("publish")}>Publier un arrivage</Btn>
      </div>

      {me.status !== "active" && <div className="banner-warn"><Info size={16} /> {me.status === "pending" ? "Compte en attente de validation par l'équipe ARRIVAGE : vos publications ne sont pas encore visibles." : "Compte suspendu par la modération : vos publications ne sont plus visibles."}</div>}
      {s.reservations.some((r) => r.merchantId === me.id && r.status === "paid") && (
        <button className="resbanner" onClick={() => go("reservations")}><ShoppingBag size={18} /> <span><strong>{s.reservations.filter((r) => r.merchantId === me.id && r.status === "paid").length} réservation(s) payée(s) à préparer.</strong> Le client a déjà réglé en ligne et viendra retirer en magasin.</span><strong>Voir</strong></button>
      )}
      {s.reports.some((r) => r.merchantUnread && mine.some((p) => p.id === r.productId)) && (
        <button className="modbanner" onClick={() => go("moderation")}><Info size={16} /> <span>Vous avez un nouveau message de la modération concernant une publication signalée.</span><strong>Voir</strong></button>
      )}
      <div className="stats">
        <Stat icon={Package} label="Publications actives" value={fmtNum(active.length)} sub={`${mine.filter((p) => p.state === "draft").length} brouillon(s) · ${mine.filter((p) => p.state === "scheduled").length} programmée(s)`} />
        <Stat icon={Eye} label="Vues" value={plan.can.stats === "none" ? "—" : fmtNum(views)} sub={plan.can.stats === "none" ? "Inclus dès Starter" : "Cumul des fiches produits"} />
        <Stat icon={Heart} label="Favoris générés" value={plan.can.stats === "none" ? "—" : fmtNum(favs)} />
        <Stat icon={MousePointerClick} label="Clics vers les coordonnées" value={plan.can.stats === "none" ? "—" : fmtNum(contacts)} />
        <Stat icon={Users} label="Abonnés au commerce" value={fmtNum(followers)} />
        <Stat icon={BellRing} label="Alertes déclenchées" value={plan.can.alerts ? fmtNum(alertHits) : "—"} sub={plan.can.alerts ? "Consommateurs prévenus" : "Inclus dès Business"} />
      </div>

      <div className="dash-grid">
        <div className="panel panel-chart">
          <div className="panel-head">
            <div><h3>Évolution des performances</h3><span className="muted small">{canPeriod ? `${days} derniers jours` : "30 derniers jours · périodes personnalisées dès Business"}</span></div>
            <div className="row">
              <Segmented size="sm" value={metric} onChange={setMetric} options={[{ v: "views", l: "Vues" }, { v: "favs", l: "Favoris" }, { v: "contacts", l: "Contacts" }]} />
              {canPeriod && <Segmented size="sm" value={period} onChange={setPeriod} options={[{ v: "7", l: "7 j" }, { v: "30", l: "30 j" }, { v: "90", l: "90 j" }]} />}
            </div>
          </div>
          {plan.can.stats === "none" ? (
            <Locked title="Statistiques disponibles dès le forfait Starter" onUpgrade={() => go("plans")} />
          ) : (
            <div className="chart-h">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                  <defs><linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} /><stop offset="100%" stopColor="var(--accent)" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip contentStyle={tipStyle} formatter={(v: any) => [fmtNum(v), { views: "Vues", favs: "Favoris", contacts: "Contacts" }[metric]]} />
                  <Area type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={2} fill="url(#gA)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Forfait actuel</h3><button className="link" onClick={() => go("plans")}>Changer</button></div>
          <div className="plan-now">
            <span className={cx("plan-badge", `plan-${plan.id}`)}>{plan.id === "premium" && <Crown size={14} />}{plan.name}</span>
            <strong>{plan.price ? fmtXPF(plan.price) + " / mois" : "Gratuit"}</strong>
          </div>
          <div className="quota">
            <div className="row-between small"><span>Publications ce mois-ci</span><strong>{used}{plan.quota ? ` / ${plan.quota}` : " · illimitées"}</strong></div>
            <div className="bar"><i style={{ width: plan.quota ? Math.min(100, (used / plan.quota) * 100) + "%" : "100%", background: plan.quota && used >= plan.quota ? "var(--danger)" : undefined }} /></div>
          </div>
          <ul className="checks small">{plan.features.slice(0, 4).map((f) => <li key={f}><Check size={14} />{f}</li>)}</ul>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Publications les plus populaires</h3><button className="link" onClick={() => go("posts")}>Tout gérer</button></div>
          {top.length ? (
            <div className="toplist">
              {top.map((p, i) => (
                <div key={p.id} className="toprow">
                  <span className="rank">{i + 1}</span>
                  <span className="toprow-thumb"><ProductVisual p={p} /></span>
                  <div className="toprow-main"><strong>{p.name}</strong><span className="muted small">{fmtXPF(p.price)} · <StatusPill status={p.status} small /></span></div>
                  <div className="toprow-num"><strong>{plan.can.stats === "none" ? "—" : fmtNum(p.views)}</strong><span className="muted small">vues</span></div>
                </div>
              ))}
            </div>
          ) : <Empty icon={Package} title="Aucune publication en ligne" />}
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Provenance des vues</h3><span className="muted small">par commune</span></div>
          {plan.can.stats === "detailed" ? (
            <div className="commune-bars">
              {byCommune.map((c) => (<div key={c.name} className="cbar"><span>{c.name}</span><div className="bar"><i style={{ width: c.pct * 2 + "%" }} /></div><strong>{c.pct} %</strong></div>))}
            </div>
          ) : <Locked title="Statistiques détaillées incluses dans Premium" onUpgrade={() => go("plans")} small />}
        </div>
      </div>
    </div>
  );
}

function Locked({ title, onUpgrade, small }: any) {
  return (
    <div className={cx("locked", small && "locked-sm")}>
      <Lock size={18} />
      <strong>{title}</strong>
      <Btn size="sm" variant="accent" onClick={onUpgrade}>Voir les forfaits</Btn>
    </div>
  );
}

// ---------- Publications ----------
export function PostsPage() {
  const { s, mutate, toast, log, publish } = useStore();
  const { go } = useNav();
  const me = useMe();
  const plan = planById(me.plan);
  const [tab, setTab] = useState("all");
  const [del, setDel] = useState<Product | null>(null);
  const mine = s.products.filter((p) => p.merchantId === me.id).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const list = mine.filter((p) => tab === "all" || p.state === tab);
  const upd = (id: string, fn: (p: Product) => void, msg: string) => { mutate((d) => { const p = d.products.find((x) => x.id === id); if (p) { fn(p); p.updatedAt = new Date().toISOString(); } }); toast(msg); };
  const used = monthCount(s.products, me.id);
  const quotaLeft = plan.quota == null ? Infinity : plan.quota - used;

  const publishNow = (p: Product) => {
    if (p.state === "draft" && quotaLeft <= 0) { toast(`Quota du forfait ${plan.name} atteint (${plan.quota} publications ce mois-ci)`, "warn"); return; }
    const m = s.merchants.find((x) => x.id === p.merchantId);
    const hits = s.alerts.filter((a) => a.active && alertMatches(a, { ...p, state: "published" }, m)).length;
    mutate((d) => { const x = d.products.find((y) => y.id === p.id)!; x.state = "published"; x.scheduledAt = null; x.publishedAt = x.updatedAt = x.createdAt = new Date().toISOString(); publish(d, x); log(d, `${me.name} a publié « ${x.name} »`, "commerçant"); });
    toast(`« ${p.name} » est en ligne${hits ? ` · ${hits} alerte(s) déclenchée(s)` : ""}`);
  };
  const duplicate = (p: Product) => {
    const id = "p" + newId();
    mutate((d) => { d.products.unshift({ ...structuredClone(p), id, name: p.name + " (copie)", state: "draft", views: 0, favBase: 0, contacts: 0, alertHits: 0, sponsored: false, featured: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), publishedAt: new Date().toISOString() }); });
    toast("Publication dupliquée en brouillon");
  };

  const counts: any = { all: mine.length, published: 0, draft: 0, scheduled: 0, hidden: 0 };
  mine.forEach((p) => counts[p.state]++);
  return (
    <div className="page">
      <div className="page-head">
        <div><h1 className="page-title">Mes publications</h1><p className="muted">{plan.quota ? `${Math.max(0, quotaLeft)} publication(s) restante(s) ce mois-ci sur votre forfait ${plan.name}` : `Publications illimitées avec le forfait ${plan.name}`}</p></div>
        <Btn icon={Plus} onClick={() => go("publish")}>Nouvel arrivage</Btn>
      </div>
      <Segmented value={tab} onChange={setTab} options={[{ v: "all", l: `Toutes (${counts.all})` }, { v: "published", l: `En ligne (${counts.published})` }, { v: "scheduled", l: `Programmées (${counts.scheduled})` }, { v: "draft", l: `Brouillons (${counts.draft})` }, { v: "hidden", l: `Masquées (${counts.hidden})` }]} />
      <div className="posts">
        {!list.length && <Empty icon={Package} title="Aucune publication ici" action={<Btn icon={Plus} onClick={() => go("publish")}>Publier un arrivage</Btn>} />}
        {list.map((p) => (
          <div key={p.id} className="post">
            <span className="post-thumb"><ProductVisual p={p} /></span>
            <div className="post-main">
              <div className="post-title"><strong>{p.name}</strong>{p.sponsored && <span className="sponso sponso-inline">Sponsorisé</span>}</div>
              <div className="post-meta">
                <StatePill state={p.state} />
                <StatusPill status={p.status} small />
                <span>{fmtXPF(p.price)}</span>
                {p.qty != null && <span>{p.qty} en stock</span>}
                <span className="muted">{p.state === "scheduled" && p.scheduledAt ? `Prévue le ${new Date(p.scheduledAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : `Mise à jour ${fmtRel(p.updatedAt)}`}</span>
                <span className="muted"><Eye size={12} /> {fmtNum(p.views)}</span>
              </div>
            </div>
            <div className="post-actions">
              {(p.state === "draft" || p.state === "scheduled") && <Btn size="sm" icon={Send} onClick={() => publishNow(p)}>Publier</Btn>}
              {p.state === "published" && p.status !== "limited" && p.status !== "out" && <Btn size="sm" variant="outline" icon={Zap} onClick={() => upd(p.id, (x) => (x.status = "limited"), "Passé en stock limité")}>Stock limité</Btn>}
              {p.state === "published" && p.status !== "out" && <Btn size="sm" variant="outline" icon={Ban} onClick={() => upd(p.id, (x) => (x.status = "out"), "Passé en rupture de stock")}>Rupture</Btn>}
              {p.state === "published" && (p.status === "out" || p.status === "limited") && <Btn size="sm" variant="outline" icon={RotateCcw} onClick={() => upd(p.id, (x) => { x.status = "restock"; x.arrivedAt = new Date().toISOString(); }, "Marqué comme réapprovisionné")}>Réappro.</Btn>}
              {plan.can.sponsored && p.state === "published" && <Btn size="sm" variant="ghost" icon={Megaphone} onClick={() => upd(p.id, (x) => (x.sponsored = !x.sponsored), p.sponsored ? "Mise en avant retirée" : "Publication sponsorisée (simulation, sans paiement)")}>{p.sponsored ? "Retirer" : "Sponsoriser"}</Btn>}
              <IconBtn icon={Pencil} label="Modifier" onClick={() => go("publish", { id: p.id })} />
              <IconBtn icon={Copy} label="Dupliquer" onClick={() => duplicate(p)} />
              <IconBtn icon={Trash2} label="Supprimer" onClick={() => setDel(p)} />
            </div>
          </div>
        ))}
      </div>
      <Confirm open={!!del} onClose={() => setDel(null)} danger title="Supprimer la publication ?" body={`« ${del?.name} » disparaîtra de l'espace consommateur et des favoris.`} confirmLabel="Supprimer"
        onConfirm={() => { const id = del!.id; mutate((d) => { d.products = d.products.filter((x) => x.id !== id); d.favorites = d.favorites.filter((x) => x !== id); log(d, `${me.name} a supprimé « ${del!.name} »`, "commerçant"); }); toast("Publication supprimée", "info"); }} />
    </div>
  );
}

export function StatePill({ state }: { state: string }) {
  const map: any = { published: ["En ligne", "green"], draft: ["Brouillon", "grey"], scheduled: ["Programmée", "violet"], hidden: ["Masquée (modération)", "red"] };
  const [l, t] = map[state] || [state, "grey"];
  return <span className={cx("pill pill-sm", `pill-${t}`)}><i />{l}</span>;
}

// Redimensionne une photo pour la stocker localement
export function readImage(file: File): Promise<string> {
  return new Promise((res, rej) => {
    if (!file.type.startsWith("image/")) return rej(new Error("Format non pris en charge"));
    const fr = new FileReader();
    fr.onerror = () => rej(new Error("Lecture impossible"));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => rej(new Error("Image illisible"));
      img.onload = () => {
        const max = 900, r = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", 0.8));
      };
      img.src = fr.result as string;
    };
    fr.readAsDataURL(file);
  });
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export function PublishPage({ params }: any) {
  const { s, mutate, toast, log, publish } = useStore();
  const { go } = useNav();
  const me = useMe();
  const plan = planById(me.plan);
  const editing = params?.id ? s.products.find((p) => p.id === params.id) : null;
  const blank = { name: "", category: me.categories[0] as string, brand: "", description: "", price: "", qty: "", images: [] as string[], arrived: todayStr(), status: "today" as Status, store: me.stores[0], tags: "", schedule: "", tryOn: false };
  const [f, setF] = useState(() => editing ? {
    name: editing.name, category: editing.category, brand: editing.brand, description: editing.description, price: String(editing.price), qty: editing.qty != null ? String(editing.qty) : "",
    images: editing.images, arrived: editing.arrivedAt.slice(0, 10), status: editing.status, store: editing.store || me.stores[0], tags: editing.tags.join(", "), schedule: editing.scheduledAt ? editing.scheduledAt.slice(0, 16) : "", tryOn: !!editing.tryOn,
  } : blank);
  const [err, setErr] = useState<any>({});
  const [imgErr, setImgErr] = useState("");
  const [started] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [schedOpen, setSchedOpen] = useState(false);
  useEffect(() => { const t = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000); return () => clearInterval(t); }, []);
  const fileRef = useRef<HTMLInputElement>(null);
  const used = monthCount(s.products, me.id);
  const quotaLeft = plan.quota == null ? Infinity : plan.quota - used;
  const set = (k: string, v: any) => setF((x) => ({ ...x, [k]: v }));

  const build = (): Product => {
    const nowI = new Date().toISOString();
    const arrived = f.status === "soon" ? new Date(f.arrived + "T08:00:00").toISOString() : (f.arrived === todayStr() ? nowI : new Date(f.arrived + "T08:00:00").toISOString());
    return {
      ...(editing || { id: "p" + newId(), views: 0, favBase: 0, contacts: 0, alertHits: 0, sponsored: false, featured: false, createdAt: nowI, publishedAt: nowI, state: "draft", scheduledAt: null } as any),
      name: f.name.trim(), category: f.category as any, brand: f.brand.trim() || "Sans marque", description: f.description.trim() || "Aucune description fournie.",
      price: Math.round(Number(f.price)), qty: f.qty === "" ? null : Math.round(Number(f.qty)), images: f.images, arrivedAt: arrived, status: f.status, store: f.store,
      tags: f.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean), updatedAt: nowI, merchantId: me.id, tryOn: !!f.tryOn,
    };
  };
  const validate = (forPublish: boolean) => {
    const e: any = {};
    if (f.name.trim().length < 3) e.name = "Nom du produit requis (3 caractères minimum)";
    if (!f.category) e.category = "Choisissez une catégorie";
    if (forPublish || f.price !== "") {
      const n = Number(f.price);
      if (f.price === "" || !Number.isFinite(n)) e.price = "Indiquez un prix en F CFP";
      else if (n <= 0) e.price = "Le prix doit être supérieur à 0";
      else if (n > 50000000) e.price = "Prix inhabituel, vérifiez la saisie";
    }
    if (f.qty !== "" && (!Number.isFinite(Number(f.qty)) || Number(f.qty) < 0)) e.qty = "Quantité invalide";
    if (!f.arrived) e.arrived = "Date requise";
    setErr(e);
    return !Object.keys(e).length;
  };

  const save = (mode: "draft" | "publish" | "schedule") => {
    if (!validate(mode !== "draft")) { toast("Vérifiez les champs signalés", "warn"); return; }
    const wasLive = editing && (editing.state === "published" || editing.state === "scheduled");
    if (mode !== "draft" && !wasLive && quotaLeft <= 0) { toast(`Quota atteint : ${plan.quota} publications par mois avec le forfait ${plan.name}`, "warn"); return; }
    if (mode === "schedule") {
      if (!plan.can.schedule) { toast("La programmation est incluse dès le forfait Business", "warn"); return; }
      if (!f.schedule || new Date(f.schedule).getTime() <= Date.now()) { setErr({ ...err, schedule: "Choisissez une date et une heure futures" }); return; }
    }
    const p = build();
    if (f.price === "") p.price = 0;
    const m = me;
    let hits = 0;
    if (mode === "publish") hits = s.alerts.filter((a) => a.active && alertMatches(a, { ...p, state: "published" }, m)).length;
    const firstPublish = mode === "publish" && (!editing || editing.state !== "published");
    mutate((d) => {
      const nowI = new Date().toISOString();
      const target: Product = { ...p };
      if (mode === "draft") { target.state = editing?.state === "published" ? "published" : "draft"; }
      if (mode === "schedule") { target.state = "scheduled"; target.scheduledAt = new Date(f.schedule).toISOString(); }
      if (mode === "publish") { target.state = "published"; target.scheduledAt = null; if (firstPublish) { target.publishedAt = nowI; target.createdAt = nowI; } }
      const i = d.products.findIndex((x) => x.id === target.id);
      if (i >= 0) d.products[i] = target; else d.products.unshift(target);
      if (mode === "publish" && firstPublish) { publish(d, d.products.find((x) => x.id === target.id)!); log(d, `${me.name} a publié « ${target.name} »`, "commerçant"); }
      else if (mode === "publish") log(d, `${me.name} a modifié « ${target.name} »`, "commerçant");
      if (mode === "schedule") log(d, `${me.name} a programmé « ${target.name} »`, "commerçant");
    });
    if (mode === "draft") toast(editing?.state === "published" ? "Modifications enregistrées" : "Brouillon enregistré");
    if (mode === "schedule") toast(`Publication programmée le ${new Date(f.schedule).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`);
    if (mode === "publish") toast(firstPublish ? `Publié en ${elapsed} s · visible dans l'espace consommateur${hits ? ` · ${hits} alerte(s) déclenchée(s)` : ""}` : "Publication mise à jour");
    go("posts");
  };

  const example = () => setF({ ...f, name: "GTA VI — édition standard PS5", category: "gaming", brand: "Rockstar Games", description: "Premier arrivage du jeu en version PS5, boîte française. Réservation conseillée.", price: "9990", qty: "24", status: "today", tags: "gta, gta vi, ps5, jeu vidéo", arrived: todayStr() });

  const preview: Product = { ...build(), price: Number(f.price) || 0, name: f.name || "Nom du produit", brand: f.brand || "Marque", state: "published" } as Product;
  const minSched = new Date(Date.now() + 60e3 - new Date().getTimezoneOffset() * 60e3).toISOString().slice(0, 16);

  return (
    <div className="page">
      <div className="page-head">
        <div><h1 className="page-title">{editing ? "Modifier la publication" : "Publier un arrivage"}</h1><p className="muted">{editing ? "Les modifications sont visibles immédiatement côté consommateur." : "Remplissez l'essentiel, le reste est facultatif."}</p></div>
        {!editing && <div className="timer" title="Temps de saisie"><Timer size={15} /> {elapsed} s</div>}
      </div>
      <div className="publish">
        <form className="form publish-form" onSubmit={(e) => { e.preventDefault(); save("publish"); }} noValidate>
          {!editing && <button type="button" className="imp-link" onClick={() => go("import")}><FileSpreadsheet size={16} /><span><b>Tout un arrivage à publier ?</b> Importez vos produits depuis un fichier Excel.</span>{!plan.can.bulkImport && <span className="plan-badge plan-premium">Premium</span>}</button>}
          {!editing && <button type="button" className="example" onClick={example}><Wand2 size={15} /> Remplir avec un exemple (déclenche l'alerte « GTA VI »)</button>}
          <Field label="Nom du produit *" error={err.name} htmlFor="pf-name"><input id="pf-name" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex. PlayStation 5 Pro 2 To" /></Field>
          <div className="form-2">
            <Field label="Catégorie *" error={err.category} htmlFor="pf-cat"><select id="pf-cat" value={f.category} onChange={(e) => set("category", e.target.value)}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
            <Field label="Marque" htmlFor="pf-brand"><input id="pf-brand" value={f.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Ex. Sony" /></Field>
            <Field label="Prix (F CFP) *" error={err.price} htmlFor="pf-price"><input id="pf-price" inputMode="numeric" value={f.price} onChange={(e) => set("price", e.target.value.replace(/[^\d]/g, ""))} placeholder="Ex. 109990" /></Field>
            <Field label="Quantité disponible" hint="Facultatif" error={err.qty} htmlFor="pf-qty"><input id="pf-qty" inputMode="numeric" value={f.qty} onChange={(e) => set("qty", e.target.value.replace(/[^\d]/g, ""))} placeholder="Ex. 8" /></Field>
            <Field label={f.status === "soon" ? "Date d'arrivage prévue" : "Date d'arrivage"} error={err.arrived} htmlFor="pf-date"><input id="pf-date" type="date" value={f.arrived} onChange={(e) => set("arrived", e.target.value)} /></Field>
            <Field label="Point de vente" htmlFor="pf-store"><select id="pf-store" value={f.store} onChange={(e) => set("store", e.target.value)}>{me.stores.map((x) => <option key={x}>{x}</option>)}</select></Field>
          </div>
          <Field label="Statut">
            <div className="chips-wrap">{STATUSES.map((st) => <Chip key={st.id} active={f.status === st.id} onClick={() => set("status", st.id)}>{st.label}</Chip>)}</div>
          </Field>
          <label className={cx("tryon-opt", f.tryOn && "is-on")}>
            <input id="pf-tryon" type="checkbox" checked={!!f.tryOn} onChange={(e) => set("tryOn", e.target.checked)} />
            <span className="tryon-box"><Check size={14} strokeWidth={3} /></span>
            <span className="tryon-txt"><strong><Shirt size={15} /> Produit essayable en magasin</strong><span className="micro">Le client peut l'essayer sur place avant d'acheter : cabine d'essayage, pointures, tailles.{["mode", "sneakers", "sport"].includes(f.category) && !f.tryOn ? " Conseillé pour cette catégorie." : ""}</span>{f.tryOn && <span className="tryon-warn">La réservation et le paiement en ligne sont désactivés pour ce produit, le client choisit sa taille en magasin.</span>}</span>
          </label>
          <Field label="Description" htmlFor="pf-desc"><textarea id="pf-desc" rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Version, garantie, conditions…" /></Field>
          <Field label="Tags et mots-clés" hint="Séparés par des virgules. Ils aident les alertes à vous trouver." htmlFor="pf-tags"><input id="pf-tags" value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="ps5, console, sony" /></Field>
          <Field label="Photographies" error={imgErr}>
            <div className="uploads">
              {f.images.map((src, i) => (
                <div key={i} className="upl"><img src={src} alt="" /><button type="button" onClick={() => set("images", f.images.filter((_, j) => j !== i))} aria-label="Retirer la photo">×</button></div>
              ))}
              {f.images.length < 4 && <button type="button" className="upl upl-add" onClick={() => fileRef.current?.click()}><ImagePlus size={20} /><span>Ajouter</span></button>}
              <input ref={fileRef} id="pf-file" type="file" accept="image/*" multiple hidden onChange={async (e) => {
                setImgErr("");
                const files = Array.from(e.target.files || []).slice(0, 4 - f.images.length);
                try { const imgs = await Promise.all(files.map(readImage)); set("images", [...f.images, ...imgs]); }
                catch (x: any) { setImgErr(x.message || "Image non prise en charge"); }
                e.target.value = "";
              }} />
            </div>
          </Field>

          <div className="publish-actions">
            <Btn type="button" variant="ghost" icon={Save} onClick={() => save("draft")}>{editing?.state === "published" ? "Enregistrer" : "Brouillon"}</Btn>
            <Btn type="button" variant="outline" icon={Calendar} onClick={() => plan.can.schedule ? setSchedOpen(true) : toast("La programmation est incluse dès le forfait Business", "warn")}>Programmer{!plan.can.schedule && <Lock size={13} />}</Btn>
            <Btn type="submit" variant="accent" icon={Send}>{editing?.state === "published" ? "Mettre à jour" : "Publier maintenant"}</Btn>
          </div>
          {plan.quota != null && <p className="micro">{Math.max(0, quotaLeft)} publication(s) restante(s) ce mois-ci · forfait {plan.name}</p>}
        </form>

        <aside className="publish-preview">
          <div className="preview-label"><Eye size={14} /> Aperçu en direct</div>
          <div className="pcard pcard-static">
            <div className="pcard-media"><ProductVisual p={preview} /><div className="pcard-top"><StatusPill status={preview.status} small /></div></div>
            <div className="pcard-body">
              <div className="pcard-cat">{catById(preview.category).label}</div>
              <h3 className="pcard-name">{preview.name}</h3>
              <div className="pcard-merchant">{me.name}</div>
              <div className="pcard-foot"><span className="price">{fmtXPF(preview.price)}</span><span className="pcard-meta"><MapPin size={12} />{me.commune} · à l'instant</span></div>
            </div>
          </div>
          <MatchHint p={preview} />
        </aside>
      </div>

      <Modal open={schedOpen} onClose={() => setSchedOpen(false)} title="Programmer la publication">
        <p className="muted" style={{ marginTop: 0 }}>Programmation simulée : la publication sera mise en ligne automatiquement à l'heure choisie tant que la démo est ouverte. Essayez dans 1 ou 2 minutes.</p>
        <Field label="Date et heure de mise en ligne" error={err.schedule} htmlFor="pf-sched"><input id="pf-sched" type="datetime-local" min={minSched} value={f.schedule} onChange={(e) => set("schedule", e.target.value)} /></Field>
        <div className="chips-wrap" style={{ margin: "10px 0 16px" }}>
          {[2, 60, 24 * 60].map((mins) => <Chip key={mins} onClick={() => set("schedule", new Date(Date.now() + mins * 60e3 - new Date().getTimezoneOffset() * 60e3).toISOString().slice(0, 16))}>{mins === 2 ? "Dans 2 min" : mins === 60 ? "Dans 1 h" : "Demain même heure"}</Chip>)}
        </div>
        <div className="row-end"><Btn variant="ghost" onClick={() => setSchedOpen(false)}>Annuler</Btn><Btn icon={Clock} onClick={() => { setSchedOpen(false); save("schedule"); }}>Programmer</Btn></div>
      </Modal>
    </div>
  );
}

function MatchHint({ p }: { p: Product }) {
  const { s } = useStore();
  const m = s.merchants.find((x) => x.id === p.merchantId);
  const n = p.name.length >= 3 ? s.alerts.filter((a) => a.active && alertMatches(a, p, m)).length : 0;
  const demand = p.name.length >= 3 ? DEMAND.filter((d) => { const t = tokens(d.query); const hay = productHay(p, m); return t.filter((x) => hay.includes(x)).length / t.length >= 0.6; }) : [];
  return (
    <div className="matchhint">
      <Target size={16} />
      <div>
        {n > 0 ? <strong>{n} alerte(s) active(s) dans cette démo seront déclenchées à la publication.</strong> : <span>Aucune alerte de la démo ne correspond encore.</span>}
        {demand.length > 0 && <div className="muted small">Demande locale : « {demand[0].query} » · {demand[0].alerts} alertes actives sur la plateforme (simulé).</div>}
      </div>
    </div>
  );
}

// ---------- Demande locale ----------
export function DemandPage() {
  const { s } = useStore();
  const { go } = useNav();
  const me = useMe();
  const plan = planById(me.plan);
  const [commune, setCommune] = useState("Nouméa");
  const catalog = s.products.filter((p) => p.state === "published" && p.status !== "out");
  const items = useMemo(() => {
    const list = DEMAND.map((d) => ({ ...d, communes: { ...d.communes } }));
    // recherches réelles de la session et alertes de la démo, agrégées sans identité
    for (const [q, n] of Object.entries(s.searchLog)) {
      const hit = list.find((d) => norm(d.query) === norm(q) || tokens(d.query).every((t) => norm(q).includes(t)));
      if (hit) hit.searches += n;
      else list.push({ query: q, category: "loisirs" as any, searches: n, alerts: 0, avgBudget: 0, communes: {}, trend: 0, ...(({ fromSession: true }) as any) });
    }
    for (const a of s.alerts.filter((x) => x.active)) {
      const hit = list.find((d) => tokens(d.query).filter((t) => norm(a.query).includes(t)).length / tokens(d.query).length >= 0.6);
      if (hit) hit.alerts += 1;
    }
    return list.map((d) => ({ ...d, available: catalog.some((p) => { const t = tokens(d.query); const hay = productHay(p); return t.length > 0 && t.filter((x) => hay.includes(x)).length / t.length >= 0.75; }) })).sort((a, b) => b.searches - a.searches);
  }, [s.searchLog, s.alerts, s.products]);
  const byCat = useMemo(() => {
    const agg: Record<string, number> = {};
    items.forEach((d) => (agg[d.category] = (agg[d.category] || 0) + d.searches));
    return Object.entries(agg).map(([k, v]) => ({ name: catById(k).label, value: v })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [items]);
  const local = items.filter((d) => d.communes[commune]).map((d) => ({ q: d.query, n: d.communes[commune] })).sort((a, b) => b.n - a.n).slice(0, 6);
  const missing = items.filter((d) => !d.available && d.alerts > 0);
  const COLORS = ["var(--c1)", "var(--ch-acc)", "var(--ch-b)", "#C9A27A", "var(--ch-c)", "#B7B9A8"];

  const body = (
    <>
      <div className="stats stats-4">
        <Stat icon={Search} label="Recherches analysées (30 j)" value={fmtNum(items.reduce((a, b) => a + b.searches, 0))} />
        <Stat icon={BellRing} label="Alertes actives" value={fmtNum(items.reduce((a, b) => a + b.alerts, 0))} />
        <Stat icon={Target} label="Produits demandés absents" value={fmtNum(missing.length)} tone="accent" />
        <Stat icon={TrendingUp} label="Plus forte hausse" value={[...items].sort((a, b) => b.trend - a.trend)[0]?.query || "—"} sub={`+${[...items].sort((a, b) => b.trend - a.trend)[0]?.trend || 0} % sur 30 j`} />
      </div>
      <div className="dash-grid">
        <div className="panel panel-chart">
          <div className="panel-head"><h3>Produits les plus recherchés</h3><span className="muted small">recherches · 30 derniers jours</span></div>
          <div className="demand-table">
            <div className="dt-head"><span>Produit</span><span>Recherches</span><span>Alertes</span><span>Budget moyen</span><span>Catalogue</span></div>
            {items.slice(0, 10).map((d) => (
              <div key={d.query} className="dt-row">
                <span className="dt-q"><strong>{d.query}</strong><em>{catById(d.category).label}{(d as any).fromSession ? " · recherche de la session" : ""}</em></span>
                <span><div className="bar bar-inline"><i style={{ width: Math.min(100, (d.searches / items[0].searches) * 100) + "%" }} /></div><b>{fmtNum(d.searches)}</b></span>
                <span>{fmtNum(d.alerts)}</span>
                <span>{d.avgBudget ? fmtXPF(d.avgBudget) : "—"}</span>
                <span>{d.available ? <span className="pill pill-sm pill-green"><i />Disponible</span> : <span className="pill pill-sm pill-orange"><i />Absent</span>}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Catégories populaires</h3></div>
          <div className="chart-h chart-sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCat} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={104} tick={{ fontSize: 12, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tipStyle} formatter={(v: any) => [fmtNum(v) + " recherches", ""]} cursor={{ fill: "var(--soft)" }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>{byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Tendances par commune</h3>
            <select id="dm-commune" className="select select-sm" value={commune} onChange={(e) => setCommune(e.target.value)} aria-label="Commune">{COMMUNES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          {local.length ? <div className="commune-bars">{local.map((l) => <div key={l.q} className="cbar"><span>{l.q}</span><div className="bar"><i style={{ width: (l.n / local[0].n) * 100 + "%" }} /></div><strong>{l.n}</strong></div>)}</div> : <Empty title="Pas assez de données pour cette commune" />}
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Recherchés mais non disponibles</h3><span className="muted small">opportunités de commande</span></div>
          <div className="toplist">
            {missing.slice(0, 6).map((d) => (
              <div key={d.query} className="toprow">
                <span className="rank"><Target size={14} /></span>
                <div className="toprow-main"><strong>{d.query}</strong><span className="muted small">{d.alerts} alertes · budget moyen {d.avgBudget ? fmtXPF(d.avgBudget) : "—"}</span></div>
                <Btn size="sm" variant="outline" onClick={() => go("publish")}>Annoncer</Btn>
              </div>
            ))}
            {!missing.length && <Empty title="Toute la demande suivie est couverte" />}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="page">
      <div className="page-head">
        <div><h1 className="page-title">Demande locale</h1><p className="muted">Ce que les Calédoniens recherchent, pour anticiper vos commandes fournisseurs. Données agrégées et anonymes · <DemoTag>Données simulées</DemoTag></p></div>
      </div>
      {plan.can.demand ? body : (
        <div className="locked-wrap">
          <div className="locked-blur" aria-hidden>{body}</div>
          <div className="locked-over">
            <Crown size={22} />
            <h3>Analyse de la demande locale</h3>
            <p>Incluse dans le forfait Premium. Vous êtes actuellement en {plan.name}.</p>
            <Btn variant="accent" onClick={() => go("plans")}>Découvrir Premium</Btn>
          </div>
        </div>
      )}
      <p className="note"><Info size={14} /> Aucune donnée personnelle n'est affichée : uniquement des volumes de recherches et d'alertes agrégés.</p>
    </div>
  );
}

// ---------- Forfaits ----------
export function PlansPage({ merchantId, admin }: { merchantId?: string; admin?: boolean }) {
  const { s, mutate, toast, log } = useStore();
  const me = useMe();
  const m = merchantId ? s.merchants.find((x) => x.id === merchantId)! : me;
  const [pick, setPick] = useState<PlanId | null>(null);
  const rows: [string, (p: typeof PLANS[number]) => string | boolean][] = [
    ["Fiche commerçant", () => true],
    ["Publications mensuelles", (p) => (p.quota == null ? "Illimitées" : String(p.quota))],
    ["Présence dans les recherches", () => true],
    ["Statistiques", (p) => ({ none: false, basic: "Basiques", advanced: "Avancées", detailed: "Détaillées" } as any)[p.can.stats]],
    ["Programmation des publications", (p) => p.can.schedule],
    ["Alertes produits déclenchées", (p) => p.can.alerts],
    ["Publications sponsorisées", (p) => p.can.sponsored],
    ["Analyse de la demande locale", (p) => p.can.demand],
    ["Plusieurs points de vente", (p) => p.can.multiStore],
  ];
  return (
    <div className="page">
      {!admin && (
        <div className="page-head plans-head">
          <div><h1 className="page-title">Forfaits professionnels</h1><p className="muted">Gratuit pour les consommateurs, financé par les commerçants. Changement de forfait simulé, aucun paiement réel.</p></div>
        </div>
      )}
      <div className="plans">
        {PLANS.map((p) => {
          const current = m.plan === p.id;
          return (
            <div key={p.id} className={cx("plan", `plan-card-${p.id}`, current && "is-current")}>
              {p.id === "business" && <span className="plan-flag">Le plus choisi</span>}
              <div className="plan-name">{p.id === "premium" && <Crown size={16} />}{p.name}</div>
              <div className="plan-price"><strong>{p.price ? p.price.toLocaleString("fr-FR") : "0"}</strong><span> F CFP / mois</span></div>
              <p className="plan-tag">{p.tagline}</p>
              <ul className="checks">{p.features.map((f) => <li key={f}><Check size={15} />{f}</li>)}</ul>
              <Btn className="w-full" variant={current ? "outline" : p.id === "premium" ? "accent" : "primary"} disabled={current} onClick={() => setPick(p.id)}>{current ? "Forfait actuel" : "Choisir " + p.name}</Btn>
            </div>
          );
        })}
      </div>
      <div className="panel compare">
        <h3>Comparer les forfaits</h3>
        <div className="table-scroll">
          <table className="cmp">
            <thead><tr><th></th>{PLANS.map((p) => <th key={p.id} className={cx(m.plan === p.id && "is-current")}>{p.name}<span>{p.price ? fmtXPF(p.price) : "0 F"}</span></th>)}</tr></thead>
            <tbody>{rows.map(([l, fn]) => <tr key={l}><td>{l}</td>{PLANS.map((p) => { const v = fn(p); return <td key={p.id} className={cx(m.plan === p.id && "is-current")}>{v === true ? <Check size={16} className="ok" /> : v === false ? <span className="no">—</span> : v}</td>; })}</tr>)}</tbody>
          </table>
        </div>
      </div>
      <Modal open={!!pick} onClose={() => setPick(null)} title={`Passer au forfait ${pick ? planById(pick).name : ""}`}>
        {pick && <>
          <p className="muted" style={{ marginTop: 0 }}>{m.name} passera de {planById(m.plan).name} à {planById(pick).name} ({planById(pick).price ? fmtXPF(planById(pick).price) + " / mois" : "gratuit"}).</p>
          <div className="banner-info"><Info size={16} /> Simulation : aucun moyen de paiement n'est demandé et aucun montant n'est prélevé.</div>
          <div className="row-end"><Btn variant="ghost" onClick={() => setPick(null)}>Annuler</Btn><Btn onClick={() => {
            mutate((d) => { const x = d.merchants.find((y) => y.id === m.id)!; const old = x.plan; x.plan = pick; if (pick !== "premium") d.products.forEach((p) => { if (p.merchantId === m.id) p.sponsored = false; }); log(d, `${m.name} : forfait ${planById(old).name} → ${planById(pick).name}`, admin ? "admin" : "commerçant"); });
            toast(`Forfait ${planById(pick).name} activé (simulation)`); setPick(null);
          }}>Confirmer le changement</Btn></div>
        </>}
      </Modal>
    </div>
  );
}

// ---------- Ma fiche ----------
export function ShopProfile() {
  const { s, mutate, toast } = useStore();
  const me = useMe();
  const plan = planById(me.plan);
  const [f, setF] = useState({ ...me, hoursTxt: me.hours.join("\n"), storesTxt: me.stores.join(", ") });
  useEffect(() => setF({ ...me, hoursTxt: me.hours.join("\n"), storesTxt: me.stores.join(", ") }), [me.id]);
  const [err, setErr] = useState<any>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const er: any = {};
    if (f.name.trim().length < 2) er.name = "Nom requis";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) er.email = "Adresse e-mail invalide";
    if (f.phone.replace(/\D/g, "").length < 6) er.phone = "Numéro invalide";
    setErr(er);
    if (Object.keys(er).length) return;
    const stores = plan.can.multiStore ? f.storesTxt.split(",").map((x) => x.trim()).filter(Boolean) : [f.storesTxt.split(",")[0].trim() || me.stores[0]];
    mutate((d) => { const x = d.merchants.find((y) => y.id === me.id)!; Object.assign(x, { name: f.name.trim(), tagline: f.tagline, description: f.description, address: f.address, commune: f.commune, phone: f.phone, email: f.email, hours: f.hoursTxt.split("\n").map((h) => h.trim()).filter(Boolean), addressVerified: f.addressVerified, logo: f.logo, color: f.color, stores }); });
    toast("Fiche commerçant mise à jour, visible côté consommateur");
  };
  return (
    <div className="page narrow">
      <div className="page-head"><div><h1 className="page-title">Ma fiche commerçant</h1><p className="muted">Ces informations apparaissent dans l'annuaire et sur chaque fiche produit.</p></div></div>
      <form className="form panel" onSubmit={save} noValidate>
        <div className="row" style={{ gap: 16 }}>
          <MerchantLogo m={{ ...me, logo: f.logo, color: f.color }} size={64} />
          <div className="row">
            <Btn type="button" variant="outline" size="sm" icon={ImagePlus} onClick={() => fileRef.current?.click()}>Logo</Btn>
            {f.logo && <Btn type="button" variant="ghost" size="sm" onClick={() => setF({ ...f, logo: undefined })}>Retirer</Btn>}
            <label className="color-pick">Couleur <input id="sp-color" type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} disabled={me.plan === "free"} /></label>
            <input ref={fileRef} id="sp-logo" type="file" accept="image/*" hidden onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { setF({ ...f, logo: await readImage(file) }); } catch { toast("Image non prise en charge", "warn"); } }} />
          </div>
        </div>
        {me.plan === "free" && <p className="micro">Personnalisation des couleurs incluse dès Starter.</p>}
        <div className="form-2">
          <Field label="Nom du commerce" error={err.name} htmlFor="sp-name"><input id="sp-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Accroche" htmlFor="sp-tag"><input id="sp-tag" value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} /></Field>
          <Field label="Adresse" htmlFor="sp-addr"><input id="sp-addr" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
          <Field label="Commune" htmlFor="sp-com"><select id="sp-com" value={f.commune} onChange={(e) => setF({ ...f, commune: e.target.value })}>{COMMUNES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Téléphone" error={err.phone} htmlFor="sp-phone"><input id="sp-phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="E-mail" error={err.email} htmlFor="sp-mail"><input id="sp-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        </div>
        <label className="switch-row"><input type="checkbox" checked={f.addressVerified} onChange={(e) => setF({ ...f, addressVerified: e.target.checked })} /><span className="switch" /> Adresse réelle et exploitable (active le bouton Itinéraire)</label>
        <Field label="Description" htmlFor="sp-desc"><textarea id="sp-desc" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="form-2">
          <Field label="Horaires" hint="Une ligne par créneau" htmlFor="sp-hours"><textarea id="sp-hours" rows={3} value={f.hoursTxt} onChange={(e) => setF({ ...f, hoursTxt: e.target.value })} /></Field>
          <Field label="Points de vente" hint={plan.can.multiStore ? "Séparés par des virgules" : "Plusieurs points de vente avec Premium"} htmlFor="sp-stores"><input id="sp-stores" value={f.storesTxt} onChange={(e) => setF({ ...f, storesTxt: e.target.value })} /></Field>
        </div>
        <div className="row-end"><Btn type="submit" icon={Check}>Enregistrer la fiche</Btn></div>
      </form>
    </div>
  );
}
