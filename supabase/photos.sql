-- =====================================================================
-- ARRIVAGE : photos dans le stockage Supabase (bucket « photos ») — 27/11/2026
-- À coller dans Supabase > SQL Editor > New query, puis « Run ». Peut être relancé sans risque.
--
-- Avant : les photos étaient enregistrées comme du texte dans chaque fiche, et tout le site les rechargeait à chaque visite.
-- Après : chaque photo est un fichier (lecture publique, mise en cache), la fiche ne garde que son adresse.
-- Les anciennes photos sont déplacées automatiquement quand le commerçant (ou un admin) ouvre le site.
-- Qui peut envoyer une photo : le propriétaire ou un employé du commerce (dossier = identifiant du commerce), ou un admin.
-- Taille maximum : 3 Mo par fichier, formats JPEG, PNG ou WebP.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "photos : envoi par le commerce" on storage.objects;
drop policy if exists "photos : suppression par le commerce" on storage.objects;

create policy "photos : envoi par le commerce" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos' and not public.is_blocked() and (
      public.is_admin()
      or exists (select 1 from public.merchants m where m.id = (storage.foldername(name))[1] and m.owner = auth.uid())
      or exists (select 1 from public.staff s where s.merchant_id = (storage.foldername(name))[1]
                 and s.data->>'userId' = auth.uid()::text and s.data->>'status' = 'active')
    ));

create policy "photos : suppression par le commerce" on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos' and (
      public.is_admin()
      or exists (select 1 from public.merchants m where m.id = (storage.foldername(name))[1] and m.owner = auth.uid())
    ));
