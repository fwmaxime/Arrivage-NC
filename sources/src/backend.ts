import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY } from "./config";

export const sb: SupabaseClient | null = SUPABASE_URL.startsWith("https://")
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "arrivage-auth" } })
  : null;

// Un identifiant sans « @ » (ex. comptes admin) correspond à une adresse interne non routée.
export const ID_DOMAIN = "id.arrivagenc.com";
export const idToEmail = (id: string) => {
  const v = id.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@${ID_DOMAIN}`;
};

// Sérialisation stable (clés triées) pour comparer local et serveur
export function stable(v: any): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return "[" + v.map((x) => (x === undefined ? "null" : stable(x))).join(",") + "]";
  return "{" + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
}

export function authError(msg?: string) {
  const m = (msg || "").toLowerCase();
  if (m.includes("banned")) return "Ce compte a été bloqué par la modération. Écrivez à contact@arrivagenc.com si vous pensez qu'il s'agit d'une erreur.";
  if (m.includes("invalid login")) return "Identifiant ou mot de passe incorrect.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Un compte existe déjà avec cette adresse e-mail.";
  if (m.includes("password") && (m.includes("at least") || m.includes("short") || m.includes("weak"))) return "Mot de passe trop court ou trop simple (8 caractères minimum).";
  if (m.includes("email not confirmed")) return "Confirmez d'abord votre adresse e-mail grâce au lien reçu par mail.";
  if (m.includes("rate limit") || m.includes("too many")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  if (m.includes("invalid") && m.includes("email")) return "Adresse e-mail invalide.";
  if (m.includes("same") && m.includes("password")) return "Le nouveau mot de passe doit être différent de l'ancien.";
  if (m.includes("fetch") || m.includes("network")) return "Connexion au serveur impossible. Vérifiez votre connexion internet.";
  return "Une erreur est survenue. Réessayez.";
}
