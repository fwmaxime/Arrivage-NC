// Comptes employés : rôles et permissions 
export type Role = "owner" | "manager" | "seller";
export type Perm = "posts" | "publish" | "stock" | "reservations" | "reviews" | "stats" | "shop" | "moderation" | "billing" | "team";
export interface Staff {
  id: string; merchantId: string; name: string; email: string; role: Exclude<Role, "owner">;
  status: "invited" | "active"; invitedAt: string; lastActive?: string; stores: string[];
  code?: string;          // code d'invitation à usage unique, donné à l'employé (lien ou e-mail)
  userId?: string | null; // compte ARRIVAGE de l'employé, rempli quand il accepte l'invitation
  joinedAt?: string | null;
}
// Code d'invitation lisible (sans 0/O ni 1/I), ex. « K7P2-9QXM »
export function newInviteCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const r = crypto.getRandomValues(new Uint32Array(8));
  const c = Array.from(r, (x) => A[x % A.length]).join("");
  return c.slice(0, 4) + "-" + c.slice(4);
}
export const ROLES: { id: Role; name: string; short: string; desc: string; perms: Perm[] }[] = [
  { id: "owner", name: "Propriétaire", short: "Accès complet", desc: "Vous. Gère tout, y compris le forfait, la facturation et l'équipe.", perms: ["posts", "publish", "stock", "reservations", "reviews", "stats", "shop", "moderation", "billing", "team"] },
  { id: "manager", name: "Gérant", short: "Gère la boutique au quotidien", desc: "Publie et modifie les produits, importe le catalogue, répond aux avis, modifie la fiche et voit les statistiques. N'a pas accès au forfait ni à l'équipe.", perms: ["posts", "publish", "stock", "reservations", "reviews", "stats", "shop", "moderation"] },
  { id: "seller", name: "Vendeur", short: "Stock au comptoir", desc: "Met à jour le stock et la disponibilité des produits déjà publiés (épuisé, stock limité, réassort). Ne publie pas de nouveaux produits.", perms: ["posts", "stock"] },
];
export const PERM_LABELS: { id: Perm; label: string }[] = [
  { id: "stock", label: "Mettre à jour le stock et le statut des produits" },
  { id: "publish", label: "Publier des produits et importer le catalogue" },
  { id: "reviews", label: "Répondre aux avis clients" },
  { id: "stats", label: "Voir les statistiques et la demande locale" },
  { id: "shop", label: "Modifier la fiche de la boutique" },
  { id: "billing", label: "Changer de forfait et voir la facturation" },
  { id: "team", label: "Inviter ou retirer des membres de l'équipe" },
];
export const roleById = (r: Role) => ROLES.find((x) => x.id === r)!;
export const can = (r: Role, p: Perm) => roleById(r).perms.includes(p);
// Page de l'espace commerçant → permission nécessaire
export const ROUTE_PERM: Record<string, Perm | null> = {
  dashboard: null, theme: null, posts: "posts", publish: "publish", import: "publish", demand: "stats", reservations: "reservations",
  reviews: "reviews", moderation: "moderation", plans: "billing", shop: "shop", team: "team",
};
export const MAX_STAFF = 10;
