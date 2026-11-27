import React, { useMemo, useState } from "react";
import { ChevronLeft, ShoppingBag, CreditCard, Undo2, Receipt, Package, Wallet, Eye, Phone, Mail, MapPin, User, CalendarDays, ShieldCheck, Ban, Check, Download, ArrowUpRight, ArrowDownLeft, Flag, Activity as ActivityIco, Search, Store, Copy } from "lucide-react";
import { fmtXPF, fmtNum, fmtRel, planById, PLANS, norm, statusLabel } from "./data";
import { useStore } from "./store";
import { useNav } from "./nav";
import { Btn, Stat, Segmented, MerchantLogo, Empty, Modal, cx, DemoTag, ProductVisual } from "./ui";
import { Reservation, ResPill, RES_LABEL } from "./reservations";
import { toCSV } from "./finance";

const fmtD = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const fmtDT = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

interface Ledger { at: string; kind: "sale" | "refund" | "sub"; label: string; ref: string; amount: number; status: string }

function subscriptionInvoices(joinedAt: string, price: number, planName: string): Ledger[] {
  if (!price) return [];
  const out: Ledger[] = [];
  const start = new Date(joinedAt); const now = new Date();
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  let n = 1;
  while (d <= now) {
    const at = new Date(d.getFullYear(), d.getMonth(), Math.min(start.getDate(), 28), 9).toISOString();
    if (new Date(at) <= now) out.push({ at, kind: "sub", label: `Abonnement ${planName} · ${d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`, ref: `FA-${start.getFullYear()}-${String(n).padStart(3, "0")}`, amount: price, status: "Prélevé" });
    d.setMonth(d.getMonth() + 1); n++;
  }
  return out;
}

export function AdminMerchantDetail({ id }: { id: string }) {
  const { s, mutate, toast, log } = useStore();
  const { go, setMode } = useNav();
  const [tab, setTab] = useState("orders");
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [csv, setCsv] = useState("");
  const m = s.merchants.find((x) => x.id === id);
  const orders = useMemo(() => s.reservations.filter((r) => r.merchantId === id).sort((a, b) => b.at.localeCompare(a.at)), [s.reservations, id]);
  if (!m) return <div className="page"><Empty icon={Store} title="Commerce introuvable" action={<Btn onClick={() => go("merchants")}>Retour aux commerçants</Btn>} /></div>;
  const plan = planById(m.plan);
  const products = s.products.filter((p) => p.merchantId === id);
  const valid = orders.filter((r) => r.status !== "cancelled" && r.status !== "refunded");
  const refunded = orders.filter((r) => r.status === "cancelled" || r.status === "refunded");
  const gross = valid.reduce((a, r) => a + r.total, 0);
  const refundSum = refunded.reduce((a, r) => a + r.total, 0);
  const pending = orders.filter((r) => r.status === "paid" || r.status === "ready");
  const subs = subscriptionInvoices(m.joinedAt, plan.price, plan.name);
  const subTotal = subs.reduce((a, x) => a + x.amount, 0);

  // Paiements : encaissements clients, remboursements, abonnements facturés par ARRIVAGE
  const ledger: Ledger[] = [
    ...orders.map((r) => ({ at: r.at, kind: "sale" as const, label: `Paiement client · ${r.productName}${r.qty > 1 ? ` × ${r.qty}` : ""}`, ref: r.code, amount: r.total, status: "Encaissé" })),
    ...orders.filter((r) => r.status === "cancelled" || r.status === "refunded").map((r) => { const ev = [...r.history].reverse().find((h) => /rembours|annul/i.test(h.text)); return { at: ev?.at || r.at, kind: "refund" as const, label: `${r.status === "cancelled" ? "Annulation client" : "Remboursement boutique"} · ${r.productName}`, ref: r.code, amount: -r.total, status: "Remboursé" }; }),
    ...subs,
  ].sort((a, b) => b.at.localeCompare(a.at));

  // Activité : journal plateforme + historique des commandes + signalements
  const reportsHere = s.reports.filter((r) => products.some((p) => p.id === r.productId));
  const activity = [
    ...s.activity.filter((a) => a.text.includes(m.name)).map((a) => ({ at: a.at, who: a.space, text: a.text, ico: "act" })),
    ...orders.flatMap((r) => r.history.map((h) => ({ at: h.at, who: h.by === "client" ? "client" : h.by === "boutique" ? "commerçant" : "système", text: `${r.code} · ${h.text}`, ico: "order" }))),
    ...reportsHere.flatMap((r) => r.history.map((h) => ({ at: h.at, who: h.by, text: `Signalement « ${s.products.find((p) => p.id === r.productId)?.name} » · ${h.text}`, ico: "report" }))),
    ...products.filter((p) => p.state === "published").map((p) => ({ at: p.publishedAt, who: "commerçant", text: `Publication de « ${p.name} »`, ico: "post" })),
    { at: new Date(m.joinedAt).toISOString(), who: "système", text: `Inscription sur ARRIVAGE (forfait ${plan.name})`, ico: "act" },
  ].sort((a, b) => b.at.localeCompare(a.at));

  const list = orders.filter((r) => (filter === "all" || (filter === "open" ? r.status === "paid" || r.status === "ready" : filter === "done" ? r.status === "collected" : r.status === "cancelled" || r.status === "refunded")) && (!q || norm(r.code + r.productName + r.buyer).includes(norm(q))));
  const upd = (fn: (x: any) => void, msg: string) => { mutate((d) => { const x = d.merchants.find((y) => y.id === id)!; fn(x); log(d, msg, "admin"); }); toast(msg); };

  const exportCSV = async () => {
    const rows: any[] = [[`ARRIVAGE · ${m.name} · données fictives, montants en F CFP`], ["Généré le", new Date().toLocaleString("fr-FR")], [],
      ["Commandes"], ["Code", "Date", "Produit", "Quantité", "Client", "Montant", "Statut"], ...orders.map((r) => [r.code, fmtDT(r.at), r.productName, r.qty, r.buyer, r.total, RES_LABEL[r.status]]), [],
      ["Paiements"], ["Date", "Type", "Libellé", "Référence", "Montant", "Statut"], ...ledger.map((l) => [fmtD(l.at), l.kind === "sale" ? "Encaissement" : l.kind === "refund" ? "Remboursement" : "Abonnement", l.label, l.ref, l.amount, l.status])];
    const data = "﻿" + toCSV(rows);
    try {
      const dl = await (window as any).claude?.use?.("downloads");
      if (dl) { await dl.save({ filename: `arrivage-${m.id}.csv`, data: new Blob([data], { type: "text/csv;charset=utf-8" }) }); toast("Fichier CSV proposé au téléchargement"); return; }
    } catch (e: any) { if (e?.code === "declined") { toast("Téléchargement annulé", "info"); return; } }
    setCsv(data.slice(1));
  };

  return (
    <div className="page md-page">
      <button className="back" onClick={() => go("merchants")}><ChevronLeft size={18} /> Commerçants</button>
      <div className="md-head">
        <MerchantLogo m={m} size={64} />
        <div className="md-id">
          <h1 className="page-title">{m.name}{m.verified && <ShieldCheck size={20} className="verified" />}</h1>
          <div className="row">
            {m.status === "active" ? <span className="pill pill-sm pill-green"><i />Actif</span> : m.status === "suspended" ? <span className="pill pill-sm pill-red"><i />Suspendu</span> : <span className="pill pill-sm pill-amber"><i />{m.status === "pending" ? "En attente" : "Refusé"}</span>}
            <span className={cx("plan-badge", `plan-${plan.id}`)}>{plan.name}</span>
            <span className="muted small">{m.tagline} · {m.commune} · inscrit le {fmtD(m.joinedAt)}</span>
          </div>
        </div>
        <div className="md-actions">
          <Btn variant="outline" size="sm" icon={Download} onClick={exportCSV}>Exporter</Btn>
          <Btn variant="outline" size="sm" icon={Eye} onClick={() => { mutate((d) => { d.currentMerchant = m.id; }); setMode("merchant", { name: "dashboard" }); }}>Voir son espace</Btn>
          {m.status === "active" ? <Btn variant="ghost" size="sm" icon={Ban} onClick={() => upd((x) => (x.status = "suspended"), `${m.name} suspendu : ses publications sont retirées du catalogue`)}>Suspendre</Btn>
            : m.status === "suspended" ? <Btn variant="ghost" size="sm" icon={Check} onClick={() => upd((x) => (x.status = "active"), `${m.name} réactivé`)}>Réactiver</Btn> : null}
        </div>
      </div>

      <div className="stats">
        <Stat icon={ShoppingBag} label="Commandes" value={fmtNum(orders.length)} sub={`${pending.length} en cours · ${orders.filter((r) => r.status === "collected").length} retirée(s)`} />
        <Stat icon={CreditCard} label="Ventes encaissées" value={fmtXPF(gross)} sub="Hors annulations et remboursements" />
        <Stat icon={Undo2} label="Remboursements" value={fmtXPF(refundSum)} sub={`${refunded.length} commande(s)`} />
        <Stat icon={Receipt} label="Panier moyen" value={valid.length ? fmtXPF(gross / valid.length) : "—"} />
        <Stat icon={Wallet} label="Abonnement" value={plan.price ? `${fmtXPF(plan.price)} / mois` : "Gratuit"} sub={`${fmtXPF(subTotal)} facturés depuis l'inscription`} />
        <Stat icon={Package} label="Publications" value={fmtNum(products.filter((p) => p.state === "published").length)} sub={`${fmtNum(products.reduce((a, p) => a + p.views, 0))} vues cumulées`} />
      </div>

      <div className="md-grid">
        <div className="md-main">
          <Segmented value={tab} onChange={setTab} options={[{ v: "orders", l: `Commandes (${orders.length})` }, { v: "payments", l: "Paiements" }, { v: "posts", l: `Publications (${products.length})` }, { v: "activity", l: "Activité" }]} />

          {tab === "orders" && (
            <div className="panel p0 md-panel">
              <div className="md-toolbar">
                <div className="chips-wrap">{[["all", "Toutes"], ["open", "En cours"], ["done", "Retirées"], ["refund", "Annulées ou remboursées"]].map(([v, l]) => <button key={v} className={cx("chip", filter === v && "is-active")} onClick={() => setFilter(v)}>{l}</button>)}</div>
                <div className="search search-inline md-search"><Search size={16} className="search-ico" /><input id="md-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code, produit, client" aria-label="Rechercher une commande" /></div>
              </div>
              {!list.length ? <Empty icon={ShoppingBag} title="Aucune commande" body={orders.length ? "Aucune commande ne correspond à ce filtre." : "Ce commerce n'a encore reçu aucune réservation payée."} /> : (
                <div className="table-scroll">
                  <table className="admin-table md-table">
                    <thead><tr><th>Code</th><th>Date</th><th>Produit</th><th>Client</th><th className="num">Montant</th><th>Statut</th></tr></thead>
                    <tbody>
                      {list.map((r) => (
                        <React.Fragment key={r.id}>
                          <tr className={cx("md-row", open === r.id && "is-open")} onClick={() => setOpen(open === r.id ? null : r.id)}>
                            <td><span className="mono">{r.code}</span></td>
                            <td className="nowrap">{fmtDT(r.at)}</td>
                            <td>{r.productName}{r.qty > 1 && <span className="muted"> × {r.qty}</span>}</td>
                            <td>{r.buyer}</td>
                            <td className="num"><b>{fmtXPF(r.total)}</b></td>
                            <td><ResPill st={r.status} /></td>
                          </tr>
                          {open === r.id && (
                            <tr className="md-detail"><td colSpan={6}>
                              <div className="md-detail-in">
                                <div><span className="lbl">Paiement</span>{r.card} · {fmtXPF(r.unitPrice)} × {r.qty} · frais de service offerts</div>
                                <div><span className="lbl">Client</span>{r.buyer} · {r.phone}</div>
                                <div><span className="lbl">Retrait avant</span>{fmtD(r.pickupBy)}</div>
                                <div className="md-hist"><span className="lbl">Historique</span>{r.history.map((h, i) => <div key={i}><em>{fmtDT(h.at)}</em> {h.text}</div>)}</div>
                              </div>
                            </td></tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "payments" && (
            <div className="panel p0 md-panel">
              <div className="md-sum">
                <div><span>Encaissé auprès des clients</span><b>{fmtXPF(orders.reduce((a, r) => a + r.total, 0))}</b></div>
                <div><span>Remboursé</span><b className="neg">− {fmtXPF(refundSum)}</b></div>
                <div><span>Net reversé au commerce</span><b>{fmtXPF(gross)}</b></div>
                <div><span>Abonnements facturés par ARRIVAGE</span><b>{fmtXPF(subTotal)}</b></div>
              </div>
              <p className="note md-note">Aucun paiement ne transite par ARRIVAGE : le client paie directement le commerçant (en magasin ou par son lien de paiement). Les anciennes réservations restent listées ici pour mémoire. Les montants d'abonnement sont théoriques, calculés à partir du forfait actuel.</p>
              {!ledger.length ? <Empty icon={CreditCard} title="Aucun paiement" /> : (
                <div className="table-scroll">
                  <table className="admin-table md-table">
                    <thead><tr><th>Date</th><th>Opération</th><th>Référence</th><th className="num">Montant</th><th>Statut</th></tr></thead>
                    <tbody>{ledger.map((l, i) => (
                      <tr key={i}>
                        <td className="nowrap">{fmtD(l.at)}</td>
                        <td><span className={cx("md-op", `md-op-${l.kind}`)}>{l.kind === "sale" ? <ArrowDownLeft size={14} /> : l.kind === "refund" ? <Undo2 size={14} /> : <ArrowUpRight size={14} />}</span>{l.label}</td>
                        <td><span className="mono">{l.ref}</span></td>
                        <td className={cx("num", l.amount < 0 && "neg")}><b>{l.amount < 0 ? "− " + fmtXPF(-l.amount) : fmtXPF(l.amount)}</b></td>
                        <td><span className="muted small">{l.status}</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "posts" && (
            <div className="panel p0 md-panel">
              {!products.length ? <Empty icon={Package} title="Aucune publication" /> : (
                <div className="table-scroll">
                  <table className="admin-table md-table">
                    <thead><tr><th>Produit</th><th>État</th><th>Statut</th><th className="num">Prix</th><th className="num">Vues</th><th className="num">Commandes</th></tr></thead>
                    <tbody>{products.map((p) => (
                      <tr key={p.id}>
                        <td><div className="cell-id"><ProductVisual p={p} className="md-pv" /><div><strong>{p.name}</strong><span className="muted small">mis à jour {fmtRel(p.updatedAt)}</span></div></div></td>
                        <td>{{ published: "En ligne", draft: "Brouillon", scheduled: "Programmée", hidden: "Masquée" }[p.state]}</td>
                        <td>{statusLabel(p.status)}</td>
                        <td className="num">{fmtXPF(p.price)}</td>
                        <td className="num">{fmtNum(p.views)}</td>
                        <td className="num">{orders.filter((r) => r.productId === p.id).length}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "activity" && (
            <div className="panel md-panel">
              <div className="md-timeline">
                {activity.slice(0, 60).map((a, i) => (
                  <div key={i} className="md-ev">
                    <span className={cx("md-ev-ico", `md-ev-${a.ico}`)}>{a.ico === "order" ? <ShoppingBag size={13} /> : a.ico === "report" ? <Flag size={13} /> : a.ico === "post" ? <Package size={13} /> : <ActivityIco size={13} />}</span>
                    <div><span>{a.text}</span><em>{fmtDT(a.at)} · {a.who}</em></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="md-side">
          <div className="side-card">
            <span className="lbl">Contact</span>
            {m.contactName && <div className="md-line"><User size={14} />{m.contactName}</div>}
            <div className="md-line"><Phone size={14} /><span className="sel">{m.phone}</span></div>
            <div className="md-line"><Mail size={14} /><span className="sel">{m.email}</span></div>
            <div className="md-line"><MapPin size={14} />{m.address}, {m.commune}</div>
            {m.siret && <div className="md-line"><Receipt size={14} />RIDET {m.siret}</div>}
            <span className="lbl">Abonnement</span>
            <select id="md-plan" className="select select-sm" value={m.plan} onChange={(e) => upd((x) => (x.plan = e.target.value), `${m.name} : forfait ${planById(e.target.value).name} (admin)`)} aria-label="Forfait">{PLANS.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.price ? fmtXPF(p.price) + " / mois" : "gratuit"}</option>)}</select>
            <span className="lbl">Vérification</span>
            <button className={cx("tgl", m.verified && "is-on")} onClick={() => upd((x) => (x.verified = !x.verified), `${m.name} ${m.verified ? "n'est plus vérifié" : "vérifié"}`)}>{m.verified ? <><ShieldCheck size={14} /> Vérifié</> : "Non vérifié"}</button>
            <span className="lbl">Audience</span>
            <div className="md-line"><User size={14} />{fmtNum(m.followersBase + (s.follows.includes(m.id) ? 1 : 0))} abonnés</div>
            <div className="md-line"><CalendarDays size={14} />Membre depuis {fmtRel(new Date(m.joinedAt).toISOString())}</div>
            <span className="lbl">Modération</span>
            <div className="md-line"><Flag size={14} />{reportsHere.length} signalement(s) · {reportsHere.filter((r) => r.status === "open" || r.status === "fixed" || r.status === "waiting").length} en cours</div>
            {reportsHere.length > 0 && <button className="link small" onClick={() => go("reports")}>Ouvrir les signalements</button>}
          </div>
        </aside>
      </div>

      <Modal open={!!csv} onClose={() => setCsv("")} title="Export CSV" wide>
        <p className="muted" style={{ marginTop: 0 }}>Le téléchargement n'est pas disponible ici : copiez le contenu ci-dessous.</p>
        <textarea className="csv-box" readOnly value={csv} rows={12} />
        <div className="row-end"><Btn icon={Copy} onClick={async () => { try { await navigator.clipboard.writeText(csv); toast("CSV copié"); } catch { toast("Sélectionnez le texte pour le copier", "warn"); } }}>Copier</Btn></div>
      </Modal>
    </div>
  );
}
