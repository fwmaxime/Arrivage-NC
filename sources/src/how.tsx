// Expliquer le concept : bandeau « Comment ça marche » sur l'accueil (refermable) et page complète #/comment-ca-marche (clients + commerçants + questions fréquentes).
import React, { useState } from "react";
import { Search, BellRing, ShoppingBag, Store, Megaphone, BarChart3, X, ChevronRight, HelpCircle, MapPin, UserPlus, Sparkles } from "lucide-react";
import { useStore } from "./store";
import { useNav } from "./nav";
import { Btn, cx } from "./ui";
import { PLANS, fmtXPF } from "./data";

const KEY = "arrivage-how-vu";
const seen = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };

const CLIENT_STEPS = [
  { i: Search, t: "Cherchez", d: "Un produit, une marque ou un commerce. ARRIVAGE vous montre qui l'a, où, et à quel prix." },
  { i: BellRing, t: "Créez une alerte", d: "Introuvable aujourd'hui ? Vous êtes prévenu dès qu'un commerce le publie." },
  { i: ShoppingBag, t: "Achetez", d: "En ligne, directement chez le commerçant quand il le propose, ou en passant en magasin." },
];
const PRO_STEPS = [
  { i: Megaphone, t: "Publiez vos arrivages", d: "En une minute, depuis votre téléphone : photo, prix, stock." },
  { i: BellRing, t: "Touchez les bons clients", d: "Ceux qui ont créé une alerte sont prévenus dès votre publication." },
  { i: BarChart3, t: "Suivez la demande", d: "Vues, favoris, contacts et ce que cherchent les Calédoniens près de chez vous." },
];

function Steps({ list }: { list: typeof CLIENT_STEPS }) {
  return <ol className="how-steps">{list.map((x, n) => <li key={x.t}><span className="how-ico"><x.i size={20} /></span><div><strong><em>{n + 1}.</em> {x.t}</strong><p>{x.d}</p></div></li>)}</ol>;
}

// Bandeau d'accueil : visible tant que le visiteur ne l'a pas refermé
export function HowBand() {
  const { s, openAuth } = useStore();
  const { go } = useNav();
  const [hide, setHide] = useState(seen);
  if (hide) return null;
  const close = () => { try { localStorage.setItem(KEY, "1"); } catch {} setHide(true); };
  return (
    <section className="sec how-band" aria-label="Comment ça marche">
      <button className="how-close" onClick={close} aria-label="Masquer"><X size={18} /></button>
      <div className="how-band-head">
        <span className="eyebrow">Nouveau ici ?</span>
        <h2>Tout ce qui débarque en Calédonie, au même endroit.</h2>
        <p>Les commerces publient ce qui vient d'arriver. Vous savez où trouver ce que vous cherchez, sans faire le tour des magasins ni des pages Facebook.</p>
      </div>
      <Steps list={CLIENT_STEPS} />
      <div className="how-band-foot">
        {!s.me && <Btn variant="accent" icon={UserPlus} onClick={() => openAuth(undefined, "signup")}>Créer un compte gratuit</Btn>}
        <Btn variant="outline" icon={Store} onClick={() => go("signup")}>Je suis commerçant</Btn>
        <button className="link" onClick={() => go("how")}>En savoir plus <ChevronRight size={15} /></button>
      </div>
    </section>
  );
}

const FAQ_CLIENT = [
  ["C'est payant pour les clients ?", "Non. Chercher, créer des alertes, suivre des commerces et enregistrer des favoris est gratuit. Un compte gratuit permet de retrouver tout cela sur tous vos appareils."],
  ["Comment j'achète un produit ?", "Si le commerçant propose le paiement en ligne, le bouton « Acheter » vous emmène sur sa page de paiement : vous payez directement le commerce. Sinon, contactez-le ou passez en magasin."],
  ["ARRIVAGE prend une commission sur mes achats ?", "Non. ARRIVAGE ne touche pas l'argent : vous payez le commerçant directement, au même prix qu'en boutique."],
  ["Les prix et les stocks sont-ils fiables ?", "Ils sont déclarés par les commerçants, avec la date de mise à jour. En cas d'erreur, le bouton « Signaler » prévient notre équipe de modération."],
  ["Existe-t-il une application ?", "L'application officielle arrive. En attendant, vous pouvez installer ARRIVAGE sur l'écran d'accueil de votre téléphone : sur iPhone, dans Safari, touchez Partager puis « Sur l'écran d'accueil » ; sur Android, dans Chrome, menu ⋮ puis « Installer l'application ». Le lien « Installer l'appli sur mon téléphone » en bas de page vous guide."],
  ["Comment marchent les alertes ?", "Indiquez ce que vous cherchez (produit, marque, budget, commune). Dès qu'un commerce publie un produit qui correspond, vous recevez une notification."],
];
const FAQ_PRO = [
  ["Combien ça coûte ?", `Une formule gratuite pour démarrer, puis des abonnements mensuels à partir de ${fmtXPF(Math.min(...PLANS.filter((p) => p.price > 0).map((p) => p.price)))} pour publier plus et accéder aux statistiques. Aucune commission sur vos ventes.`],
  ["Comment je reçois les paiements ?", "Vous collez le lien de votre page de paiement (banque, Stripe, PayPal, boutique en ligne) dans votre fiche. Les clients paient directement chez vous."],
  ["Combien de temps pour publier ?", "Une minute : nom, prix, photo, stock. Les grandes enseignes peuvent aussi importer leur catalogue depuis Excel."],
  ["Qui voit mes publications ?", "Tous les visiteurs, et surtout les clients qui ont créé une alerte correspondante ou qui suivent votre commerce : ils sont prévenus tout de suite."],
];

function Faq({ list }: { list: string[][] }) {
  return <div className="how-faq">{list.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>;
}

export function HowPage() {
  const { s, openAuth } = useStore();
  const { go } = useNav();
  const [tab, setTab] = useState<"client" | "pro">("client");
  return (
    <div className="page narrow how-page">
      <section className="how-hero">
        <span className="eyebrow"><Sparkles size={14} /> Comment ça marche</span>
        <h1>Sachez ce qui vient d'arriver dans les commerces du Caillou.</h1>
        <p>En Nouvelle-Calédonie, les produits arrivent par bateau ou par avion, souvent en petites quantités, et partent vite. ARRIVAGE rassemble les arrivages des commerces de tout le territoire pour que vous trouviez au bon endroit, au bon moment.</p>
      </section>
      <div className="seg how-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "client"} className={cx(tab === "client" && "is-on")} onClick={() => setTab("client")}><MapPin size={15} /> Je cherche</button>
        <button role="tab" aria-selected={tab === "pro"} className={cx(tab === "pro" && "is-on")} onClick={() => setTab("pro")}><Store size={15} /> Je suis commerçant</button>
      </div>
      {tab === "client" ? (
        <>
          <Steps list={CLIENT_STEPS} />
          <div className="how-cta">
            <Btn variant="accent" icon={Search} onClick={() => go("explore", {})}>Explorer les arrivages</Btn>
            <Btn variant="outline" icon={BellRing} onClick={() => go("alerts", { create: {} })}>Créer une alerte</Btn>
            {!s.me && <Btn variant="ghost" icon={UserPlus} onClick={() => openAuth(undefined, "signup")}>Créer un compte gratuit</Btn>}
          </div>
          <h2 className="how-h2"><HelpCircle size={18} /> Questions fréquentes</h2>
          <Faq list={FAQ_CLIENT} />
        </>
      ) : (
        <>
          <Steps list={PRO_STEPS} />
          <div className="how-cta">
            <Btn variant="accent" icon={Store} onClick={() => go("signup")}>Inscrire mon commerce</Btn>
            <a className="btn btn-outline btn-md" href="mailto:contact@arrivagenc.com?subject=Commerce%20sur%20ARRIVAGE">Nous écrire</a>
          </div>
          <h2 className="how-h2"><HelpCircle size={18} /> Questions fréquentes</h2>
          <Faq list={FAQ_PRO} />
        </>
      )}
      <p className="muted small how-contact">Une autre question ? <a href="mailto:contact@arrivagenc.com">contact@arrivagenc.com</a></p>
    </div>
  );
}
