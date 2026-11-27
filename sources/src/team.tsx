import React, { useState } from "react";
import { Users, UserPlus, Check, X, Mail, Eye, Crown, Send, Clock, Trash2, Store, ShieldCheck, Info, ArrowLeftRight } from "lucide-react";
import { planById, fmtRel } from "./data";
import { useStore, newId } from "./store";
import { sb } from "./backend";
import { useNav } from "./nav";
import { Btn, Modal, Confirm, Field, cx, MerchantLogo, Chip, IconBtn } from "./ui";
import { useMe } from "./merchant";
import { ROLES, PERM_LABELS, roleById, can, Staff, Role, MAX_STAFF, newInviteCode } from "./staff";
import { shareUrl } from "./url";

// Lien et message d'invitation : l'employé l'ouvre, se connecte (ou crée son compte) et rejoint l'équipe.
export const inviteLink = (code: string) => shareUrl({ name: "join", params: { code } });
const inviteText = (m: Staff, shop: string) => `Bonjour ${m.name.split(" ")[0]},\n\nVous êtes invité(e) à rejoindre l'équipe de ${shop} sur ARRIVAGE en tant que ${roleById(m.role).name.toLowerCase()}.\n\n1. Ouvrez ce lien : ${inviteLink(m.code || "")}\n2. Connectez-vous ou créez votre compte gratuit (avec votre propre mot de passe).\n3. Validez l'invitation. Votre code : ${m.code}\n\nÀ bientôt sur ARRIVAGE`;

function ShareInvite({ m, shop, onClose }: { m: Staff | null; shop: string; onClose: () => void }) {
  const { toast } = useStore();
  if (!m) return null;
  const txt = inviteText(m, shop);
  const copy = async (t: string, msg: string) => { try { await navigator.clipboard.writeText(t); toast(msg); } catch { toast("Copie impossible : sélectionnez le texte manuellement", "warn"); } };
  return (
    <Modal open onClose={onClose} title={`Invitation pour ${m.name}`}>
      <p className="muted" style={{ marginTop: 0 }}>Envoyez ce message à {m.name.split(" ")[0]} par e-mail, SMS ou WhatsApp. Le code ne sert qu'une fois.</p>
      <div className="invite-code"><span className="micro">Code d'invitation</span><b className="sel">{m.code}</b></div>
      <textarea className="invite-msg" readOnly rows={9} value={txt} onFocus={(e) => e.currentTarget.select()} />
      <div className="row-end" style={{ marginTop: 12, flexWrap: "wrap" }}>
        <a className="btn btn-outline btn-md" href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent("Invitation à rejoindre " + shop + " sur ARRIVAGE")}&body=${encodeURIComponent(txt)}`}><Mail size={16} /> Ouvrir dans ma messagerie</a>
        <a className="btn btn-outline btn-md" href={`https://wa.me/?text=${encodeURIComponent(txt)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <Btn icon={Send} onClick={() => copy(txt, "Message d'invitation copié")}>Copier le message</Btn>
      </div>
    </Modal>
  );
}

const initialsOf = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const AV_COLORS = ["#1F4E5A", "#8A5A2B", "#5B4B8A", "#2F6B4F", "#9A3B4A", "#3D5A80"];
const avColor = (id: string) => AV_COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length];

function RoleTable({ compact }: { compact?: boolean }) {
  return (
    <div className={cx("role-table", compact && "is-compact")} role="table" aria-label="Ce que chaque rôle peut faire">
      <div className="rt-row rt-head" role="row"><span role="columnheader">Ce que la personne peut faire</span>{ROLES.map((r) => <span key={r.id} role="columnheader">{r.name}</span>)}</div>
      {PERM_LABELS.map((p) => (
        <div key={p.id} className="rt-row" role="row">
          <span role="cell">{p.label}</span>
          {ROLES.map((r) => <span key={r.id} role="cell" className={cx("rt-cell", can(r.id, p.id) ? "is-yes" : "is-no")} aria-label={can(r.id, p.id) ? "Oui" : "Non"}>{can(r.id, p.id) ? <Check size={16} /> : <X size={14} />}</span>)}
        </div>
      ))}
    </div>
  );
}

function InviteModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (m: Staff) => void }) {
  const { s, mutate, log } = useStore();
  const me = useMe();
  const [f, setF] = useState({ name: "", email: "", role: "seller" as Exclude<Role, "owner">, stores: [me.stores[0]] });
  const [err, setErr] = useState<any>({});
  const submit = () => {
    const e: any = {};
    if (f.name.trim().length < 2) e.name = "Indiquez le prénom et le nom";
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Adresse e-mail invalide";
    if (!f.stores.length) e.stores = "Choisissez au moins un point de vente";
    if (s.staff.some((x) => x.merchantId === me.id && x.email.toLowerCase() === f.email.trim().toLowerCase())) e.email = "Cette personne fait déjà partie de l'équipe ou a déjà une invitation";
    setErr(e); if (Object.keys(e).length) return;
    const row: Staff = { id: "st" + newId(), merchantId: me.id, name: f.name.trim(), email: f.email.trim(), role: f.role, status: "invited", invitedAt: new Date().toISOString(), stores: f.stores, code: newInviteCode(), userId: null };
    mutate((d) => {
      d.staff.push(row);
      log(d, `${me.name} a invité ${row.name} (${roleById(f.role).name})`, "commerçant");
    });
    onCreated(row);
    setF({ name: "", email: "", role: "seller", stores: [me.stores[0]] }); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Inviter un membre de l'équipe">
      <div className="invite-form">
        <div className="form-2">
          <Field label="Prénom et nom" error={err.name} htmlFor="inv-name"><input id="inv-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex. Léa Martin" /></Field>
          <Field label="Adresse e-mail" error={err.email} htmlFor="inv-email"><input id="inv-email" type="email" inputMode="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="lea@exemple.nc" /></Field>
        </div>
        <div className="field"><span className="field-label">Rôle</span>
          <div className="role-pick">
            {ROLES.filter((r) => r.id !== "owner").map((r) => (
              <button key={r.id} type="button" className={cx("role-opt", f.role === r.id && "is-on")} onClick={() => setF({ ...f, role: r.id as any })} aria-pressed={f.role === r.id}>
                <span className="role-opt-top"><b>{r.name}</b>{f.role === r.id && <Check size={16} />}</span>
                <span className="role-opt-short">{r.short}</span>
                <span className="micro">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>
        {me.stores.length > 1 && (
          <div className={cx("field", err.stores && "has-error")}><span className="field-label">Points de vente</span>
            <div className="chips-wrap">{me.stores.map((x) => { const on = f.stores.includes(x); return <Chip key={x} icon={Store} active={on} onClick={() => setF({ ...f, stores: on ? f.stores.filter((y) => y !== x) : [...f.stores, x] })}>{x}</Chip>; })}</div>
            {err.stores && <span className="field-err">{err.stores}</span>}
          </div>
        )}
        <p className="note"><Mail size={14} /> Vous obtenez un lien et un code à envoyer à la personne. Elle se connecte avec son propre compte : vous ne partagez jamais votre mot de passe.</p>
        <div className="row-end"><Btn variant="ghost" onClick={onClose}>Annuler</Btn><Btn icon={Send} onClick={submit}>Créer l'invitation</Btn></div>
      </div>
    </Modal>
  );
}

export function TeamPage() {
  const { s, mutate, toast, log } = useStore();
  const { go } = useNav();
  const me = useMe();
  const plan = planById(me.plan);
  const [invite, setInvite] = useState(false);
  const [removing, setRemoving] = useState<Staff | null>(null);
  const team = s.staff.filter((x) => x.merchantId === me.id);
  const full = team.length >= MAX_STAFF;
  const [sharing, setSharing] = useState<Staff | null>(null);

  const steps = (
    <div className="team-steps">
      {[[UserPlus, "1. Invitez", "Saisissez le nom et l'e-mail de votre employé."], [ShieldCheck, "2. Choisissez son rôle", "Gérant ou Vendeur : il ne voit que ce dont il a besoin."], [Mail, "3. Il se connecte", "Il reçoit un lien et se connecte avec son propre mot de passe."]].map(([I, t, d]: any) => (
        <div key={t} className="team-step"><span className="team-step-ico"><I size={18} /></span><div><strong>{t}</strong><span className="muted small">{d}</span></div></div>
      ))}
    </div>
  );

  if (!plan.can.team) return (
    <div className="page team-page">
      <div className="page-head"><div><h1 className="page-title">Équipe</h1><p className="muted">Donnez un accès à vos employés, sans partager votre mot de passe.</p></div></div>
      {steps}
      <div className="panel team-upsell">
        <Crown size={22} />
        <div><h3>Comptes employés, inclus dans le forfait Premium</h3><p className="muted">Jusqu'à {MAX_STAFF} membres, chacun avec son propre accès. Vous êtes actuellement en {plan.name}.</p></div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Btn variant="accent" onClick={() => go("plans")}>Découvrir Premium</Btn>
        </div>
      </div>
      <section className="panel"><div className="panel-head"><h3>Qui peut faire quoi</h3></div><RoleTable /></section>
    </div>
  );

  return (
    <div className="page team-page">
      <div className="page-head">
        <div><h1 className="page-title">Équipe</h1><p className="muted">Donnez un accès à vos employés, sans partager votre mot de passe. {team.length}/{MAX_STAFF} membres.</p></div>
        <Btn icon={UserPlus} onClick={() => setInvite(true)} disabled={full}>Inviter un membre</Btn>
      </div>
      {team.length === 0 && steps}

      <section className="panel">
        <div className="panel-head"><h3>Membres</h3><span className="muted small">{team.filter((x) => x.status === "active").length} actif{team.filter((x) => x.status === "active").length > 1 ? "s" : ""} · {team.filter((x) => x.status === "invited").length} invitation{team.filter((x) => x.status === "invited").length > 1 ? "s" : ""} en attente</span></div>
        <div className="team-list">
          <div className="team-row is-owner">
            <MerchantLogo m={me} size={40} />
            <div className="team-id"><b>Vous</b><span className="micro">{me.email}</span></div>
            <span className="role-pill role-owner"><Crown size={12} /> Propriétaire</span>
            <span className="team-meta micro">Accès complet</span>
            <span className="team-actions" />
          </div>
          {team.map((m) => (
            <div key={m.id} className="team-row">
              <span className="team-av" style={{ background: avColor(m.id) }}>{initialsOf(m.name)}</span>
              <div className="team-id"><b>{m.name}</b><span className="micro">{m.email}</span></div>
              <label className="team-role">
                <select aria-label={`Rôle de ${m.name}`} value={m.role} onChange={(e) => { const r = e.target.value as any; mutate((d) => { const x = d.staff.find((y) => y.id === m.id); if (x) x.role = r; log(d, `${m.name} est maintenant ${roleById(r).name}`, "commerçant"); }); toast(`${m.name} est maintenant ${roleById(r).name}`); }} className={cx("select select-sm", `role-${m.role}`)}>
                  {ROLES.filter((r) => r.id !== "owner").map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>
              <span className="team-meta micro">
                {m.status === "invited" ? <span className="pill pill-sm pill-amber"><Clock size={11} /> Invitation en attente · {fmtRel(m.invitedAt)}</span> : <>Actif · vu {m.lastActive ? fmtRel(m.lastActive) : "récemment"}</>}
                {me.stores.length > 1 && <span className="team-stores"><Store size={11} /> {m.stores.join(", ")}</span>}
              </span>
              <span className="team-actions">
                {m.status === "invited" ? (
                  <>
                    <Btn size="sm" variant="outline" icon={Send} onClick={() => setSharing(m)}>Envoyer l'invitation</Btn>
                  </>
                ) : (
                  <Btn size="sm" variant="outline" icon={Eye} onClick={() => { mutate((d) => { d.actAs = m.id; }); go("dashboard"); }}>Voir comme {m.name.split(" ")[0]}</Btn>
                )}
                <IconBtn icon={Trash2} size={16} label={`Retirer ${m.name}`} onClick={() => setRemoving(m)} />
              </span>
            </div>
          ))}
        </div>
        {full && <p className="note"><Info size={14} /> Limite de {MAX_STAFF} membres atteinte. Retirez un membre pour en inviter un autre.</p>}
      </section>

      <section className="panel">
        <div className="panel-head"><h3>Qui peut faire quoi</h3><span className="muted small">Le bouton « Voir comme » vous montre exactement l'espace de la personne.</span></div>
        <RoleTable />
      </section>

      <InviteModal open={invite} onClose={() => setInvite(false)} onCreated={(m) => { setInvite(false); setSharing(m); }} />
      <ShareInvite m={sharing} shop={me.name} onClose={() => setSharing(null)} />
      <Confirm open={!!removing} onClose={() => setRemoving(null)} danger confirmLabel="Retirer" title={`Retirer ${removing?.name} de l'équipe ?`}
        body="Son accès est coupé immédiatement. Ses actions passées restent visibles dans l'historique."
        onConfirm={() => { const r = removing!; mutate((d) => { d.staff = d.staff.filter((x) => x.id !== r.id); if (d.actAs === r.id) d.actAs = null; log(d, `${me.name} a retiré ${r.name} de l'équipe`, "commerçant"); }); toast(`${r.name} n'a plus accès à l'espace`); }} />
    </div>
  );
}

// Bandeau affiché quand le propriétaire regarde l'espace « comme » un employé
export function ActAsBanner({ member }: { member: Staff }) {
  const { mutate } = useStore();
  const { go } = useNav();
  return (
    <div className="actas">
      <Eye size={16} />
      <span>Aperçu : vous voyez l'espace comme <b>{member.name}</b> · {roleById(member.role).name}</span>
      <Btn size="sm" variant="outline" onClick={() => { mutate((d) => { d.actAs = null; }); go("team"); }}>Revenir à mon compte</Btn>
    </div>
  );
}

export function NoAccess({ member }: { member: Staff }) {
  const { go } = useNav();
  const { s } = useStore();
  if (member.userId && member.userId === s.me?.id) return (
    <div className="page"><div className="empty">
      <ShieldCheck size={28} />
      <h3>Page réservée au propriétaire du commerce</h3>
      <p className="muted">Votre rôle de {roleById(member.role).name.toLowerCase()} ne donne pas accès à cette page. Demandez au propriétaire si vous en avez besoin.</p>
      <Btn onClick={() => go("dashboard")}>Retour au tableau de bord</Btn>
    </div></div>
  );
  return (
    <div className="page"><div className="empty">
      <ShieldCheck size={28} />
      <h3>Page non accessible pour un {roleById(member.role).name.toLowerCase()}</h3>
      <p className="muted">{member.name} ne voit pas cette page avec son rôle actuel. Vous pouvez changer son rôle dans Équipe.</p>
      <Btn onClick={() => go("dashboard")}>Retour au tableau de bord</Btn>
    </div></div>
  );
}

// ---------- Employé : accepter une invitation (#/rejoindre-equipe?code=…) ----------
export function JoinTeamPage({ params }: { params?: any }) {
  const { s, mutate, reload, openAuth, toast } = useStore();
  const { setMode } = useNav();
  const [code, setCode] = useState<string>(String(params?.code || "").toUpperCase());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!s.me) return (
    <div className="page narrow"><div className="panel join-panel">
      <UserPlus size={26} />
      <h1 className="page-title">Rejoindre l'équipe d'un commerce</h1>
      <p className="muted">Connectez-vous avec votre propre compte, ou créez-en un gratuitement, puis validez votre invitation. Ne demandez jamais le mot de passe de votre employeur.</p>
      {code && <p className="small">Votre code : <b className="sel">{code}</b></p>}
      <div className="row"><Btn onClick={() => openAuth("Connectez-vous pour rejoindre l'équipe.", "login")}>Se connecter</Btn><Btn variant="outline" onClick={() => openAuth("Créez votre compte pour rejoindre l'équipe.", "signup")}>Créer un compte</Btn></div>
    </div></div>
  );
  const join = async () => {
    const c = code.trim().toUpperCase();
    if (c.replace(/[^A-Z0-9]/g, "").length < 8) { setErr("Le code comporte 8 caractères, par exemple K7P2-9QXM."); return; }
    setBusy(true); setErr("");
    const { data, error } = await sb!.rpc("join_staff", { invite: c });
    setBusy(false);
    if (error) {
      const m = error.message || "";
      setErr(/premium/i.test(m) ? "Ce commerce n'a plus le forfait Premium : les comptes employés ne sont pas disponibles." : /déjà|already/i.test(m) ? "Vous faites déjà partie de cette équipe." : /propri/i.test(m) ? "C'est votre propre commerce : vous y avez déjà accès." : "Code invalide ou déjà utilisé. Demandez une nouvelle invitation au commerce.");
      return;
    }
    await reload();
    mutate((d) => { d.currentMerchant = String(data || ""); d.actAs = null; });
    toast("Bienvenue dans l'équipe !");
    setMode("merchant", { name: "dashboard" });
  };
  return (
    <div className="page narrow"><div className="panel join-panel">
      <UserPlus size={26} />
      <h1 className="page-title">Rejoindre l'équipe d'un commerce</h1>
      <p className="muted">Saisissez le code reçu de votre employeur. Vous accéderez à l'espace du commerce avec votre compte ({s.me.displayName}), selon le rôle qu'il vous a donné.</p>
      <Field label="Code d'invitation" error={err} htmlFor="join-code"><input id="join-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 12))} placeholder="K7P2-9QXM" autoCapitalize="characters" /></Field>
      <div className="row-end"><Btn icon={Check} onClick={join} disabled={busy}>{busy ? "Vérification…" : "Rejoindre l'équipe"}</Btn></div>
    </div></div>
  );
}
