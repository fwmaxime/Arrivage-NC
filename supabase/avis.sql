-- =====================================================================
-- ARRIVAGE : avis clients sans réservation (27/11/2026)
-- À coller dans Supabase > SQL Editor > New query, puis « Run ». Peut être relancé sans risque.
-- À relancer après chaque exécution de schema.sql.
--
-- Ce que ça change :
--   - un client connecté peut modifier son propre avis (note, texte, nom affiché) ;
--     s'il est modifié et que la modération est active, il repasse « en attente » ;
--   - un seul avis par compte et par commerce (les doublons envoyés à la main sont refusés) ;
--   - un commerçant ne peut pas noter son propre commerce ;
--   - « Achat vérifié » reste réservé aux anciens avis liés à une réservation retirée.
-- =====================================================================

create or replace function public.guard_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare moderate boolean;
begin
  if public.is_admin() then return new; end if;
  select coalesce((data->'settings'->>'moderateReviews')::boolean, true) into moderate from config where id = 'main';
  if tg_op = 'INSERT' then
    -- un « upsert » d'un avis existant passe d'abord ici : on laisse la règle de modification (UPDATE) décider
    if exists (select 1 from reviews r where r.id = new.id) then return new; end if;
    if public.owns_merchant(new.data->>'merchantId') then
      raise exception 'Vous ne pouvez pas noter votre propre commerce';
    end if;
    if exists (select 1 from reviews r where r.author = auth.uid() and r.merchant_id = new.data->>'merchantId' and r.id <> new.id) then
      raise exception 'Vous avez déjà donné votre avis sur ce commerce';
    end if;
    new.data := new.data || jsonb_build_object(
      'status', case when coalesce(moderate, true) then 'pending' else 'published' end,
      'verified', exists (select 1 from reservations r where r.id = new.data->>'reservationId' and r.buyer = auth.uid() and r.data->>'status' = 'collected'));
    new.data := new.data - 'reply' - 'modNote';
    return new;
  end if;
  if public.owns_merchant(old.data->>'merchantId') then
    -- le commerce peut répondre ou signaler l'avis à la modération
    new.data := old.data || jsonb_strip_nulls(jsonb_build_object(
      'reply', new.data->'reply', 'modNote', new.data->'modNote',
      'status', case when new.data->>'status' = 'pending' then new.data->'status' end));
  elsif old.author = auth.uid() and old.data->>'status' <> 'hidden' then
    -- l'auteur modifie son avis : seuls la note, le texte, le nom affiché et la date changent
    new.data := old.data || jsonb_strip_nulls(jsonb_build_object(
      'rating', case when (new.data->>'rating')::int between 1 and 5 then new.data->'rating' end,
      'text', new.data->'text', 'author', new.data->'author', 'at', new.data->'at',
      'status', case when coalesce(moderate, true) then 'pending' else 'published' end));
  else
    new.data := old.data;
  end if;
  return new;
end $$;
