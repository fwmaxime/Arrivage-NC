import { AdminReservationsPanel } from "./reservations";
import React, { useMemo, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { Users, Store, Package, BellRing, Search, Wallet, Flag, Check, Ban, Eye, EyeOff, Star, Trash2, ShieldCheck, Activity as ActIcon, Megaphone, RotateCcw, Info, Calculator } from "lucide-react";
import { useStore } from "./store";
import { useNav } from "./nav";
import { CATEGORIES, PLANS, DEMAND, planById, catById, fmtXPF, fmtNum, fmtRel, norm } from "./data";
import { Btn, IconBtn, Stat, Segmented, StatusPill, ProductVisual, MerchantLogo, Empty, DemoTag, cx, Confirm, Chip } from "./ui";
import { StatePill } from "./merchant";

const tipStyle = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, fontSize: 12, color: "var(--fg)" };
const PCOL: Record<string, string> = { free: "#D9D4C7", starter: "var(--ch-c)", business: "var(--c1)", premium: "var(--ch-acc)" };

export function AdminOverview() {
  const { s } = useStore();
  const { go } = useNav();
  const active = s.merchants.filter((m) => m.status === "active");
  const registered = s.merchants.filter((m) => m.status === "active" || m.status === "suspended");
  const pendingN = s.merchants.filter((m) => m.status === "pending").length;
  const mrr = active.reduce((a, m) => a + planById(m.plan).price, 0);
  const dist = PLANS.map((p) => ({ name: p.name, id: p.id, value: registered.filter((m) => m.plan === p.id).length }));
  const published = s.products.filter((p) => p.state === "published").length;
  const platformAlerts = DEMAND.reduce((a, d) => a + d.alerts, 0) + s.alerts.length;
  const searches = DEMAND.reduce((a, d) => a + d.searches, 0) * 9 + Object.values(s.searchLog).reduce((a, b) => a + b, 0);
  const usersBase = 3480 + s.users.length;
  const growth = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const dt = new Date(Date.now() - (11 - i) * 7 * 864e5);
    return { w: dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), users: Math.round(1450 + i * i * 14 + i * 95), merchants: Math.round(4 + i * 0.9) };
  }), []);
  const openReports = s.reports.filter((r) => r.status === "open" || r.status === "fixed").length;
  return (
    <div className="page">
      <div className="page-head">
        <div><h1 className="page-title">Supervision de la plateforme</h1><p className="muted">Vue globale de la démonstration · <DemoTag>Données fictives</DemoTag></p></div>
        <Btn icon={Calculator} variant="outline" onClick={() => go("finance")}>Ouvrir le simulateur</Btn>
      </div>
      <div className="stats">
        <Stat icon={Users} label="Utilisateurs" value={fmtNum(usersBase)} sub="Comptes consommateurs simulés" />
        <Stat icon={Store} label="Commerçants inscrits" value={fmtNum(registered.length)} sub={`${active.length} actifs · ${registered.length - active.length} suspendu(s) · ${pendingN} en attente`} />
        <Stat icon={Package} label="Publications en ligne" value={fmtNum(published)} sub={`${s.products.length} au total`} />
        <Stat icon={BellRing} label="Alertes actives" value={fmtNum(platformAlerts)} />
        <Stat icon={Search} label="Recherches (30 j)" value={fmtNum(searches)} />
        <Stat icon={Wallet} label="MRR des comptes démo" value={fmtXPF(mrr)} sub="Somme des forfaits des commerces actifs" />
      </div>
      <div className="dash-grid">
        <div className="panel panel-chart">
          <div className="panel-head"><div><h3>Croissance de la plateforme</h3><span className="muted small">Utilisateurs cumulés, 12 dernières semaines · simulé</span></div></div>
          <div className="chart-h">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth} margin={{ top: 10, right: 8, left: -6, bottom: 0 }}>
                <defs><linearGradient id="gU" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--c1)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--c1)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="w" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={44} />
                <Tooltip contentStyle={tipStyle} formatter={(v: any) => [fmtNum(v), "Utilisateurs"]} />
                <Area type="monotone" dataKey="users" stroke="var(--fg)" strokeWidth={2} fill="url(#gU)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Répartition des abonnements</h3></div>
          <div className="row" style={{ alignItems: "center", gap: 12 }}>
            <div style={{ width: 130, height: 130 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={dist} dataKey="value" innerRadius={38} outerRadius={60} stroke="none" paddingAngle={2}>{dist.map((d) => <Cell key={d.id} fill={PCOL[d.id]} />)}</Pie><Tooltip contentStyle={tipStyle} /></PieChart>
              </ResponsiveContainer>
            </div>
            <div className="legend-list">{dist.map((d) => <div key={d.id}><i style={{ background: PCOL[d.id] }} />{d.name}<b>{d.value}</b></div>)}</div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>À traiter</h3></div>
          <div className="todo">
            <button onClick={() => go("reports")}><Flag size={16} /><span>{openReports} signalement(s) à traiter · {s.reports.filter((r) => r.status === "waiting").length} en attente boutique</span></button>
            <button onClick={() => go("merchants")}><ShieldCheck size={16} /><span>{pendingN} inscription(s) à valider · {registered.filter((m) => !m.verified).length} commerce(s) non vérifié(s)</span></button>
            <button onClick={() => go("posts")}><EyeOff size={16} /><span>{s.products.filter((p) => p.state === "hidden").length} publication(s) masquée(s)</span></button>
          </div>
        </div>
        <AdminReservationsPanel />
        <div className="panel">
          <div className="panel-head"><h3>Activité récente</h3><span className="muted small">tous espaces</span></div>
          <div className="feed">
            {s.activity.slice(0, 8).map((a) => <div key={a.id} className="feed-row"><span className={cx("feed-dot", `feed-${a.space === "commerçant" ? "m" : a.space === "admin" ? "a" : "c"}`)} /><div><span>{a.text}</span><em>{a.space} · {fmtRel(a.at)}</em></div></div>)}
            {!s.activity.length && <Empty title="Aucune activité" />}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminMerchants({ embedded }: { embedded?: boolean }) {
  const { s, mutate, toast, log } = useStore();
  const { go } = useNav();
  const [q, setQ] = useState("");
  const list = s.merchants.filter((m) => (m.status === "active" || m.status === "suspended") && (!q || norm(m.name + m.commune).includes(norm(q))));
  const upd = (id: string, fn: (m: any) => void, msg: string) => { mutate((d) => { const m = d.merchants.find((x) => x.id === id)!; fn(m); log(d, msg, "admin"); }); toast(msg); };
  return (
    <div className={embedded ? "" : "page"}>
      {!embedded && <div className="page-head"><div><h1 className="page-title">Comptes commerçants et abonnements</h1></div></div>}
      <div className="search search-inline" style={{ maxWidth: 360, marginBottom: 16 }}><Search size={18} className="search-ico" /><input id="am-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un commerce" aria-label="Rechercher" /></div>
      <div className="table-scroll panel p0">
        <table className="admin-table">
          <thead><tr><th>Commerce</th><th>Commune</th><th>Forfait</th><th>Publications</th><th>Commandes</th><th>Vérifié</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id} className={cx(m.status !== "active" && "is-muted")}>
                <td><button className="cell-id cell-link" onClick={() => go("merchant", { id: m.id })} title="Voir la fiche détaillée"><MerchantLogo m={m} size={30} /><div><strong>{m.name}</strong><span className="muted small">inscrit le {new Date(m.joinedAt).toLocaleDateString("fr-FR")}</span></div></button></td>
                <td>{m.commune}</td>
                <td><select id={"pl-" + m.id} className="select select-sm" value={m.plan} onChange={(e) => upd(m.id, (x) => (x.plan = e.target.value), `${m.name} : forfait ${planById(e.target.value).name} (admin)`)} aria-label="Forfait">{PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></td>
                <td>{s.products.filter((p) => p.merchantId === m.id && p.state === "published").length}</td>
                <td>{(() => { const rs = s.reservations.filter((r) => r.merchantId === m.id); const v = rs.filter((r) => r.status !== "cancelled" && r.status !== "refunded").reduce((a, r) => a + r.total, 0); return rs.length ? <div className="cell-stack"><b>{rs.length}</b><span className="muted small">{fmtXPF(v)}</span></div> : <span className="muted">0</span>; })()}</td>
                <td><button className={cx("tgl", m.verified && "is-on")} onClick={() => upd(m.id, (x) => (x.verified = !x.verified), `${m.name} ${m.verified ? "n'est plus vérifié" : "vérifié"}`)}>{m.verified ? <><ShieldCheck size={14} /> Vérifié</> : "Non vérifié"}</button></td>
                <td>{m.status === "active" ? <span className="pill pill-sm pill-green"><i />Actif</span> : <span className="pill pill-sm pill-red"><i />Suspendu</span>}</td>
                <td className="cell-actions">
                  <Btn size="sm" variant="outline" icon={Eye} onClick={() => go("merchant", { id: m.id })}>Fiche</Btn>
                  {m.status === "active"
                    ? <Btn size="sm" variant="ghost" icon={Ban} onClick={() => upd(m.id, (x) => (x.status = "suspended"), `${m.name} suspendu : ses publications sont retirées du catalogue`)}>Suspendre</Btn>
                    : <Btn size="sm" variant="ghost" icon={Check} onClick={() => upd(m.id, (x) => (x.status = "active"), `${m.name} réactivé`)}>Réactiver</Btn>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminUsers() {
  const { s, mutate, toast } = useStore();
  return (
    <div className="page">
      <div className="page-head"><div><h1 className="page-title">Utilisateurs fictifs</h1><p className="muted">Identifiants pseudonymes uniquement : la démo ne collecte aucune donnée personnelle.</p></div></div>
      <div className="table-scroll panel p0">
        <table className="admin-table">
          <thead><tr><th>Identifiant</th><th>Commune</th><th>Inscription</th><th>Alertes</th><th>Favoris</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            <tr><td><strong>Vous (visiteur démo)</strong></td><td>{s.profile.commune || "—"}</td><td>aujourd'hui</td><td>{s.alerts.length}</td><td>{s.favorites.length}</td><td>{s.profile.blocked ? <span className="pill pill-sm pill-red"><i />Bloqué</span> : <span className="pill pill-sm pill-green"><i />Actif</span>}</td><td className="cell-actions"><Btn size="sm" variant="ghost" icon={s.profile.blocked ? Check : Ban} onClick={() => { mutate((d) => { d.profile.blocked = !d.profile.blocked; }); toast(s.profile.blocked ? "Visiteur démo débloqué" : "Visiteur démo bloqué"); }}>{s.profile.blocked ? "Débloquer" : "Bloquer"}</Btn></td></tr>
            {s.users.map((u) => (
              <tr key={u.id} className={cx(u.status === "blocked" && "is-muted")}>
                <td><strong>{u.label}</strong></td><td>{u.commune}</td><td>{fmtRel(u.joinedAt)}</td><td>{u.alerts}</td><td>{u.favorites}</td>
                <td>{u.status === "active" ? <span className="pill pill-sm pill-green"><i />Actif</span> : <span className="pill pill-sm pill-red"><i />Bloqué</span>}</td>
                <td className="cell-actions"><Btn size="sm" variant="ghost" icon={u.status === "active" ? Ban : Check} onClick={() => { mutate((d) => { const x = d.users.find((y) => y.id === u.id)!; x.status = x.status === "active" ? "blocked" : "active"; }); toast(u.status === "active" ? `${u.label} bloqué` : `${u.label} débloqué`); }}>{u.status === "active" ? "Bloquer" : "Débloquer"}</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminPosts() {
  const { s, mutate, toast, log } = useStore();
  const { setMode } = useNav();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [del, setDel] = useState<any>(null);
  const list = s.products.filter((p) => (tab === "all" || (tab === "featured" ? p.featured || p.sponsored : p.state === tab)) && (!q || norm(p.name + p.brand).includes(norm(q))));
  const upd = (id: string, fn: (p: any) => void, msg: string) => { mutate((d) => { const p = d.products.find((x) => x.id === id)!; fn(p); log(d, msg, "admin"); }); toast(msg); };
  return (
    <div className="page">
      <div className="page-head"><div><h1 className="page-title">Publications et mises en avant</h1><p className="muted">Masquer, mettre à la une ou supprimer une publication. Les mises en avant apparaissent dans le bandeau de l'accueil.</p></div></div>
      <div className="row" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <Segmented value={tab} onChange={setTab} options={[{ v: "all", l: "Toutes" }, { v: "published", l: "En ligne" }, { v: "hidden", l: "Masquées" }, { v: "featured", l: "Mises en avant" }, { v: "draft", l: "Brouillons" }]} />
        <div className="search search-inline" style={{ maxWidth: 300 }}><Search size={18} className="search-ico" /><input id="ap-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" aria-label="Rechercher" /></div>
      </div>
      <div className="posts">
        {!list.length && <Empty icon={Package} title="Aucune publication" />}
        {list.slice(0, 60).map((p) => {
          const m = s.merchants.find((x) => x.id === p.merchantId);
          return (
            <div key={p.id} className="post">
              <span className="post-thumb"><ProductVisual p={p} /></span>
              <div className="post-main">
                <div className="post-title"><strong>{p.name}</strong>{p.featured && <span className="pill pill-sm pill-orange"><i />À la une</span>}{p.sponsored && <span className="sponso sponso-inline">Sponsorisé</span>}</div>
                <div className="post-meta"><StatePill state={p.state} /><StatusPill status={p.status} small /><span>{m?.name}</span><span>{fmtXPF(p.price)}</span><span className="muted">{catById(p.category).label}</span></div>
              </div>
              <div className="post-actions">
                {p.state !== "hidden" ? <Btn size="sm" variant="outline" icon={EyeOff} onClick={() => upd(p.id, (x) => (x.state = "hidden"), `Publication masquée : « ${p.name} »`)}>Masquer</Btn>
                  : <Btn size="sm" variant="outline" icon={Eye} onClick={() => upd(p.id, (x) => (x.state = "published"), `Publication rétablie : « ${p.name} »`)}>Rétablir</Btn>}
                <Btn size="sm" variant={p.featured ? "primary" : "ghost"} icon={Star} onClick={() => upd(p.id, (x) => (x.featured = !x.featured), p.featured ? `« ${p.name} » retiré de la une` : `« ${p.name} » mis à la une`)}>{p.featured ? "À la une" : "Mettre à la une"}</Btn>
                {p.sponsored && <Btn size="sm" variant="ghost" icon={Megaphone} onClick={() => upd(p.id, (x) => (x.sponsored = false), `Sponsorisation retirée : « ${p.name} »`)}>Retirer sponso</Btn>}
                <IconBtn icon={Trash2} label="Supprimer" onClick={() => setDel(p)} />
              </div>
            </div>
          );
        })}
      </div>
      <Confirm open={!!del} onClose={() => setDel(null)} danger title="Supprimer définitivement ?" body={`« ${del?.name} » sera supprimé pour tous les espaces.`} confirmLabel="Supprimer"
        onConfirm={() => { const id = del.id; mutate((d) => { d.products = d.products.filter((x) => x.id !== id); d.favorites = d.favorites.filter((x) => x !== id); log(d, `Publication supprimée par la modération : « ${del.name} »`, "admin"); }); toast("Publication supprimée", "info"); }} />
    </div>
  );
}

export function AdminCategories() {
  const { s, mutate, toast } = useStore();
  return (
    <div className="page">
      <div className="page-head"><div><h1 className="page-title">Catégories</h1><p className="muted">Une catégorie désactivée disparaît de l'accueil et du catalogue consommateur.</p></div></div>
      <div className="cat-admin">
        {CATEGORIES.map((c) => {
          const st = s.categories.find((x) => x.id === c.id)!;
          const n = s.products.filter((p) => p.category === c.id && p.state === "published").length;
          return (
            <div key={c.id} className={cx("cat-adm", !st.active && "is-off")}>
              <span className="cat-ico" style={{ background: c.tint }}><c.icon size={18} /></span>
              <div><strong>{c.label}</strong><span className="muted small">{n} publication(s)</span></div>
              <label className="switch-row"><input type="checkbox" checked={st.active} onChange={() => { mutate((d) => { const x = d.categories.find((y) => y.id === c.id)!; x.active = !x.active; }); toast(st.active ? `${c.label} désactivée` : `${c.label} activée`, "info"); }} aria-label={`Activer ${c.label}`} /><span className="switch" /></label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

