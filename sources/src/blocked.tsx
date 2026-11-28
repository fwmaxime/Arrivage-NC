// Comptes bloqués par la modération : accès au site coupé.
// - Le compte est vérifié en continu (toutes les 20 s et à chaque retour sur l'onglet) : dès que l'admin bloque, la personne est déconnectée et ne voit plus que la page « Accès suspendu ».
// - L'appareil garde la trace du blocage : se déconnecter, fermer l'onglet ou se reconnecter avec un autre compte ne rouvre pas le site sur ce navigateur.
// - Côté serveur (supabase/blocage.sql), le compte est banni dans Supabase : il ne peut plus se connecter, ni lire ou écrire avec son compte.
import { Wordmark } from "./ui";
import React from "react";
import { Ban, Mail, LogIn } from "lucide-react";
import { useStore } from "./store";

const KEY = "arrivage-acces-suspendu";
export const blockedDevice = (): string | null => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const markBlockedDevice = (userId: string) => { try { localStorage.setItem(KEY, userId); } catch {} };
export const clearBlockedDevice = () => { try { localStorage.removeItem(KEY); } catch {} };

// Faut-il couper l'accès ? Les administrateurs ne sont jamais bloqués.
export function useBlockGate() {
  const { s } = useStore();
  if (!s.ready) return false;
  const me = s.me;
  if (me?.role === "admin") return false;
  if (me?.blocked) return true;
  const flagged = blockedDevice();
  if (!flagged) return false;
  if (me && me.id === flagged) { clearBlockedDevice(); return false; } // débloqué par l'admin : l'appareil est libéré
  return true;
}

export function BlockedPage() {
  const { openAuth } = useStore();
  return (
    <div className="standby blocked-page">
      <main>
        <div className="standby-badge blocked-badge"><Ban size={14} /> Accès suspendu</div>
        <h1 className="standby-logo"><Wordmark size="clamp(56px, 14vw, 128px)" /></h1>
        <p className="standby-text">Votre compte a été bloqué par la modération d'ARRIVAGE. Vous ne pouvez plus accéder au site. Si vous pensez qu'il s'agit d'une erreur, écrivez-nous.</p>
        <a className="standby-cta" href="mailto:contact@arrivagenc.com"><Mail size={18} /> contact@arrivagenc.com</a>
      </main>
      <footer>© 2026 ARRIVAGE · Nouvelle-Calédonie <button className="standby-admin" onClick={() => openAuth("Si votre compte a été débloqué, reconnectez-vous pour retrouver l'accès.", "login")}><LogIn size={13} /> Mon compte a été débloqué</button></footer>
    </div>
  );
}
