// Données de démonstration ARRIVAGE — toutes fictives.
import {
  Laptop, Gamepad2, Smartphone, Shirt, Footprints, Sofa, Car, Hammer,
  ShoppingBasket, Sparkles, Dumbbell, Sailboat, Refrigerator, Puzzle,
} from "lucide-react";

export type CategoryId =
  | "hightech" | "gaming" | "telephonie" | "mode" | "sneakers" | "maison" | "auto"
  | "bricolage" | "alimentation" | "beaute" | "sport" | "nautisme" | "electromenager" | "loisirs";

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
  followersBase: number; joinedAt: string; addressVerified: boolean; stores: string[]; logo?: string;
}

const H_STD = ["Lun–Ven · 8h30 – 18h00", "Samedi · 8h30 – 12h30", "Dimanche · Fermé"];
const H_LONG = ["Lun–Sam · 8h00 – 19h00", "Dimanche · 8h00 – 12h00"];
const H_SHOP = ["Mar–Ven · 9h00 – 18h30", "Samedi · 9h00 – 17h00", "Dim–Lun · Fermé"];

export const MERCHANTS: Merchant[] = [
  { id: "m-pixel", name: "Pixel Lagon", tagline: "High-tech et gaming", description: "Boutique spécialisée en consoles, PC gaming et accessoires. Arrivages hebdomadaires par fret aérien depuis l'Australie et la métropole.", commune: "Nouméa", address: "12 rue fictive des Corsaires, Quartier Latin", hours: H_SHOP, phone: "+687 00 11 24", email: "contact@pixel-lagon.demo", categories: ["gaming", "hightech", "telephonie"], color: "#203C31", ink: "#F5F5F1", shape: "square", plan: "business", status: "active", verified: true, followersBase: 1240, joinedAt: "2026-03-02", addressVerified: false, stores: ["Quartier Latin"] },
  { id: "m-baie", name: "Baie Sneakers", tagline: "Sneakers et streetwear", description: "Sélection de sneakers et de streetwear, éditions limitées et tailles rares. Réservations possibles en boutique.", commune: "Nouméa", address: "4 promenade fictive, Baie-des-Citrons", hours: H_SHOP, phone: "+687 00 22 31", email: "hello@baie-sneakers.demo", categories: ["sneakers", "mode"], color: "#E77938", ink: "#FFFFFF", shape: "round", plan: "premium", status: "active", verified: true, followersBase: 2380, joinedAt: "2026-02-14", addressVerified: false, stores: ["Baie-des-Citrons", "Centre-ville"] },
  { id: "m-comptoir", name: "Comptoir de Tontouta", tagline: "Épicerie fine d'import", description: "Produits importés d'Asie, d'Australie et d'Europe : boissons, snacks, condiments. Arrivage conteneur toutes les trois semaines.", commune: "Païta", address: "Lot fictif 18, zone artisanale", hours: H_LONG, phone: "+687 00 35 02", email: "comptoir@tontouta.demo", categories: ["alimentation"], color: "#6B4E2E", ink: "#F5F5F1", shape: "pill", plan: "starter", status: "active", verified: true, followersBase: 860, joinedAt: "2026-04-21", addressVerified: false, stores: ["Païta"] },
  { id: "m-recif", name: "Récif Nautic", tagline: "Pêche, nautisme et plein air", description: "Tout pour la pêche au large et le bateau : moulinets, cannes, électronique marine et accastillage.", commune: "Nouméa", address: "Quai fictif n°3, Nouville", hours: H_STD, phone: "+687 00 47 18", email: "atelier@recif-nautic.demo", categories: ["nautisme", "sport", "loisirs"], color: "#1F4E5A", ink: "#F5F5F1", shape: "round", plan: "business", status: "active", verified: true, followersBase: 1510, joinedAt: "2026-01-30", addressVerified: false, stores: ["Nouville"] },
  { id: "m-niaouli", name: "Maison Niaouli", tagline: "Mobilier et décoration", description: "Mobilier contemporain, luminaires et linge de maison. Arrivages de mobilier par conteneur tous les deux mois.", commune: "Dumbéa", address: "Centre commercial fictif, Dumbéa-sur-Mer", hours: H_LONG, phone: "+687 00 52 66", email: "bonjour@maison-niaouli.demo", categories: ["maison"], color: "#C9B79C", ink: "#202720", shape: "square", plan: "premium", status: "active", verified: true, followersBase: 1930, joinedAt: "2026-02-03", addressVerified: false, stores: ["Dumbéa-sur-Mer", "Nouméa Magenta"] },
  { id: "m-brousse", name: "Brousse Auto Pièces", tagline: "Pneus et pièces 4x4", description: "Pneumatiques, pièces détachées et équipements 4x4 pour la Brousse. Montage sur place sur rendez-vous.", commune: "Bourail", address: "RT1 fictive, km 162", hours: H_STD, phone: "+687 00 61 09", email: "garage@brousse-auto.demo", categories: ["auto", "bricolage"], color: "#2F2F2A", ink: "#E77938", shape: "square", plan: "starter", status: "active", verified: true, followersBase: 640, joinedAt: "2026-05-11", addressVerified: false, stores: ["Bourail"] },
  { id: "m-kaori", name: "Atelier Kaori", tagline: "Bricolage et outillage", description: "Outillage électroportatif, quincaillerie et matériaux pour particuliers et artisans.", commune: "Mont-Dore", address: "Route fictive de la Coulée", hours: H_LONG, phone: "+687 00 73 40", email: "atelier@kaori.demo", categories: ["bricolage", "maison"], color: "#8A5A2B", ink: "#FFFFFF", shape: "pill", plan: "business", status: "active", verified: true, followersBase: 720, joinedAt: "2026-03-18", addressVerified: false, stores: ["La Coulée"] },
  { id: "m-nord", name: "Fraîcheur du Nord", tagline: "Fruits et légumes", description: "Fruits et légumes de saison, arrivages de fruits importés en petites quantités. Paniers le mercredi.", commune: "Koné", address: "Marché fictif, centre de Koné", hours: ["Mar–Sam · 6h30 – 13h00", "Dim–Lun · Fermé"], phone: "+687 00 81 77", email: "marche@fraicheur-nord.demo", categories: ["alimentation"], color: "#4F6B2E", ink: "#F5F5F1", shape: "round", plan: "free", status: "active", verified: false, followersBase: 410, joinedAt: "2026-07-07", addressVerified: false, stores: ["Koné"] },
  { id: "m-lumiere", name: "Lumière Beauté", tagline: "Cosmétiques et parfums", description: "Soins, maquillage et parfums de marques internationales. Arrivages réguliers depuis la métropole.", commune: "Nouméa", address: "Galerie fictive, rue de Sébastopol", hours: H_SHOP, phone: "+687 00 90 12", email: "boutique@lumiere-beaute.demo", categories: ["beaute"], color: "#7A3B46", ink: "#F5F5F1", shape: "round", plan: "starter", status: "active", verified: true, followersBase: 1120, joinedAt: "2026-04-02", addressVerified: false, stores: ["Centre-ville"] },
  { id: "m-alize", name: "Alizé Sport", tagline: "Sport et running", description: "Running, fitness et sports collectifs. Équipements de musculation à domicile sur commande.", commune: "Dumbéa", address: "Zone fictive de Koutio", hours: H_LONG, phone: "+687 00 14 58", email: "team@alize-sport.demo", categories: ["sport", "sneakers", "mode"], color: "#2E5D4B", ink: "#FFFFFF", shape: "pill", plan: "business", status: "active", verified: true, followersBase: 980, joinedAt: "2026-02-25", addressVerified: false, stores: ["Koutio"] },
  { id: "m-froid", name: "Froid Calédonien", tagline: "Électroménager et climatisation", description: "Climatiseurs, réfrigérateurs et gros électroménager. Installation et SAV assurés par nos techniciens.", commune: "Nouméa", address: "Rue fictive des Entrepreneurs, Ducos", hours: H_STD, phone: "+687 00 26 93", email: "sav@froid-caledonien.demo", categories: ["electromenager", "maison"], color: "#3C5A73", ink: "#FFFFFF", shape: "square", plan: "premium", status: "active", verified: true, followersBase: 1670, joinedAt: "2026-01-12", addressVerified: false, stores: ["Ducos", "Païta"] },
  { id: "m-lifou", name: "Lifou Bazar", tagline: "Bazar et loisirs", description: "Jeux, papeterie, petit électroménager et articles de loisirs. Arrivages par le Betico et la barge.", commune: "Lifou", address: "Centre fictif de Wé", hours: ["Lun–Sam · 7h30 – 17h00", "Dimanche · Fermé"], phone: "+687 00 45 21", email: "bazar@lifou.demo", categories: ["loisirs", "electromenager", "alimentation"], color: "#B4562A", ink: "#FFFFFF", shape: "round", plan: "free", status: "active", verified: false, followersBase: 290, joinedAt: "2026-08-19", addressVerified: false, stores: ["Wé"] },
  { id: "m-koumac", name: "Koumac Électro", tagline: "High-tech dans le Nord", description: "Téléphonie, informatique et audio pour le Grand Nord. Commandes spéciales sous dix jours.", commune: "Koumac", address: "Avenue fictive principale", hours: H_STD, phone: "+687 00 37 84", email: "contact@koumac-electro.demo", categories: ["telephonie", "hightech", "electromenager"], color: "#24344D", ink: "#E77938", shape: "pill", plan: "starter", status: "active", verified: true, followersBase: 350, joinedAt: "2026-06-03", addressVerified: false, stores: ["Koumac"] },
  { id: "m-boulou", name: "Terre de Boulouparis", tagline: "Jardin, élevage et plein air", description: "Matériel de jardin, clôtures et plein air pour la côte Ouest.", commune: "Boulouparis", address: "Route fictive de Tomo", hours: H_STD, phone: "+687 00 58 30", email: "magasin@terre-boulou.demo", categories: ["bricolage", "loisirs", "auto"], color: "#5C6B3A", ink: "#F5F5F1", shape: "square", plan: "free", status: "active", verified: false, followersBase: 180, joinedAt: "2026-09-09", addressVerified: false, stores: ["Boulouparis"] },
];

export const PENDING_MERCHANTS: Merchant[] = [
  { id: "m-vague", name: "Vague Surf Shop", tagline: "Surf, kitesurf et paddle", description: "Planches, wetsuits et accessoires de glisse. Arrivages tous les deux mois depuis l'Australie.", commune: "Nouméa", address: "Rue fictive de l'Anse-Vata", hours: ["Mar–Sam · 9h00 – 18h00"], phone: "+687 00 66 41", email: "contact@vague-surf.demo", categories: ["sport", "nautisme"], color: "#2B6F8A", ink: "#FFFFFF", shape: "round", plan: "starter", status: "pending", verified: false, followersBase: 0, joinedAt: new Date().toISOString().slice(0, 10), addressVerified: false, stores: ["Anse-Vata"], siret: "RIDET 1 234 567.001 (fictif)", contactName: "Gérant (fictif)", appliedAt: new Date(Date.now() - 5 * 3600e3).toISOString(), source: "inscription" },
  { id: "m-epices", name: "Épices du Pacifique", tagline: "Épicerie asiatique", description: "Produits d'Asie du Sud-Est, frais et secs.", commune: "Dumbéa", address: "Centre fictif de Koutio", hours: ["Lun–Sam · 7h30 – 19h00"], phone: "+687 00 71 08", email: "epices@pacifique.demo", categories: ["alimentation"], color: "#9A3B2E", ink: "#FFFFFF", shape: "square", plan: "free", status: "pending", verified: false, followersBase: 0, joinedAt: new Date().toISOString().slice(0, 10), addressVerified: false, stores: ["Koutio"], siret: "RIDET 7 654 321.001 (fictif)", contactName: "Responsable (fictif)", appliedAt: new Date(Date.now() - 26 * 3600e3).toISOString(), source: "inscription" },
  { id: "m-promo", name: "MEGA PROMO 100% ORIGINAL", tagline: "Tout à -70 %", description: "Vente de téléphones et sneakers à prix cassés, livraison partout.", commune: "Païta", address: "Non renseignée", hours: [], phone: "+687 00 00 00", email: "megapromo@demo.invalid", categories: ["telephonie", "sneakers"], color: "#555555", ink: "#FFFFFF", shape: "square", plan: "free", status: "pending", verified: false, followersBase: 0, joinedAt: new Date().toISOString().slice(0, 10), addressVerified: false, stores: ["Païta"], contactName: "—", appliedAt: new Date(Date.now() - 2 * 3600e3).toISOString(), source: "inscription" },
];

export interface Product {
  id: string; name: string; brand: string; category: CategoryId; merchantId: string; price: number;
  status: Status; qty?: number | null; description: string; tags: string[]; arrivedAt: string;
  updatedAt: string; publishedAt: string; createdAt: string; state: "published" | "draft" | "scheduled" | "hidden";
  scheduledAt?: string | null; sponsored: boolean; featured: boolean; images: string[]; store?: string;
  views: number; favBase: number; contacts: number; alertHits: number;
  tryOn?: boolean; // essayable en magasin
}

const now = Date.now();
const h = (hours: number) => new Date(now - hours * 3600e3).toISOString();
const d = (days: number) => h(days * 24);

let seq = 0;
function P(name: string, brand: string, category: CategoryId, merchantId: string, price: number, status: Status, ageH: number, description: string, tags: string[], extra: Partial<Product> = {}): Product {
  seq++;
  const arrivedAt = status === "soon" ? new Date(now + (ageH || 72) * 3600e3).toISOString() : h(ageH + 2);
  const pub = status === "soon" ? h(10 + seq) : h(ageH);
  return {
    id: "p" + String(seq).padStart(3, "0"), name, brand, category, merchantId, price, status, qty: null,
    description, tags, arrivedAt, updatedAt: pub, publishedAt: pub, createdAt: pub, state: "published",
    scheduledAt: null, sponsored: false, featured: false, images: [],
    views: 180 + ((seq * 97) % 900), favBase: 8 + ((seq * 37) % 120), contacts: 4 + ((seq * 13) % 60), alertHits: (seq * 7) % 25,
    ...extra,
  };
}

export const PRODUCTS: Product[] = [
  P("PlayStation 5 Pro", "Sony", "gaming", "m-pixel", 109990, "today", 3, "Console PS5 Pro 2 To, version européenne, garantie boutique 12 mois. Lot de 8 consoles arrivé ce matin par fret aérien.", ["ps5", "console", "sony", "playstation"], { qty: 8, featured: true, views: 2140, favBase: 312 }),
  P("Manette DualSense Edge", "Sony", "gaming", "m-pixel", 26990, "new", 20, "Manette sans fil professionnelle avec palettes arrière et sticks remplaçables.", ["manette", "ps5", "dualsense"]),
  P("Écran gaming 27 pouces QHD 180 Hz", "MSI", "gaming", "m-pixel", 34990, "restock", 30, "Dalle IPS QHD 180 Hz, 1 ms. Retour en stock après trois semaines de rupture.", ["écran", "moniteur", "pc", "gaming"]),
  P("Carte graphique RTX 5060 Ti 16 Go", "Gigabyte", "hightech", "m-pixel", 74990, "limited", 52, "Trois exemplaires seulement. La RTX 5070 est attendue au prochain arrivage.", ["gpu", "nvidia", "rtx", "pc"], { qty: 3 }),
  P("Casque sans fil Arctis Nova 7", "SteelSeries", "gaming", "m-pixel", 24990, "new", 70, "Casque multiplateforme, autonomie 38 h, compatible PS5, PC et Switch.", ["casque", "audio", "gaming"]),
  P("Nintendo Switch 2", "Nintendo", "gaming", "m-pixel", 64990, "soon", 96, "Arrivage prévu par conteneur. Précommande possible en boutique.", ["switch", "console", "nintendo"]),
  P("Samsung Galaxy S25 Ultra 256 Go", "Samsung", "telephonie", "m-koumac", 119990, "today", 5, "Version internationale, double SIM, compatible réseaux OPT. Chargeur non fourni.", ["smartphone", "samsung", "galaxy", "android"], { featured: true }),
  P("iPhone 16 128 Go", "Apple", "telephonie", "m-koumac", 129990, "limited", 40, "Coloris noir et blanc. Quantités limitées sur cet arrivage.", ["iphone", "apple", "smartphone"], { qty: 5 }),
  P("Enceinte Bluetooth étanche Flip 6", "JBL", "hightech", "m-koumac", 19990, "restock", 26, "Étanche IP67, 12 h d'autonomie. Idéale pour l'îlot et le bateau.", ["enceinte", "bluetooth", "audio", "jbl"]),
  P("Ordinateur portable 14 pouces Ryzen 7", "Lenovo", "hightech", "m-koumac", 99990, "new", 98, "16 Go de RAM, SSD 1 To, clavier AZERTY.", ["ordinateur", "portable", "pc", "lenovo"]),
  P("Nike Air Max 95", "Nike", "sneakers", "m-baie", 18990, "today", 2, "Coloris Neon. Tailles disponibles du 39 au 45, la taille 43 part vite.", ["nike", "air max", "basket", "43"], { featured: true, sponsored: true }),
  P("New Balance 9060", "New Balance", "sneakers", "m-baie", 21990, "new", 28, "Coloris Sea Salt. Arrivage de 24 paires.", ["new balance", "basket"]),
  P("Adidas Samba OG", "Adidas", "sneakers", "m-baie", 16990, "restock", 60, "Retour du modèle le plus demandé de la boutique.", ["adidas", "samba", "basket"]),
  P("Veste coupe-vent légère", "Carhartt WIP", "mode", "m-baie", 15990, "new", 80, "Coupe-vent déperlant, parfait pour la saison des alizés.", ["veste", "streetwear", "vêtement"]),
  P("Lunettes de soleil polarisées", "Ray-Ban", "mode", "m-baie", 22990, "limited", 110, "Verres polarisés, étui fourni.", ["lunettes", "accessoire", "soleil"], { qty: 6 }),
  P("Boissons énergisantes importées (pack)", "Red Bull", "alimentation", "m-comptoir", 390, "today", 6, "Éditions saisonnières importées d'Australie. Prix à l'unité, 390 F la canette.", ["red bull", "boisson", "édition limitée", "import"]),
  P("Ramen coréens (assortiment)", "Nongshim", "alimentation", "m-comptoir", 290, "new", 44, "Arrivage conteneur : Shin Ramyun, Chapagetti et éditions épicées.", ["ramen", "nouilles", "corée", "import"]),
  P("Chocolats australiens", "Cadbury", "alimentation", "m-comptoir", 690, "restock", 75, "Tablettes 180 g, plusieurs parfums.", ["chocolat", "australie", "import"]),
  P("Fraises fraîches (barquette 250 g)", "Producteur local", "alimentation", "m-nord", 1290, "today", 4, "Fraises de saison, cueillies hier. Quantités limitées chaque matin.", ["fraises", "fruits", "local"]),
  P("Mangues de saison (le kilo)", "Producteur local", "alimentation", "m-nord", 650, "soon", 48, "Les premières mangues de la saison sont attendues en fin de semaine.", ["mangue", "fruits", "local"]),
  P("Moulinet spinning 8000", "Shimano", "nautisme", "m-recif", 32990, "new", 22, "Moulinet pour la traîne et le jigging au large.", ["pêche", "moulinet", "shimano"]),
  P("Kit pêche au large complet", "Penn", "nautisme", "m-recif", 12990, "today", 8, "Canne 2,10 m, moulinet, tresse et leurres. Prêt à pêcher.", ["pêche", "canne", "kit", "matériel de pêche"]),
  P("Sondeur GPS 7 pouces", "Garmin", "nautisme", "m-recif", 89990, "limited", 90, "Sondeur avec cartographie, sonde traversante incluse.", ["sondeur", "gps", "bateau", "garmin"], { qty: 2 }),
  P("Gilet de sauvetage autogonflant", "Plastimo", "nautisme", "m-recif", 14990, "restock", 130, "Norme 150 N, adulte.", ["sécurité", "bateau", "gilet"]),
  P("Fauteuil contemporain en bouclette", "Maison Niaouli", "maison", "m-niaouli", 39900, "new", 18, "Assise bouclette écrue, piètement chêne massif.", ["fauteuil", "salon", "mobilier"], { featured: true }),
  P("Table basse en teck recyclé", "Maison Niaouli", "maison", "m-niaouli", 54900, "today", 7, "Plateau en teck recyclé, 110 × 60 cm.", ["table", "teck", "mobilier"]),
  P("Suspension en rotin naturel", "Maison Niaouli", "maison", "m-niaouli", 12900, "soon", 120, "Arrivée prévue avec le prochain conteneur de mobilier.", ["luminaire", "rotin", "déco"]),
  P("Pneus 4x4 tout-terrain 265/65 R17", "BFGoodrich", "auto", "m-brousse", 29900, "today", 9, "Pneu All-Terrain KO2. Prix à l'unité, montage sur rendez-vous.", ["pneus", "4x4", "265/65 r17", "pneu"]),
  P("Batterie 12V 95 Ah", "Varta", "auto", "m-brousse", 24900, "restock", 66, "Batterie pour 4x4 et pick-up, garantie 2 ans.", ["batterie", "4x4", "voiture"]),
  P("Perceuse-visseuse sans fil 18V", "Makita", "bricolage", "m-kaori", 21900, "new", 34, "Livrée avec deux batteries et chargeur.", ["perceuse", "outillage", "makita"]),
  P("Groupe électrogène 3 kW", "Honda", "bricolage", "m-kaori", 149900, "limited", 140, "Inverter silencieux, idéal en cas de coupure.", ["groupe électrogène", "énergie"], { qty: 2 }),
  P("Sérum visage à la vitamine C", "La Roche-Posay", "beaute", "m-lumiere", 4990, "new", 24, "Flacon 30 ml.", ["soin", "sérum", "visage"]),
  P("Parfum Eau de Parfum 100 ml", "Dior", "beaute", "m-lumiere", 18990, "out", 200, "Victime de son succès. Prochain arrivage annoncé sous trois semaines.", ["parfum", "dior"]),
  P("Chaussures de running Pegasus 41", "Nike", "sport", "m-alize", 17990, "new", 36, "Pointures du 38 au 46.", ["running", "nike", "chaussures"]),
  P("Kettlebells réglables 2–20 kg", "Domyos", "sport", "m-alize", 16990, "restock", 82, "Le retour des kettlebells réglables.", ["fitness", "musculation"]),
  P("Climatiseur split inverter 12 000 BTU", "Daikin", "electromenager", "m-froid", 89900, "today", 5, "Classe A++, pose possible sous 72 h dans le Grand Nouméa.", ["climatiseur", "clim", "12000 btu", "daikin"], { featured: true, sponsored: true }),
  P("Réfrigérateur américain 600 L", "LG", "electromenager", "m-froid", 249900, "new", 50, "Distributeur d'eau et de glaçons, inox.", ["frigo", "réfrigérateur", "lg"]),
  P("Ventilateur colonne silencieux", "Rowenta", "electromenager", "m-lifou", 9990, "today", 10, "Arrivé par le Betico ce matin.", ["ventilateur", "chaleur"]),
  P("Jeu de société familial (édition FR)", "Asmodee", "loisirs", "m-lifou", 5990, "new", 58, "Plusieurs titres disponibles, de 2 à 6 joueurs.", ["jeu", "société", "famille"]),
  P("Débroussailleuse thermique", "Stihl", "bricolage", "m-boulou", 59900, "new", 100, "Moteur 2 temps, harnais fourni.", ["jardin", "débroussailleuse"]),
];

// Demande locale simulée (agrégée, anonyme)
export interface DemandItem { query: string; category: CategoryId; searches: number; alerts: number; avgBudget: number; communes: Record<string, number>; trend: number }
export const DEMAND: DemandItem[] = [
  { query: "GTA VI PS5", category: "gaming", searches: 215, alerts: 142, avgBudget: 11500, communes: { Nouméa: 118, Dumbéa: 39, Païta: 24, "Mont-Dore": 21, Koné: 13 }, trend: 34 },
  { query: "RTX 5070", category: "hightech", searches: 124, alerts: 61, avgBudget: 98000, communes: { Nouméa: 76, Dumbéa: 18, "Mont-Dore": 14, Païta: 9, Koumac: 7 }, trend: 18 },
  { query: "Nike Air Max taille 43", category: "sneakers", searches: 87, alerts: 44, avgBudget: 19500, communes: { Nouméa: 51, Dumbéa: 17, Païta: 11, Bourail: 8 }, trend: 9 },
  { query: "Climatiseur 12 000 BTU", category: "electromenager", searches: 63, alerts: 29, avgBudget: 92000, communes: { Nouméa: 30, Païta: 13, Dumbéa: 12, Koné: 8 }, trend: 41 },
  { query: "Pneus 265/65 R17", category: "auto", searches: 58, alerts: 33, avgBudget: 30000, communes: { Bourail: 16, Koné: 14, "La Foa": 12, Païta: 9, Poindimié: 7 }, trend: 6 },
  { query: "Red Bull édition limitée", category: "alimentation", searches: 52, alerts: 18, avgBudget: 450, communes: { Nouméa: 31, Dumbéa: 12, Lifou: 9 }, trend: -4 },
  { query: "Nintendo Switch 2", category: "gaming", searches: 49, alerts: 37, avgBudget: 66000, communes: { Nouméa: 26, "Mont-Dore": 10, Dumbéa: 9, Maré: 4 }, trend: 22 },
  { query: "Groupe électrogène", category: "bricolage", searches: 41, alerts: 12, avgBudget: 135000, communes: { "Mont-Dore": 12, Païta: 10, Boulouparis: 9, Ouvéa: 10 }, trend: 15 },
  { query: "Moteur hors-bord 15 CV", category: "nautisme", searches: 38, alerts: 21, avgBudget: 420000, communes: { Nouméa: 14, Lifou: 9, Ouvéa: 8, Poindimié: 7 }, trend: 3 },
  { query: "Glacière 50 L", category: "loisirs", searches: 34, alerts: 9, avgBudget: 18000, communes: { Nouméa: 15, Bourail: 8, Koumac: 6, Maré: 5 }, trend: -2 },
  { query: "iPhone 17", category: "telephonie", searches: 31, alerts: 24, avgBudget: 145000, communes: { Nouméa: 21, Dumbéa: 6, Koné: 4 }, trend: 12 },
  { query: "Fraises", category: "alimentation", searches: 27, alerts: 6, avgBudget: 1400, communes: { Nouméa: 12, Koné: 9, "La Foa": 6 }, trend: 28 },
];

export const USERS = Array.from({ length: 14 }, (_, i) => ({
  id: "u" + (1040 + i * 7),
  label: "Utilisateur #" + (1040 + i * 7),
  commune: COMMUNES[(i * 5) % COMMUNES.length],
  joinedAt: d(20 + i * 9),
  alerts: (i * 3) % 7,
  favorites: (i * 5) % 13,
  status: (i === 9 ? "blocked" : "active") as "active" | "blocked",
}));

export const REPORTS = [
  { id: "r1", productId: "p016", reason: "Prix affiché différent en boutique", at: h(14), status: "open" as const, reporterId: "u1047" },
  { id: "r2", productId: "p033", reason: "Produit indiqué disponible mais épuisé", at: h(30), status: "open" as const, reporterId: "u1061" },
  { id: "r3", productId: "p012", reason: "Photo ne correspondant pas au produit", at: d(3), status: "resolved" as const, reporterId: "u1047" },
];

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
export const TRYON_SEED = new Set(PRODUCTS.filter((p) => p.category === "mode" || p.category === "sneakers" || p.id === "p034").map((p) => p.id));
PRODUCTS.forEach((p) => { p.tryOn = TRYON_SEED.has(p.id); });
