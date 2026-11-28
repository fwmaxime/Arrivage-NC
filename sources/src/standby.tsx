// Mise en stand-by du site officiel, réservée aux administrateurs.
// Le réglage est enregistré dans la configuration (table config, modifiable seulement par un admin).
// Le site de test (/demo-x7q4/) n'est jamais mis en stand-by.
import React from "react";
import { Mail, PauseCircle, PlayCircle, ShieldCheck, Moon } from "lucide-react";
import { useStore } from "./store";
import { Btn, cx, Wordmark } from "./ui";

export const isTestSite = () => { try { return /\/demo-x7q4(\/|$)/.test(location.pathname); } catch { return false; } };

// Le visiteur doit-il voir la page stand-by ?
export function useStandby() {
  const { s } = useStore();
  if (isTestSite()) return { gate: false, loading: false, on: false };
  const on = !!s.settings.standby;
  return { on, loading: !s.ready, gate: s.ready && on && s.me?.role !== "admin" };
}

export function StandbyPage() {
  const { openAuth } = useStore();
  return (
    <div className="standby">
      <main>
        <div className="standby-badge"><span className="standby-dot" aria-hidden />Bientôt de retour</div>
        <h1 className="standby-logo"><Wordmark size="clamp(56px, 14vw, 128px)" /></h1>
        <p className="standby-slogan">Tout ce qui débarque, au même endroit.</p>
        <p className="standby-text">ARRIVAGE fait une courte pause pour préparer la suite. Le site revient très bientôt. Une question, ou envie de référencer votre commerce&nbsp;? Écrivez-nous.</p>
        <a className="standby-cta" href="mailto:contact@arrivagenc.com"><Mail size={18} /> contact@arrivagenc.com</a>
      </main>
      <footer>© 2026 ARRIVAGE · Nouvelle-Calédonie <button className="standby-admin" onClick={() => openAuth("Connexion réservée à l'équipe ARRIVAGE pendant la pause.", "login")}>Accès équipe</button></footer>
    </div>
  );
}

// Même écran que celui affiché avant le démarrage du site (voir build.sh) : pas de clignotement au lancement de l'appli installée
export const StandbySplash = () => <div className="boot" aria-busy="true"><Wordmark className="boot-logo" size="clamp(52px, 17vw, 96px)" /></div>;

// Bandeau rappel pour les admins pendant le stand-by
export function StandbyAdminBar({ go }: { go?: () => void }) {
  const { s } = useStore();
  if (isTestSite() || !s.settings.standby || s.me?.role !== "admin") return null;
  return <div className="standby-bar"><Moon size={15} /> <span><b>Site en stand-by.</b> Les visiteurs voient la page « Bientôt de retour ». Vous seul(e)s, administrateurs, voyez le site.</span>{go && <button onClick={go}>Gérer</button>}</div>;
}

// Carte de l'espace admin
export function StandbyCard() {
  const { s, mutate, toast, log } = useStore();
  const on = !!s.settings.standby;
  const toggle = () => {
    if (!on && !window.confirm("Mettre le site en stand-by ? Les visiteurs, clients et commerçants verront la page « Bientôt de retour » jusqu'à ce que vous rouvriez le site.")) return;
    mutate((d) => { d.settings = { ...d.settings, standby: !on }; log(d, on ? "Site rouvert au public" : "Site mis en stand-by", "admin"); });
    toast(on ? "Site rouvert au public" : "Site en stand-by : seuls les admins voient le site", on ? "ok" : "info");
  };
  return (
    <section className={cx("standby-card", on && "is-on")}>
      <div className="standby-card-ico">{on ? <PauseCircle size={22} /> : <ShieldCheck size={22} />}</div>
      <div className="standby-card-txt">
        <strong>{on ? "Le site est en stand-by" : "Le site est ouvert au public"}</strong>
        <span>{on ? "Les visiteurs voient « Bientôt de retour ». Les administrateurs continuent de voir et gérer le site. Le site de test reste accessible." : "Mettez le site en pause d'un clic (travaux, problème, préparation) : les visiteurs verront « Bientôt de retour »."}</span>
      </div>
      <Btn variant={on ? "accent" : "outline"} icon={on ? PlayCircle : PauseCircle} onClick={toggle}>{on ? "Rouvrir le site" : "Mettre en stand-by"}</Btn>
    </section>
  );
}
