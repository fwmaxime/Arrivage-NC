import React, { useEffect, useState } from "react";
import { Ban, UserX, Flag, Check, EyeOff, Eye, Phone, Mail, Copy, Send, Pencil, MessageSquare, PhoneCall, RotateCcw, Info, Clock, ChevronRight, Store, ShieldCheck, Undo2 } from "lucide-react";
import { useStore, Report, ReportEvent, ReportStatus } from "./store";
import { useNav } from "./nav";
import { STATUSES, fmtXPF, fmtRel, catById, Product } from "./data";
import { Btn, Segmented, StatusPill, ProductVisual, MerchantLogo, Empty, Modal, Field, Chip, cx } from "./ui";
import { StatePill, useMe } from "./merchant";

export const REPORT_STATUS: Record<ReportStatus, [string, string]> = {
  open: ["À traiter", "orange"],
  waiting: ["En attente de la boutique", "violet"],
  fixed: ["Corrigé par la boutique · à vérifier", "blue"],
  resolved: ["Résolu", "green"],
  removed: ["Contenu retiré", "red"],
};
export function ReportPill({ status }: { status: ReportStatus }) {
  const [l, t] = REPORT_STATUS[status] || [status, "grey"];
  return <span className={cx("pill pill-sm", `pill-${t}`)}><i />{l}</span>;
}

const now = () => new Date().toISOString();
const ev = (by: ReportEvent["by"], kind: ReportEvent["kind"], text: string): ReportEvent => ({ at: now(), by, kind, text });

function templateFor(r: Report, p?: Product, shop?: string) {
  const name = p ? `« ${p.name} »` : "votre publication";
  const base = `Bonjour ${shop || ""},\n\nUn client d'ARRIVAGE a signalé ${name} pour le motif suivant : « ${r.reason} ».\n\n`;
  const lower = r.reason.toLowerCase();
  let ask = "Pouvez-vous vérifier la publication et la mettre à jour si nécessaire ?";
  if (lower.includes("prix")) ask = `Le prix affiché sur ARRIVAGE est de ${p ? fmtXPF(p.price) : "—"}. Pouvez-vous confirmer le prix pratiqué en boutique et corriger la publication si besoin ?`;
  else if (lower.includes("épuisé") || lower.includes("dispon")) ask = "Le produit semble épuisé en boutique. Pouvez-vous passer la publication en « Épuisé » ou indiquer le stock réel ?";
  else if (lower.includes("photo")) ask = "La photo ne correspondrait pas au produit. Pouvez-vous la remplacer par une photo du produit réellement vendu ?";
  return base + ask + "\n\nMerci,\nL'équipe ARRIVAGE";
}

const EVENT_ICON: Record<string, any> = { created: Flag, message: Send, call: PhoneCall, edit: Pencil, status: ShieldCheck, reply: MessageSquare };

export function Timeline({ history }: { history: ReportEvent[] }) {
  return (
    <ol className="timeline">
      {[...history].reverse().map((h, i) => {
        const I = EVENT_ICON[h.kind] || Info;
        return (
          <li key={i} className={cx("tl", `tl-${h.by === "boutique" ? "shop" : h.by}`)}>
            <span className="tl-ico"><I size={14} /></span>
            <div>
              <div className="tl-head"><strong>{h.by === "admin" ? "Modération" : h.by === "boutique" ? "Boutique" : h.by === "client" ? "Client" : "Système"}</strong><em>{fmtRel(h.at)}</em></div>
              <p>{h.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ---------- Admin : liste + fiche de traitement ----------
export function AdminReports() {
  const { s } = useStore();
  const [tab, setTab] = useState("todo");
  const [openId, setOpenId] = useState<string | null>(null);
  const todo = (r: Report) => r.status === "open" || r.status === "fixed";
  const list = s.reports.filter((r) => tab === "all" || (tab === "todo" ? todo(r) : tab === "waiting" ? r.status === "waiting" : r.status === "resolved" || r.status === "removed"));
  const count = (f: (r: Report) => boolean) => s.reports.filter(f).length;
  return (
    <div className="page">
      <div className="page-head"><div><h1 className="page-title">Signalements et modération</h1><p className="muted">Ouvrez un signalement pour prévenir la boutique, noter un appel, corriger la publication vous-même ou la masquer.</p></div></div>
      <Segmented value={tab} onChange={setTab} options={[
        { v: "todo", l: `À traiter (${count(todo)})` }, { v: "waiting", l: `En attente boutique (${count((r) => r.status === "waiting")})` },
        { v: "closed", l: `Clos (${count((r) => r.status === "resolved" || r.status === "removed")})` }, { v: "all", l: "Tous" },
      ]} />
      <div className="posts" style={{ marginTop: 16 }}>
        {!list.length && <Empty icon={Flag} title="Rien ici" body="Signalez une publication depuis une fiche produit (espace consommateur) pour tester." />}
        {list.map((r) => {
          const p = s.products.find((x) => x.id === r.productId);
          const m = p && s.merchants.find((x) => x.id === p.merchantId);
          const last = r.history[r.history.length - 1];
          return (
            <button key={r.id} className="post post-btn" onClick={() => setOpenId(r.id)}>
              {p ? <span className="post-thumb"><ProductVisual p={p} /></span> : <span className="post-thumb" />}
              <div className="post-main">
                <div className="post-title"><Flag size={14} /> <strong>{r.reason}</strong><ReportPill status={r.status} />{r.adminUnread && <span className="dot-new">Nouveau</span>}</div>
                <div className="post-meta"><span>{p ? p.name : "Publication supprimée"}</span>{m && <span className="muted">{m.name}</span>}<span className="muted">signalé {fmtRel(r.at)} par {r.reporterId === s.me?.id ? "vous" : s.users.find((u) => u.id === r.reporterId)?.label || "un utilisateur"}</span></div>
                {last && last.kind !== "created" && <div className="post-last muted small">Dernière action : {last.text}</div>}
              </div>
              <span className="post-go">Traiter <ChevronRight size={16} /></span>
            </button>
          );
        })}
      </div>
      <ReportDesk id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function ReportDesk({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { s, mutate, toast, log } = useStore();
  const r = s.reports.find((x) => x.id === id);
  const p = r && s.products.find((x) => x.id === r.productId);
  const m = p && s.merchants.find((x) => x.id === p.merchantId);
  const [tab, setTab] = useState("contact");
  const [msg, setMsg] = useState("");
  const [call, setCall] = useState({ outcome: "", note: "" });
  const [fix, setFix] = useState<any>(null);
  const [closeAfter, setCloseAfter] = useState(true);
  useEffect(() => {
    if (!r) return;
    setTab("contact"); setMsg(templateFor(r, p, m?.name)); setCall({ outcome: "", note: "" });
    setFix(p ? { price: String(p.price), status: p.status, qty: p.qty != null ? String(p.qty) : "", name: p.name, description: p.description } : null);
    if (r.adminUnread) mutate((d) => { const x = d.reports.find((y) => y.id === r.id); if (x) x.adminUnread = false; });
  }, [id]);
  if (!r) return null;

  const upd = (fn: (x: Report, d: any) => void) => mutate((d) => { const x = d.reports.find((y) => y.id === r.id)!; fn(x, d); });
  const copy = async (t: string, label: string) => { try { await navigator.clipboard.writeText(t); toast(label + " copié"); } catch { toast("Copie impossible ici : sélectionnez le texte", "warn"); } };

  const sendMsg = () => {
    if (msg.trim().length < 10) { toast("Le message est trop court", "warn"); return; }
    upd((x, d) => { x.history.push(ev("admin", "message", "Message envoyé à la boutique : " + msg.trim())); if (x.status === "open" || x.status === "fixed") x.status = "waiting"; x.merchantUnread = true; log(d, `Modération : message envoyé à ${m?.name} (${r.reason})`, "admin"); });
    toast(`Message transmis à ${m?.name} dans son espace commerçant`);
  };
  const logCall = () => {
    if (!call.outcome) { toast("Choisissez le résultat de l'appel", "warn"); return; }
    upd((x, d) => {
      x.history.push(ev("admin", "call", `Appel au ${m?.phone} : ${call.outcome}${call.note.trim() ? ". " + call.note.trim() : ""}`));
      if (call.outcome.startsWith("Joint") && (x.status === "open")) x.status = "waiting";
      log(d, `Modération : appel à ${m?.name} noté`, "admin");
    });
    setCall({ outcome: "", note: "" }); toast("Appel ajouté à l'historique");
  };
  const applyFix = () => {
    if (!p || !fix) return;
    const price = Math.round(Number(fix.price));
    if (!Number.isFinite(price) || price <= 0) { toast("Prix invalide", "warn"); return; }
    if (fix.name.trim().length < 3) { toast("Nom trop court", "warn"); return; }
    const changes: string[] = [];
    if (price !== p.price) changes.push(`prix ${fmtXPF(p.price)} → ${fmtXPF(price)}`);
    if (fix.status !== p.status) changes.push(`disponibilité « ${STATUSES.find((x) => x.id === p.status)?.label} » → « ${STATUSES.find((x) => x.id === fix.status)?.label} »`);
    const qty = fix.qty === "" ? null : Math.max(0, Math.round(Number(fix.qty)));
    if (qty !== (p.qty ?? null)) changes.push(`stock ${p.qty ?? "non précisé"} → ${qty ?? "non précisé"}`);
    if (fix.name.trim() !== p.name) changes.push(`nom modifié`);
    if (fix.description.trim() !== p.description) changes.push(`description modifiée`);
    if (!changes.length) { toast("Aucune modification à appliquer", "info"); return; }
    mutate((d) => {
      const x = d.products.find((y) => y.id === p.id)!;
      Object.assign(x, { price, status: fix.status, qty, name: fix.name.trim(), description: fix.description.trim(), updatedAt: now() });
      const rr = d.reports.find((y) => y.id === r.id)!;
      rr.history.push(ev("admin", "edit", "Correction par la modération : " + changes.join(", ")));
      rr.history.push(ev("système", "message", "La boutique a été informée de la correction dans son espace commerçant."));
      rr.merchantUnread = true;
      if (closeAfter) { rr.status = "resolved"; rr.history.push(ev("admin", "status", "Signalement clos après correction")); }
      log(d, `Modération : « ${p.name} » corrigé (${changes.join(", ")})`, "admin");
    });
    toast(closeAfter ? "Publication corrigée et signalement clos" : "Publication corrigée, visible immédiatement côté consommateur");
  };
  const rid = r.reporterId || "";
  const reporterUser = s.users.find((u) => u.id === rid);
  const reporterLabel = rid === s.me?.id ? "vous" : reporterUser?.label || "Utilisateur inconnu";
  const reporterBlocked = reporterUser?.status === "blocked";
  const reporterCount = s.reports.filter((x) => (x.reporterId || "") === rid).length;
  const reporterRejected = s.reports.filter((x) => (x.reporterId || "") === rid && x.history.some((h) => h.text.startsWith("Signalement classé : information"))).length;
  const toggleReporter = (block: boolean) => {
    mutate((d) => {
      { const u = d.users.find((y) => y.id === rid); if (u) u.status = block ? "blocked" : "active"; }
      const x = d.reports.find((y) => y.id === r.id)!;
      x.history.push(ev("admin", "status", block ? `Auteur du signalement (${reporterLabel}) bloqué` : `Auteur du signalement (${reporterLabel}) débloqué`));
      if (block && (x.status === "open" || x.status === "waiting")) { x.status = "resolved"; x.history.push(ev("admin", "status", "Signalement classé : auteur bloqué pour abus")); }
      log(d, `Modération : ${reporterLabel} ${block ? "bloqué" : "débloqué"}`, "admin");
    });
    toast(block ? `${reporterLabel} bloqué` : `${reporterLabel} débloqué`);
  };
  const setStatus = (st: ReportStatus, text: string, extra?: (d: any) => void) => {
    upd((x, d) => { x.status = st; x.history.push(ev("admin", "status", text)); extra?.(d); log(d, `Modération : ${text}`, "admin"); });
    toast(text);
  };

  return (
    <Modal open={!!id} onClose={onClose} title="Traitement du signalement" wide>
      <div className="desk">
        <div className="desk-top">
          <div className="desk-prod">
            {p && <span className="post-thumb"><ProductVisual p={p} /></span>}
            <div>
              <div className="row"><strong>{r.reason}</strong><ReportPill status={r.status} /></div>
              <div className="muted small">{p ? `${p.name} · ${fmtXPF(p.price)} · ${catById(p.category).label}` : "Publication supprimée"}</div>
              {p && <div className="row" style={{ marginTop: 4 }}><StatePill state={p.state} /><StatusPill status={p.status} small /></div>}
            </div>
          </div>
          {m && (
            <div className="desk-shop">
              <MerchantLogo m={m} size={36} />
              <div className="desk-shop-id"><strong>{m.name}</strong><span className="muted small">{m.commune} · {m.hours[0]}</span></div>
              <div className="desk-contact">
                <button className="cline" onClick={() => copy(m.phone, "Numéro")}><Phone size={14} /><span className="sel">{m.phone}</span><Copy size={13} /></button>
                <button className="cline" onClick={() => copy(m.email, "E-mail")}><Mail size={14} /><span className="sel">{m.email}</span><Copy size={13} /></button>
              </div>
            </div>
          )}
        </div>

        {r.status === "fixed" && (
          <div className="banner-info desk-banner"><ShieldCheck size={16} /> La boutique indique avoir corrigé la publication. Vérifiez-la puis clôturez, ou relancez-la.
            <div className="row" style={{ marginLeft: "auto" }}><Btn size="sm" icon={Check} onClick={() => setStatus("resolved", "Correction de la boutique validée, signalement clos")}>Valider</Btn></div>
          </div>
        )}

        <div className="desk-grid">
          <div className="desk-main">
            <Segmented value={tab} onChange={setTab} options={[{ v: "contact", l: "Prévenir la boutique" }, { v: "call", l: "Noter un appel" }, { v: "fix", l: "Corriger moi-même" }, { v: "decide", l: "Décision" }]} />
            {tab === "contact" && (
              <div className="desk-pane">
                <Field label="Message à la boutique" hint="Pré-rempli selon le motif. Il arrive dans l'onglet « Modération » de l'espace commerçant." htmlFor="rd-msg">
                  <textarea id="rd-msg" rows={8} value={msg} onChange={(e) => setMsg(e.target.value)} />
                </Field>
                <div className="row-end">
                  <Btn variant="ghost" icon={RotateCcw} onClick={() => setMsg(templateFor(r, p, m?.name))}>Modèle</Btn>
                  <Btn variant="outline" icon={Copy} onClick={() => copy(msg, "Message")}>Copier pour un e-mail</Btn>
                  <Btn icon={Send} onClick={sendMsg} disabled={!m}>Envoyer dans ARRIVAGE</Btn>
                </div>
                <p className="note"><Info size={14} /> Le message apparaît dans l'espace du commerçant à sa prochaine connexion. Pour un contact immédiat, copiez le message ou les coordonnées.</p>
              </div>
            )}
            {tab === "call" && m && (
              <div className="desk-pane">
                <div className="callcard">
                  <PhoneCall size={18} />
                  <div><span className="muted small">Appeler {m.name}</span><strong className="sel">{m.phone}</strong></div>
                  <Btn size="sm" variant="outline" icon={Copy} onClick={() => copy(m.phone, "Numéro")}>Copier</Btn>
                </div>
                <Field label="Résultat de l'appel">
                  <div className="chips-wrap">{["Joint, correction promise", "Joint, l'information est exacte", "Messagerie, message laissé", "Injoignable"].map((o) => <Chip key={o} active={call.outcome === o} onClick={() => setCall({ ...call, outcome: o })}>{o}</Chip>)}</div>
                </Field>
                <Field label="Note" hint="Facultatif : interlocuteur, engagement, date de rappel…" htmlFor="rd-note"><textarea id="rd-note" rows={3} value={call.note} onChange={(e) => setCall({ ...call, note: e.target.value })} /></Field>
                <div className="row-end"><Btn icon={Check} onClick={logCall}>Ajouter à l'historique</Btn></div>
                {call.outcome === "Joint, l'information est exacte" && <p className="note"><Info size={14} /> Si la boutique confirme, vous pourrez classer le signalement dans l'onglet « Décision ».</p>}
              </div>
            )}
            {tab === "fix" && p && fix && (
              <div className="desk-pane">
                <div className="form-2">
                  <Field label="Prix (F CFP)" htmlFor="rd-price"><input id="rd-price" inputMode="numeric" value={fix.price} onChange={(e) => setFix({ ...fix, price: e.target.value.replace(/\D/g, "") })} /></Field>
                  <Field label="Stock déclaré" hint="Vide = non précisé" htmlFor="rd-qty"><input id="rd-qty" inputMode="numeric" value={fix.qty} onChange={(e) => setFix({ ...fix, qty: e.target.value.replace(/\D/g, "") })} /></Field>
                </div>
                <Field label="Disponibilité"><div className="chips-wrap">{STATUSES.map((st) => <Chip key={st.id} active={fix.status === st.id} onClick={() => setFix({ ...fix, status: st.id })}>{st.label}</Chip>)}</div></Field>
                <Field label="Nom" htmlFor="rd-name"><input id="rd-name" value={fix.name} onChange={(e) => setFix({ ...fix, name: e.target.value })} /></Field>
                <Field label="Description" htmlFor="rd-desc"><textarea id="rd-desc" rows={3} value={fix.description} onChange={(e) => setFix({ ...fix, description: e.target.value })} /></Field>
                <label className="switch-row"><input type="checkbox" checked={closeAfter} onChange={(e) => setCloseAfter(e.target.checked)} /><span className="switch" /> Clore le signalement après correction</label>
                <div className="row-end"><Btn icon={Pencil} onClick={applyFix}>Appliquer la correction</Btn></div>
                <p className="note"><Info size={14} /> La correction est visible tout de suite côté consommateur, et la boutique en est informée dans son espace.</p>
              </div>
            )}
            {tab === "decide" && (
              <div className="desk-pane decide">
                <div className="lbl">Publication et signalement</div>
                {p && p.state !== "hidden" && <button className="decide-row" onClick={() => setStatus("removed", `Publication « ${p.name} » masquée`, (d) => { const x = d.products.find((y: any) => y.id === p.id); if (x) x.state = "hidden"; const rr = d.reports.find((y: any) => y.id === r.id); rr.merchantUnread = true; })}><EyeOff size={18} /><div><strong>Masquer la publication</strong><span>Elle disparaît du catalogue. La boutique est informée.</span></div></button>}
                {p && p.state === "hidden" && <button className="decide-row" onClick={() => setStatus("resolved", `Publication « ${p.name} » rétablie`, (d) => { const x = d.products.find((y: any) => y.id === p.id); if (x) x.state = "published"; })}><Eye size={18} /><div><strong>Rétablir la publication</strong><span>Elle redevient visible dans le catalogue.</span></div></button>}
                <button className="decide-row" onClick={() => setStatus("resolved", "Signalement classé : information confirmée exacte")}><Check size={18} /><div><strong>Classer sans suite</strong><span>L'information affichée est exacte.</span></div></button>
                {(r.status === "resolved" || r.status === "removed") && <button className="decide-row" onClick={() => setStatus("open", "Signalement rouvert")}><Undo2 size={18} /><div><strong>Rouvrir le signalement</strong><span>Il repasse dans « À traiter ».</span></div></button>}
                {r.status !== "waiting" && r.status !== "resolved" && r.status !== "removed" && <button className="decide-row" onClick={() => setStatus("waiting", "Mis en attente d'une réponse de la boutique")}><Clock size={18} /><div><strong>Mettre en attente</strong><span>En attendant une réponse de la boutique.</span></div></button>}
                {m && <>
                  <div className="lbl" style={{ marginTop: 10 }}>Boutique</div>
                  {m.status === "active"
                    ? <button className="decide-row decide-danger" onClick={() => setStatus(r.status === "resolved" ? r.status : "removed", `Boutique ${m.name} suspendue : toutes ses publications sont retirées du catalogue`, (d) => { const x = d.merchants.find((y: any) => y.id === m.id); if (x) x.status = "suspended"; const rr = d.reports.find((y: any) => y.id === r.id); rr.merchantUnread = true; })}><Store size={18} /><div><strong>Suspendre la boutique {m.name}</strong><span>Toutes ses publications disparaissent du catalogue. Réversible depuis Commerçants.</span></div></button>
                    : <button className="decide-row" onClick={() => setStatus(r.status, `Boutique ${m.name} réactivée`, (d) => { const x = d.merchants.find((y: any) => y.id === m.id); if (x) x.status = "active"; })}><Store size={18} /><div><strong>Réactiver la boutique {m.name}</strong><span>Ses publications redeviennent visibles.</span></div></button>}
                </>}
                <div className="lbl" style={{ marginTop: 10 }}>Auteur du signalement</div>
                <div className="reporter">
                  <UserX size={16} />
                  <div><strong>{reporterLabel}</strong><span className="muted small">{reporterCount} signalement(s) envoyé(s) · {reporterRejected} classé(s) sans suite</span></div>
                  {reporterBlocked ? <span className="pill pill-sm pill-red"><i />Bloqué</span> : <span className="pill pill-sm pill-green"><i />Actif</span>}
                </div>
                {reporterBlocked
                  ? <button className="decide-row" onClick={() => toggleReporter(false)}><Check size={18} /><div><strong>Débloquer {reporterLabel}</strong><span>Il peut de nouveau signaler des publications.</span></div></button>
                  : <button className="decide-row decide-danger" onClick={() => toggleReporter(true)}><Ban size={18} /><div><strong>Bloquer {reporterLabel}</strong><span>En cas d'abus (faux signalements, harcèlement d'une boutique). Il ne pourra plus signaler. Ce signalement sera classé.</span></div></button>}
              </div>
            )}
          </div>
          <aside className="desk-side">
            <div className="lbl">Historique</div>
            <Timeline history={r.history} />
          </aside>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Commerçant : onglet Modération ----------
export function MerchantModeration() {
  const { s, mutate, toast, log } = useStore();
  const { go } = useNav();
  const me = useMe();
  const mine = s.reports.filter((r) => { const p = s.products.find((x) => x.id === r.productId); return p?.merchantId === me.id && r.history.some((h) => h.by === "admin" || h.by === "boutique"); });
  const [reply, setReply] = useState<Record<string, string>>({});
  useEffect(() => { if (mine.some((r) => r.merchantUnread)) mutate((d) => d.reports.forEach((r) => { if (mine.find((x) => x.id === r.id)) r.merchantUnread = false; })); }, [me.id]);
  const send = (r: Report, markFixed: boolean) => {
    const t = (reply[r.id] || "").trim();
    if (!t && !markFixed) { toast("Écrivez une réponse", "warn"); return; }
    mutate((d) => {
      const x = d.reports.find((y) => y.id === r.id)!;
      if (t) x.history.push(ev("boutique", "reply", t));
      if (markFixed) { x.status = "fixed"; x.history.push(ev("boutique", "status", "La boutique indique avoir corrigé la publication")); }
      x.adminUnread = true;
      log(d, `${me.name} a répondu à la modération${markFixed ? " (corrigé)" : ""}`, "commerçant");
    });
    setReply({ ...reply, [r.id]: "" });
    toast(markFixed ? "Correction signalée à la modération" : "Réponse envoyée à la modération");
  };
  return (
    <div className="page">
      <div className="page-head"><div><h1 className="page-title">Modération</h1><p className="muted">Messages de l'équipe ARRIVAGE concernant vos publications signalées par des clients.</p></div></div>
      {!mine.length && <Empty icon={ShieldCheck} title="Aucun message de la modération" body="Tout est en ordre. Si un client signale une publication, l'équipe ARRIVAGE vous contactera ici." />}
      <div className="modlist">
        {mine.map((r) => {
          const p = s.products.find((x) => x.id === r.productId);
          const open = r.status === "open" || r.status === "waiting";
          return (
            <div key={r.id} className="panel modcard">
              <div className="modcard-head">
                {p && <span className="post-thumb"><ProductVisual p={p} /></span>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row"><strong>{p?.name}</strong><ReportPill status={r.status} /></div>
                  <div className="muted small">Motif : {r.reason}</div>
                </div>
                {p && <Btn size="sm" variant="outline" icon={Pencil} onClick={() => go("publish", { id: p.id })}>Corriger la publication</Btn>}
              </div>
              <Timeline history={r.history.filter((h) => h.by !== "client" || h.kind === "created")} />
              {open && (
                <div className="modreply">
                  <textarea id={"mr-" + r.id} rows={2} placeholder="Répondre à la modération…" value={reply[r.id] || ""} onChange={(e) => setReply({ ...reply, [r.id]: e.target.value })} aria-label="Réponse" />
                  <div className="row-end">
                    <Btn size="sm" variant="ghost" icon={Send} onClick={() => send(r, false)}>Répondre</Btn>
                    <Btn size="sm" icon={Check} onClick={() => send(r, true)}>C'est corrigé</Btn>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
