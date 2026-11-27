import React, { useState } from "react";
import { toHash } from "./url";
import { Plus, Check, X, Store, Info, Clock, ShieldCheck, UserPlus, Phone, Mail, MapPin, ChevronLeft } from "lucide-react";
import { useStore, newId } from "./store";
import { useNav } from "./nav";
import { CATEGORIES, COMMUNES, PLANS, planById, fmtRel, Merchant, PlanId, planRequests } from "./data";
import { Btn, Segmented, MerchantLogo, Empty, Modal, Field, Chip, cx } from "./ui";
import { AdminMerchants } from "./admin";
import { NeedAccount } from "./auth";

const COLORS = ["#203C31", "#E77938", "#2B6F8A", "#7A3B46", "#5C6B3A", "#3C5A73", "#8A5A2B", "#24344D"];
type F = { name: string; tagline: string; description: string; commune: string; address: string; phone: string; email: string; contactName: string; siret: string; categories: string[]; plan: PlanId; hours: string };
const blank = (): F => ({ name: "", tagline: "", description: "", commune: "Nouméa", address: "", phone: "+687 ", email: "", contactName: "", siret: "", categories: [], plan: "free", hours: "Lun–Ven · 8h00 – 17h30" });

function validate(f: F, existing: Merchant[]) {
  const e: Record<string, string> = {};
  if (f.name.trim().length < 2) e.name = "Nom du commerce requis";
  else if (existing.some((m) => m.name.trim().toLowerCase() === f.name.trim().toLowerCase() && m.status !== "rejected")) e.name = "Un commerce porte déjà ce nom";
  if (f.phone.replace(/\D/g, "").length < 6) e.phone = "Numéro invalide (6 chiffres minimum)";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = "Adresse e-mail invalide";
  if (!f.categories.length) e.categories = "Choisissez au moins une catégorie";
  if (f.address.trim().length < 4) e.address = "Adresse requise";
  return e;
}

function build(f: F, status: Merchant["status"], source: Merchant["source"], ownerId: string): Merchant {
  const name = f.name.trim();
  return {
    id: "m-" + newId(), name, tagline: f.tagline.trim() || CATEGORIES.find((c) => c.id === f.categories[0])?.label || "Commerce", description: f.description.trim() || "Commerce local.",
    commune: f.commune, address: f.address.trim(), hours: f.hours.split("\n").map((h) => h.trim()).filter(Boolean), phone: f.phone.trim(), email: f.email.trim(),
    categories: f.categories as any, color: COLORS[name.length % COLORS.length], ink: "#FFFFFF", shape: (["round", "square", "pill"] as const)[name.length % 3],
    plan: source === "admin" ? f.plan : "free", planRequest: source === "admin" || f.plan === "free" ? null : f.plan, ownerId, status, verified: source === "admin", followersBase: 0, joinedAt: new Date().toISOString().slice(0, 10), addressVerified: false,
    stores: [f.commune], siret: f.siret.trim() || undefined, contactName: f.contactName.trim() || undefined, appliedAt: new Date().toISOString(), source,
  };
}

function MerchantFields({ f, setF, err, admin }: { f: F; setF: (f: F) => void; err: Record<string, string>; admin?: boolean }) {
  const set = (k: keyof F, v: any) => setF({ ...f, [k]: v });
  return (
    <>
      <div className="form-2">
        <Field label="Nom du commerce *" error={err.name} htmlFor="sg-name"><input id="sg-name" value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Accroche" hint="Ex. Électroménager et climatisation" htmlFor="sg-tag"><input id="sg-tag" value={f.tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
        <Field label="Commune *" htmlFor="sg-com"><select id="sg-com" value={f.commune} onChange={(e) => set("commune", e.target.value)}>{COMMUNES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Adresse *" error={err.address} htmlFor="sg-addr"><input id="sg-addr" value={f.address} onChange={(e) => set("address", e.target.value)} /></Field>
        <Field label="Téléphone *" error={err.phone} htmlFor="sg-phone"><input id="sg-phone" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="E-mail du commerce *" error={err.email} htmlFor="sg-mail"><input id="sg-mail" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Nom du responsable" htmlFor="sg-contact"><input id="sg-contact" value={f.contactName} onChange={(e) => set("contactName", e.target.value)} /></Field>
        <Field label="N° RIDET" hint="Identifiant d'entreprise en Nouvelle-Calédonie" htmlFor="sg-ridet"><input id="sg-ridet" value={f.siret} onChange={(e) => set("siret", e.target.value)} /></Field>
      </div>
      <Field label="Catégories vendues *" error={err.categories}>
        <div className="chips-wrap">{CATEGORIES.map((c) => <Chip key={c.id} icon={c.icon} active={f.categories.includes(c.id)} onClick={() => set("categories", f.categories.includes(c.id) ? f.categories.filter((x) => x !== c.id) : [...f.categories, c.id])}>{c.label}</Chip>)}</div>
      </Field>
      <Field label="Description" htmlFor="sg-desc"><textarea id="sg-desc" rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
      <div className="form-2">
        <Field label="Horaires" hint="Une ligne par créneau" htmlFor="sg-hours"><textarea id="sg-hours" rows={2} value={f.hours} onChange={(e) => set("hours", e.target.value)} /></Field>
        <Field label={admin ? "Forfait attribué" : "Forfait souhaité"} htmlFor="sg-plan"><select id="sg-plan" value={f.plan} onChange={(e) => set("plan", e.target.value as PlanId)}>{PLANS.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.price ? p.price.toLocaleString("fr-FR") + " F/mois" : "gratuit"}</option>)}</select></Field>
      </div>
    </>
  );
}

// ---------- Admin ----------
export function AdminMerchantsPage({ params }: { params?: any }) {
  const { s, mutate, toast, log } = useStore();
  const [tab, setTab] = useState<string>(params?.tab || "accounts");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState<F>(blank());
  const [err, setErr] = useState<Record<string, string>>({});
  const [reject, setReject] = useState<Merchant | null>(null);
  const [reason, setReason] = useState("");
  const [approvePlan, setApprovePlan] = useState<Record<string, PlanId>>({});
  const pending = s.merchants.filter((m) => m.status === "pending").sort((a, b) => +new Date(b.appliedAt || 0) - +new Date(a.appliedAt || 0));
  const rejected = s.merchants.filter((m) => m.status === "rejected");
  const accounts = s.merchants.filter((m) => m.status === "active" || m.status === "suspended");
  const requests = planRequests(s.merchants);
  const [refuse, setRefuse] = useState<Merchant | null>(null);
  const acceptPlan = (m: Merchant) => {
    const to = m.planRequest!;
    mutate((d) => { const x = d.merchants.find((y) => y.id === m.id)!; const old = x.plan; x.plan = to; x.planRequest = null; x.planRequestAt = null; x.planRequestNote = null; if (to !== "premium") d.products.forEach((p) => { if (p.merchantId === m.id) p.sponsored = false; }); log(d, `Demande de forfait acceptée : ${m.name} passe de ${planById(old).name} à ${planById(to).name}`, "admin"); });
    toast(`${m.name} passe au forfait ${planById(to).name}`);
  };
  const doRefuse = () => {
    if (!refuse) return;
    mutate((d) => { const x = d.merchants.find((y) => y.id === refuse.id)!; log(d, `Demande de forfait refusée : ${refuse.name} (${planById(x.planRequest || "free").name})${reason.trim() ? " : " + reason.trim() : ""}`, "admin"); x.planRequestNote = reason.trim() || "Demande non retenue"; x.planRequest = null; x.planRequestAt = null; });
    toast(`Demande de ${refuse.name} refusée`); setRefuse(null); setReason("");
  };

  const create = () => {
    const e = validate(f, s.merchants); setErr(e);
    if (Object.keys(e).length) return;
    const m = build(f, "active", "admin", s.me!.id);
    mutate((d) => { d.merchants.push(m); log(d, `Commerçant ajouté par l'admin : ${m.name} (${planById(m.plan).name})`, "admin"); });
    toast(`${m.name} ajouté et visible dans l'annuaire`); setAdding(false); setF(blank()); setTab("accounts");
  };
  const approve = (m: Merchant) => {
    const plan = approvePlan[m.id] || m.planRequest || m.plan;
    mutate((d) => { const x = d.merchants.find((y) => y.id === m.id)!; x.status = "active"; x.verified = true; x.plan = plan; x.planRequest = null; x.planRequestAt = null; x.joinedAt = new Date().toISOString().slice(0, 10); log(d, `Inscription validée : ${m.name} (${planById(plan).name})`, "admin"); });
    toast(`${m.name} validé : le commerce apparaît dans l'annuaire`);
  };
  const doReject = () => {
    if (!reject) return;
    if (reason.trim().length < 3) { toast("Indiquez un motif de refus", "warn"); return; }
    mutate((d) => { const x = d.merchants.find((y) => y.id === reject.id)!; x.status = "rejected"; x.rejectReason = reason.trim(); log(d, `Inscription refusée : ${reject.name} (${reason.trim()})`, "admin"); });
    toast(`Inscription de ${reject.name} refusée`); setReject(null); setReason("");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div><h1 className="page-title">Commerçants</h1><p className="muted">Vous contrôlez qui rejoint la plateforme : ajout manuel, validation ou refus des inscriptions, forfaits et suspensions.</p></div>
        <Btn icon={Plus} onClick={() => { setF(blank()); setErr({}); setAdding(true); }}>Ajouter un commerçant</Btn>
      </div>
      <div className="approval-setting">
        <ShieldCheck size={18} />
        <div><strong>Validation manuelle des inscriptions</strong><span className="muted small">{s.settings.manualApproval ? "Chaque nouvelle inscription attend votre accord avant d'apparaître sur ARRIVAGE." : "Les nouvelles inscriptions sont publiées immédiatement, sans contrôle."}</span></div>
        <label className="switch-row"><input type="checkbox" checked={s.settings.manualApproval} onChange={() => { mutate((d) => { d.settings.manualApproval = !d.settings.manualApproval; }); toast(s.settings.manualApproval ? "Inscriptions acceptées automatiquement" : "Validation manuelle activée", "info"); }} aria-label="Validation manuelle" /><span className="switch" /></label>
      </div>
      <Segmented value={tab} onChange={setTab} options={[{ v: "accounts", l: `Comptes (${accounts.length})` }, { v: "pending", l: `Inscriptions à valider (${pending.length})` }, { v: "plans", l: `Demandes de forfait (${requests.length})` }, { v: "rejected", l: `Refusées (${rejected.length})` }]} />
      <div style={{ marginTop: 16 }}>
        {tab === "accounts" && <AdminMerchants embedded />}
        {tab === "pending" && (pending.length ? (
          <div className="apps">
            {pending.map((m) => (
              <div key={m.id} className="panel app">
                <div className="app-head">
                  <MerchantLogo m={m} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}><strong>{m.name}</strong><div className="muted small">{m.tagline} · demande reçue {fmtRel(m.appliedAt || new Date().toISOString())}</div></div>
                  <span className="pill pill-sm pill-violet"><i />En attente</span>
                </div>
                <dl className="app-facts">
                  <div><dt><MapPin size={13} /> Adresse</dt><dd>{m.address}, {m.commune}</dd></div>
                  <div><dt><Phone size={13} /> Téléphone</dt><dd className="sel">{m.phone}</dd></div>
                  <div><dt><Mail size={13} /> E-mail</dt><dd className="sel">{m.email}</dd></div>
                  <div><dt>Responsable</dt><dd>{m.contactName || "—"}</dd></div>
                  <div><dt>RIDET</dt><dd>{m.siret || <span className="warn-txt">Non fourni</span>}</dd></div>
                  <div><dt>Catégories</dt><dd>{m.categories.map((c) => CATEGORIES.find((x) => x.id === c)?.label).join(", ")}</dd></div>
                </dl>
                <p className="small">{m.description}</p>
                <div className="app-actions">
                  <label className="small muted">Forfait : <select id={"ap-" + m.id} className="select select-sm" value={approvePlan[m.id] || m.planRequest || m.plan} onChange={(e) => setApprovePlan({ ...approvePlan, [m.id]: e.target.value as PlanId })}>{PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                  <div className="row">
                    <Btn size="sm" variant="ghost" icon={X} onClick={() => { setReject(m); setReason(""); }}>Refuser</Btn>
                    <Btn size="sm" icon={Check} onClick={() => approve(m)}>Valider l'inscription</Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : <Empty icon={UserPlus} title="Aucune inscription en attente" body="Les commerçants s'inscrivent depuis l'espace consommateur : Commerces, puis « Inscrire mon commerce »." />)}
        {tab === "plans" && (requests.length ? (
          <div className="apps">
            {requests.map((m) => {
              const from = planById(m.plan), to = planById(m.planRequest!);
              return (
                <div key={m.id} className="panel app">
                  <div className="app-head">
                    <MerchantLogo m={m} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}><strong>{m.name}</strong><div className="muted small">{m.commune} · demande {m.planRequestAt ? "reçue " + fmtRel(m.planRequestAt) : "en attente"}</div></div>
                    <span className="pill pill-sm pill-amber"><i />{from.name} → {to.name}</span>
                  </div>
                  <dl className="app-facts">
                    <div><dt>Forfait demandé</dt><dd><b>{to.name}</b> · {to.price ? `${to.price.toLocaleString("fr-FR")} F / mois` : "gratuit"}</dd></div>
                    <div><dt>Forfait actuel</dt><dd>{from.name}</dd></div>
                    <div><dt><Phone size={13} /> Téléphone</dt><dd className="sel">{m.phone}</dd></div>
                    <div><dt><Mail size={13} /> E-mail</dt><dd className="sel">{m.email}</dd></div>
                    <div><dt>Responsable</dt><dd>{m.contactName || "—"}</dd></div>
                  </dl>
                  <p className="note"><Info size={14} /> Contactez le commerçant pour la facturation, puis activez le forfait une fois le paiement reçu.</p>
                  <div className="app-actions">
                    <span />
                    <div className="row">
                      <Btn size="sm" variant="ghost" icon={X} onClick={() => { setRefuse(m); setReason(""); }}>Refuser</Btn>
                      <Btn size="sm" icon={Check} onClick={() => acceptPlan(m)}>Activer le forfait {to.name}</Btn>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <Empty icon={Clock} title="Aucune demande de forfait" body="Quand un commerçant choisit un forfait payant dans son espace (Forfaits), sa demande apparaît ici." />)}
        {tab === "rejected" && (rejected.length ? (
          <div className="posts">
            {rejected.map((m) => (
              <div key={m.id} className="post">
                <MerchantLogo m={m} size={40} />
                <div className="post-main"><strong>{m.name}</strong><span className="muted small">Motif : {m.rejectReason}</span></div>
                <Btn size="sm" variant="outline" onClick={() => { mutate((d) => { const x = d.merchants.find((y) => y.id === m.id)!; x.status = "pending"; x.rejectReason = undefined; }); toast(`${m.name} remis en attente de validation`, "info"); }}>Réexaminer</Btn>
              </div>
            ))}
          </div>
        ) : <Empty icon={X} title="Aucune inscription refusée" />)}
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Ajouter un commerçant" wide>
        <form className="form" onSubmit={(e) => { e.preventDefault(); create(); }} noValidate>
          <MerchantFields f={f} setF={setF} err={err} admin />
          <p className="note"><Info size={14} /> Un compte créé par l'admin est validé et vérifié directement.</p>
          <div className="row-end"><Btn type="button" variant="ghost" onClick={() => setAdding(false)}>Annuler</Btn><Btn type="submit" icon={Check}>Créer le compte</Btn></div>
        </form>
      </Modal>
      <Modal open={!!refuse} onClose={() => setRefuse(null)} title={`Refuser la demande de ${refuse?.name || ""}`}>
        <p className="muted" style={{ marginTop: 0 }}>Le commerce garde son forfait actuel ({refuse ? planById(refuse.plan).name : ""}). Le motif s'affiche dans sa page Forfaits.</p>
        <Field label="Motif (facultatif)" htmlFor="pr-reason"><input id="pr-reason" value={reason} onChange={(e) => setReason(e.target.value.slice(0, 200))} placeholder="Paiement non reçu, forfait inadapté…" /></Field>
        <div className="row-end" style={{ marginTop: 12 }}><Btn variant="ghost" onClick={() => setRefuse(null)}>Annuler</Btn><Btn onClick={doRefuse}>Refuser la demande</Btn></div>
      </Modal>
      <Modal open={!!reject} onClose={() => setReject(null)} title={`Refuser ${reject?.name || ""}`}>
        <div className="chips-wrap" style={{ marginBottom: 10 }}>{["Informations incomplètes", "RIDET invalide ou manquant", "Activité hors périmètre (vente entre particuliers)", "Doublon d'un commerce existant", "Pratiques commerciales douteuses"].map((r) => <Chip key={r} active={reason === r} onClick={() => setReason(r)}>{r}</Chip>)}</div>
        <Field label="Motif" htmlFor="rj-reason"><input id="rj-reason" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <div className="row-end" style={{ marginTop: 14 }}><Btn variant="ghost" onClick={() => setReject(null)}>Annuler</Btn><Btn variant="danger" onClick={doReject}>Refuser l'inscription</Btn></div>
      </Modal>
    </div>
  );
}

// ---------- Inscription publique (côté consommateur) ----------
export function MerchantSignup() {
  const { s, mutate, toast, log } = useStore();
  const { back, go, setMode } = useNav();
  const [f, setF] = useState<F>(blank());
  const [err, setErr] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Merchant | null>(null);
  const [agree, setAgree] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er = validate(f, s.merchants); if (!agree) er.agree = "Acceptez les conditions pour envoyer la demande."; setErr(er);
    if (Object.keys(er).length) { toast("Vérifiez les champs signalés", "warn"); return; }
    const auto = !s.settings.manualApproval;
    const m = build(f, auto ? "active" : "pending", "inscription", s.me!.id);
    mutate((d) => { d.merchants.push(m); d.currentMerchant = m.id; if (d.me && d.me.role === "client") d.me = { ...d.me, role: "merchant" }; log(d, auto ? `Nouveau commerce inscrit (validation automatique) : ${m.name}` : `Nouvelle demande d'inscription : ${m.name}`, "commerçant"); });
    setDone(m);
  };
  if (!s.me) return <NeedAccount title="Inscrire mon commerce" body="Créez d'abord un compte gratuit (ou connectez-vous) : il vous servira à gérer votre commerce et vos publications." />;
  if (done) return (
    <div className="page narrow">
      <div className="panel signup-done">
        <span className="empty-ico">{done.status === "pending" ? <Clock size={22} /> : <Check size={22} />}</span>
        <h1 className="page-title">{done.status === "pending" ? "Demande envoyée" : "Commerce inscrit"}</h1>
        <p className="muted">{done.status === "pending" ? `L'équipe ARRIVAGE va vérifier les informations de ${done.name}. Le commerce apparaîtra dans l'annuaire après validation.` : `${done.name} est visible dans l'annuaire.`}</p>
        <p className="note"><Info size={14} /> Vous pouvez déjà préparer vos publications dans votre espace commerçant : elles seront visibles dès la validation.</p>
        <div className="row-center" style={{ flexWrap: "wrap" }}><Btn variant="outline" onClick={() => go("merchants")}>Retour à l'annuaire</Btn><Btn onClick={() => setMode("merchant", { name: "dashboard" })}>Ouvrir mon espace commerçant</Btn></div>
      </div>
    </div>
  );
  return (
    <div className="page narrow">
      <button className="back" onClick={back}><ChevronLeft size={18} /> Retour</button>
      <h1 className="page-title">Inscrire mon commerce</h1>
      <p className="muted" style={{ margin: "4px 0 18px" }}>Rejoignez ARRIVAGE pour annoncer vos arrivages aux Calédoniens. {s.settings.manualApproval ? "Chaque inscription est vérifiée par l'équipe avant publication." : ""}</p>
      <form className="form panel" onSubmit={submit} noValidate>
        <MerchantFields f={f} setF={setF} err={err} />
        <label className="check-line"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>Je certifie être autorisé(e) à représenter ce commerce et j'accepte les <a href={toHash("consumer", { name: "terms" })} target="_blank" rel="noopener">conditions d'utilisation</a>, notamment les engagements des commerçants (article 5).</span></label>
        {err.agree && <p className="field-err">{err.agree}</p>}
        <div className="row-end"><Btn type="submit" icon={Store}>Envoyer ma demande</Btn></div>
      </form>
    </div>
  );
}
