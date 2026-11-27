-- =====================================================================
-- ARRIVAGE : blocage complet d'un compte par la modération
-- À coller dans Supabase > SQL Editor > New query, puis « Run ». Peut être relancé sans risque.
--
-- Quand un admin bloque un compte (profiles.blocked = true) :
--   - le compte est banni dans Supabase Auth : il ne peut plus se connecter ;
--   - toutes ses sessions sont fermées : il ne peut plus renouveler sa connexion
--     (le site, lui, le déconnecte dans les 20 secondes et affiche « Accès suspendu ») ;
--   - il ne peut plus rien lire ni écrire avec son compte (règles ci-dessous).
-- Quand l'admin le débloque, le bannissement est levé.
-- =====================================================================

create or replace function public.sync_ban() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if new.blocked is distinct from old.blocked then
    update auth.users set banned_until = case when new.blocked then 'infinity'::timestamptz else null end where id = new.id;
    if new.blocked then
      delete from auth.sessions where user_id = new.id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_sync_ban on public.profiles;
create trigger profiles_sync_ban after update of blocked on public.profiles
  for each row execute function public.sync_ban();

-- Un compte bloqué ne peut plus modifier ses données personnelles (alertes, favoris…)
-- ni créer de commerce, de publication, d'avis ou de signalement (déjà en place dans schema.sql).
do $$ begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_state') then
    execute 'drop policy if exists "compte bloqué : état figé" on public.user_state';
    execute 'create policy "compte bloqué : état figé" on public.user_state as restrictive for all using (not public.is_blocked() or public.is_admin()) with check (not public.is_blocked() or public.is_admin())';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'products') then
    execute 'drop policy if exists "compte bloqué : pas de publication" on public.products';
    execute 'create policy "compte bloqué : pas de publication" on public.products as restrictive for insert with check (not public.is_blocked() or public.is_admin())';
  end if;
end $$;

-- Rattrapage : bannir les comptes déjà bloqués avant ce script
update auth.users u set banned_until = 'infinity'::timestamptz
  from public.profiles p where p.id = u.id and p.blocked and (u.banned_until is null or u.banned_until < now());
delete from auth.sessions s using public.profiles p where p.id = s.user_id and p.blocked;
