-- =====================================================================
-- ARRIVAGE : suppression de compte par l'utilisateur (27/11/2026)
-- À coller dans Supabase > SQL Editor > New query, puis « Run ». Peut être relancé sans risque.
-- À relancer après chaque exécution de schema.sql.
--
-- Ce que ça ajoute : la fonction delete_my_account(), appelée par le bouton
-- « Supprimer mon compte » de la page Profil. Elle efface :
--   - le compte de connexion (auth.users), le profil et les favoris/alertes (en cascade) ;
--   - les avis et les anciennes réservations de la personne ;
--   - ses places dans les équipes de commerces ;
--   - son identifiant dans les signalements et le journal (le contenu reste, sans lien avec elle).
-- Elle refuse si la personne possède encore un commerce (il faut d'abord écrire à
-- contact@arrivagenc.com pour fermer ou transférer le commerce) ou si c'est un administrateur.
-- =====================================================================

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Connexion requise'; end if;
  if exists (select 1 from profiles where id = me and role = 'admin') then
    raise exception 'Un compte administrateur ne peut pas être supprimé depuis le site';
  end if;
  if exists (select 1 from merchants where owner = me) then
    raise exception 'Vous possédez encore un commerce. Écrivez à contact@arrivagenc.com pour le fermer ou le transférer, puis supprimez votre compte.';
  end if;
  delete from reviews where author = me;
  delete from reservations where buyer = me;
  delete from staff where data->>'userId' = me::text;
  update reports set data = data - 'reporterId' - 'reporterName' where reporter = me;
  update activity set author = null where author = me;
  delete from auth.users where id = me;
end $$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
