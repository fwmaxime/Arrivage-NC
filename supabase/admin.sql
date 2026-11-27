-- =====================================================================
-- ARRIVAGE : suppression d'un commerce ou d'un compte par un administrateur (28/11/2026)
-- À coller dans Supabase > SQL Editor > New query, puis « Run ». Peut être relancé sans risque.
-- À relancer après chaque exécution de schema.sql.
--
-- admin_delete_merchant(mid) : efface le commerce, ses annonces, son équipe, ses avis,
--   ses anciennes réservations et les signalements de ses annonces.
--   Le propriétaire garde son compte (il redevient simple client s'il n'a plus de commerce).
-- admin_delete_user(uid) : efface le compte, ses commerces (comme ci-dessus), ses avis,
--   ses anciennes réservations, ses places dans les équipes ; ses signalements restent sans lien avec lui.
-- Impossible de supprimer un administrateur ou soi-même par ces fonctions.
-- =====================================================================

create or replace function public.admin_delete_merchant(mid text) returns void
language plpgsql security definer set search_path = public as $$
declare own uuid;
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs'; end if;
  select owner into own from merchants where id = mid;
  if not found then raise exception 'Commerce introuvable'; end if;
  delete from reports where product_id in (select id from products where merchant_id = mid);
  delete from products where merchant_id = mid;
  delete from staff where merchant_id = mid;
  delete from reviews where merchant_id = mid;
  delete from reservations where merchant_id = mid;
  delete from daily_stats where merchant_id = mid;
  delete from merchants where id = mid;
  if own is not null and not exists (select 1 from merchants where owner = own) then
    perform set_config('arrivage.sys', '1', true);
    update profiles set role = 'client' where id = own and role = 'merchant';
    perform set_config('arrivage.sys', '0', true);
  end if;
end $$;
revoke all on function public.admin_delete_merchant(text) from public;
grant execute on function public.admin_delete_merchant(text) to authenticated;

create or replace function public.admin_delete_user(uid uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare m record;
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs'; end if;
  if uid = auth.uid() then raise exception 'Vous ne pouvez pas supprimer votre propre compte ici'; end if;
  if exists (select 1 from profiles where id = uid and role = 'admin') then
    raise exception 'Un compte administrateur ne peut pas être supprimé';
  end if;
  for m in select id from merchants where owner = uid loop
    perform public.admin_delete_merchant(m.id);
  end loop;
  delete from reviews where author = uid;
  delete from reservations where buyer = uid;
  delete from staff where data->>'userId' = uid::text;
  update reports set data = data - 'reporterId' - 'reporterName' where reporter = uid;
  update activity set author = null where author = uid;
  delete from auth.users where id = uid;
end $$;
revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;
