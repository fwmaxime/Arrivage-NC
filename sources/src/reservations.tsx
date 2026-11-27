import React, { useEffect, useState } from "react";
import { CreditCard, Lock, Check, Store, Clock, MapPin, ShoppingBag, PackageCheck, XCircle, Info, Minus, Plus, Copy, ShieldCheck, ArrowRight, Receipt, Undo2, KeyRound, Shirt, Star } from "lucide-react";
import { fmtXPF, fmtRel, fmtDateLong, Product, Merchant } from "./data";
import { useStore, State, newId } from "./store";
import { useNav } from "./nav";
import { ReviewButton } from "./reviews";
import { Btn, Modal, Empty, Segmented, ProductVisual, MerchantLogo, Field, cx, Stat, DemoTag } from "./ui";

export type ResStatus = "paid" | "ready" | "collected" | "cancelled" | "refunded";
export interface ResEvent { at: string; by: "client" | "boutique" | "système"; text: string }
export interface Reservation {
  id: string; code: string; productId: string; merchantId: string; productName: string; unitPrice: number; qty: number; total: number;
  buyer: string; phone: string; buyerId: string; status: ResStatus; at: string; pickupBy: string; card: string;
  history: ResEvent[]; merchantUnread?: boolean; clientUnread?: boolean;
}

export const RES_LABEL: Record<ResStatus, string> = { paid: "Réservée, à préparer", ready: "Prête au retrait", collected: "Retirée", cancelled: "Annulée", refunded: "Annulée par le commerce" };
const RES_TONE: Record<ResStatus, string> = { paid: "orange", ready: "green", collected: "grey", cancelled: "grey", refunded: "grey" };
export const ResPill = ({ st }: { st: ResStatus }) => <span className={cx("pill", `pill-${RES_TONE[st]}`)}><i />{RES_LABEL[st]}</span>;

const HOLD_DAYS = 3;
const iso = (ms: number) => new Date(ms).toISOString();
function code() { const a = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; let x = ""; for (let i = 0; i < 4; i++) x += a[Math.floor(Math.random() * a.length)]; return "AR-" + x; }

const canReserve = (p: Product, m: Merchant) => !p.tryOn && p.state === "published" && m.status === "active" && p.status !== "out" && p.status !== "soon";
const maxQty = (p: Product) => Math.max(1, Math.min(5, p.qty ?? 5));

// Restitue le stock d'une réservation annulée ou remboursée
function restock(d: State, r: Reservation) {
  const p = d.products.find((x) => x.id === r.productId);
  if (p && p.qty != null) { p.qty += r.qty; if (p.status === "out" && p.qty > 0) p.status = "limited"; }
}

// ---------- Consommateur : bouton + tunnel de paiement ----------
export function ReserveButton({ p, m }: { p: Product; m: Merchant }) {
  const [open, setOpen] = useState(false);
  const { requireAccount } = useStore();
  const ok = canReserve(p, m);
  if (p.tryOn) return <div className="tryon-noonline"><Shirt size={18} /><div><strong>À essayer en magasin</strong><span>Ce produit n'est pas vendu en ligne : choisissez votre taille et essayez-le sur place chez {m.name}.</span></div></div>;
  return (
    <>
      <Btn size="lg" variant="accent" icon={ShoppingBag} disabled={!ok} onClick={() => { if (requireAccount("Créez un compte gratuit ou connectez-vous pour réserver ce produit.")) setOpen(true); }} title={ok ? "" : "Produit non réservable pour le moment"}>Réserver</Btn>
      {open && <ReserveFlow p={p} m={m} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReserveFlow({ p, m, onClose }: { p: Product; m: Merchant; onClose: () => void }) {
  const { s, mutate, toast, log } = useStore();
  const { go, setMode } = useNav();
  const [step, setStep] = useState<"details" | "pay" | "processing" | "done">("details");
  const [qty, setQty] = useState(1);
  const [name, setName] = useState(s.me?.displayName || "");
  const [phone, setPhone] = useState("");
  const [accept, setAccept] = useState(false);
  const [res, setRes] = useState<Reservation | null>(null);
  const mx = maxQty(p);
  const total = p.price * qty;
  const nameErr = name.trim().length < 2 ? "Indiquez le nom pour le retrait" : "";
  const phoneErr = phone.replace(/\D/g, "").length < 6;

  const pay = () => {
    setStep("processing");
    setTimeout(() => {
      const r: Reservation = {
        id: newId(), code: code(), productId: p.id, merchantId: m.id, productName: p.name, unitPrice: p.price, qty, total,
        buyer: name.trim(), phone: phone.trim(), buyerId: s.me!.id, status: "paid", at: iso(Date.now()), pickupBy: iso(Date.now() + HOLD_DAYS * 864e5), card: "en magasin",
        history: [{ at: iso(Date.now()), by: "client", text: `Réservation (${fmtXPF(total)}, paiement au retrait)` }], merchantUnread: true,
      };
      mutate((d) => {
        d.reservations.unshift(r);
        const x = d.products.find((y) => y.id === p.id);
        if (x && x.qty != null) { x.qty = Math.max(0, x.qty - qty); if (x.qty === 0) x.status = "out"; x.updatedAt = iso(Date.now()); }
        d.notifications.unshift({ id: newId(), kind: "order", title: `Réservation confirmée · ${r.code}`, body: `${p.name} chez ${m.name} · ${fmtXPF(total)} à régler sur place · à retirer avant le ${fmtDateLong(r.pickupBy)}`, productId: p.id, read: false, at: r.at });
        log(d, `Réservation ${r.code} : « ${p.name} » chez ${m.name} (${fmtXPF(total)})`, "consommateur");
      });
      setRes(r); setStep("done"); toast("Produit réservé");
    }, 600);
  };

  const title = step === "done" ? "Réservation confirmée" : "Réserver ce produit";
  return (
    <Modal open onClose={step === "processing" ? () => {} : onClose} title={title}>
      <div className="rf-steps">{["Réservation", "Confirmation"].map((l, i) => { const cur = step === "done" ? 1 : 0; return <span key={l} className={cx(i < cur && "is-done", i === cur && "is-on")}>{i < cur ? <Check size={12} /> : i + 1}<em>{l}</em></span>; })}</div>

      <div className="rf-item">
        <ProductVisual p={p} className="rf-pv" />
        <div><strong>{p.name}</strong><span className="muted small">{m.name} · {p.store || m.stores[0]}</span><span className="rf-price">{fmtXPF(p.price)}</span></div>
      </div>

      {(step === "details" || step === "processing") && (
        <>
          <div className="rf-qty">
            <span>Quantité</span>
            <div className="qty"><button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Diminuer" disabled={qty <= 1}><Minus size={15} /></button><b>{qty}</b><button onClick={() => setQty(Math.min(mx, qty + 1))} aria-label="Augmenter" disabled={qty >= mx}><Plus size={15} /></button></div>
            {p.qty != null && <span className="micro">{p.qty} en stock</span>}
          </div>
          <div className="rf-grid">
            <Field label="Nom pour le retrait" htmlFor="rf-name" error={nameErr}><input id="rf-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Téléphone" htmlFor="rf-phone" hint="Pour que le commerce puisse vous joindre"><input id="rf-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          </div>
          <div className="rf-info">
            <p><Store size={15} /> Retrait en magasin : <strong>{p.store || m.stores[0]}</strong>, {m.commune}</p>
            <p><Clock size={15} /> Produit mis de côté pendant {HOLD_DAYS} jours. Vous payez directement en magasin au retrait</p>
            <p><Undo2 size={15} /> Annulation gratuite tant que le commerce n'a pas préparé la commande</p>
          </div>
          <Recap price={p.price} qty={qty} />
          <div className="row-end"><Btn variant="ghost" onClick={onClose}>Annuler</Btn><Btn variant="accent" disabled={!!nameErr || phoneErr || step === "processing"} onClick={pay} icon={Check}>{step === "processing" ? "Réservation…" : "Confirmer la réservation"}</Btn></div>
        </>
      )}

      {step === "done" && res && (
        <div className="rf-done">
          <span className="rf-ok"><Check size={26} /></span>
          <p>Produit mis de côté. Présentez ce code en magasin et réglez <strong>{fmtXPF(res.total)}</strong> sur place :</p>
          <div className="rf-code">{res.code}</div>
          <div className="rf-info">
            <p><Store size={15} /> {m.name} a été prévenu dans son espace commerçant.</p>
            <p><Clock size={15} /> À retirer avant le {fmtDateLong(res.pickupBy)}.</p>
            <p><Info size={15} /> Vous recevrez une notification quand la commande sera prête.</p>
          </div>
          <div className="row-end">
            <Btn onClick={() => { onClose(); go("orders"); }}>Mes réservations</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Recap({ price, qty }: { price: number; qty: number }) {
  return (
    <div className="rf-recap">
      <div><span>{qty} × {fmtXPF(price)}</span><span>{fmtXPF(price * qty)}</span></div>
      <div><span>Frais de réservation</span><span>Gratuit</span></div>
      <div className="rf-total"><span>À régler en magasin</span><span>{fmtXPF(price * qty)}</span></div>
    </div>
  );
}

// ---------- Consommateur : mes réservations ----------
export function MyReservations() {
  const { s, mutate, toast, log } = useStore();
  const { go } = useNav();
  const [tab, setTab] = useState("current");
  const [cancel, setCancel] = useState<Reservation | null>(null);
  const mine = s.reservations.filter((r) => r.buyerId === s.me?.id);
  const list = mine.filter((r) => (tab === "current" ? r.status === "paid" || r.status === "ready" : r.status !== "paid" && r.status !== "ready"));
  useEffect(() => { if (mine.some((r) => r.clientUnread)) mutate((d) => d.reservations.forEach((r) => { if (r.buyerId === s.me?.id) r.clientUnread = false; })); }, []);
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); toast("Code copié"); } catch { toast("Copie impossible ici : sélectionnez le code", "warn"); } };
  return (
    <div className="page narrow">
      <div className="page-head"><div><h1 className="page-title">Mes réservations</h1><p className="muted">Produits mis de côté en magasin, à régler au retrait.</p></div></div>
      <Segmented value={tab} onChange={setTab} options={[{ v: "current", l: `En cours (${mine.filter((r) => r.status === "paid" || r.status === "ready").length})` }, { v: "past", l: "Historique et avis" }]} />
      {tab === "current" && (() => { const n = mine.filter((r) => r.status === "collected" && !s.reviews.some((v) => v.reservationId === r.id)).length; return n ? <button className="resbanner" style={{ marginTop: 14 }} onClick={() => setTab("past")}><Star size={18} /> <span>Vous avez {n} achat{n > 1 ? "s" : ""} retiré{n > 1 ? "s" : ""} à noter. Votre avis aide les autres clients.</span><strong>Noter</strong></button> : null; })()}
      {!list.length && <Empty icon={ShoppingBag} title={tab === "current" ? "Aucune réservation en cours" : "Aucun historique"} body="Sur une fiche produit, « Réserver » met l'article de côté dans le commerce." action={<Btn onClick={() => go("explore", {})}>Explorer les arrivages</Btn>} />}
      <div className="res-list">
        {list.map((r) => {
          const p = s.products.find((x) => x.id === r.productId); const m = s.merchants.find((x) => x.id === r.merchantId);
          return (
            <div key={r.id} className={cx("res-card", r.status === "ready" && "is-ready")}>
              <button className="res-pv" onClick={() => p && go("product", { id: p.id })}>{p ? <ProductVisual p={p} /> : null}</button>
              <div className="res-body">
                <div className="row-between"><strong>{r.productName}</strong><ResPill st={r.status} /></div>
                <span className="muted small">{m?.name} · {r.qty} × {fmtXPF(r.unitPrice)} · réservé {fmtRel(r.at)}</span>
                {(r.status === "paid" || r.status === "ready") && (
                  <div className="res-code-row">
                    <span className="res-code sel">{r.code}</span>
                    <Btn variant="ghost" size="sm" icon={Copy} onClick={() => copy(r.code)}>Copier</Btn>
                    <span className="micro">{r.status === "ready" ? "Prête : présentez ce code en magasin" : "En préparation par le commerce"} · avant le {fmtDateLong(r.pickupBy)}</span>
                  </div>
                )}
                {m && (r.status === "paid" || r.status === "ready") && <span className="micro"><MapPin size={12} style={{ verticalAlign: -2 }} /> {m.address}, {m.commune} · {m.hours[0]}</span>}
                <div className="row res-actions">
                  <span className="res-total">{fmtXPF(r.total)}</span>
                  {r.status === "paid" && <Btn variant="ghost" size="sm" icon={XCircle} onClick={() => setCancel(r)}>Annuler la réservation</Btn>}
                  {r.status === "collected" && <ReviewButton res={r} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Modal open={!!cancel} onClose={() => setCancel(null)} title="Annuler la réservation ?">
        {cancel && <>
          <p className="muted" style={{ marginTop: 0 }}>{cancel.productName} sera remis en vente. Le commerce sera prévenu.</p>
          <div className="row-end"><Btn variant="ghost" onClick={() => setCancel(null)}>Garder</Btn><Btn variant="danger" onClick={() => {
            mutate((d) => { const r = d.reservations.find((x) => x.id === cancel.id); if (!r || r.status !== "paid") return; r.status = "cancelled"; r.merchantUnread = true; r.history.push({ at: iso(Date.now()), by: "client", text: "Annulée par le client" }); restock(d, r); log(d, `Réservation ${r.code} annulée par le client`, "consommateur"); });
            toast("Réservation annulée"); setCancel(null);
          }}>Annuler la réservation</Btn></div>
        </>}
      </Modal>
    </div>
  );
}

// ---------- Commerçant ----------
export function MerchantReservations({ merchantId }: { merchantId: string }) {
  const { s, mutate, toast, log } = useStore();
  const [tab, setTab] = useState("todo");
  const [pickup, setPickup] = useState<Reservation | null>(null);
  const [refund, setRefund] = useState<Reservation | null>(null);
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("Rupture de stock");
  const mine = s.reservations.filter((r) => r.merchantId === merchantId);
  useEffect(() => { if (mine.some((r) => r.merchantUnread)) { const t = setTimeout(() => mutate((d) => d.reservations.forEach((r) => { if (r.merchantId === merchantId) r.merchantUnread = false; })), 2500); return () => clearTimeout(t); } }, [merchantId]);
  const groups: Record<string, ResStatus[]> = { todo: ["paid"], ready: ["ready"], done: ["collected", "cancelled", "refunded"] };
  const list = mine.filter((r) => groups[tab].includes(r.status));
  const paidTotal = mine.filter((r) => r.status !== "cancelled" && r.status !== "refunded").reduce((a, r) => a + r.total, 0);
  const notifyClient = (d: State, r: Reservation, title: string, body: string) => { r.clientUnread = true; if (r.buyerId === s.me?.id) { d.notifications.unshift({ id: newId(), kind: "order", title, body, productId: r.productId, read: false, at: iso(Date.now()) }); } };
  const markReady = (r0: Reservation) => {
    mutate((d) => { const r = d.reservations.find((x) => x.id === r0.id)!; r.status = "ready"; r.history.push({ at: iso(Date.now()), by: "boutique", text: "Commande préparée, prête au retrait" }); notifyClient(d, r, `Votre commande ${r.code} est prête`, `${r.productName} vous attend en magasin. Présentez le code ${r.code}.`); log(d, `Réservation ${r.code} prête au retrait`, "commerçant"); });
    toast("Commande prête : le client le verra dans ses réservations");
  };
  return (
    <div className="page">
      <div className="page-head"><div><h1 className="page-title">Réservations</h1><p className="muted">Produits réservés par vos clients, à préparer puis remettre en magasin contre paiement.</p></div></div>
      <div className="stats stats-3">
        <Stat icon={Receipt} label="À préparer" value={mine.filter((r) => r.status === "paid").length} />
        <Stat icon={PackageCheck} label="Prêtes au retrait" value={mine.filter((r) => r.status === "ready").length} />
        <Stat icon={CreditCard} label="Montant des retraits" value={fmtXPF(paidTotal)} sub="Hors annulations" />
      </div>
      <Segmented value={tab} onChange={setTab} options={[{ v: "todo", l: `À préparer (${mine.filter((r) => r.status === "paid").length})` }, { v: "ready", l: `Prêtes (${mine.filter((r) => r.status === "ready").length})` }, { v: "done", l: "Terminées" }]} />
      {!list.length && <Empty icon={ShoppingBag} title="Rien ici pour l'instant" body={tab === "todo" ? "Les nouvelles réservations apparaissent ici." : "Aucune réservation dans cette catégorie."} />}
      <div className="res-list">
        {list.map((r) => {
          const p = s.products.find((x) => x.id === r.productId);
          return (
            <div key={r.id} className={cx("res-card", r.merchantUnread && "is-new")}>
              <div className="res-pv">{p ? <ProductVisual p={p} /> : null}</div>
              <div className="res-body">
                <div className="row-between"><strong>{r.productName}{r.merchantUnread && <span className="dot-new">Nouveau</span>}</strong><ResPill st={r.status} /></div>
                <span className="muted small">{r.buyer} · {r.phone} · {r.qty} × {fmtXPF(r.unitPrice)} · {fmtRel(r.at)}</span>
                <span className="micro">Code de retrait vérifié en magasin · à retirer avant le {fmtDateLong(r.pickupBy)}</span>
                <details className="res-hist"><summary>Historique</summary>{r.history.map((h, i) => <div key={i}><em>{fmtRel(h.at)}</em> {h.text}</div>)}</details>
                <div className="row res-actions">
                  <span className="res-total">{fmtXPF(r.total)}</span>
                  {r.status === "paid" && <Btn size="sm" icon={PackageCheck} onClick={() => markReady(r)}>Marquer prête</Btn>}
                  {(r.status === "paid" || r.status === "ready") && <Btn size="sm" variant={r.status === "ready" ? "primary" : "outline"} icon={KeyRound} onClick={() => { setTyped(""); setPickup(r); }}>Valider le retrait</Btn>}
                  {(r.status === "paid" || r.status === "ready") && <Btn size="sm" variant="ghost" icon={Undo2} onClick={() => setRefund(r)}>Annuler</Btn>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!pickup} onClose={() => setPickup(null)} title="Valider le retrait">
        {pickup && <>
          <p className="muted" style={{ marginTop: 0 }}>Demandez au client son code de retrait et saisissez-le pour remettre <strong>{pickup.productName}</strong>.</p>
          <Field label="Code présenté par le client" htmlFor="pk-code" error={typed && typed.trim().toUpperCase() !== pickup.code && typed.trim().length >= 7 ? "Ce code ne correspond pas à cette réservation" : ""}><input id="pk-code" className="input rf-code-input" value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase())} placeholder="AR-XXXX" autoFocus /></Field>
          
          <div className="row-end" style={{ marginTop: 14 }}><Btn variant="ghost" onClick={() => setPickup(null)}>Annuler</Btn><Btn icon={Check} disabled={typed.trim().toUpperCase() !== pickup.code} onClick={() => {
            mutate((d) => { const r = d.reservations.find((x) => x.id === pickup.id)!; r.status = "collected"; r.history.push({ at: iso(Date.now()), by: "boutique", text: "Retrait validé avec le code" }); notifyClient(d, r, `Retrait confirmé · ${r.code}`, `Merci ! ${r.productName} a bien été remis par le commerce.`); log(d, `Réservation ${r.code} retirée en magasin`, "commerçant"); });
            toast("Retrait validé"); setPickup(null);
          }}>Confirmer la remise</Btn></div>
        </>}
      </Modal>

      <Modal open={!!refund} onClose={() => setRefund(null)} title="Annuler cette réservation ?">
        {refund && <>
          <p className="muted" style={{ marginTop: 0 }}>La réservation de {refund.buyer} sera annulée et le stock remis en ligne. Indiquez le motif au client.</p>
          <Field label="Motif communiqué au client" htmlFor="rf-reason"><select id="rf-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>{["Rupture de stock", "Produit endommagé", "Erreur de prix", "Le client ne s'est pas présenté", "Demande du client"].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <div className="row-end" style={{ marginTop: 14 }}><Btn variant="ghost" onClick={() => setRefund(null)}>Annuler</Btn><Btn variant="danger" onClick={() => {
            mutate((d) => { const r = d.reservations.find((x) => x.id === refund.id)!; r.status = "refunded"; r.history.push({ at: iso(Date.now()), by: "boutique", text: "Annulée par le commerce : " + reason }); restock(d, r); notifyClient(d, r, `Réservation annulée par le commerce · ${r.code}`, `${r.productName} : ${reason}.`); log(d, `Réservation ${r.code} remboursée par le commerce (${reason})`, "commerçant"); });
            toast("Réservation annulée, le client est prévenu"); setRefund(null);
          }}>Annuler la réservation</Btn></div>
        </>}
      </Modal>
    </div>
  );
}

// ---------- Admin ----------
export function AdminReservationsPanel() {
  const { s } = useStore();
  const { go } = useNav();
  const all = s.reservations;
  const live = all.filter((r) => r.status !== "cancelled" && r.status !== "refunded");
  const volume = live.reduce((a, r) => a + r.total, 0);
  return (
    <div className="panel">
      <div className="panel-head"><div><h3>Réservations</h3><span className="micro">Réglées en magasin au retrait</span></div><span className="micro">{fmtXPF(volume)} réservés</span></div>
      <div className="res-admin">
        {[["paid", "À préparer"], ["ready", "Prêtes"], ["collected", "Retirées"], ["refunded", "Annulées"]].map(([k, l]) => <div key={k}><b>{all.filter((r) => (k === "refunded" ? r.status === "refunded" || r.status === "cancelled" : r.status === k)).length}</b><span>{l}</span></div>)}
      </div>
      <div className="res-admin-list">
        {all.slice(0, 5).map((r) => { const m = s.merchants.find((x) => x.id === r.merchantId); return <div key={r.id}><span className="mono">{r.code}</span><span className="ellipsis">{r.productName} · {m?.name}</span><ResPill st={r.status} /><b>{fmtXPF(r.total)}</b></div>; })}
      </div>
    </div>
  );
}
