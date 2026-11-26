// Comptes employés : rôles et permissions (données fictives)
export type Role = "owner" | "manager" | "seller";
export type Perm = "posts" | "publish" | "stock" | "reservations" | "reviews" | "stats" | "shop" | "moderation" | "billing" | "team";
export interface Staff {
  id: string; merchantId: string; name: string; email: string; role: Exclude<Role, "owner">;
  status: "invited" | "active"; invitedAt: string; lastActive?: string; stores: string[];
}
export const ROLES: { id: Role; name: string; short: string; desc: string; perms: Perm[] }[] = [
  { id: "owner", name: "Propriétaire", short: "Accès complet", desc: "Vous. Gère tout, y compris le forfait, la facturation et l'équipe.", perms: ["posts", "publish", "stock", "reservations", "reviews", "stats", "shop", "moderation", "billing", "team"] },
  { id: "manager", name: "Gérant", short: "Gère la boutique au quotidien", desc: "Publie et modifie les produits, importe le catalogue, gère les réservations, répond aux avis et voit les statistiques. N'a pas accès au forfait ni à l'équipe.", perms: ["posts", "publish", "stock", "reservations", "reviews", "stats", "shop", "moderation"] },
  { id: "seller", name: "Vendeur", short: "Comptoir et retraits", desc: "Met à jour le stock et prépare les réservations : marque « prête » et valide les retraits avec le code client. Ne publie pas de nouveaux produits.", perms: ["posts", "stock", "reservations"] },
];
export const PERM_LABELS: { id: Perm; label: string }[] = [
  { id: "stock", label: "Mettre à jour le stock et le statut des produits" },
  { id: "reservations", label: "Préparer les réservations et valider les retraits" },
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
const ago = (h: number) => new Date(Date.now() - h * 36e5).toISOString();
export function seedStaff(): Staff[] {
  return [
    { id: "st1", merchantId: "m-baie", name: "Léa Martin", email: "lea.martin@baie-sneakers.demo", role: "manager", status: "active", invitedAt: ago(24 * 40), lastActive: ago(2), stores: ["Baie-des-Citrons", "Centre-ville"] },
    { id: "st2", merchantId: "m-baie", name: "Jordan Kowal", email: "jordan@baie-sneakers.demo", role: "seller", status: "active", invitedAt: ago(24 * 21), lastActive: ago(26), stores: ["Centre-ville"] },
    { id: "st3", merchantId: "m-baie", name: "Inès Lefèvre", email: "ines.lefevre@exemple.demo", role: "seller", status: "invited", invitedAt: ago(5), stores: ["Baie-des-Citrons"] },
    { id: "st4", merchantId: "m-baie", name: "Kenzo Wahio", email: "kenzo@baie-sneakers.demo", role: "seller", status: "active", invitedAt: ago(24 * 60), lastActive: ago(4), stores: ["Baie-des-Citrons"] },
  ];
}
