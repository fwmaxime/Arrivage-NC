-- =====================================================================
-- ARRIVAGE : « Je cherche ce produit » (produits introuvables) — 28/11/2026
-- À coller dans Supabase > SQL Editor > New query, puis « Run ». Peut être relancé sans risque
-- (aucune donnée n'est supprimée). À relancer après chaque exécution de schema.sql.
--
-- Fonctionnement :
--   - un client connecté signale un produit qu'il ne trouve pas (nom, marque, catégorie, commune,
--     budget, précisions). Une seule demande par produit et par compte : la renvoyer la met à jour ;
--   - le client voit et retire ses propres demandes ;
--   - les commerçants voient les demandes regroupées par produit, sans aucune identité
--     (fonction wanted_stats), avec un niveau de détail qui dépend du forfait :
--       Gratuit, Starter : nombre total + les 3 produits les plus demandés ;
--       Business        : liste complète, communes, date de la dernière demande ;
--       Premium         : en plus, budget moyen et précisions laissées par les clients ;
--   - les admins voient tout (y compris qui a demandé) et peuvent supprimer une demande abusive.
--   Les demandes de plus de 90 jours, ou marquées « trouvé », ne sont plus comptées.
-- =====================================================================

-- Clé de regroupement : minuscules, sans accents, espaces simplifiés (« Crème  Nivéa » = « creme nivea »)
create or replace function public.wanted_key(t text) returns text language sql immutable as $$
  select left(trim(regexp_replace(translate(lower(coalesce(t, '')),
    'àâäáãåéèêëíìîïóòôöõúùûüçñœ', 'aaaaaaeeeeiiiiooooouuuucno'), '\s+', ' ', 'g')), 80)
$$;

create table if not exists public.wanted (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  query text not null check (char_length(trim(query)) between 2 and 80),
  brand text not null default '' check (char_length(brand) <= 60),
  category text not null default '' check (char_length(category) <= 40),
  commune text not null default '' check (char_length(commune) <= 40),
  max_budget integer check (max_budget is null or (max_budget >= 0 and max_budget <= 100000000)),
  note text not null default '' check (char_length(note) <= 200),
  status text not null default 'open' check (status in ('open', 'found')),
  qkey text generated always as (public.wanted_key(query)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists wanted_one_per_user on public.wanted (user_id, qkey);
create index if not exists wanted_recent on public.wanted (created_at desc);

-- Le client ne peut ni changer d'auteur ni antidater sa demande
create or replace function public.guard_wanted() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then new.updated_at := now(); return new; end if;
  if tg_op = 'INSERT' then
    new.user_id := auth.uid(); new.created_at := now();
  else
    new.user_id := old.user_id;
    -- renvoyer une demande déjà faite la remet en tête (et la rouvre)
    new.created_at := case when new.status = 'open' then now() else old.created_at end;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists guard on public.wanted;
create trigger guard before insert or update on public.wanted for each row execute function public.guard_wanted();

-- Anti-abus : 30 demandes nouvelles au maximum par compte et par 24 h
create or replace function public.wanted_quota_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select (select count(*) from wanted where user_id = auth.uid() and created_at > now() - interval '24 hours') < 30
$$;

alter table public.wanted enable row level security;
drop policy if exists "mes demandes" on public.wanted;
drop policy if exists "demande créée" on public.wanted;
drop policy if exists "demande modifiée" on public.wanted;
drop policy if exists "demande supprimée" on public.wanted;
create policy "mes demandes" on public.wanted for select using (user_id = auth.uid() or public.is_admin());
create policy "demande créée" on public.wanted for insert with check (
  (auth.uid() is not null and not public.is_blocked() and public.wanted_quota_ok()) or public.is_admin());
create policy "demande modifiée" on public.wanted for update
  using ((user_id = auth.uid() and not public.is_blocked()) or public.is_admin())
  with check ((user_id = auth.uid() and not public.is_blocked()) or public.is_admin());
create policy "demande supprimée" on public.wanted for delete using (user_id = auth.uid() or public.is_admin());

revoke all on public.wanted from anon;
grant select, insert, update, delete on public.wanted to authenticated;

-- ---------- Demandes regroupées pour les commerçants (et les admins) ----------
-- mid : le commerce affiché dans l'espace Pro. Le niveau de détail suit son forfait.
-- Admin sans commerce (mid vide) : niveau « admin » (tout, avec le nombre de comptes distincts).
drop function if exists public.wanted_stats(text);
create or replace function public.wanted_stats(mid text default '') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  tier text;
  lim int;
  res jsonb;
begin
  if coalesce(mid, '') = '' then
    if not public.is_admin() then return jsonb_build_object('tier', 'none'); end if;
    tier := 'admin';
  else
    if not (public.is_admin() or public.owns_merchant(mid) or public.staff_role(mid) is not null) then
      return jsonb_build_object('tier', 'none');
    end if;
    select case coalesce(data->>'plan', 'free') when 'premium' then 'premium' when 'business' then 'business' else 'free' end
      into tier from merchants where id = mid;
    tier := coalesce(tier, 'free');
  end if;
  lim := case when tier in ('free') then 3 else 500 end;

  with base as (
    select * from wanted
    where status = 'open' and created_at > now() - interval '90 days'
  ),
  g as (
    select qkey,
      (array_agg(trim(query) order by created_at desc))[1] as q,
      (select b.brand from base b where b.qkey = base.qkey and b.brand <> '' group by b.brand order by count(*) desc, b.brand limit 1) as brand,
      (select b.category from base b where b.qkey = base.qkey and b.category <> '' group by b.category order by count(*) desc, b.category limit 1) as category,
      count(distinct user_id) as n,
      max(created_at) as last_at,
      round(avg(max_budget) filter (where max_budget > 0)) as budget,
      (select jsonb_object_agg(c, k) from (select b.commune as c, count(*) as k from base b where b.qkey = base.qkey and b.commune <> '' group by b.commune) x) as communes,
      (select jsonb_agg(t) from (select b.note as t from base b where b.qkey = base.qkey and b.note <> '' order by b.created_at desc limit 5) y) as notes
    from base group by qkey
  ),
  ranked as (select * from g order by n desc, last_at desc limit lim)
  select jsonb_build_object(
    'tier', tier,
    'total', (select count(*) from base),
    'products', (select count(*) from g),
    'people', (select count(distinct user_id) from base),
    'week', (select count(*) from base where created_at > now() - interval '7 days'),
    'items', coalesce((select jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'q', r.q, 'n', r.n,
        'brand', case when tier <> 'free' then r.brand end,
        'category', r.category,
        'last', case when tier <> 'free' then r.last_at end,
        'communes', case when tier <> 'free' then r.communes end,
        'budget', case when tier in ('premium', 'admin') then r.budget end,
        'notes', case when tier in ('premium', 'admin') then r.notes end
      )) order by r.n desc, r.last_at desc) from ranked r), '[]'::jsonb)
  ) into res;
  return res;
end $$;

revoke all on function public.wanted_stats(text) from public;
grant execute on function public.wanted_stats(text) to authenticated;
