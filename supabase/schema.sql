-- =====================================================================
-- ARRIVAGE : base de données Supabase
-- À coller en entier dans Supabase > SQL Editor > New query, puis « Run ».
-- Le script peut être relancé sans risque (il ne supprime aucune donnée).
-- Aucun mot de passe ici : les comptes se créent dans Authentication > Users.
-- =====================================================================

-- ---------- Profils (un par compte) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  display_name text,
  role text not null default 'client' check (role in ('client', 'merchant', 'admin')),
  blocked boolean not null default false,
  created_at timestamptz not null default now()
);

-- Identifiants admin : « admin » (Mathis) et « admin2 » (Maxime).
-- Un identifiant sans @ est converti par le site en <id>@id.arrivagenc.com.
create or replace function public.admin_emails() returns text[] language sql immutable as $$
  select array['admin@id.arrivagenc.com', 'admin2@id.arrivagenc.com']
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, username, display_name, role)
  values (
    new.id, lower(new.email),
    case when lower(new.email) like '%@id.arrivagenc.com' then split_part(lower(new.email), '@', 1) else null end,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)),
    case when lower(new.email) = any(public.admin_emails()) then 'admin' else 'client' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Comptes déjà créés avant ce script : on leur crée un profil
insert into public.profiles (id, email, username, display_name, role)
select u.id, lower(u.email),
  case when lower(u.email) like '%@id.arrivagenc.com' then split_part(lower(u.email), '@', 1) else null end,
  split_part(u.email, '@', 1),
  case when lower(u.email) = any(public.admin_emails()) then 'admin' else 'client' end
from auth.users u
on conflict (id) do nothing;
update public.profiles set role = 'admin' where email = any(public.admin_emails());

-- ---------- Fonctions utilitaires ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and not blocked)
$$;

create or replace function public.is_blocked() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select blocked from profiles where id = auth.uid()), false)
$$;

create or replace function public.now_iso() returns text language sql stable as $$
  select to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$$;

-- ---------- Tables de contenu (document JSON + colonnes calculées pour la sécurité) ----------
create table if not exists public.config (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.config (id, data) values ('main', '{"settings": {"manualApproval": true, "moderateReviews": true}}')
on conflict (id) do nothing;

create table if not exists public.merchants (
  id text primary key,
  data jsonb not null,
  owner uuid generated always as (nullif(data->>'ownerId', '')::uuid) stored,
  status text generated always as (data->>'status') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  data jsonb not null,
  merchant_id text generated always as (data->>'merchantId') stored,
  state text generated always as (data->>'state') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id text primary key,
  data jsonb not null,
  buyer uuid generated always as (nullif(data->>'buyerId', '')::uuid) stored,
  merchant_id text generated always as (data->>'merchantId') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id text primary key,
  data jsonb not null,
  author uuid generated always as (nullif(data->>'authorId', '')::uuid) stored,
  merchant_id text generated always as (data->>'merchantId') stored,
  status text generated always as (data->>'status') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id text primary key,
  data jsonb not null,
  reporter uuid generated always as (nullif(data->>'reporterId', '')::uuid) stored,
  product_id text generated always as (data->>'productId') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff (
  id text primary key,
  data jsonb not null,
  merchant_id text generated always as (data->>'merchantId') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity (
  id text primary key,
  data jsonb not null,
  author uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- Favoris, alertes, notifications, préférences : un document par compte
create table if not exists public.user_state (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Statistiques réelles (vues, favoris, contacts) par commerce, jour et commune
create table if not exists public.daily_stats (
  merchant_id text not null,
  day date not null,
  metric text not null,
  commune text not null default '',
  n integer not null default 0,
  primary key (merchant_id, day, metric, commune)
);

-- Recherches anonymes (pour la « Demande locale »)
create table if not exists public.searches (
  q text not null,
  day date not null,
  n integer not null default 0,
  primary key (q, day)
);

create or replace function public.owns_merchant(mid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from merchants where id = mid and owner = auth.uid())
$$;

create or replace function public.merchant_active(mid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from merchants where id = mid and status = 'active')
$$;

create or replace function public.owns_product(pid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from products p join merchants m on m.id = p.merchant_id where p.id = pid and m.owner = auth.uid())
$$;

create or replace function public.touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- ---------- Règles de protection (ce qu'un non-admin ne peut pas modifier) ----------
create or replace function public.guard_merchant() returns trigger
language plpgsql security definer set search_path = public as $$
declare manual boolean;
begin
  if current_setting('arrivage.bump', true) = '1' or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    select coalesce((data->'settings'->>'manualApproval')::boolean, true) into manual from config where id = 'main';
    new.data := new.data || jsonb_build_object(
      'status', case when coalesce(manual, true) then 'pending' else 'active' end,
      'verified', false, 'plan', 'free', 'followersBase', 0);
  else
    new.data := (new.data - 'rejectReason') || jsonb_strip_nulls(jsonb_build_object(
      'status', old.data->'status', 'verified', old.data->'verified', 'plan', old.data->'plan',
      'ownerId', old.data->'ownerId', 'followersBase', old.data->'followersBase', 'rejectReason', old.data->'rejectReason'));
  end if;
  return new;
end $$;

create or replace function public.after_merchant() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('arrivage.sys', '1', true);
  update profiles set role = 'merchant' where id = new.owner and role = 'client';
  perform set_config('arrivage.sys', '0', true);
  return new;
end $$;

create or replace function public.guard_product() returns trigger
language plpgsql security definer set search_path = public as $$
declare plan text;
begin
  if current_setting('arrivage.bump', true) = '1' then return new; end if;
  if tg_op = 'INSERT' then
    new.data := new.data || '{"views":0,"favBase":0,"contacts":0,"alertHits":0}'::jsonb;
  else
    -- les compteurs ne bougent que via bump()
    new.data := new.data || jsonb_build_object(
      'views', coalesce(old.data->'views', '0'), 'favBase', coalesce(old.data->'favBase', '0'),
      'contacts', coalesce(old.data->'contacts', '0'), 'alertHits', coalesce(old.data->'alertHits', '0'));
  end if;
  if public.is_admin() then return new; end if;
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

create or replace function public.guard_reservation() returns trigger
language plpgsql security definer set search_path = public as $$
declare staff boolean := public.is_admin() or public.owns_merchant(coalesce(new.data->>'merchantId', ''));
begin
  if tg_op = 'INSERT' then
    if not staff then
      new.data := new.data || '{"status":"paid","merchantUnread":true}'::jsonb;
    end if;
    return new;
  end if;
  staff := public.is_admin() or public.owns_merchant(coalesce(old.data->>'merchantId', ''));
  if staff then return new; end if;
  -- le client ne peut qu'annuler et marquer comme lu
  new.data := old.data || jsonb_strip_nulls(jsonb_build_object(
    'clientUnread', new.data->'clientUnread',
    'history', new.data->'history',
    'reviewed', new.data->'reviewed',
    'status', case when new.data->>'status' = 'cancelled' and old.data->>'status' in ('paid', 'ready') then new.data->'status' end));
  return new;
end $$;

-- Stock : décrémenté à la réservation, remis à l'annulation par le client
create or replace function public.after_reservation() returns trigger
language plpgsql security definer set search_path = public as $$
declare q int := coalesce((new.data->>'qty')::int, 1); delta int := 0;
begin
  if public.is_admin() or public.owns_merchant(coalesce(new.data->>'merchantId', '')) then return new; end if;
  if tg_op = 'INSERT' then delta := -q;
  elsif new.data->>'status' in ('cancelled', 'refunded') and old.data->>'status' in ('paid', 'ready') then delta := q;
  end if;
  if delta <> 0 then
    update products set data = data
      || jsonb_build_object('qty', greatest(0, (data->>'qty')::int + delta), 'updatedAt', public.now_iso())
      || case when greatest(0, (data->>'qty')::int + delta) = 0 then '{"status":"out"}'::jsonb
              when data->>'status' = 'out' then '{"status":"limited"}'::jsonb else '{}'::jsonb end
    where id = new.data->>'productId' and jsonb_typeof(data->'qty') = 'number';
  end if;
  return new;
end $$;

create or replace function public.guard_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare moderate boolean;
begin
  if public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    select coalesce((data->'settings'->>'moderateReviews')::boolean, true) into moderate from config where id = 'main';
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
  else
    new.data := old.data;
  end if;
  return new;
end $$;

create or replace function public.guard_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.data := new.data || '{"status":"open","adminUnread":true}'::jsonb;
  elsif new.data->>'status' not in ('open', 'waiting', 'fixed') then
    new.data := new.data || jsonb_build_object('status', old.data->'status');
  end if;
  return new;
end $$;

create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or current_setting('arrivage.sys', true) = '1' then return new; end if;
  new.role := old.role; new.blocked := old.blocked; new.email := old.email; new.username := old.username;
  return new;
end $$;

drop trigger if exists guard on public.merchants;
create trigger guard before insert or update on public.merchants for each row execute function public.guard_merchant();
drop trigger if exists after_ins on public.merchants;
create trigger after_ins after insert on public.merchants for each row execute function public.after_merchant();
drop trigger if exists guard on public.products;
create trigger guard before insert or update on public.products for each row execute function public.guard_product();
drop trigger if exists guard on public.reservations;
create trigger guard before insert or update on public.reservations for each row execute function public.guard_reservation();
drop trigger if exists stock on public.reservations;
create trigger stock after insert or update on public.reservations for each row execute function public.after_reservation();
drop trigger if exists guard on public.reviews;
create trigger guard before insert or update on public.reviews for each row execute function public.guard_review();
drop trigger if exists guard on public.reports;
create trigger guard before insert or update on public.reports for each row execute function public.guard_report();
drop trigger if exists guard on public.profiles;
create trigger guard before update on public.profiles for each row execute function public.guard_profile();

do $$ declare t text; begin
  foreach t in array array['merchants', 'products', 'reservations', 'reviews', 'reports', 'staff', 'config', 'user_state'] loop
    execute format('drop trigger if exists touch on public.%I', t);
    execute format('create trigger touch before update on public.%I for each row execute function public.touch()', t);
  end loop;
end $$;

-- ---------- Accès (Row Level Security) ----------
alter table public.profiles enable row level security;
alter table public.config enable row level security;
alter table public.merchants enable row level security;
alter table public.products enable row level security;
alter table public.reservations enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.staff enable row level security;
alter table public.activity enable row level security;
alter table public.user_state enable row level security;
alter table public.daily_stats enable row level security;
alter table public.searches enable row level security;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('profiles', 'config', 'merchants', 'products', 'reservations', 'reviews', 'reports', 'staff', 'activity', 'user_state', 'daily_stats', 'searches')
  loop execute format('drop policy %I on public.%I', r.policyname, r.tablename); end loop;
end $$;

create policy "profil lisible" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profil modifiable" on public.profiles for update using (id = auth.uid() or public.is_admin());

create policy "config lisible" on public.config for select using (true);
create policy "config admin" on public.config for all using (public.is_admin()) with check (public.is_admin());

create policy "commerces visibles" on public.merchants for select using (status = 'active' or owner = auth.uid() or public.is_admin());
create policy "commerce créé" on public.merchants for insert with check ((owner = auth.uid() and not public.is_blocked()) or public.is_admin());
create policy "commerce modifié" on public.merchants for update using (owner = auth.uid() or public.is_admin()) with check (owner = auth.uid() or public.is_admin());
create policy "commerce supprimé" on public.merchants for delete using (public.is_admin());

create policy "produits visibles" on public.products for select using (
  ((state = 'published' or (state = 'scheduled' and data->>'scheduledAt' <= public.now_iso())) and public.merchant_active(merchant_id))
  or public.owns_merchant(merchant_id) or public.is_admin());
create policy "produit créé" on public.products for insert with check (public.owns_merchant(merchant_id) or public.is_admin());
create policy "produit modifié" on public.products for update using (public.owns_merchant(merchant_id) or public.is_admin()) with check (public.owns_merchant(merchant_id) or public.is_admin());
create policy "produit supprimé" on public.products for delete using (public.owns_merchant(merchant_id) or public.is_admin());

create policy "réservations visibles" on public.reservations for select using (buyer = auth.uid() or public.owns_merchant(merchant_id) or public.is_admin());
create policy "réservation créée" on public.reservations for insert with check ((buyer = auth.uid() and not public.is_blocked()) or public.is_admin());
create policy "réservation modifiée" on public.reservations for update using (buyer = auth.uid() or public.owns_merchant(merchant_id) or public.is_admin());
create policy "réservation supprimée" on public.reservations for delete using (public.is_admin());

create policy "avis visibles" on public.reviews for select using (status = 'published' or author = auth.uid() or public.owns_merchant(merchant_id) or public.is_admin());
create policy "avis créé" on public.reviews for insert with check (author = auth.uid() and not public.is_blocked());
create policy "avis modifié" on public.reviews for update using (author = auth.uid() or public.owns_merchant(merchant_id) or public.is_admin());
create policy "avis supprimé" on public.reviews for delete using (public.is_admin());

create policy "signalements visibles" on public.reports for select using (reporter = auth.uid() or public.owns_product(product_id) or public.is_admin());
create policy "signalement créé" on public.reports for insert with check (reporter = auth.uid() and not public.is_blocked());
create policy "signalement modifié" on public.reports for update using (reporter = auth.uid() or public.owns_product(product_id) or public.is_admin());
create policy "signalement supprimé" on public.reports for delete using (public.is_admin());

create policy "équipe" on public.staff for all using (public.owns_merchant(merchant_id) or public.is_admin()) with check (public.owns_merchant(merchant_id) or public.is_admin());

create policy "journal écrit" on public.activity for insert with check (auth.uid() is not null);
create policy "journal lu" on public.activity for select using (public.is_admin());

create policy "mes données" on public.user_state for all using (id = auth.uid()) with check (id = auth.uid());
create policy "données lues admin" on public.user_state for select using (public.is_admin());

create policy "stats du commerce" on public.daily_stats for select using (public.owns_merchant(merchant_id) or public.is_admin());
create policy "recherches admin" on public.searches for select using (public.is_admin());

-- ---------- Compteurs publics (vues, favoris, abonnés…) ----------
drop function if exists public.bump(text, text, text, int, text);
create or replace function public.bump(t text, rid text, field text, delta int, com text default '')
returns void language plpgsql security definer set search_path = public as $$
declare mid text;
begin
  if delta not in (-1, 1) then return; end if;
  perform set_config('arrivage.bump', '1', true);
  if t = 'products' and field in ('views', 'favBase', 'contacts', 'alertHits') then
    update products set data = jsonb_set(data, array[field], to_jsonb(greatest(0, coalesce((data->>field)::int, 0) + delta)))
      where id = rid returning merchant_id into mid;
  elsif t = 'merchants' and field = 'followersBase' then
    update merchants set data = jsonb_set(data, '{followersBase}', to_jsonb(greatest(0, coalesce((data->>'followersBase')::int, 0) + delta)))
      where id = rid returning id into mid;
  end if;
  perform set_config('arrivage.bump', '0', true);
  if mid is not null and delta > 0 then
    insert into daily_stats (merchant_id, day, metric, commune, n)
      values (mid, (now() at time zone 'Pacific/Noumea')::date, field, left(coalesce(com, ''), 40), 1)
      on conflict (merchant_id, day, metric, commune) do update set n = daily_stats.n + 1;
  end if;
end $$;

create or replace function public.log_search(q text) returns void
language sql security definer set search_path = public as $$
  insert into searches (q, day, n) values (left(lower(trim(q)), 80), (now() at time zone 'Pacific/Noumea')::date, 1)
  on conflict (q, day) do update set n = searches.n + 1;
$$;

-- Demande locale : alertes et recherches agrégées, sans identité
create or replace function public.demand_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'alerts', coalesce((select jsonb_agg(jsonb_build_object('q', a->>'query', 'c', a->>'category', 'b', a->'maxBudget', 'm', coalesce(nullif(a->>'commune', ''), us.data->'profile'->>'commune')))
      from user_state us, jsonb_array_elements(case when jsonb_typeof(us.data->'alerts') = 'array' then us.data->'alerts' else '[]'::jsonb end) a
      where coalesce((a->>'active')::boolean, false)), '[]'::jsonb),
    'searches', coalesce((select jsonb_object_agg(q, n) from (
      select q, sum(n) as n from searches where day > (now() at time zone 'Pacific/Noumea')::date - 30 group by q order by 2 desc limit 300) x), '{}'::jsonb),
    'prev', coalesce((select jsonb_object_agg(q, n) from (
      select q, sum(n) as n from searches where day <= (now() at time zone 'Pacific/Noumea')::date - 30 and day > (now() at time zone 'Pacific/Noumea')::date - 60 group by q) x), '{}'::jsonb),
    'users', (select count(*) from profiles)
  )
$$;

-- Statistiques d'un commerce (propriétaire ou admin)
create or replace function public.merchant_stats(mid text, days int default 90) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.owns_merchant(mid) or public.is_admin() then coalesce(
    (select jsonb_agg(jsonb_build_object('d', day, 'm', metric, 'c', commune, 'n', n))
       from daily_stats where merchant_id = mid and day > (now() at time zone 'Pacific/Noumea')::date - days), '[]'::jsonb)
  else '[]'::jsonb end
$$;

revoke all on function public.bump(text, text, text, int, text) from public;
grant execute on function public.bump(text, text, text, int, text) to anon, authenticated;
grant execute on function public.log_search(text) to anon, authenticated;
grant execute on function public.demand_stats() to authenticated;
grant execute on function public.merchant_stats(text, int) to authenticated;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
