// Installer ARRIVAGE sur l'écran d'accueil du téléphone (application web installable), en attendant l'appli officielle.
// - Android (Chrome, Edge, Samsung Internet) : le bouton « Installer » ouvre la fenêtre d'installation du téléphone.
// - iPhone / iPad : Apple ne permet pas d'installer d'un bouton ; on explique « Partager > Sur l'écran d'accueil ».
// - Navigateur intégré de Facebook, Instagram, Messenger… : il faut d'abord ouvrir la page dans Safari ou Chrome.
// L'invitation est discrète : sur mobile seulement, après 30 s sur le site ou dès la 2e visite, et elle ne revient pas avant 30 jours si on la ferme.
import React, { useEffect, useState } from "react";
import { Share, SquarePlus, EllipsisVertical, Ellipsis, X, Smartphone, Download, Compass, CheckCircle2 } from "lucide-react";
import { useStore } from "./store";
import { Btn, Modal, cx } from "./ui";

type Platform = "ios" | "android" | "desktop";

const UA = typeof navigator !== "undefined" ? navigator.userAgent : "";
const IS_IOS = /iPhone|iPad|iPod/.test(UA) || (typeof navigator !== "undefined" && navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
const IS_ANDROID = /Android/i.test(UA);
// Navigateurs intégrés aux applis (on ne peut pas y installer de site)
const IN_APP = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|MicroMessenger|Line\/|Snapchat|TikTok|musical_ly|LinkedInApp/i.test(UA);
const IOS_OTHER = IS_IOS && /CriOS|FxiOS|EdgiOS/.test(UA); // Chrome, Firefox, Edge sur iPhone

const platform = (): Platform => (IS_IOS ? "ios" : IS_ANDROID ? "android" : "desktop");
export const isStandalone = () => {
  try { return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true; } catch { return false; }
};

const HIDE_KEY = "arr.install.hide";
const VISITS_KEY = "arr.visits";
const hiddenUntil = () => { try { return Number(localStorage.getItem(HIDE_KEY) || 0); } catch { return 0; } };

// L'événement d'installation d'Android peut arriver avant le démarrage de l'application : on l'écoute dès le chargement.
let deferred: any = null;
const subs = new Set<() => void>();
const ping = () => subs.forEach((f) => f());
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: any) => { e.preventDefault(); deferred = e; ping(); });
  window.addEventListener("appinstalled", () => { deferred = null; try { localStorage.setItem(HIDE_KEY, String(Date.now() + 3650 * 864e5)); } catch {} ping(); });
}

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((n) => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return {
    standalone: isStandalone(),
    platform: platform(),
    inApp: IN_APP,
    canPrompt: !!deferred,
    // Ouvre la fenêtre d'installation d'Android. Renvoie true si la personne a accepté.
    prompt: async () => {
      const e = deferred; if (!e) return false;
      deferred = null; ping();
      try { e.prompt(); const r = await e.userChoice; return r?.outcome === "accepted"; } catch { return false; }
    },
  };
}

// Compte les visites (une par session de navigation)
function countVisit() {
  try {
    if (sessionStorage.getItem(VISITS_KEY)) return Number(localStorage.getItem(VISITS_KEY) || 1);
    sessionStorage.setItem(VISITS_KEY, "1");
    const n = Number(localStorage.getItem(VISITS_KEY) || 0) + 1;
    localStorage.setItem(VISITS_KEY, String(n));
    return n;
  } catch { return 1; }
}

// Petite carte en bas de l'écran (mobile)
export function InstallBanner() {
  const inst = useInstall();
  const { toast } = useStore();
  const [show, setShow] = useState(false);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    if (inst.standalone || inst.platform === "desktop" || hiddenUntil() > Date.now()) return;
    if (countVisit() >= 2) { const t = setTimeout(() => setShow(true), 4000); return () => clearTimeout(t); }
    const t = setTimeout(() => setShow(true), 30000);
    return () => clearTimeout(t);
  }, []);
  if (!show || inst.standalone) return null;
  const close = (days = 30) => { try { localStorage.setItem(HIDE_KEY, String(Date.now() + days * 864e5)); } catch {} setShow(false); };
  const install = async () => {
    if (inst.canPrompt) { if (await inst.prompt()) { toast("ARRIVAGE est installé sur votre téléphone"); close(3650); } return; }
    setHelp(true);
  };
  return (
    <>
      <aside className="install-card" role="complementary" aria-label="Installer ARRIVAGE">
        <img src="/icons/icon-192.png" alt="" width={44} height={44} />
        <div className="install-card-txt">
          <strong>ARRIVAGE en appli</strong>
          <span>Sur votre écran d'accueil, gratuit.</span>
        </div>
        <Btn size="sm" variant="accent" onClick={install}>Installer</Btn>
        <button className="install-card-x" onClick={() => close()} aria-label="Plus tard"><X size={17} /></button>
      </aside>
      <InstallHelp open={help} onClose={() => setHelp(false)} />
    </>
  );
}

// Lien permanent (pied de page, page « Comment ça marche »)
export function InstallLink({ className }: { className?: string }) {
  const inst = useInstall();
  const { toast } = useStore();
  const [help, setHelp] = useState(false);
  if (inst.standalone) return null;
  const click = async () => {
    if (inst.canPrompt) { if (await inst.prompt()) toast("ARRIVAGE est installé sur votre téléphone"); return; }
    setHelp(true);
  };
  return (
    <>
      <button className={cx("link", className)} onClick={click}><Smartphone size={14} /> Installer l'appli sur mon téléphone</button>
      <InstallHelp open={help} onClose={() => setHelp(false)} />
    </>
  );
}

// Fenêtre d'explication, avec un onglet iPhone et un onglet Android
export function InstallHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inst = useInstall();
  const { toast } = useStore();
  const [tab, setTab] = useState<"ios" | "android">(inst.platform === "android" ? "android" : "ios");
  const copy = async () => {
    try { await navigator.clipboard.writeText(location.origin + location.pathname); toast("Lien copié : collez-le dans Safari ou Chrome"); } catch { toast("Adresse : " + location.host, "info"); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Installer ARRIVAGE">
      <div className="install-help">
        <div className="install-hero">
          <img src="/icons/icon-192.png" alt="" width={56} height={56} />
          <p>Ajoutez ARRIVAGE à l'écran d'accueil : il s'ouvre en plein écran, comme une appli, sans passer par l'App Store ni le Play Store.</p>
        </div>
        {inst.inApp && (
          <div className="install-warn">
            <Compass size={18} />
            <div>
              <strong>Ouvrez d'abord la page dans {inst.platform === "ios" ? "Safari" : "Chrome"}.</strong>
              <span>Vous êtes dans le navigateur de Facebook, Instagram ou Messenger, qui ne permet pas l'installation. Touchez le menu <Ellipsis size={14} className="inl" /> puis « Ouvrir dans {inst.platform === "ios" ? "Safari" : "le navigateur"} ».</span>
              <button className="link" onClick={copy}>Ou copier le lien du site</button>
            </div>
          </div>
        )}
        <div className="install-tabs" role="tablist">
          <button role="tab" aria-selected={tab === "ios"} className={cx(tab === "ios" && "is-on")} onClick={() => setTab("ios")}>iPhone, iPad</button>
          <button role="tab" aria-selected={tab === "android"} className={cx(tab === "android" && "is-on")} onClick={() => setTab("android")}>Android</button>
        </div>
        {tab === "ios" ? (
          <ol className="install-steps">
            <li><span className="n">1</span><span>Ouvrez <b>arrivagenc.com</b> dans <b>Safari</b>{IOS_OTHER ? " (ou restez dans Chrome : le bouton Partager est en haut à droite)" : ""}.</span></li>
            <li><span className="n">2</span><span>Touchez le bouton <b>Partager</b> <Share size={15} className="inl" />. Sur les iPhone récents, il est dans le menu <Ellipsis size={15} className="inl" /> en bas à droite.</span></li>
            <li><span className="n">3</span><span>Faites défiler et touchez <b>Sur l'écran d'accueil</b> <SquarePlus size={15} className="inl" />.</span></li>
            <li><span className="n">4</span><span>Touchez <b>Ajouter</b>. L'icône ARRIVAGE apparaît avec vos applis.</span></li>
          </ol>
        ) : inst.canPrompt ? (
          <div className="install-now">
            <p>Votre téléphone permet l'installation en un geste.</p>
            <Btn variant="accent" icon={Download} onClick={async () => { if (await inst.prompt()) { toast("ARRIVAGE est installé sur votre téléphone"); onClose(); } }}>Installer maintenant</Btn>
          </div>
        ) : (
          <ol className="install-steps">
            <li><span className="n">1</span><span>Ouvrez <b>arrivagenc.com</b> dans <b>Chrome</b> (ou Samsung Internet).</span></li>
            <li><span className="n">2</span><span>Touchez le menu <EllipsisVertical size={15} className="inl" /> en haut à droite (≡ en bas sur Samsung Internet).</span></li>
            <li><span className="n">3</span><span>Touchez <b>Installer l'application</b> ou <b>Ajouter à l'écran d'accueil</b>.</span></li>
            <li><span className="n">4</span><span>Confirmez avec <b>Installer</b>. L'icône ARRIVAGE apparaît avec vos applis.</span></li>
          </ol>
        )}
        {inst.standalone && <p className="install-ok"><CheckCircle2 size={16} /> ARRIVAGE est déjà installé sur cet appareil.</p>}
        <p className="muted small">Gratuit et sans téléchargement depuis un store. Pour l'enlever, supprimez l'icône comme une autre appli. Vos favoris et alertes restent liés à votre compte.</p>
      </div>
    </Modal>
  );
}
