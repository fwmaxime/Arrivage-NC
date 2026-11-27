// Mode démonstration : données d'exemple TEMPORAIRES, gardées uniquement dans le navigateur.
// Rien n'est jamais envoyé à Supabase : le mode démo remplace le contexte du magasin par un bac à sable local.
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { CategoryId, Merchant, Product, Status } from "./data";
import { useStore, StoreCtx, State } from "./store";

const H_STD = ["Lun–Ven · 8h30 – 18h00", "Samedi · 8h30 – 12h30", "Dimanche · Fermé"];
const H_LONG = ["Lun–Sam · 8h00 – 19h00", "Dimanche · 8h00 – 12h00"];
const H_SHOP = ["Mar–Ven · 9h00 – 18h30", "Samedi · 9h00 – 17h00", "Dim–Lun · Fermé"];

const MERCHANTS: Merchant[] = [
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

const PRODUCTS: Product[] = [
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


// Identifiants préfixés « demo- » : impossible de les confondre avec de vraies fiches
const DEMO_MERCHANTS: Merchant[] = MERCHANTS.map((m) => ({ ...m, id: "demo-" + m.id }));
const DEMO_PRODUCTS: Product[] = PRODUCTS.map((p) => ({
  ...p, id: "demo-" + p.id, merchantId: "demo-" + p.merchantId,
  tryOn: p.category === "mode" || p.category === "sneakers" || p.id === "p034",
}));
export const isDemoId = (id?: string) => !!id && id.startsWith("demo-");

const KEY = "arrivage-demo";
const readOn = () => {
  try { if (/[?&]demo=1\b/.test(location.search)) return true; return localStorage.getItem(KEY) === "1"; } catch { return false; }
};
interface DemoApi { on: boolean; setOn: (v: boolean) => void }
const DemoCtx = createContext<DemoApi>({ on: false, setOn: () => {} });
export const useDemo = () => useContext(DemoCtx);

// Clés jamais simulées : elles restent celles du vrai compte
const KEEP = ["me", "ready", "users", "settings", "categories"] as const;
const strip = (d: any) => { const o: any = { ...d }; for (const k of KEEP) delete o[k]; return o; };

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const real = useStore();
  const [on, setOnRaw] = useState(readOn);
  const [overlay, setOverlay] = useState<Partial<State> | null>(null);
  const realRef = useRef(real.s); realRef.current = real.s;
  const setOn = (v: boolean) => {
    setOnRaw(v);
    try { v ? localStorage.setItem(KEY, "1") : localStorage.removeItem(KEY); } catch {}
    if (!v) setOverlay(null);
    window.scrollTo({ top: 0 });
  };
  useEffect(() => {
    if (on && !overlay) {
      const s = realRef.current;
      setOverlay(strip({
        ...s, products: structuredClone(DEMO_PRODUCTS), merchants: structuredClone(DEMO_MERCHANTS), reviews: [], reservations: [], reports: [], staff: [],
        favorites: [], follows: [], alerts: [], notifications: [], searchLog: {},
      }));
    }
  }, [on, overlay]);
  const value = useMemo(() => {
    if (!on || !overlay) return real;
    const s = { ...real.s, ...overlay } as State;
    const mutate = (fn: (d: State) => void) => setOverlay((prev) => { const d = structuredClone({ ...realRef.current, ...prev }) as State; fn(d); return strip(d); });
    return { ...real, s, mutate, publish: () => 0, log: () => {}, reload: async () => {} };
  }, [on, overlay, real]);
  return <DemoCtx.Provider value={{ on, setOn }}><StoreCtx.Provider value={value}>{children}</StoreCtx.Provider></DemoCtx.Provider>;
}

export function DemoBanner() {
  const { on, setOn } = useDemo();
  if (!on) return null;
  return (
    <div className="demo-banner" role="status">
      <FlaskConical size={15} />
      <span><b>Mode démonstration.</b> <span className="hide-xs">Commerces et produits d'exemple, fictifs et temporaires. Rien n'est enregistré.</span><span className="show-xs">Exemples fictifs, rien n'est enregistré.</span></span>
      <button onClick={() => setOn(false)}><X size={14} /> Quitter</button>
    </div>
  );
}
