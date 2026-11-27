import React, { useEffect, useState } from "react";
import { LogIn, UserPlus, Mail, KeyRound, Check, Info, LogOut, ShieldCheck, Store, Eye, EyeOff } from "lucide-react";
import { useStore } from "./store";
import { useNav } from "./nav";
import { Btn, Modal, Field, Segmented, Logo } from "./ui";

function Password({ id, value, onChange, auto, placeholder }: { id: string; value: string; onChange: (v: string) => void; auto: string; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="pw-wrap">
      <input id={id} type={show ? "text" : "password"} autoComplete={auto} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <button type="button" className="pw-eye" onClick={() => setShow(!show)} aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
    </span>
  );
}

// Fenêtre de connexion / inscription, ouverte depuis n'importe où (openAuth)
export function AuthModal() {
  const { auth, closeAuth, signIn, signUp, resetPassword, updatePassword, online, toast } = useStore();
  const [tab, setTab] = useState<string>("login");
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");
  useEffect(() => { if (auth) { setTab(auth.tab || "login"); setErr(""); setInfo(""); setPw(""); setPw2(""); } }, [auth]);
  if (!auth) return null;

  const run = async (fn: () => Promise<string | null | void>) => { setBusy(true); setErr(""); try { const e = await fn(); if (e) setErr(e); } finally { setBusy(false); } };
  const login = (e: React.FormEvent) => { e.preventDefault(); if (!id.trim() || !pw) return setErr("Saisissez votre identifiant ou e-mail et votre mot de passe."); run(() => signIn(id, pw)); };
  const signup = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setErr("Indiquez votre prénom ou un nom d'affichage.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(id.trim())) return setErr("Adresse e-mail invalide.");
    if (pw.length < 8) return setErr("Mot de passe trop court (8 caractères minimum).");
    run(async () => { const r = await signUp(id, pw, name); if (r.confirm) setInfo("Compte créé. Ouvrez le lien reçu par e-mail pour l'activer, puis connectez-vous."); return r.error; });
  };
  const forgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(id.trim())) return setErr("Saisissez l'adresse e-mail de votre compte.");
    run(async () => { const r = await resetPassword(id); if (!r) setInfo("Si un compte existe avec cette adresse, un lien pour choisir un nouveau mot de passe vient d'être envoyé."); return r; });
  };
  const reset = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setErr("Mot de passe trop court (8 caractères minimum).");
    if (pw !== pw2) return setErr("Les deux mots de passe ne correspondent pas.");
    run(async () => { const r = await updatePassword(pw); if (!r) { toast("Mot de passe modifié"); closeAuth(); } return r; });
  };

  const title = tab === "signup" ? "Créer un compte" : tab === "forgot" ? "Mot de passe oublié" : tab === "reset" ? "Nouveau mot de passe" : "Se connecter";
  return (
    <Modal open onClose={closeAuth} title={title}>
      <div className="auth">
        {auth.reason && <p className="auth-reason"><Info size={15} /> {auth.reason}</p>}
        {!online && <p className="banner-warn"><Info size={15} /> La connexion aux comptes n'est pas encore disponible.</p>}
        {(tab === "login" || tab === "signup") && <Segmented value={tab} onChange={(v) => { setTab(v); setErr(""); setInfo(""); }} options={[{ v: "login", l: "Connexion" }, { v: "signup", l: "Inscription" }]} />}
        {info ? (
          <div className="auth-info"><Check size={18} /><span>{info}</span></div>
        ) : tab === "login" ? (
          <form className="form" onSubmit={login} noValidate>
            <Field label="E-mail ou identifiant" htmlFor="au-id"><input id="au-id" autoComplete="username" autoCapitalize="none" value={id} onChange={(e) => setId(e.target.value)} /></Field>
            <Field label="Mot de passe" htmlFor="au-pw"><Password id="au-pw" value={pw} onChange={setPw} auto="current-password" /></Field>
            {err && <p className="field-err">{err}</p>}
            <Btn type="submit" icon={LogIn} disabled={busy || !online} className="w-full">{busy ? "Connexion…" : "Se connecter"}</Btn>
            <button type="button" className="link small" onClick={() => { setTab("forgot"); setErr(""); }}>Mot de passe oublié ?</button>
          </form>
        ) : tab === "signup" ? (
          <form className="form" onSubmit={signup} noValidate>
            <Field label="Prénom ou nom affiché" htmlFor="au-name"><input id="au-name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} /></Field>
            <Field label="E-mail" htmlFor="au-mail"><input id="au-mail" type="email" autoComplete="email" autoCapitalize="none" value={id} onChange={(e) => setId(e.target.value)} /></Field>
            <Field label="Mot de passe" hint="8 caractères minimum" htmlFor="au-npw"><Password id="au-npw" value={pw} onChange={setPw} auto="new-password" /></Field>
            {err && <p className="field-err">{err}</p>}
            <Btn type="submit" icon={UserPlus} disabled={busy || !online} className="w-full">{busy ? "Création…" : "Créer mon compte"}</Btn>
            <p className="muted small" style={{ margin: 0 }}>Le compte est gratuit. Il sert à inscrire votre commerce et à retrouver vos favoris et alertes sur tous vos appareils.</p>
          </form>
        ) : tab === "forgot" ? (
          <form className="form" onSubmit={forgot} noValidate>
            <Field label="E-mail du compte" htmlFor="au-fmail"><input id="au-fmail" type="email" autoComplete="email" autoCapitalize="none" value={id} onChange={(e) => setId(e.target.value)} /></Field>
            {err && <p className="field-err">{err}</p>}
            <Btn type="submit" icon={Mail} disabled={busy || !online} className="w-full">Recevoir un lien</Btn>
            <button type="button" className="link small" onClick={() => { setTab("login"); setErr(""); }}>Retour à la connexion</button>
          </form>
        ) : (
          <form className="form" onSubmit={reset} noValidate>
            <Field label="Nouveau mot de passe" hint="8 caractères minimum" htmlFor="au-rpw"><Password id="au-rpw" value={pw} onChange={setPw} auto="new-password" /></Field>
            <Field label="Confirmer" htmlFor="au-rpw2"><Password id="au-rpw2" value={pw2} onChange={setPw2} auto="new-password" /></Field>
            {err && <p className="field-err">{err}</p>}
            <Btn type="submit" icon={KeyRound} disabled={busy} className="w-full">Enregistrer</Btn>
          </form>
        )}
      </div>
    </Modal>
  );
}

// Bloc « Mon compte » de la page Profil
export function AccountSection() {
  const { s, openAuth, signOut, updatePassword, updateName, toast } = useStore();
  const { setMode } = useNav();
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [name, setName] = useState(s.me?.displayName || "");
  useEffect(() => setName(s.me?.displayName || ""), [s.me?.displayName]);
  const me = s.me;
  if (!me) return (
    <div className="side-card account-card">
      <div className="row"><span className="avatar"><Logo size={14} /></span><div><strong>Vous naviguez sans compte</strong><div className="muted small">Favoris et alertes restent sur cet appareil. Un compte gratuit est nécessaire pour inscrire un commerce.</div></div></div>
      <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}><Btn icon={LogIn} onClick={() => openAuth()}>Se connecter</Btn><Btn variant="outline" icon={UserPlus} onClick={() => openAuth(undefined, "signup")}>Créer un compte</Btn></div>
    </div>
  );
  const roleLabel = me.role === "admin" ? "Administrateur" : me.role === "merchant" ? "Commerçant" : "Client";
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setErr("Mot de passe trop court (8 caractères minimum).");
    if (pw !== pw2) return setErr("Les deux mots de passe ne correspondent pas.");
    setBusy(true); const r = await updatePassword(pw); setBusy(false);
    if (r) return setErr(r);
    toast("Mot de passe modifié"); setPwOpen(false); setPw(""); setPw2(""); setErr("");
  };
  return (
    <div className="side-card account-card">
      <div className="row"><span className="avatar">{(me.displayName || "?").slice(0, 1).toUpperCase()}</span><div style={{ minWidth: 0 }}><strong>{me.displayName}</strong><div className="muted small sel">{me.username ? `Identifiant : ${me.username}` : me.email} · {roleLabel}</div></div></div>
      {me.blocked && <p className="banner-warn" style={{ marginTop: 12 }}><Info size={15} /> Votre compte a été bloqué par la modération.</p>}
      <form className="row" style={{ marginTop: 12, flexWrap: "wrap", alignItems: "flex-end" }} onSubmit={async (e) => { e.preventDefault(); if (name.trim().length < 2) return; const r = await updateName(name); toast(r || "Nom mis à jour", r ? "warn" : "ok"); }}>
        <Field label="Nom affiché" htmlFor="ac-name"><input id="ac-name" value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} /></Field>
        {name.trim() !== me.displayName && <Btn type="submit" size="sm" variant="outline">Enregistrer</Btn>}
      </form>
      <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}>
        {me.role === "admin" && <Btn size="sm" icon={ShieldCheck} onClick={() => setMode("admin")}>Espace admin</Btn>}
        {(me.role === "merchant" || me.role === "admin") && <Btn size="sm" variant="outline" icon={Store} onClick={() => setMode("merchant")}>Espace commerçant</Btn>}
        <Btn size="sm" variant="outline" icon={KeyRound} onClick={() => setPwOpen(true)}>Changer le mot de passe</Btn>
        <Btn size="sm" variant="ghost" icon={LogOut} onClick={() => signOut()}>Se déconnecter</Btn>
      </div>
      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Changer le mot de passe">
        <form className="form" onSubmit={save} noValidate>
          <Field label="Nouveau mot de passe" hint="8 caractères minimum" htmlFor="ac-pw"><Password id="ac-pw" value={pw} onChange={setPw} auto="new-password" /></Field>
          <Field label="Confirmer" htmlFor="ac-pw2"><Password id="ac-pw2" value={pw2} onChange={setPw2} auto="new-password" /></Field>
          {err && <p className="field-err">{err}</p>}
          <div className="row-end"><Btn variant="ghost" onClick={() => setPwOpen(false)}>Annuler</Btn><Btn type="submit" icon={Check} disabled={busy}>Enregistrer</Btn></div>
        </form>
      </Modal>
    </div>
  );
}

// Écran affiché quand un espace demande un compte
export function NeedAccount({ title, body }: { title: string; body: string }) {
  const { openAuth } = useStore();
  return (
    <div className="page narrow">
      <div className="panel signup-done">
        <span className="empty-ico"><LogIn size={22} /></span>
        <h1 className="page-title">{title}</h1>
        <p className="muted">{body}</p>
        <div className="row-center" style={{ flexWrap: "wrap" }}><Btn icon={LogIn} onClick={() => openAuth()}>Se connecter</Btn><Btn variant="outline" icon={UserPlus} onClick={() => openAuth(undefined, "signup")}>Créer un compte</Btn></div>
      </div>
    </div>
  );
}
