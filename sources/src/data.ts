// Référentiels ARRIVAGE (catégories, communes, forfaits) et utilitaires.
import {
  Laptop, Gamepad2, Smartphone, Shirt, Footprints, Sofa, Car, Hammer,
  ShoppingBasket, Sparkles, Dumbbell, Sailboat, Refrigerator, Puzzle, UtensilsCrossed,
} from "lucide-react";
import type { Deal } from "./deals";

export type CategoryId =
  | "hightech" | "gaming" | "telephonie" | "mode" | "sneakers" | "maison" | "auto"
  | "bricolage" | "alimentation" | "beaute" | "sport" | "nautisme" | "electromenager" | "loisirs" | "restauration";

export const CATEGORIES: { id: CategoryId; label: string; icon: any; tint: string }[] = [
  { id: "hightech", label: "High-tech", icon: Laptop, tint: "#DCE3DE" },
  { id: "gaming", label: "Gaming", icon: Gamepad2, tint: "#D9DDE6" },
  { id: "telephonie", label: "Téléphonie", icon: Smartphone, tint: "#E2E0DA" },
  { id: "mode", label: "Mode", icon: Shirt, tint: "#EADFD6" },
  { id: "sneakers", label: "Sneakers", icon: Footprints, tint: "#EFDCCF" },
  { id: "maison", label: "Maison et décoration", icon: Sofa, tint: "#E6E1D3" },
  { id: "auto", label: "Automobile", icon: Car, tint: "#DADDD9" },
  { id: "bricolage", label: "Bricolage", icon: Hammer, tint: "#E8E0CC" },
  { id: "alimentation", label: "Alimentation", icon: ShoppingBasket, tint: "#E4E6D2" },
  { id: "beaute", label: "Beauté", icon: Sparkles, tint: "#EEDDDA" },
  { id: "sport", label: "Sport", icon: Dumbbell, tint: "#D7E2DC" },
  { id: "nautisme", label: "Nautisme", icon: Sailboat, tint: "#D3E1E3" },
  { id: "electromenager", label: "Électroménager", icon: Refrigerator, tint: "#DFE3E3" },
  { id: "loisirs", label: "Loisirs", icon: Puzzle, tint: "#E5DCE3" },
  { id: "restauration", label: "Restaurants", icon: UtensilsCrossed, tint: "#F0DCCB" },
];
export const catById = (id: string) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

export const COMMUNES = [
  "Nouméa", "Dumbéa", "Païta", "Mont-Dore", "Boulouparis", "La Foa", "Bourail",
  "Koné", "Koumac", "Poindimié", "Lifou", "Maré", "Ouvéa",
];

export type Status = "today" | "new" | "restock" | "soon" | "limited" | "out";
export const STATUSES: { id: Status; label: string }[] = [
  { id: "today", label: "Arrivé aujourd'hui" },
  { id: "new", label: "Nouvel arrivage" },
  { id: "restock", label: "Réapprovisionnement" },
  { id: "soon", label: "Bientôt disponible" },
  { id: "limited", label: "Stock limité" },
  { id: "out", label: "Épuisé" },
];
export const statusLabel = (s: string) => STATUSES.find((x) => x.id === s)?.label || s;

// Statuts qui vieillissent tout seuls : « Arrivé aujourd'hui » devient « Arrivé hier », « Arrivé il y a 3 jours »…
// Calculé à l'affichage à partir de la date d'arrivage : rien à faire côté commerçant ni côté serveur.
const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
export const daysSince = (iso: string) => Math.round((dayStart(new Date()) - dayStart(new Date(iso))) / 864e5);
const ago = (n: number) => n <= 0 ? "aujourd'hui" : n === 1 ? "hier" : n < 7 ? `il y a ${n} jours` : n < 30 ? `il y a ${Math.floor(n / 7)} semaine${n >= 14 ? "s" : ""}` : n < 365 ? `il y a ${Math.floor(n / 30)} mois` : "il y a plus d'un an";
// Statut réel du moment (pour les filtres et les couleurs) : un arrivage « du jour » devient « nouvel arrivage » dès le lendemain.
export const liveStatus = (p: { status: Status; arrivedAt: string }): Status => (p.status === "today" && daysSince(p.arrivedAt) >= 1 ? "new" : p.status);
export function statusText(status: string, arrivedAt?: string) {
  if (!arrivedAt || isNaN(+new Date(arrivedAt))) return statusLabel(status);
  const n = daysSince(arrivedAt);
  switch (status) {
    case "today": case "new": return n <= 0 ? "Arrivé aujourd'hui" : "Arrivé " + ago(n);
    case "restock": return n <= 0 ? "Réassort aujourd'hui" : "Réassort " + ago(n);
    case "soon": return n === 0 ? "Arrive aujourd'hui" : n === -1 ? "Arrive demain" : n < 0 ? `Arrive dans ${-n} jours` : "Arrivage annoncé, à confirmer";
    default: return statusLabel(status);
  }
}

export type PlanId = "free" | "starter" | "business" | "premium";
export const PLANS: {
  id: PlanId; name: string; price: number; quota: number | null; tagline: string; features: string[];
  can: { stats: "none" | "basic" | "advanced" | "detailed"; schedule: boolean; sponsored: boolean; demand: boolean; multiStore: boolean; alerts: boolean; team: boolean; bulkImport: boolean };
}[] = [
  { id: "free", name: "Gratuit", price: 0, quota: 2, tagline: "Pour être présent sur ARRIVAGE",
    features: ["Fiche commerçant", "2 publications par mois", "Présence dans les recherches", "Fonctionnalités essentielles"],
    can: { stats: "none", schedule: false, sponsored: false, demand: false, multiStore: false, alerts: false, team: false, bulkImport: false } },
  { id: "starter", name: "Starter", price: 1900, quota: 10, tagline: "Pour les petits commerces réguliers",
    features: ["10 publications par mois", "Statistiques basiques", "Gestion des arrivages", "Fiche commerçant personnalisable"],
    can: { stats: "basic", schedule: false, sponsored: false, demand: false, multiStore: false, alerts: false, team: false, bulkImport: false } },
  { id: "business", name: "Business", price: 4900, quota: null, tagline: "Pour les commerces qui publient chaque semaine",
    features: ["Publications illimitées", "Statistiques avancées", "Programmation des publications", "Alertes produits déclenchées", "Outils professionnels de gestion"],
    can: { stats: "advanced", schedule: true, sponsored: false, demand: false, multiStore: false, alerts: true, team: false, bulkImport: false } },
  { id: "premium", name: "Premium", price: 9900, quota: null, tagline: "Pour les enseignes multi-points de vente",
    features: ["Toutes les fonctionnalités Business", "Publications sponsorisées", "Mises en avant prioritaires identifiées", "Comptes employés (jusqu'à 10)", "Import du catalogue depuis Excel", "Analyse de la demande locale", "Plusieurs points de vente", "Statistiques détaillées", "Personnalisation avancée"],
    can: { stats: "detailed", schedule: true, sponsored: true, demand: true, multiStore: true, alerts: true, team: true, bulkImport: true } },
];
export const planById = (id: string) => PLANS.find((p) => p.id === id) || PLANS[0];

export interface Merchant {
  id: string; name: string; tagline: string; description: string; commune: string; address: string;
  hours: string[]; phone: string; email: string; categories: CategoryId[]; color: string; ink: string;
  shape: "round" | "square" | "pill"; plan: PlanId; status: "active" | "suspended" | "pending" | "rejected"; verified: boolean; siret?: string; contactName?: string; appliedAt?: string; rejectReason?: string; source?: "inscription" | "admin";
  followersBase: number; joinedAt: string; addressVerified: boolean; stores: string[]; logo?: string; ownerId?: string; planRequest?: PlanId | null; planRequestAt?: string | null; planRequestNote?: string | null;
  shopUrl?: string; // boutique en ligne ou page de paiement par défaut du commerçant
}

export interface Product {
  id: string; name: string; brand: string; category: CategoryId; merchantId: string; price: number;
  status: Status; qty?: number | null; description: string; tags: string[]; arrivedAt: string;
  updatedAt: string; publishedAt: string; createdAt: string; state: "published" | "draft" | "scheduled" | "hidden";
  scheduledAt?: string | null; sponsored: boolean; featured: boolean; images: string[]; store?: string;
  views: number; favBase: number; contacts: number; alertHits: number;
  tryOn?: boolean; // essayable en magasin
  buyUrl?: string; // lien d'achat : page de paiement du commerçant (le client paie directement le commerce)
  deal?: Deal | null; // promotion flash ou offre limitée (restaurants : plat du jour, suggestion du week-end…)
}

export interface DemandItem { query: string; category: CategoryId; searches: number; alerts: number; avgBudget: number; communes: Record<string, number>; trend: number }
export const fmtXPF = (n: number) => Math.round(n || 0).toLocaleString("fr-FR").replace(/ | /g, " ") + " F";
export const fmtNum = (n: number) => Math.round(n || 0).toLocaleString("fr-FR");
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
export const fmtDateLong = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
export function fmtRel(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 0) {
    const days = Math.ceil(-diff / 86400);
    return days <= 1 ? "demain" : `dans ${days} j`;
  }
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  return days === 1 ? "hier" : `il y a ${days} j`;
}
export const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Produits d'habillement fictifs essayables en magasin

// Lien d'achat sûr (https uniquement) : celui du produit, sinon celui du commerce
export const safeUrl = (u?: string) => { const x = (u || "").trim(); try { const url = new URL(x); return url.protocol === "https:" ? url.href : ""; } catch { return ""; } };
export const buyLink = (p: { buyUrl?: string; tryOn?: boolean }, m?: { shopUrl?: string }) => p.tryOn ? "" : safeUrl(p.buyUrl) || safeUrl(m?.shopUrl);

// Demandes de changement de forfait en attente (commerces actifs ou suspendus) : listées ici et comptées dans la pastille « Commerçants »
export const planRequests = (list: Merchant[]): Merchant[] => list.filter((m) => m.planRequest && m.planRequest !== m.plan && (m.status === "active" || m.status === "suspended"))
  .sort((a, b) => +new Date(a.planRequestAt || 0) - +new Date(b.planRequestAt || 0));

