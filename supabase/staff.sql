-- =====================================================================
-- ARRIVAGE : comptes employés (forfait Premium) — 27/11/2026
-- À coller dans Supabase > SQL Editor > New query, puis « Run ». Peut être relancé sans risque.
-- À relancer après chaque exécution de schema.sql (qui remet les anciennes règles).
--
-- Fonctionnement :
--   1. le propriétaire crée une invitation (nom, e-mail, rôle) : un code à usage unique est généré ;
--   2. l'employé ouvre le lien, se connecte avec SON compte et valide le code (fonction join_staff) ;
--   3. Gérant : publie, modifie, supprime les produits, répond aux avis, modifie la fiche, voit les stats ;
--      Vendeur : met à jour le stock et la disponibilité des produits existants, rien d'autre ;
--      ni l'un ni l'autre ne touche au forfait ni à l'équipe.
--   Si le commerce quitte le forfait Premium, les employés perdent l'accès.
-- =====================================================================

-- Rôle de la personne connectée dans un commerce : 'manager', 'seller' ou null
create or replace function public.staff_role(mid text) returns text
language sql stable security definer set search_path = public as $$
  select s.data->>'role' from staff s
  where s.merchant_id = mid and s.data->>'userId' = auth.uid()::text and s.data->>'status' = 'active'
    and not public.is_blocked()
    and exists (select 1 from merchants m where m.id = mid and m.data->>'plan' = 'premium')
  limit 1
$$;

-- Propriétaire strict (pour l'équipe et le forfait)
create or replace function public.is_owner(mid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from merchants where id = mid and owner = auth.uid())
$$;

-- « Gère le commerce » = propriétaire ou gérant (utilisé par toutes les règles existantes)
create or replace function public.owns_merchant(mid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from merchants where id = mid and owner = auth.uid()) or public.staff_role(mid) = 'manager'
$$;
create or replace function public.owns_product(pid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from products p join merchants m on m.id = p.merchant_id where p.id = pid and (m.owner = auth.uid() or public.staff_role(m.id) = 'manager'))
$$;

-- Fiche commerce : un gérant peut la modifier, mais ni forfait, ni statut, ni propriétaire, ni demande de forfait
create or replace function public.guard_merchant() returns trigger
language plpgsql security definer set search_path = public as $$
declare manual boolean;
begin
  if current_setting('arrivage.bump', true) = '1' or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if exists (select 1 from merchants where id = new.id) then return new; end if;
    select coalesce((data->'settings'->>'manualApproval')::boolean, true) into manual from config where id = 'main';
    new.data := new.data || jsonb_build_object(
      'status', case when coalesce(manual, true) then 'pending' else 'active' end,
      'verified', false, 'plan', 'free', 'followersBase', 0);
  else
    new.data := (new.data - 'rejectReason' - 'planRequestNote') || jsonb_strip_nulls(jsonb_build_object(
      'status', old.data->'status', 'verified', old.data->'verified', 'plan', old.data->'plan',
      'ownerId', old.data->'ownerId', 'followersBase', old.data->'followersBase', 'rejectReason', old.data->'rejectReason',
      'planRequestNote', old.data->'planRequestNote'));
    if old.owner is distinct from auth.uid() then
      new.data := (new.data - 'planRequest' - 'planRequestAt') || jsonb_strip_nulls(jsonb_build_object(
        'planRequest', old.data->'planRequest', 'planRequestAt', old.data->'planRequestAt'));
    end if;
  end if;
  return new;
end $$;

-- Produits : un vendeur ne change que le stock et la disponibilité
create or replace function public.guard_product() returns trigger
language plpgsql security definer set search_path = public as $$
declare plan text;
begin
  if current_setting('arrivage.bump', true) = '1' then return new; end if;
  if tg_op = 'INSERT' then
    new.data := new.data || '{"views":0,"favBase":0,"contacts":0,"alertHits":0}'::jsonb;
  else
    new.data := new.data || jsonb_build_object(
      'views', coalesce(old.data->'views', '0'), 'favBase', coalesce(old.data->'favBase', '0'),
      'contacts', coalesce(old.data->'contacts', '0'), 'alertHits', coalesce(old.data->'alertHits', '0'));
  end if;
  if public.is_admin() then return new; end if;
  if tg_op = 'UPDATE' and not public.owns_merchant(old.data->>'merchantId') and public.staff_role(old.data->>'merchantId') = 'seller' then
    new.data := old.data || jsonb_strip_nulls(jsonb_build_object(
      'status', new.data->'status', 'qty', new.data->'qty', 'updatedAt', new.data->'updatedAt', 'arrivedAt', new.data->'arrivedAt'));
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.data := new.data || '{"featured":false}'::jsonb;
    if new.data->>'state' = 'hidden' then new.data := new.data || '{"state":"draft"}'::jsonb; end if;
  else
    new.data := new.data || jsonb_build_object('featured', coalesce(old.data->'featured', 'false'), 'merchantId', old.data->'merchantId');
    if old.data->>'state' = 'hidden' then new.data := new.data || '{"state":"hidden"}'::jsonb;
    elsif new.data->>'state' = 'hidden' then new.data := new.data || jsonb_build_object('state', old.data->'state');
    end if;
  end if;
  select m.data->>'plan' into plan from merchants m where m.id = new.data->>'merchantId';
  if coalesce(plan, 'free') <> 'premium' then new.data := new.data || '{"sponsored":false}'::jsonb; end if;
  return new;
end $$;

-- Équipe : seul le propriétaire invite, change les rôles ou retire ; l'invitation ne s'accepte que par join_staff
create or replace function public.guard_staff() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or current_setting('arrivage.sys', true) = '1' then return new; end if;
  if tg_op = 'INSERT' and not exists (select 1 from staff where id = new.id) then
    if (select count(*) from staff where merchant_id = new.data->>'merchantId') >= 10 then
      raise exception 'Limite de 10 membres atteinte';
    end if;
    new.data := (new.data - 'userId' - 'joinedAt') || jsonb_build_object('status', 'invited',
      'code', coalesce(nullif(new.data->>'code', ''), upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))));
  elsif tg_op = 'UPDATE' then
    new.data := (new.data - 'userId' - 'joinedAt' - 'status' - 'code') || jsonb_strip_nulls(jsonb_build_object(
      'userId', old.data->'userId', 'joinedAt', old.data->'joinedAt', 'status', old.data->'status', 'code', old.data->'code',
      'merchantId', old.data->'merchantId'));
  end if;
  return new;
end $$;
drop trigger if exists guard on public.staff;
create trigger guard before insert or update on public.staff for each row execute function public.guard_staff();

-- Accepter une invitation (appelé par l'employé connecté). Renvoie l'identifiant du commerce.
create or replace function public.join_staff(invite text) returns text
language plpgsql security definer set search_path = public as $$
declare r record; c text := upper(regexp_replace(coalesce(invite, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  if public.is_blocked() then raise exception 'Compte bloqué'; end if;
  if length(c) < 8 then raise exception 'Code invalide'; end if;
  select * into r from staff
    where upper(regexp_replace(coalesce(data->>'code', ''), '[^A-Za-z0-9]', '', 'g')) = c and data->>'status' = 'invited' limit 1;
  if not found then raise exception 'Code invalide'; end if;
  if exists (select 1 from merchants where id = r.merchant_id and owner = auth.uid()) then raise exception 'Vous êtes le propriétaire de ce commerce'; end if;
  if exists (select 1 from staff where merchant_id = r.merchant_id and data->>'userId' = auth.uid()::text) then raise exception 'Vous faites déjà partie de cette équipe'; end if;
  if not exists (select 1 from merchants where id = r.merchant_id and data->>'plan' = 'premium') then raise exception 'Forfait Premium requis'; end if;
  perform set_config('arrivage.sys', '1', true);
  update staff set data = (data - 'code') || jsonb_build_object('userId', auth.uid()::text, 'status', 'active', 'joinedAt', public.now_iso())
    where id = r.id;
  perform set_config('arrivage.sys', '0', true);
  return r.merchant_id;
end $$;
revoke all on function public.join_staff(text) from public;
grant execute on function public.join_staff(text) to authenticated;

-- Règles d'accès
drop policy if exists "équipe" on public.staff;
drop policy if exists "équipe gérée par le propriétaire" on public.staff;
drop policy if exists "ma place dans l'équipe" on public.staff;
create policy "équipe gérée par le propriétaire" on public.staff for all
  using (public.is_owner(merchant_id) or public.is_admin()) with check (public.is_owner(merchant_id) or public.is_admin());
create policy "ma place dans l'équipe" on public.staff for select using (data->>'userId' = auth.uid()::text);

drop policy if exists "commerces visibles" on public.merchants;
create policy "commerces visibles" on public.merchants for select
  using (status = 'active' or owner = auth.uid() or public.is_admin() or public.staff_role(id) is not null);
drop policy if exists "commerce modifié" on public.merchants;
create policy "commerce modifié" on public.merchants for update
  using (owner = auth.uid() or public.is_admin() or public.staff_role(id) = 'manager')
  with check (owner = auth.uid() or public.is_admin() or public.staff_role(id) = 'manager');

drop policy if exists "produits visibles" on public.products;
create policy "produits visibles" on public.products for select using (
  ((state = 'published' or (state = 'scheduled' and data->>'scheduledAt' <= public.now_iso())) and public.merchant_active(merchant_id))
  or public.owns_merchant(merchant_id) or public.staff_role(merchant_id) is not null or public.is_admin());
drop policy if exists "produit modifié" on public.products;
create policy "produit modifié" on public.products for update
  using (public.owns_merchant(merchant_id) or public.staff_role(merchant_id) = 'seller' or public.is_admin())
  with check (public.owns_merchant(merchant_id) or public.staff_role(merchant_id) = 'seller' or public.is_admin());
