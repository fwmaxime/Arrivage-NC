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

export const RES_LABEL: Record<ResStatus, string> = { paid: "Payée, à préparer", ready: "Prête au retrait", collected: "Retirée", cancelled: "Annulée", refunded: "Remboursée" };
const RES_TONE: Record<ResStatus, string> = { paid: "orange", ready: "green", collected: "grey", cancelled: "grey", refunded: "grey" };
export const ResPill = ({ st }: { st: ResStatus }) => <span className={cx("pill", `pill-${RES_TONE[st]}`)}><i />{RES_LABEL[st]}</span>;

const HOLD_DAYS = 3;
const iso = (ms: number) => new Date(ms).toISOString();
function code() { const a = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; let x = ""; for (let i = 0; i < 4; i++) x += a[Math.floor(Math.random() * a.length)]; return "AR-" + x; }

export function seedReservations(): Reservation[] {
  const n = Date.now();
  const mk = (id: string, c: string, pid: string, name: string, price: number, qty: number, buyer: string, phone: string, st: ResStatus, hAgo: number, extra: ResEvent[] = [], merchantId = "m-pixel"): Reservation => ({
    id, code: c, productId: pid, merchantId, productName: name, unitPrice: price, qty, total: price * qty, buyer, phone, buyerId: "u-demo", status: st,
    at: iso(n - hAgo * 36e5), pickupBy: iso(n - hAgo * 36e5 + HOLD_DAYS * 864e5), card: "•••• 4242",
    history: [{ at: iso(n - hAgo * 36e5), by: "client", text: `Réservation payée en ligne (${fmtXPF(price * qty)})` }, ...extra],
    merchantUnread: st === "paid",
  });
  return [
    mk("rs1", "AR-7KQ2", "p002", "Manette DualSense Edge", 26990, 1, "Kévin T. (fictif)", "75 12 34", "paid", 1),
    mk("rs2", "AR-M4ZP", "p005", "Casque sans fil Arctis Nova 7", 24990, 1, "Léa W. (fictif)", "79 45 21", "ready", 20, [{ at: iso(n - 18 * 36e5), by: "boutique", text: "Commande préparée, prête au retrait" }]),
    mk("rs3", "AR-3HXR", "p003", "Écran gaming 27 pouces QHD 180 Hz", 34990, 1, "Samuel N. (fictif)", "77 88 02", "collected", 50, [{ at: iso(n - 46 * 36e5), by: "boutique", text: "Commande préparée, prête au retrait" }, { at: iso(n - 30 * 36e5), by: "boutique", text: "Retrait validé avec le code" }]),
    ...extraSeeds(mk),
  ];
}

/** Réservation déjà retirée par le visiteur, pour pouvoir laisser un avis tout de suite */
export function visitorSeed(): Reservation {
  const n = Date.now();
  return { id: "rs12", code: "AR-9VTN", productId: "p030", merchantId: "m-kaori", productName: "Perceuse-visseuse sans fil 18V", unitPrice: 21900, qty: 1, total: 21900, buyer: "Visiteur démo", phone: "00 00 00", buyerId: "visitor", status: "collected", at: iso(n - 80 * 36e5), pickupBy: iso(n - 80 * 36e5 + HOLD_DAYS * 864e5), card: "•••• 4242",
    history: [{ at: iso(n - 80 * 36e5), by: "client", text: "Réservation payée en ligne (21 900 F)" }, { at: iso(n - 76 * 36e5), by: "boutique", text: "Commande préparée, prête au retrait" }, { at: iso(n - 50 * 36e5), by: "boutique", text: "Retrait validé avec le code" }] };
}

const READY = (h: number): ResEvent => ({ at: iso(Date.now() - h * 36e5), by: "boutique", text: "Commande préparée, prête au retrait" });
const DONE = (h: number): ResEvent => ({ at: iso(Date.now() - h * 36e5), by: "boutique", text: "Retrait validé avec le code" });
const REF = (h: number, why: string): ResEvent => ({ at: iso(Date.now() - h * 36e5), by: "boutique", text: "Remboursée : " + why });
/** Réservations fictives d'autres commerces, pour l'historique côté admin */
export function extraSeeds(mk: any = null): Reservation[] {
  if (!mk) return seedReservations().filter((r) => !["rs1", "rs2", "rs3"].includes(r.id));
  return [
    mk("rs4", "AR-B2NW", "p011", "Nike Air Max 95", 18990, 1, "Marie P. (fictif)", "76 21 09", "collected", 70, [READY(66), DONE(40)], "m-baie"),
    mk("rs5", "AR-Q8TD", "p012", "New Balance 9060", 21990, 2, "Jordan K. (fictif)", "78 30 44", "paid", 5, [], "m-baie"),
    mk("rs6", "AR-H6VE", "p013", "Adidas Samba OG", 16990, 1, "Inès R. (fictif)", "75 66 18", "refunded", 120, [REF(110, "Rupture de stock")], "m-baie"),
    mk("rs7", "AR-K9SM", "p022", "Kit pêche au large complet", 12990, 1, "Tom G. (fictif)", "79 02 57", "collected", 96, [READY(90), DONE(72)], "m-recif"),
    mk("rs8", "AR-W3FJ", "p023", "Sondeur GPS 7 pouces", 89990, 1, "Henri B. (fictif)", "77 14 90", "ready", 26, [READY(22)], "m-recif"),
    mk("rs9", "AR-P7GC", "p036", "Climatiseur split inverter 12 000 BTU", 89900, 1, "Famille T. (fictif)", "76 55 31", "collected", 150, [READY(140), DONE(100)], "m-froid"),
    mk("rs10", "AR-D4RY", "p007", "Samsung Galaxy S25 Ultra 256 Go", 119990, 1, "Nicolas W. (fictif)", "78 77 12", "cancelled", 60, [{ at: iso(Date.now() - 58 * 36e5), by: "client", text: "Annulée par le client, remboursement intégral" }], "m-koumac"),
    mk("rs11", "AR-Z5LU", "p009", "Enceinte Bluetooth étanche Flip 6", 19990, 2, "Sarah M. (fictif)", "75 40 03", "collected", 200, [READY(190), DONE(170)], "m-koumac"),
  ].map((r: Reservation) => ({ ...r, merchantUnread: r.status === "paid" }));
}

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
  const ok = canReserve(p, m);
  if (p.tryOn) return <div className="tryon-noonline"><Shirt size={18} /><div><strong>À essayer en magasin</strong><span>Ce produit n'est pas vendu en ligne : choisissez votre taille et essayez-le sur place chez {m.name}.</span></div></div>;
  return (
    <>
      <Btn size="lg" variant="accent" icon={ShoppingBag} disabled={!ok} onClick={() => setOpen(true)} title={ok ? "" : "Produit non réservable pour le moment"}>Réserver et payer</Btn>
      {open && <ReserveFlow p={p} m={m} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReserveFlow({ p, m, onClose }: { p: Product; m: Merchant; onClose: () => void }) {
  const { s, mutate, toast, log } = useStore();
  const { go, setMode } = useNav();
  const [step, setStep] = useState<"details" | "pay" | "processing" | "done">("details");
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("Visiteur démo");
  const [phone, setPhone] = useState("00 00 00");
  const [accept, setAccept] = useState(false);
  const [res, setRes] = useState<Reservation | null>(null);
  const mx = maxQty(p);
  const total = p.price * qty;
  const nameErr = name.trim().length < 2 ? "Indiquez le nom pour le retrait" : "";

  const pay = () => {
    setStep("processing");
    setTimeout(() => {
      const r: Reservation = {
        id: newId(), code: code(), productId: p.id, merchantId: m.id, productName: p.name, unitPrice: p.price, qty, total,
        buyer: name.trim(), phone: phone.trim(), buyerId: "visitor", status: "paid", at: iso(Date.now()), pickupBy: iso(Date.now() + HOLD_DAYS * 864e5), card: "•••• 4242",
        history: [{ at: iso(Date.now()), by: "client", text: `Réservation payée en ligne (${fmtXPF(total)})` }], merchantUnread: true,
      };
      mutate((d) => {
        d.reservations.unshift(r);
        const x = d.products.find((y) => y.id === p.id);
        if (x && x.qty != null) { x.qty = Math.max(0, x.qty - qty); if (x.qty === 0) x.status = "out"; x.updatedAt = iso(Date.now()); }
        d.notifications.unshift({ id: newId(), kind: "order", title: `Réservation confirmée · ${r.code}`, body: `${p.name} chez ${m.name} · ${fmtXPF(total)} payés · à retirer avant le ${fmtDateLong(r.pickupBy)}`, productId: p.id, read: false, at: r.at });
        log(d, `Réservation payée ${r.code} : « ${p.name} » chez ${m.name} (${fmtXPF(total)})`, "consommateur");
      });
      setRes(r); setStep("done"); toast("Paiement accepté, produit réservé");
    }, 1300);
  };

  const title = step === "done" ? "Réservation confirmée" : step === "pay" || step === "processing" ? "Paiement" : "Réserver ce produit";
  return (
    <Modal open onClose={step === "processing" ? () => {} : onClose} title={title}>
      <div className="rf-steps">{["Réservation", "Paiement", "Confirmation"].map((l, i) => { const cur = step === "details" ? 0 : step === "done" ? 2 : 1; return <span key={l} className={cx(i < cur && "is-done", i === cur && "is-on")}>{i < cur ? <Check size={12} /> : i + 1}<em>{l}</em></span>; })}</div>

      <div className="rf-item">
        <ProductVisual p={p} className="rf-pv" />
        <div><strong>{p.name}</strong><span className="muted small">{m.name} · {p.store || m.stores[0]}</span><span className="rf-price">{fmtXPF(p.price)}</span></div>
      </div>

      {step === "details" && (
        <>
          <div className="rf-qty">
            <span>Quantité</span>
            <div className="qty"><button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Diminuer" disabled={qty <= 1}><Minus size={15} /></button><b>{qty}</b><button onClick={() => setQty(Math.min(mx, qty + 1))} aria-label="Augmenter" disabled={qty >= mx}><Plus size={15} /></button></div>
            {p.qty != null && <span className="micro">{p.qty} en stock</span>}
          </div>
          <div className="rf-grid">
            <Field label="Nom pour le retrait" htmlFor="rf-name" error={nameErr}><input id="rf-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Téléphone (fictif)" htmlFor="rf-phone" hint="Ne saisissez pas de vraies coordonnées"><input id="rf-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          </div>
          <div className="rf-info">
            <p><Store size={15} /> Retrait en magasin : <strong>{p.store || m.stores[0]}</strong>, {m.commune}</p>
            <p><Clock size={15} /> Produit mis de côté pendant {HOLD_DAYS} jours après le paiement</p>
            <p><Undo2 size={15} /> Annulation gratuite tant que le commerce n'a pas préparé la commande</p>
          </div>
          <Recap price={p.price} qty={qty} />
          <div className="row-end"><Btn variant="ghost" onClick={onClose}>Annuler</Btn><Btn variant="accent" disabled={!!nameErr} onClick={() => setStep("pay")} icon={ArrowRight}>Continuer vers le paiement</Btn></div>
        </>
      )}

      {(step === "pay" || step === "processing") && (
        <>
          <div className="rf-demo"><ShieldCheck size={16} /><span><strong>Paiement simulé.</strong> Aucune carte réelle n'est demandée et rien n'est débité. Dans la version réelle, cette étape passerait par un prestataire de paiement sécurisé.</span></div>
          <div className="rf-card" aria-label="Carte de démonstration">
            <div className="row-between"><span className="rf-card-chip" /><CreditCard size={22} /></div>
            <div className="rf-card-num">4242 4242 4242 4242</div>
            <div className="row-between"><span>CARTE DE DÉMONSTRATION</span><span>12/30</span></div>
          </div>
          <Recap price={p.price} qty={qty} />
          <label className="check-row"><input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} /> <span>J'ai compris que le produit est à retirer chez {m.name} avant le {fmtDateLong(iso(Date.now() + HOLD_DAYS * 864e5))}.</span></label>
          <div className="row-end">
            <Btn variant="ghost" onClick={() => setStep("details")} disabled={step === "processing"}>Retour</Btn>
            <Btn variant="accent" icon={Lock} disabled={!accept || step === "processing"} onClick={pay}>{step === "processing" ? "Paiement en cours…" : `Payer ${fmtXPF(total)}`}</Btn>
          </div>
        </>
      )}

      {step === "done" && res && (
        <div className="rf-done">
          <span className="rf-ok"><Check size={26} /></span>
          <p>Paiement de <strong>{fmtXPF(res.total)}</strong> accepté. Présentez ce code en magasin :</p>
          <div className="rf-code">{res.code}</div>
          <div className="rf-info">
            <p><Store size={15} /> {m.name} a été prévenu dans son espace commerçant.</p>
            <p><Clock size={15} /> À retirer avant le {fmtDateLong(res.pickupBy)}.</p>
            <p><Info size={15} /> Vous recevrez une notification quand la commande sera prête.</p>
          </div>
          <div className="row-end">
            <Btn variant="ghost" onClick={() => { mutate((d) => { d.currentMerchant = m.id; }); onClose(); setMode("merchant", { name: "reservations" }); }}>Voir côté commerçant</Btn>
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
      <div><span>Frais de service</span><span>Offerts</span></div>
      <div className="rf-total"><span>Total payé</span><span>{fmtXPF(price * qty)}</span></div>
    </div>
  );
}

// ---------- Consommateur : mes réservations ----------
export function MyReservations() {
  const { s, mutate, toast, log } = useStore();
  const { go } = useNav();
  const [tab, setTab] = useState("current");
  const [cancel, setCancel] = useState<Reservation | null>(null);
  const mine = s.reservations.filter((r) => r.buyerId === "visitor");
  const list = mine.filter((r) => (tab === "current" ? r.status === "paid" || r.status === "ready" : r.status !== "paid" && r.status !== "ready"));
  useEffect(() => { if (mine.some((r) => r.clientUnread)) mutate((d) => d.reservations.forEach((r) => { if (r.buyerId === "visitor") r.clientUnread = false; })); }, []);
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); toast("Code copié"); } catch { toast("Copie impossible ici : sélectionnez le code", "warn"); } };
  return (
    <div className="page narrow">
      <div className="page-head"><div><h1 className="page-title">Mes réservations</h1><p className="muted">Produits payés dans l'application et mis de côté en magasin · <DemoTag>Paiements simulés</DemoTag></p></div></div>
      <Segmented value={tab} onChange={setTab} options={[{ v: "current", l: `En cours (${mine.filter((r) => r.status === "paid" || r.status === "ready").length})` }, { v: "past", l: "Historique et avis" }]} />
      {tab === "current" && (() => { const n = mine.filter((r) => r.status === "collected" && !s.reviews.some((v) => v.reservationId === r.id)).length; return n ? <button className="resbanner" style={{ marginTop: 14 }} onClick={() => setTab("past")}><Star size={18} /> <span>Vous avez {n} achat{n > 1 ? "s" : ""} retiré{n > 1 ? "s" : ""} à noter. Votre avis aide les autres clients.</span><strong>Noter</strong></button> : null; })()}
      {!list.length && <Empty icon={ShoppingBag} title={tab === "current" ? "Aucune réservation en cours" : "Aucun historique"} body="Sur une fiche produit, « Réserver et payer » met l'article de côté dans le commerce." action={<Btn onClick={() => go("explore", {})}>Explorer les arrivages</Btn>} />}
      <div className="res-list">
        {list.map((r) => {
          const p = s.products.find((x) => x.id === r.productId); const m = s.merchants.find((x) => x.id === r.merchantId);
          return (
            <div key={r.id} className={cx("res-card", r.status === "ready" && "is-ready")}>
              <button className="res-pv" onClick={() => p && go("product", { id: p.id })}>{p ? <ProductVisual p={p} /> : null}</button>
              <div className="res-body">
                <div className="row-between"><strong>{r.productName}</strong><ResPill st={r.status} /></div>
                <span className="muted small">{m?.name} · {r.qty} × {fmtXPF(r.unitPrice)} · payé {fmtRel(r.at)} avec {r.card}</span>
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
                  {r.status === "paid" && <Btn variant="ghost" size="sm" icon={XCircle} onClick={() => setCancel(r)}>Annuler et être remboursé</Btn>}
                  {r.status === "collected" && <ReviewButton res={r} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Modal open={!!cancel} onClose={() => setCancel(null)} title="Annuler la réservation ?">
        {cancel && <>
          <p className="muted" style={{ marginTop: 0 }}>{cancel.productName} sera remis en vente et {fmtXPF(cancel.total)} vous seront remboursés (remboursement simulé). Le commerce sera prévenu.</p>
          <div className="row-end"><Btn variant="ghost" onClick={() => setCancel(null)}>Garder</Btn><Btn variant="danger" onClick={() => {
            mutate((d) => { const r = d.reservations.find((x) => x.id === cancel.id); if (!r || r.status !== "paid") return; r.status = "cancelled"; r.merchantUnread = true; r.history.push({ at: iso(Date.now()), by: "client", text: "Annulée par le client, remboursement intégral" }); restock(d, r); log(d, `Réservation ${r.code} annulée par le client`, "consommateur"); });
            toast("Réservation annulée, remboursement simulé"); setCancel(null);
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
  const notifyClient = (d: State, r: Reservation, title: string, body: string) => { if (r.buyerId === "visitor") { r.clientUnread = true; d.notifications.unshift({ id: newId(), kind: "order", title, body, productId: r.productId, read: false, at: iso(Date.now()) }); } };
  const markReady = (r0: Reservation) => {
    mutate((d) => { const r = d.reservations.find((x) => x.id === r0.id)!; r.status = "ready"; r.history.push({ at: iso(Date.now()), by: "boutique", text: "Commande préparée, prête au retrait" }); notifyClient(d, r, `Votre commande ${r.code} est prête`, `${r.productName} vous attend en magasin. Présentez le code ${r.code}.`); log(d, `Réservation ${r.code} prête au retrait`, "commerçant"); });
    toast(r0.buyerId === "visitor" ? "Client prévenu : commande prête" : "Commande marquée prête (client fictif prévenu)");
  };
  return (
    <div className="page">
      <div className="page-head"><div><h1 className="page-title">Réservations</h1><p className="muted">Produits payés par vos clients dans l'application, à préparer puis remettre en magasin · <DemoTag>Paiements simulés</DemoTag></p></div></div>
      <div className="stats stats-3">
        <Stat icon={Receipt} label="À préparer" value={mine.filter((r) => r.status === "paid").length} />
        <Stat icon={PackageCheck} label="Prêtes au retrait" value={mine.filter((r) => r.status === "ready").length} />
        <Stat icon={CreditCard} label="Encaissé via ARRIVAGE" value={fmtXPF(paidTotal)} sub="Hors annulations et remboursements" />
      </div>
      <Segmented value={tab} onChange={setTab} options={[{ v: "todo", l: `À préparer (${mine.filter((r) => r.status === "paid").length})` }, { v: "ready", l: `Prêtes (${mine.filter((r) => r.status === "ready").length})` }, { v: "done", l: "Terminées" }]} />
      {!list.length && <Empty icon={ShoppingBag} title="Rien ici pour l'instant" body={tab === "todo" ? "Les nouvelles réservations payées apparaissent ici, avec une notification." : "Aucune réservation dans cette catégorie."} />}
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
                  {(r.status === "paid" || r.status === "ready") && <Btn size="sm" variant="ghost" icon={Undo2} onClick={() => setRefund(r)}>Rembourser</Btn>}
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
          <button className="link small" onClick={() => setTyped(pickup.code)}>Démo : remplir avec le code du client</button>
          <div className="row-end" style={{ marginTop: 14 }}><Btn variant="ghost" onClick={() => setPickup(null)}>Annuler</Btn><Btn icon={Check} disabled={typed.trim().toUpperCase() !== pickup.code} onClick={() => {
            mutate((d) => { const r = d.reservations.find((x) => x.id === pickup.id)!; r.status = "collected"; r.history.push({ at: iso(Date.now()), by: "boutique", text: "Retrait validé avec le code" }); notifyClient(d, r, `Retrait confirmé · ${r.code}`, `Merci ! ${r.productName} a bien été remis par le commerce.`); log(d, `Réservation ${r.code} retirée en magasin`, "commerçant"); });
            toast("Retrait validé"); setPickup(null);
          }}>Confirmer la remise</Btn></div>
        </>}
      </Modal>

      <Modal open={!!refund} onClose={() => setRefund(null)} title="Rembourser le client ?">
        {refund && <>
          <p className="muted" style={{ marginTop: 0 }}>{fmtXPF(refund.total)} seront remboursés à {refund.buyer} (simulation) et le stock sera remis en ligne.</p>
          <Field label="Motif communiqué au client" htmlFor="rf-reason"><select id="rf-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>{["Rupture de stock", "Produit endommagé", "Erreur de prix", "Le client ne s'est pas présenté", "Demande du client"].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <div className="row-end" style={{ marginTop: 14 }}><Btn variant="ghost" onClick={() => setRefund(null)}>Annuler</Btn><Btn variant="danger" onClick={() => {
            mutate((d) => { const r = d.reservations.find((x) => x.id === refund.id)!; r.status = "refunded"; r.history.push({ at: iso(Date.now()), by: "boutique", text: "Remboursée : " + reason }); restock(d, r); notifyClient(d, r, `Réservation remboursée · ${r.code}`, `${r.productName} : ${reason}. ${fmtXPF(r.total)} remboursés.`); log(d, `Réservation ${r.code} remboursée par le commerce (${reason})`, "commerçant"); });
            toast("Client remboursé et prévenu"); setRefund(null);
          }}>Rembourser</Btn></div>
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
      <div className="panel-head"><div><h3>Réservations payées</h3><span className="micro">Paiements simulés, reversés aux commerces</span></div><span className="micro">{fmtXPF(volume)} encaissés</span></div>
      <div className="res-admin">
        {[["paid", "À préparer"], ["ready", "Prêtes"], ["collected", "Retirées"], ["refunded", "Annulées ou remboursées"]].map(([k, l]) => <div key={k}><b>{all.filter((r) => (k === "refunded" ? r.status === "refunded" || r.status === "cancelled" : r.status === k)).length}</b><span>{l}</span></div>)}
      </div>
      <div className="res-admin-list">
        {all.slice(0, 5).map((r) => { const m = s.merchants.find((x) => x.id === r.merchantId); return <div key={r.id}><span className="mono">{r.code}</span><span className="ellipsis">{r.productName} · {m?.name}</span><ResPill st={r.status} /><b>{fmtXPF(r.total)}</b></div>; })}
      </div>
    </div>
  );
}
