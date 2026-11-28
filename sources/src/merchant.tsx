import React, { useEffect, useMemo, useRef, useState } from "react";
import { shareUrl } from "./url";
import {
  FileSpreadsheet,
  Eye, Heart, MousePointerClick, Users, BellRing, Package, Plus, Pencil, Copy, Trash2, Zap, Ban, Lock, Crown, Check, ImagePlus,
  Calendar, Save, Send, Clock, TrendingUp, Info, Search, RotateCcw, Megaphone, Store, Timer, MapPin, Wand2, Target, ShoppingBag, Shirt, Flame, UtensilsCrossed,
} from "lucide-react";
import { DEAL_KINDS, OCCASIONS, DealKind, dealKind, dealState, dealWhen, dealBadge, dealTitle, isResto, presets, toLocalInput, RESTO_CAT } from "./deals";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell, PieChart, Pie } from "recharts";
import { CATEGORIES, COMMUNES, STATUSES, PLANS, DemandItem, catById, planById, fmtXPF, fmtNum, fmtRel, fmtDate, norm, Product, Merchant, Status, PlanId, safeUrl } from "./data";
import { useStore, alertMatches, newId, tokens, productHay, myMerchants, myStaffRow } from "./store";
import { useNav } from "./nav";
import { WantedDashCard } from "./wanted";
import { Btn, IconBtn, StatusPill, Chip, ProductVisual, MerchantLogo, Modal, Empty, SectionHead, Segmented, Field, Stat, DemoTag, cx, Confirm } from "./ui";

export const useMe = () => {
  const { s } = useStore();
  const mine = s.me?.role === "admin" ? s.merchants : myMerchants(s);
  return mine.find((m) => m.id === s.currentMerchant) || mine[0];
};

const monthCount = (products: Product[], mid: string) => {
  const n = new Date();
  return products.filter((p) => p.merchantId === mid && (p.state === "published" || p.state === "scheduled") && new Date(p.createdAt).getMonth() === n.getMonth() && new Date(p.createdAt).getFullYear() === n.getFullYear()).length;
};


const tipStyle = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, fontSize: 12, color: "var(--fg)" };

// « À faire » : ce qui mérite un geste aujourd'hui, en un coup d'œil (comme « À traiter » côté admin)
function MerchantToDo({ me }: { me: Merchant }) {
  const { s } = useStore();
  const { go } = useNav();
  const mine = s.products.filter((p) => p.merchantId === me.id);
  const week = Date.now() - 7 * 864e5;
  const items = [
    { n: mine.filter((p) => p.state === "draft").length, l: "brouillon(s) à publier", run: () => go("posts", { tab: "draft" }) },
    { n: mine.filter(isStale).length, l: "annonce(s) à vérifier, sans mise à jour depuis 3 semaines", run: () => go("posts", { tab: "stale" }) },
    { n: mine.filter((p) => p.state === "published" && p.status === "out").length, l: "annonce(s) épuisée(s) : remettre en stock ou retirer", run: () => go("posts", { tab: "out" }) },
    { n: s.reviews.filter((r) => r.merchantId === me.id && r.status === "published" && +new Date(r.at) > week).length, l: "nouvel(s) avis client cette semaine", run: () => go("reviews") },
  ].filter((x) => x.n > 0);
  if (!items.length) return <div className="todo-card is-empty"><Check size={16} /> Rien à faire pour le moment.</div>;
  return (
    <div className="todo-card">
      <strong>À faire</strong>
      <div className="todo-list">{items.map((x) => <button key={x.l} className="todo-item" onClick={x.run}><b>{x.n}</b> {x.l}<span aria-hidden>›</span></button>)}</div>
    </div>
  );
}

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
  const { merchantStats } = useStore();
  const [raw, setRaw] = useState<{ d: string; m: string; c: string; n: number }[]>([]);
  useEffect(() => { merchantStats(me.id).then(setRaw); }, [me.id]);
  const field = ({ views: "views", favs: "favBase", contacts: "contacts" } as any)[metric];
  const series = useMemo(() => {
    const byDay: Record<string, number> = {};
    for (const r of raw) if (r.m === field) byDay[String(r.d).slice(0, 10)] = (byDay[String(r.d).slice(0, 10)] || 0) + r.n;
    return Array.from({ length: days }, (_, i) => {
      const dt = new Date(Date.now() - (days - 1 - i) * 864e5);
      const key = new Date(dt.getTime() + 11 * 36e5).toISOString().slice(0, 10);
      return { d: dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), v: byDay[key] || 0 };
    });
  }, [days, field, raw]);
  const top = mine.filter((p) => p.state === "published").sort((a, b) => b.views - a.views).slice(0, 5);
  const byCommune = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const r of raw) if (r.m === "views") agg[r.c || "Non précisée"] = (agg[r.c || "Non précisée"] || 0) + r.n;
    const t = Object.values(agg).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(agg).map(([name, value]) => ({ name, value, pct: Math.round((value / t) * 100) })).sort((a, b) => b.value - a.value).slice(0, 7);
  }, [raw]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Bonjour, {me.name}</h1>
          <p className="muted">Vue d'ensemble de vos arrivages</p>
        </div>
        <Btn icon={Plus} onClick={() => go("publish")}>Publier un arrivage</Btn>
      </div>

      {me.status !== "active" && <div className="banner-warn"><Info size={16} /> {me.status === "pending" ? "Compte en attente de validation par l'équipe ARRIVAGE : vos publications ne sont pas encore visibles." : "Compte suspendu par la modération : vos publications ne sont plus visibles."}</div>}
      {s.reservations.some((r) => r.merchantId === me.id && r.status === "paid") && (
        <button className="resbanner" onClick={() => go("reservations")}><ShoppingBag size={18} /> <span><strong>{s.reservations.filter((r) => r.merchantId === me.id && r.status === "paid").length} ancienne(s) réservation(s) encore ouverte(s).</strong> Les réservations n'existent plus : clôturez-les une fois le produit retiré ou annulé.</span><strong>Voir</strong></button>
      )}
      {s.reports.some((r) => r.merchantUnread && mine.some((p) => p.id === r.productId)) && (
        <button className="modbanner" onClick={() => go("moderation")}><Info size={16} /> <span>Vous avez un nouveau message de la modération concernant une publication signalée.</span><strong>Voir</strong></button>
      )}
      <MerchantToDo me={me} />
      <WantedDashCard me={me} />
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
                  <div className="toprow-main"><strong>{p.name}</strong><span className="muted small">{fmtXPF(p.price)} · <StatusPill status={p.status} at={p.arrivedAt} small /></span></div>
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
              {!byCommune.length && <span className="muted small">Pas encore de vues enregistrées.</span>}{byCommune.map((c) => (<div key={c.name} className="cbar"><span>{c.name}</span><div className="bar"><i style={{ width: c.pct * 2 + "%" }} /></div><strong>{c.pct} %</strong></div>))}
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
// Annonce qui n'a pas bougé depuis 3 semaines : à vérifier (encore en stock ? à mettre à jour ?)
const STALE_DAYS = 21;
export const isStale = (p: Product) => p.state === "published" && p.status !== "out" && p.status !== "soon" && Date.now() - Math.max(+new Date(p.updatedAt), +new Date(p.arrivedAt || p.updatedAt)) > STALE_DAYS * 864e5;

// Stock en un geste depuis la liste : En stock / Stock limité / Épuisé
function StockSwitch({ p, resto, onSet }: { p: Product; resto: boolean; onSet: (st: Status, msg: string) => void }) {
  const cur = p.status === "out" ? "out" : p.status === "limited" ? "limited" : p.status === "soon" ? "" : "ok";
  const opts = [
    { v: "ok", l: resto ? "Disponible" : "En stock", st: (cur === "ok" ? p.status : resto || p.status === "soon" ? "today" : "restock") as Status, msg: resto ? "Marqué disponible" : p.status === "soon" ? "Marqué comme arrivé" : "Marqué de nouveau en stock" },
    { v: "limited", l: resto ? "Dernières parts" : "Stock limité", st: "limited" as Status, msg: "Passé en stock limité" },
    { v: "out", l: "Épuisé", st: "out" as Status, msg: "Passé en rupture de stock" },
  ];
  return (
    <div className="stock-sw" role="group" aria-label="Stock">
      {opts.map((o) => <button key={o.v} className={cx(cur === o.v && `is-on is-${o.v}`)} aria-pressed={cur === o.v} onClick={() => { if (cur !== o.v) onSet(o.st, o.msg); else if (o.v === "ok" && isStale(p)) onSet(p.status, "Annonce confirmée : toujours en stock"); }}>{o.l}</button>)}
    </div>
  );
}

export function PostsPage({ params }: { params?: any } = {}) {
  const { s, mutate, toast, log, publish } = useStore();
  const { go } = useNav();
  const me = useMe();
  // Vendeur (compte employé) : stock et disponibilité seulement
  const stockOnly = s.me?.role !== "admin" && me.ownerId !== s.me?.id && myStaffRow(s, me.id)?.role === "seller";
  const plan = planById(me.plan);
  const [tab, setTab] = useState(params?.tab || "all");
  const [q, setQ] = useState(params?.q || "");
  const [del, setDel] = useState<Product | null>(null);
  const mine = s.products.filter((p) => p.merchantId === me.id).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const nq = norm(q.trim());
  const list = mine.filter((p) => (tab === "all" || (tab === "out" ? p.state === "published" && p.status === "out" : tab === "stale" ? isStale(p) : p.state === tab)) && (!nq || norm(`${p.name} ${p.brand || ""}`).includes(nq)));
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

  const counts: any = { all: mine.length, published: 0, draft: 0, scheduled: 0, hidden: 0, out: mine.filter((p) => p.state === "published" && p.status === "out").length, stale: mine.filter(isStale).length };
  mine.forEach((p) => counts[p.state]++);
  const resto = isResto(me);
  return (
    <div className="page">
      <div className="page-head">
        <div><h1 className="page-title">Mes publications</h1><p className="muted">{plan.quota ? `${Math.max(0, quotaLeft)} publication(s) restante(s) ce mois-ci sur votre forfait ${plan.name}` : `Publications illimitées avec le forfait ${plan.name}`}</p></div>
        {!stockOnly && <div className="row"><Btn variant="outline" icon={isResto(me) ? UtensilsCrossed : Flame} onClick={() => go("publish", { deal: 1 })}>{isResto(me) ? "Nouvelle offre" : "Créer une promo"}</Btn><Btn icon={Plus} onClick={() => go("publish")}>Nouvel arrivage</Btn></div>}
      </div>
      <div className="posts-tools">
        <div className="search search-inline"><Search size={18} className="search-ico" /><input id="mp-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher dans mes produits" aria-label="Chercher dans mes publications" autoComplete="off" /></div>
        <Segmented value={tab} onChange={setTab} options={[{ v: "all", l: `Toutes (${counts.all})` }, { v: "published", l: `En ligne (${counts.published})` }, { v: "out", l: `Épuisées (${counts.out})` }, ...(counts.stale ? [{ v: "stale", l: `À vérifier (${counts.stale})` }] : []), { v: "scheduled", l: `Programmées (${counts.scheduled})` }, { v: "draft", l: `Brouillons (${counts.draft})` }, { v: "hidden", l: `Masquées (${counts.hidden})` }]} />
      </div>
      {tab === "stale" && <p className="note"><Info size={14} /> Ces annonces n'ont pas été mises à jour depuis plus de 3 semaines. Vérifiez qu'elles sont toujours en rayon : un geste sur « En stock » les remet à jour.</p>}
      <div className="posts">
        {!list.length && (nq ? <Empty icon={Search} title={`Aucun produit ne correspond à « ${q.trim()} »`} action={<Btn variant="outline" onClick={() => setQ("")}>Effacer la recherche</Btn>} /> : <Empty icon={Package} title="Aucune publication ici" action={<Btn icon={Plus} onClick={() => go("publish")}>Publier un arrivage</Btn>} />)}
        {list.map((p) => (
          <div key={p.id} className="post">
            <span className="post-thumb"><ProductVisual p={p} /></span>
            <div className="post-main">
              <div className="post-title"><strong>{p.name}</strong>{p.sponsored && <span className="sponso sponso-inline">Sponsorisé</span>}{p.deal && <span className={cx("pill pill-sm deal-pill", dealState(p) === "upcoming" && "is-soon", dealState(p) === "ended" && "is-ended")}><Flame size={11} />{dealTitle(p)}{dealBadge(p) && dealBadge(p) !== dealKind(p.deal.kind).short ? ` · ${dealBadge(p)}` : ""} · {dealState(p) === "ended" ? "terminée" : dealWhen(p).toLowerCase()}</span>}</div>
              <div className="post-meta">
                <StatePill state={p.state} />
                <StatusPill status={p.status} at={p.arrivedAt} small />
                <span>{fmtXPF(p.price)}</span>
                {p.qty != null && <span>{p.qty} en stock</span>}
                <span className="muted">{p.state === "scheduled" && p.scheduledAt ? `Prévue le ${new Date(p.scheduledAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : `Mise à jour ${fmtRel(p.updatedAt)}`}</span>
                <span className="muted"><Eye size={12} /> {fmtNum(p.views)}</span>
              </div>
            </div>
            <div className="post-actions">
              {!stockOnly && (p.state === "draft" || p.state === "scheduled") && <Btn size="sm" icon={Send} onClick={() => publishNow(p)}>Publier</Btn>}
              {p.state === "published" && <StockSwitch p={p} resto={resto} onSet={(st, msg) => upd(p.id, (x) => { const back = (x.status === "out" || x.status === "limited" || x.status === "soon") && st !== "out" && st !== "limited"; x.status = st; if (back) x.arrivedAt = new Date().toISOString(); }, msg)} />}
              {!stockOnly && plan.can.sponsored && p.state === "published" && <Btn size="sm" variant="ghost" icon={Megaphone} onClick={() => upd(p.id, (x) => (x.sponsored = !x.sponsored), p.sponsored ? "Mise en avant retirée" : "Publication sponsorisée (simulation, sans paiement)")}>{p.sponsored ? "Retirer" : "Sponsoriser"}</Btn>}
              {!stockOnly && p.state === "published" && !p.deal && <Btn size="sm" variant="outline" icon={Flame} onClick={() => go("publish", { id: p.id, deal: 1 })}>Mettre en promo</Btn>}
              {!stockOnly && p.deal && dealState(p) === "ended" && <Btn size="sm" variant="outline" icon={RotateCcw} onClick={() => go("publish", { id: p.id, deal: 1, renew: 1 })}>Relancer</Btn>}
              {!stockOnly && <>
              <IconBtn icon={Pencil} label="Modifier" onClick={() => go("publish", { id: p.id })} />
              <IconBtn icon={Copy} label="Dupliquer" onClick={() => duplicate(p)} />
              <IconBtn icon={Trash2} label="Supprimer" onClick={() => setDel(p)} />
              </>}
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
  const resto = isResto(me);
  const defKind: DealKind = resto ? "plat" : "promo";
  const p0 = presets(defKind)[0];
  const dealBlank = { on: !!params?.deal || (resto && me.categories[0] === RESTO_CAT), kind: defKind as DealKind, occasion: "", was: "", discount: "", start: toLocalInput(p0.start), end: toLocalInput(p0.end) };
  const dealFrom = (p: Product) => {
    if (!p.deal) return { ...dealBlank, on: !!params?.deal, was: params?.deal && p.price ? String(p.price) : "" };
    const renew = params?.renew;
    return { on: true, kind: p.deal.kind, occasion: p.deal.occasion || "", was: p.deal.was ? String(p.deal.was) : "", discount: p.deal.discount || "", start: renew ? dealBlank.start : toLocalInput(new Date(p.deal.startAt)), end: renew ? dealBlank.end : toLocalInput(new Date(p.deal.endAt)) };
  };
  const pre = params?.prefill || {};
  const blank = { name: String(pre.name || "").slice(0, 120), category: (CATEGORIES.some((c) => c.id === pre.category) ? pre.category : resto && params?.deal ? RESTO_CAT : me.categories[0]) as string, brand: String(pre.brand || ""), description: "", price: "", qty: "", images: [] as string[], arrived: todayStr(), status: "today" as Status, store: me.stores[0], tags: "", schedule: "", tryOn: false, buyUrl: "", deal: dealBlank };
  const [f, setF] = useState(() => editing ? {
    name: editing.name, category: editing.category, brand: editing.brand === "Sans marque" ? "" : editing.brand, description: editing.description, price: editing.price && !(params?.deal && !editing.deal) ? String(editing.price) : "", qty: editing.qty != null ? String(editing.qty) : "",
    images: editing.images, arrived: editing.arrivedAt.slice(0, 10), status: editing.status, store: editing.store || me.stores[0], tags: editing.tags.join(", "), schedule: editing.scheduledAt ? editing.scheduledAt.slice(0, 16) : "", tryOn: !!editing.tryOn, buyUrl: editing.buyUrl || "",
    deal: dealFrom(editing),
  } : blank);
  const isRestoCat = f.category === RESTO_CAT;
  const dealOn = f.deal.on || isRestoCat;
  const setD = (k: string, v: any) => setF((x) => ({ ...x, deal: { ...x.deal, [k]: v } }));
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
      tags: f.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean), updatedAt: nowI, merchantId: me.id, tryOn: !!f.tryOn, buyUrl: safeUrl(f.buyUrl),
      deal: dealOn ? {
        kind: (isRestoCat ? f.deal.kind : dealKind(f.deal.kind).shop ? f.deal.kind : "promo") as DealKind, occasion: f.deal.occasion.trim() || undefined,
        was: f.deal.was ? Math.round(Number(f.deal.was)) : null, discount: f.deal.discount.trim() || undefined,
        startAt: new Date(f.deal.start || Date.now()).toISOString(), endAt: new Date(f.deal.end || Date.now()).toISOString(),
      } : null,
    };
  };
  const validate = (forPublish: boolean) => {
    const e: any = {};
    if (f.name.trim().length < 3) e.name = isRestoCat ? "Nom du plat ou de l'offre requis (3 caractères minimum)" : "Nom du produit requis (3 caractères minimum)";
    if (!f.category) e.category = "Choisissez une catégorie";
    if (f.buyUrl.trim() && !safeUrl(f.buyUrl)) e.buyUrl = "Collez un lien complet qui commence par https://";
    const noPriceOk = dealOn && f.price === "" && !!f.deal.discount.trim();
    if (dealOn) {
      const st = +new Date(f.deal.start), en = +new Date(f.deal.end);
      if (!f.deal.start || !Number.isFinite(st)) e.dealStart = "Date de début requise";
      if (!f.deal.end || !Number.isFinite(en)) e.dealEnd = "Date de fin requise";
      else if (en <= Date.now()) e.dealEnd = "La fin doit être dans le futur";
      else if (Number.isFinite(st) && en <= st) e.dealEnd = "La fin doit être après le début";
      else if (Number.isFinite(st) && en - st > 62 * 864e5) e.dealEnd = "Une offre limitée dure au plus 2 mois";
      if (f.deal.was !== "" && f.price !== "" && Number(f.deal.was) <= Number(f.price)) e.dealWas = "Le prix habituel doit être supérieur au prix promo";
    }
    if ((forPublish && !noPriceOk) || f.price !== "") {
      const n = Number(f.price);
      if (f.price === "" || !Number.isFinite(n)) e.price = dealOn ? "Indiquez un prix, ou une remise ci-dessous (ex. « -30 % sur le rayon »)" : "Indiquez un prix en F CFP";
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

  const example = () => setF({ ...f, name: "GTA VI — édition standard PS5", category: "gaming", brand: "Rockstar Games", description: "Premier arrivage du jeu en version PS5, boîte française. Quantités limitées.", price: "9990", qty: "24", status: "today", tags: "gta, gta vi, ps5, jeu vidéo", arrived: todayStr() });

  const preview: Product = { ...build(), price: Number(f.price) || 0, name: f.name || "Nom du produit", brand: f.brand || "Marque", state: "published" } as Product;
  const minSched = new Date(Date.now() + 60e3 - new Date().getTimezoneOffset() * 60e3).toISOString().slice(0, 16);

  return (
    <div className="page">
      <div className="page-head">
        <div><h1 className="page-title">{editing ? (params?.deal && !editing.deal ? "Mettre en promotion" : "Modifier la publication") : isRestoCat ? "Publier une offre du restaurant" : dealOn ? "Créer une promotion" : "Publier un arrivage"}</h1><p className="muted">{editing ? "Les modifications sont visibles immédiatement côté consommateur." : dealOn ? "L'offre apparaît chez les clients entre les dates choisies, puis disparaît toute seule." : "Remplissez l'essentiel, le reste est facultatif."}</p></div>
        {!editing && <div className="timer" title="Temps de saisie"><Timer size={15} /> {elapsed} s</div>}
      </div>
      <div className="publish">
        <form className="form publish-form" onSubmit={(e) => { e.preventDefault(); save("publish"); }} noValidate>
          {!editing && !isRestoCat && <button type="button" className="imp-link" onClick={() => go("import")}><FileSpreadsheet size={16} /><span><b>Tout un arrivage à publier ?</b> Importez vos produits depuis un fichier Excel.</span>{!plan.can.bulkImport && <span className="plan-badge plan-premium">Premium</span>}</button>}
          {!editing && !dealOn && <button type="button" className="example" onClick={example}><Wand2 size={15} /> Remplir avec un exemple (déclenche l'alerte « GTA VI »)</button>}
          <Field label={isRestoCat ? "Nom du plat ou de l'offre *" : "Nom du produit *"} error={err.name} htmlFor="pf-name"><input id="pf-name" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder={isRestoCat ? "Ex. Bougna de poulet, salade de papaye" : dealOn ? "Ex. PlayStation 5 Pro, ou -30 % sur tout le rayon pêche" : "Ex. PlayStation 5 Pro 2 To"} /></Field>
          <div className="form-2">
            <Field label="Catégorie *" error={err.category} htmlFor="pf-cat"><select id="pf-cat" value={f.category} onChange={(e) => set("category", e.target.value)}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
            {!isRestoCat && <Field label="Marque" htmlFor="pf-brand"><input id="pf-brand" value={f.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Ex. Sony" /></Field>}
            <Field label={dealOn && !isRestoCat ? "Prix promo (F CFP)" : "Prix (F CFP) *"} hint={dealOn ? "Facultatif si vous indiquez une remise" : undefined} error={err.price} htmlFor="pf-price"><input id="pf-price" inputMode="numeric" value={f.price} onChange={(e) => set("price", e.target.value.replace(/[^\d]/g, ""))} placeholder="Ex. 109990" /></Field>
            <Field label={isRestoCat ? "Nombre de parts" : "Quantité disponible"} hint="Facultatif" error={err.qty} htmlFor="pf-qty"><input id="pf-qty" inputMode="numeric" value={f.qty} onChange={(e) => set("qty", e.target.value.replace(/[^\d]/g, ""))} placeholder="Ex. 8" /></Field>
            {!dealOn && <Field label={f.status === "soon" ? "Date d'arrivage prévue" : "Date d'arrivage"} error={err.arrived} htmlFor="pf-date"><input id="pf-date" type="date" value={f.arrived} onChange={(e) => set("arrived", e.target.value)} /></Field>}
            <Field label="Point de vente" htmlFor="pf-store"><select id="pf-store" value={f.store} onChange={(e) => set("store", e.target.value)}>{me.stores.map((x) => <option key={x}>{x}</option>)}</select></Field>
          </div>
          {!isRestoCat && (
            <label className={cx("tryon-opt deal-opt", f.deal.on && "is-on")}>
              <input id="pf-deal" type="checkbox" checked={f.deal.on} onChange={(e) => setD("on", e.target.checked)} />
              <span className="tryon-box"><Check size={14} strokeWidth={3} /></span>
              <span className="tryon-txt"><strong><Flame size={15} /> Promotion flash ou offre limitée</strong><span className="micro">Black Friday, week-end, déstockage… L'offre est mise en avant dans « Promos et offres du moment » et retrouvée avec la recherche « promo ».</span></span>
            </label>
          )}
          {dealOn && (
            <div className="deal-form">
              <Field label="Type d'offre">
                <div className="chips-wrap">{DEAL_KINDS.filter((k) => isRestoCat ? k.resto : k.shop).map((k) => <Chip key={k.id} active={f.deal.kind === k.id || (!isRestoCat && !dealKind(f.deal.kind).shop && k.id === "promo")} onClick={() => { const pr = presets(k.id)[0]; setF((x) => ({ ...x, deal: { ...x.deal, kind: k.id, start: toLocalInput(pr.start), end: toLocalInput(pr.end) } })); }}>{k.label}</Chip>)}</div>
              </Field>
              <Field label="Occasion" hint="Facultatif">
                <div className="chips-wrap">{OCCASIONS.slice(0, isRestoCat ? 6 : 9).map((o) => <Chip key={o} active={f.deal.occasion === o} onClick={() => setD("occasion", f.deal.occasion === o ? "" : o)}>{o}</Chip>)}</div>
                <input id="pf-occ" value={f.deal.occasion} onChange={(e) => setD("occasion", e.target.value)} placeholder="Ou une autre occasion : Foire de Bourail, fête du quartier…" style={{ marginTop: 8 }} maxLength={40} />
              </Field>
              <div className="form-2">
                {!isRestoCat || f.deal.kind === "promo" ? <Field label="Prix habituel (F CFP)" hint="Affiché barré" error={err.dealWas} htmlFor="pf-was"><input id="pf-was" inputMode="numeric" value={f.deal.was} onChange={(e) => setD("was", e.target.value.replace(/[^\d]/g, ""))} placeholder="Ex. 129990" /></Field> : null}
                <Field label="Remise affichée" hint="Facultatif" htmlFor="pf-disc"><input id="pf-disc" value={f.deal.discount} onChange={(e) => setD("discount", e.target.value)} placeholder={isRestoCat ? "Ex. Dessert offert" : "Ex. -30 %, 2 achetés = 1 offert"} maxLength={32} /></Field>
              </div>
              <Field label="Période de l'offre">
                <div className="chips-wrap" style={{ marginBottom: 8 }}>{presets(isRestoCat ? f.deal.kind : "promo").map((pr) => <Chip key={pr.l} active={f.deal.start === toLocalInput(pr.start) && f.deal.end === toLocalInput(pr.end)} onClick={() => setF((x) => ({ ...x, deal: { ...x.deal, start: toLocalInput(pr.start), end: toLocalInput(pr.end), occasion: pr.occasion && !x.deal.occasion ? pr.occasion : x.deal.occasion } }))}>{pr.l}</Chip>)}</div>
                <div className="form-2">
                  <Field label="Début" error={err.dealStart} htmlFor="pf-dstart"><input id="pf-dstart" type="datetime-local" value={f.deal.start} onChange={(e) => setD("start", e.target.value)} /></Field>
                  <Field label="Fin" error={err.dealEnd} htmlFor="pf-dend"><input id="pf-dend" type="datetime-local" value={f.deal.end} onChange={(e) => setD("end", e.target.value)} /></Field>
                </div>
                <p className="micro">Avant le début, l'offre est annoncée « Bientôt » (jusqu'à 14 jours avant). Après la fin, elle disparaît du site et reste dans vos publications pour la relancer.</p>
              </Field>
            </div>
          )}
          <Field label={isRestoCat ? "Disponibilité" : "Statut"}>
            <div className="chips-wrap">{(isRestoCat ? STATUSES.filter((st) => ["today", "limited", "out"].includes(st.id)) : dealOn ? STATUSES.filter((st) => st.id !== "soon") : STATUSES).map((st) => <Chip key={st.id} active={f.status === st.id} onClick={() => set("status", st.id)}>{isRestoCat ? ({ today: "Disponible", limited: "Dernières parts", out: "Épuisé" } as any)[st.id] : st.label}</Chip>)}</div>
          </Field>
          {!isRestoCat && <label className={cx("tryon-opt", f.tryOn && "is-on")}>
            <input id="pf-tryon" type="checkbox" checked={!!f.tryOn} onChange={(e) => set("tryOn", e.target.checked)} />
            <span className="tryon-box"><Check size={14} strokeWidth={3} /></span>
            <span className="tryon-txt"><strong><Shirt size={15} /> Produit essayable en magasin</strong><span className="micro">Le client peut l'essayer sur place avant d'acheter : cabine d'essayage, pointures, tailles.{["mode", "sneakers", "sport"].includes(f.category) && !f.tryOn ? " Conseillé pour cette catégorie." : ""}</span>{f.tryOn && <span className="tryon-warn">La réservation et le paiement en ligne sont désactivés pour ce produit, le client choisit sa taille en magasin.</span>}</span>
          </label>}
          {!isRestoCat && !f.tryOn && <Field label="Lien d'achat (facultatif)" htmlFor="pf-buy" error={err.buyUrl} hint={`Lien de paiement de votre banque, Stripe, PayPal, ou la page du produit sur votre boutique en ligne. Le client paie directement chez vous, ARRIVAGE ne prend aucune commission.${safeUrl(me.shopUrl) ? " Laissé vide : le lien de votre fiche commerçant est utilisé." : ""}`}><input id="pf-buy" type="url" inputMode="url" value={f.buyUrl} onChange={(e) => set("buyUrl", e.target.value)} placeholder="https://…" /></Field>}
          <Field label="Description" htmlFor="pf-desc"><textarea id="pf-desc" rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder={isRestoCat ? "Accompagnement, sur place ou à emporter, allergènes…" : dealOn ? "Conditions de l'offre, produits concernés…" : "Version, garantie, conditions…"} /></Field>
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
            <Btn type="submit" variant="accent" icon={Send}>{editing?.state === "published" ? "Mettre à jour" : dealOn ? "Publier l'offre" : "Publier maintenant"}</Btn>
          </div>
          {plan.quota != null && <p className="micro">{Math.max(0, quotaLeft)} publication(s) restante(s) ce mois-ci · forfait {plan.name}</p>}
        </form>

        <aside className="publish-preview">
          <div className="preview-label"><Eye size={14} /> Aperçu en direct</div>
          <div className="pcard pcard-static">
            <div className="pcard-media"><ProductVisual p={preview} /><div className="pcard-top">{preview.deal ? <span className="pill pill-sm deal-pill"><Flame size={11} />{dealTitle(preview)}</span> : <StatusPill status={preview.status} small />}</div>{preview.deal && dealBadge(preview) && <span className="deal-badge">{dealBadge(preview)}</span>}</div>
            <div className="pcard-body">
              <div className="pcard-cat">{catById(preview.category).label}</div>
              <h3 className="pcard-name">{preview.name}</h3>
              <div className="pcard-merchant">{me.name}</div>
              <div className="pcard-foot"><span className="price-wrap"><span className={cx("price", preview.deal?.was && "price-deal")}>{preview.price ? fmtXPF(preview.price) : preview.deal?.discount || "Prix en magasin"}</span>{preview.deal?.was && preview.deal.was > preview.price ? <s className="price-was">{fmtXPF(preview.deal.was)}</s> : null}</span><span className="pcard-meta">{preview.deal ? dealWhen(preview) : <><MapPin size={12} />{me.commune} · à l'instant</>}</span></div>
            </div>
          </div>
          <MatchHint p={preview} />
        </aside>
      </div>

      <Modal open={schedOpen} onClose={() => setSchedOpen(false)} title="Programmer la publication">
        <p className="muted" style={{ marginTop: 0 }}>La publication sera visible automatiquement par les clients à l'heure choisie.</p>
        <Field label="Date et heure de mise en ligne" error={err.schedule} htmlFor="pf-sched"><input id="pf-sched" type="datetime-local" min={minSched} value={f.schedule} onChange={(e) => set("schedule", e.target.value)} /></Field>
        <div className="chips-wrap" style={{ margin: "10px 0 16px" }}>
          {[2, 60, 24 * 60].map((mins) => <Chip key={mins} onClick={() => set("schedule", new Date(Date.now() + mins * 60e3 - new Date().getTimezoneOffset() * 60e3).toISOString().slice(0, 16))}>{mins === 2 ? "Dans 2 min" : mins === 60 ? "Dans 1 h" : "Demain même heure"}</Chip>)}
        </div>
        <div className="row-end"><Btn variant="ghost" onClick={() => setSchedOpen(false)}>Annuler</Btn><Btn icon={Clock} onClick={() => { setSchedOpen(false); save("schedule"); }}>Programmer</Btn></div>
      </Modal>
    </div>
  );
}

// Demande réelle : alertes actives et recherches des 30 derniers jours, agrégées sans identité
let demandCache: { at: number; items: DemandItem[] } | null = null;
export function useDemand() {
  const { s, demand } = useStore();
  const [items, setItems] = useState<DemandItem[]>(demandCache?.items || []);
  useEffect(() => {
    if (demandCache && Date.now() - demandCache.at < 60000) { setItems(demandCache.items); return; }
    demand().then((raw) => {
      if (!raw) return;
      const map = new Map<string, DemandItem & { budgets: number[]; cats: Record<string, number> }>();
      const get = (q: string) => {
        const k = norm(q).trim();
        if (!map.has(k)) map.set(k, { query: q.trim(), category: "" as any, searches: 0, alerts: 0, avgBudget: 0, communes: {}, trend: 0, budgets: [], cats: {} });
        return map.get(k)!;
      };
      for (const a of raw.alerts) {
        if (!a.q || !a.q.trim()) continue;
        const it = get(a.q); it.alerts++;
        if (a.b && Number(a.b) > 0) it.budgets.push(Number(a.b));
        if (a.c) it.cats[a.c] = (it.cats[a.c] || 0) + 1;
        if (a.m) it.communes[a.m] = (it.communes[a.m] || 0) + 1;
      }
      for (const [q, n] of Object.entries(raw.searches)) { if (q.trim().length < 2) continue; const it = get(q); it.searches += Number(n); const prev = Number(raw.prev[q] || 0); it.trend = prev ? Math.round(((Number(n) - prev) / prev) * 100) : 0; }
      const list = Array.from(map.values()).map((it) => {
        let cat = Object.entries(it.cats).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (!cat) { const t = tokens(it.query); const p = s.products.find((x) => { const hay = productHay(x); return t.length > 0 && t.filter((y) => hay.includes(y)).length / t.length >= 0.75; }); cat = p?.category; }
        return { query: it.query, category: (cat || "") as any, searches: it.searches, alerts: it.alerts, avgBudget: it.budgets.length ? Math.round(it.budgets.reduce((a, b) => a + b, 0) / it.budgets.length) : 0, communes: it.communes, trend: it.trend };
      });
      demandCache = { at: Date.now(), items: list };
      setItems(list);
    });
  }, []);
  return items;
}
const catLabel = (c: string) => (c ? catById(c).label : "Recherche libre");

function MatchHint({ p }: { p: Product }) {
  const { s } = useStore();
  const DEMAND = useDemand();
  const m = s.merchants.find((x) => x.id === p.merchantId);
  const n = p.name.length >= 3 ? s.alerts.filter((a) => a.active && alertMatches(a, p, m)).length : 0;
  const demand = p.name.length >= 3 ? DEMAND.filter((d) => { const t = tokens(d.query); const hay = productHay(p, m); return t.filter((x) => hay.includes(x)).length / t.length >= 0.6; }) : [];
  return (
    <div className="matchhint">
      <Target size={16} />
      <div>
        {demand.length > 0 ? <strong>Demande locale : « {demand[0].query} » · {demand[0].alerts} alerte(s) active(s) et {demand[0].searches} recherche(s) sur ARRIVAGE.</strong> : <span>Les clients dont l'alerte correspond seront prévenus à leur prochaine visite.</span>}
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
  const raw = useDemand();
  const items = useMemo(() => {
    return raw.map((d) => ({ ...d, available: catalog.some((p) => { const t = tokens(d.query); const hay = productHay(p); return t.length > 0 && t.filter((x) => hay.includes(x)).length / t.length >= 0.75; }) })).sort((a, b) => b.searches - a.searches);
  }, [raw, s.products]);
  const byCat = useMemo(() => {
    const agg: Record<string, number> = {};
    items.forEach((d) => { if (d.category) agg[d.category] = (agg[d.category] || 0) + d.searches + d.alerts; });
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
      {!items.length && <Empty icon={Search} title="Pas encore assez de données" body="Les recherches et les alertes des clients apparaîtront ici au fil des jours." />}
      <div className="dash-grid">
        <div className="panel panel-chart">
          <div className="panel-head"><h3>Produits les plus recherchés</h3><span className="muted small">recherches · 30 derniers jours</span></div>
          <div className="demand-table">
            <div className="dt-head"><span>Produit</span><span>Recherches</span><span>Alertes</span><span>Budget moyen</span><span>Catalogue</span></div>
            {items.slice(0, 10).map((d) => (
              <div key={d.query} className="dt-row">
                <span className="dt-q"><strong>{d.query}</strong><em>{catLabel(d.category)}</em></span>
                <span><div className="bar bar-inline"><i style={{ width: Math.min(100, (d.searches / Math.max(1, items[0].searches)) * 100) + "%" }} /></div><b>{fmtNum(d.searches)}</b></span>
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
        <div><h1 className="page-title">Demande locale</h1><p className="muted">Ce que les Calédoniens recherchent, pour anticiper vos commandes fournisseurs. Données réelles, agrégées et anonymes.</p></div>
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
          <div><h1 className="page-title">Forfaits professionnels</h1><p className="muted">Gratuit pour les consommateurs, financé par les commerçants. Choisissez un forfait : l'équipe ARRIVAGE vous contacte pour l'activer.</p></div>
        </div>
      )}
      {!admin && m.planRequest && m.planRequest !== m.plan && <div className="banner-info"><Info size={16} /> Demande de passage au forfait {planById(m.planRequest).name} envoyée{m.planRequestAt ? " " + fmtRel(m.planRequestAt) : ""}. L'équipe ARRIVAGE vous contacte pour l'activer.</div>}
      {!admin && !m.planRequest && m.planRequestNote && <div className="banner-warn"><Info size={16} /> Votre dernière demande de forfait n'a pas été retenue : {m.planRequestNote}. Écrivez à contact@arrivagenc.com pour en parler.</div>}
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
              <Btn className="w-full" variant={current ? "outline" : p.id === "premium" ? "accent" : "primary"} disabled={current} onClick={() => setPick(p.id)}>{current ? "Forfait actuel" : m.planRequest === p.id ? "Demande envoyée" : "Choisir " + p.name}</Btn>
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
          {admin || !planById(pick).price ? null : <div className="banner-info"><Info size={16} /> Aucun paiement en ligne : votre demande est transmise à l'équipe ARRIVAGE, qui vous contacte pour l'activation et la facturation.</div>}
          <div className="row-end"><Btn variant="ghost" onClick={() => setPick(null)}>Annuler</Btn><Btn onClick={() => {
            const direct = admin || s.me?.role === "admin";
            mutate((d) => { const x = d.merchants.find((y) => y.id === m.id)!; const old = x.plan; if (direct) { x.plan = pick; x.planRequest = null; x.planRequestAt = null; if (pick !== "premium") d.products.forEach((p) => { if (p.merchantId === m.id) p.sponsored = false; }); } else { x.planRequest = pick; x.planRequestAt = new Date().toISOString(); x.planRequestNote = null; } log(d, direct ? `${m.name} : forfait ${planById(old).name} → ${planById(pick).name}` : `${m.name} demande le forfait ${planById(pick).name}`, direct ? "admin" : "commerçant"); });
            toast(direct ? `Forfait ${planById(pick).name} activé` : `Demande envoyée : l'équipe ARRIVAGE vous recontacte`); setPick(null);
          }}>{admin || s.me?.role === "admin" ? "Confirmer le changement" : "Envoyer la demande"}</Btn></div>
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
    if ((f.shopUrl || "").trim() && !safeUrl(f.shopUrl)) er.shopUrl = "Collez un lien complet qui commence par https://";
    if (f.phone.replace(/\D/g, "").length < 6) er.phone = "Numéro invalide";
    setErr(er);
    if (Object.keys(er).length) return;
    const stores = plan.can.multiStore ? f.storesTxt.split(",").map((x) => x.trim()).filter(Boolean) : [f.storesTxt.split(",")[0].trim() || me.stores[0]];
    mutate((d) => { const x = d.merchants.find((y) => y.id === me.id)!; Object.assign(x, { name: f.name.trim(), tagline: f.tagline, description: f.description, address: f.address, commune: f.commune, phone: f.phone, email: f.email, hours: f.hoursTxt.split("\n").map((h) => h.trim()).filter(Boolean), addressVerified: f.addressVerified, logo: f.logo, color: f.color, stores, shopUrl: safeUrl(f.shopUrl) }); });
    toast("Fiche commerçant mise à jour, visible côté consommateur");
  };
  return (
    <div className="page narrow">
      <div className="page-head"><div><h1 className="page-title">Ma fiche commerçant</h1><p className="muted">Ces informations apparaissent dans l'annuaire et sur chaque fiche produit.</p></div><Btn variant="outline" size="sm" icon={Copy} onClick={async () => { try { await navigator.clipboard.writeText(shareUrl({ name: "merchant", params: { id: me.id } })); toast("Lien de votre page copié : collez-le sur Facebook, Instagram ou votre fiche Google"); } catch { toast("Copie impossible ici", "warn"); } }}>Copier le lien de ma page</Btn></div>
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
        <Field label="Boutique en ligne ou page de paiement (facultatif)" htmlFor="sp-shop" error={err.shopUrl} hint="Affiche un bouton « Acheter » sur vos produits. Le client paie directement chez vous (lien de paiement de votre banque, Stripe, PayPal, votre site…). Vous pouvez aussi mettre un lien différent pour chaque produit."><input id="sp-shop" type="url" inputMode="url" value={f.shopUrl || ""} onChange={(e) => setF({ ...f, shopUrl: e.target.value })} placeholder="https://…" /></Field>
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
