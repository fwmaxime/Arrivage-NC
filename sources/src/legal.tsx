import React from "react";
import { Scale, ShieldCheck, FileText, Mail } from "lucide-react";
import { useNav } from "./nav";
import { Segmented } from "./ui";

// Identité de l'éditeur, affichée dans les mentions légales.
// À compléter avant publication : nom et prénom des responsables (ou raison sociale),
// statut (particuliers, association, entreprise individuelle…), RIDET s'il existe, adresse postale.
export const EDITOR = {
  name: "",      // ex. « Maxime X et Mathis Y » ou « ARRIVAGE SARL »
  status: "",    // ex. « Projet porté par deux particuliers » ou « Entreprise individuelle, RIDET 1 234 567.001 »
  address: "",   // ex. « BP 123, 98800 Nouméa, Nouvelle-Calédonie »
  director: "",  // directeur de la publication, ex. « Maxime X »
  email: "contact@arrivagenc.com",
};
const UPDATED = "27 novembre 2026";
const todo = (v: string) => v || <em className="muted">en cours d'ajout</em>;

export type LegalTab = "mentions" | "privacy" | "terms";
const TABS: { v: LegalTab; l: string; t: string; i: any }[] = [
  { v: "mentions", l: "Mentions légales", t: "Mentions légales", i: Scale },
  { v: "privacy", l: "Confidentialité", t: "Politique de confidentialité", i: ShieldCheck },
  { v: "terms", l: "Conditions", t: "Conditions générales d'utilisation", i: FileText },
];

export function LegalLinks({ className }: { className?: string }) {
  const { go } = useNav();
  return (
    <span className={className}>
      <button className="link" onClick={() => go("mentions")}>Mentions légales</button>
      <button className="link" onClick={() => go("privacy")}>Confidentialité</button>
      <button className="link" onClick={() => go("terms")}>Conditions d'utilisation</button>
    </span>
  );
}

export function LegalPage({ tab }: { tab: LegalTab }) {
  const { go } = useNav();
  const cur = TABS.find((x) => x.v === tab) || TABS[0];
  return (
    <div className="page narrow legal">
      <h1 className="page-title"><cur.i size={22} /> {cur.t}</h1>
      <Segmented value={cur.v} onChange={(v: LegalTab) => go(v)} options={TABS.map((x) => ({ v: x.v, l: x.l }))} />
      <p className="muted small">Dernière mise à jour : {UPDATED}</p>
      {cur.v === "mentions" ? <Mentions /> : cur.v === "privacy" ? <Privacy /> : <Terms />}
      <p className="legal-contact"><Mail size={15} /> Une question sur ces pages : <a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a></p>
    </div>
  );
}

function Mentions() {
  return (
    <>
      <h2>Éditeur du site</h2>
      <p>Le site arrivagenc.com (« ARRIVAGE ») est édité par :</p>
      <ul>
        <li>Responsables : {todo(EDITOR.name)}</li>
        <li>Statut : {todo(EDITOR.status)}</li>
        <li>Adresse : {todo(EDITOR.address)}</li>
        <li>Contact : <a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a></li>
        <li>Directeur de la publication : {todo(EDITOR.director)}</li>
      </ul>
      <h2>Hébergement</h2>
      <ul>
        <li>Pages du site : GitHub Pages, GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis.</li>
        <li>Comptes et données : Supabase Inc. (supabase.com). Serveurs situés à Sydney (Australie).</li>
        <li>Nom de domaine et messagerie : Cloudflare Inc., 101 Townsend Street, San Francisco, CA 94107, États-Unis.</li>
      </ul>
      <h2>Contenus publiés par les commerçants</h2>
      <p>Les annonces, prix, stocks, photos et horaires sont publiés sous la seule responsabilité des commerçants qui les déclarent. ARRIVAGE ne vend aucun produit et n'intervient pas dans la vente, qui se fait en magasin, directement auprès du commerçant.</p>
      <p>Pour signaler un contenu illicite ou erroné, utilisez le bouton « Signaler » de l'annonce ou écrivez à <a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a>. Nous le retirons rapidement s'il est manifestement illicite.</p>
      <h2>Propriété intellectuelle</h2>
      <p>Le nom ARRIVAGE, le logo et la présentation du site appartiennent à ses éditeurs. Les marques et photos des produits restent la propriété de leurs titulaires.</p>
    </>
  );
}

function Privacy() {
  return (
    <>
      <p>Cette page explique quelles données ARRIVAGE utilise, pourquoi, et comment vous gardez la main dessus. Elle suit la loi Informatique et Libertés du 6 janvier 1978, applicable en Nouvelle-Calédonie.</p>
      <h2>Responsable du traitement</h2>
      <p>Les éditeurs du site (voir les mentions légales), joignables à <a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a>.</p>
      <h2>Ce que nous enregistrons</h2>
      <ul>
        <li><strong>Sans compte</strong> : rien n'est envoyé à nos serveurs vous concernant. Vos favoris, alertes, commune et préférences d'affichage restent dans votre navigateur.</li>
        <li><strong>Avec un compte</strong> : votre e-mail, votre nom affiché, votre mot de passe (chiffré, nous ne le voyons jamais), vos favoris, commerces suivis, alertes, notifications et préférences, pour les retrouver sur tous vos appareils.</li>
        <li><strong>Avis et signalements</strong> : le texte, la note, le nom affiché et la date. Le nom affiché est public sur les avis publiés.</li>
        <li><strong>Commerçants</strong> : les informations de la fiche (nom, adresse, téléphone, e-mail, horaires, logo, photos), les annonces et le forfait. Ces informations sont publiques une fois la fiche validée, sauf le forfait.</li>
        <li><strong>Statistiques</strong> : nombre de vues, de favoris et de contacts par commerce, jour et commune, et les mots recherchés. Ces chiffres sont anonymes : ils ne sont rattachés à aucune personne.</li>
      </ul>
      <h2>Pourquoi</h2>
      <p>Uniquement pour faire fonctionner le service : afficher les arrivages, vous prévenir quand une alerte correspond, permettre aux commerçants de publier et de voir l'intérêt pour leurs produits, et modérer les contenus. Aucune publicité, aucune revente de données, aucun profilage commercial.</p>
      <h2>Cookies et stockage local</h2>
      <p>ARRIVAGE n'utilise aucun cookie publicitaire ni outil de mesure d'audience tiers. Le navigateur garde seulement ce qui est nécessaire au fonctionnement : votre session de connexion, vos préférences et une copie de vos favoris et alertes. Les polices de caractères sont chargées depuis Google Fonts, qui voit votre adresse IP comme pour tout site qui les utilise.</p>
      <h2>Où sont les données et combien de temps</h2>
      <p>Les données des comptes sont stockées chez Supabase, sur des serveurs à Sydney (Australie). Elles sont gardées tant que le compte existe. Quand vous supprimez votre compte, votre profil, vos favoris, alertes, avis et anciennes réservations sont effacés immédiatement ; vos signalements sont conservés sans lien avec vous.</p>
      <h2>Vos droits</h2>
      <ul>
        <li>Consulter et télécharger vos données : page Profil, bouton « Télécharger mes données ».</li>
        <li>Corriger votre nom affiché : page Profil.</li>
        <li>Supprimer votre compte et vos données : page Profil, bouton « Supprimer mon compte ».</li>
        <li>Pour toute autre demande (opposition, limitation, question) : <a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a>. Nous répondons sous un mois.</li>
      </ul>
      <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL (cnil.fr), compétente en Nouvelle-Calédonie.</p>
    </>
  );
}

function Terms() {
  return (
    <>
      <h2>1. Le service</h2>
      <p>ARRIVAGE permet aux commerces de Nouvelle-Calédonie d'annoncer leurs arrivages, réassorts et promotions, et aux habitants de les retrouver, de suivre des commerces et de créer des alertes. Le site est gratuit pour les clients. La consultation ne demande pas de compte.</p>
      <h2>2. Votre compte</h2>
      <p>Un compte sert à retrouver vos favoris et alertes, à laisser un avis et à inscrire un commerce. Vous donnez une adresse e-mail valide et gardez votre mot de passe pour vous. Vous pouvez supprimer votre compte à tout moment depuis la page Profil.</p>
      <h2>3. Prix, stocks et ventes</h2>
      <p>Les prix, quantités et dates sont déclarés par les commerçants et peuvent changer sans préavis. ARRIVAGE ne vend rien, n'encaisse aucun paiement pour les produits et ne garantit ni la disponibilité ni le prix affiché. L'achat se fait en magasin, aux conditions du commerçant.</p>
      <h2>4. Avis</h2>
      <p>Un avis porte sur votre expérience réelle avec le commerce. Un seul avis par compte et par commerce, modifiable. Sont interdits : les propos injurieux, diffamatoires ou discriminatoires, les données personnelles d'autrui, la publicité, les faux avis, et les avis d'un commerçant sur son propre commerce. Les avis peuvent être vérifiés avant publication et retirés s'ils ne respectent pas ces règles.</p>
      <h2>5. Engagements des commerçants</h2>
      <ul>
        <li>Publier uniquement des produits réellement disponibles ou annoncés de bonne foi, avec un prix exact, toutes taxes comprises.</li>
        <li>Mettre à jour le statut (épuisé, réassort) dès que possible.</li>
        <li>Utiliser des photos dont ils détiennent les droits.</li>
        <li>Respecter la réglementation sur les prix, les promotions et les produits vendus en Nouvelle-Calédonie.</li>
        <li>Les comptes employés (forfait Premium) agissent sous la responsabilité du commerce qui les invite.</li>
      </ul>
      <h2>6. Forfaits commerçants</h2>
      <p>L'inscription d'un commerce est gratuite. Les forfaits payants sont activés après une demande validée par l'équipe ARRIVAGE ; le prix, la durée et les modalités de paiement sont confirmés par écrit avant activation. Un forfait peut être arrêté à la fin de la période en cours, sur simple demande à {EDITOR.email}.</p>
      <h2>7. Modération</h2>
      <p>L'équipe ARRIVAGE peut masquer une annonce ou un avis, suspendre un commerce ou bloquer un compte en cas de manquement à ces conditions, de contenu illicite ou de signalements répétés. La personne concernée peut demander des explications à {EDITOR.email}.</p>
      <h2>8. Responsabilité</h2>
      <p>Nous faisons notre possible pour que le site fonctionne en continu, sans pouvoir le garantir. ARRIVAGE n'est pas responsable des contenus publiés par les commerçants ni des transactions faites en magasin.</p>
      <h2>9. Modification et droit applicable</h2>
      <p>Ces conditions peuvent évoluer ; la date de mise à jour figure en haut de la page. Elles sont soumises au droit applicable en Nouvelle-Calédonie. En cas de litige, une solution amiable est recherchée d'abord, en écrivant à {EDITOR.email}.</p>
    </>
  );
}
