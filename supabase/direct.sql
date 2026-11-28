-- Mises à jour en direct (Supabase Realtime) : le site est prévenu dès qu'un commerce, un produit, un avis ou un réglage change.
-- Déjà appliqué le 28/11/2026. À relancer seulement si le projet Supabase est recréé (une erreur « already member » veut dire que c'est déjà fait).
-- Les règles d'accès (RLS) s'appliquent : chaque visiteur n'est prévenu que des lignes qu'il a le droit de lire.
alter publication supabase_realtime add table public.merchants, public.products, public.reviews, public.config;
