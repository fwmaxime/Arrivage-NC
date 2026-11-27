# ARRIVAGE NC

Site : https://arrivagenc.com (GitHub Pages, branche `main`, racine).

**Le site est ouvert au public depuis le 27/11/2026** : `index.html` est l'application (indexable). L'ancienne page « ARRIVAGE revient bientôt » est gardée dans `maintenance.html`.

**Stand-by** : un administrateur peut mettre le site en pause depuis l'espace Admin (Vue d'ensemble > « Mettre en stand-by »). Les visiteurs voient « Bientôt de retour », les admins voient toujours le site, et le site de test `demo-x7q4/` n'est pas concerné.

Remettre en maintenance à la main (secours) : `cp maintenance.html index.html && git commit -am "Maintenance" && git push`.
Mettre à jour le site officiel après un build : `bash sources/build.sh "$PWD/demo-x7q4/index.html" && grep -v 'name="robots"' demo-x7q4/index.html > index.html`.

- `demo-x7q4/index.html` : le prototype interactif complet (données fictives, paiement simulé), mis de côté et non référencé (noindex).
- `sources/` : le code source du prototype (React + TypeScript, assemblé avec esbuild via `build.sh`).
- `CNAME` : domaine personnalisé, à ne pas supprimer.

## Remettre le prototype en ligne

```sh
git mv -f demo-x7q4/index.html index.html && git commit -m "Remise en ligne du prototype" && git push
```
(puis retirer la ligne `<meta name="robots" content="noindex, nofollow">` en tête du fichier si on veut qu'il soit indexé)

## Sauvegardes

- **Version finale avant la refonte de l'accueil** (27/11/2026) : commit `c3f67ef` de `main`, servie telle quelle sur `demo-x7q4/v1/` (https://arrivagenc.com/demo-x7q4/v1/).
  Pour la restaurer sur l'URL démo : `cp demo-x7q4/v1/index.html demo-x7q4/index.html && git checkout c3f67ef -- sources && git commit -am "Retour à la version finale" && git push`.

## Mode démonstration

`https://arrivagenc.com/demo-x7q4/?demo=1` (ou le lien « Voir un aperçu avec des exemples ») affiche des commerces et produits d'exemple fictifs, gardés uniquement dans le navigateur : rien n'est envoyé à Supabase. Le bouton « Quitter » du bandeau revient aux vraies données.

## Restaurants, promotions flash et mises en avant

- Catégorie **Restaurants** (`restauration`) : un restaurant publie des offres datées (plat du jour, suggestion du week-end, menu, offre limitée, promo).
- Tout commerce peut créer une **promotion flash** (Black Friday, week-end…) : case « Promotion flash ou offre limitée » du formulaire de publication, ou bouton « Mettre en promo » dans Mes publications. Prix barré ou remise libre, dates de début et de fin.
- Côté client : annoncée « Bientôt » jusqu'à 14 jours avant, visible pendant la période, puis masquée automatiquement. Recherche « promo », filtre « Promos et offres », sections d'accueil « Promos et offres du moment » et « Côté restaurants ».
- Les publications **sponsorisées** (forfait Premium) et « À la une » (admin) apparaissent dans le bandeau « À la une » juste sous la barre de recherche de l'accueil, et jusqu'à 2 en tête des résultats de recherche.
- Aucune modification de la base Supabase : l'offre est enregistrée dans la publication (champ `deal`).
- **Adresses des pages** : chaque écran a son adresse (`#/produit/<id>`, `#/commerce/<id>`, `#/recherche?q=…`, `#/pro/publications`, `#/admin/signalements`…), gérée dans `sources/src/url.ts`. Le bouton retour du navigateur et du téléphone revient à la page précédente, et « Partager » envoie le lien du produit.
- **Blocage d'un compte** (Admin > Utilisateurs > Bloquer) : la personne est déconnectée dans les 20 secondes et ne voit plus que la page « Accès suspendu », sur ce navigateur même déconnectée ou avec un autre compte (`sources/src/blocked.tsx`). Côté serveur, lancer une fois `supabase/blocage.sql` dans le SQL Editor (à relancer après chaque exécution de `schema.sql`) : le compte est banni de Supabase Auth et ses sessions fermées.
- **Réservation retirée** (27/11/2026) : le bouton « Réserver » n'existe plus (abus et produits jamais retirés). L'achat en ligne le remplacera ; les anciennes réservations restent consultables.
- **Achat en ligne, payé directement au commerçant** : le commerçant colle un lien de paiement (banque, Stripe, PayPal, sa boutique en ligne) dans Ma fiche, ou un lien différent par produit dans le formulaire de publication. Un bouton « Acheter » apparaît alors sur ses produits. ARRIVAGE ne touche pas l'argent et ne prend pas de commission : le modèle économique reste les abonnements. Liens `https://` uniquement.
- **Comment ça marche** (`sources/src/how.tsx`) : bandeau refermable sur l'accueil (3 étapes, créer un compte, je suis commerçant) et page `#/comment-ca-marche` avec onglets client / commerçant et questions fréquentes. Lien aussi en pied de page.

## Application installable (écran d'accueil du téléphone)

En attendant l'appli officielle, le site s'installe comme une appli (PWA) :
- iPhone / iPad : Safari > Partager > « Sur l'écran d'accueil ». Android : Chrome > menu ⋮ > « Installer l'application » (ou le bouton « Installer » du site).
- `manifest.webmanifest` (racine) et `demo-x7q4/manifest.webmanifest` (nommé « ARRIVAGE (test) ») : nom, couleurs, icônes, raccourcis.
- `icons/` : icônes et écrans de lancement iPhone, générés par `node sources/pwa/make-icons.js` (à relancer seulement si le logo change).
- `sw.js` (copié par `build.sh` à côté de la page) : ne met rien en cache, affiche seulement une page « Pas de connexion » hors ligne. Après une mise à jour du site officiel, copier aussi `demo-x7q4/sw.js` vers `sw.js` s'il a changé.
- `sources/src/install.tsx` : petite carte « ARRIVAGE en appli » (mobile, après 30 s ou dès la 2e visite, masquée 30 jours si on la ferme), lien « Installer l'appli sur mon téléphone » en pied de page, fenêtre d'aide iPhone / Android, question dans la FAQ.

## Scripts Supabase (SQL Editor > New query > coller > Run)

Ordre à respecter. Chaque script peut être relancé sans risque. **Après toute exécution de `schema.sql`, relancer les suivants.**

1. `supabase/schema.sql` : tables, règles d'accès de base.
2. `supabase/blocage.sql` : blocage complet d'un compte.
3. `supabase/avis.sql` : avis sans réservation (modifiables, un par commerce).
4. `supabase/staff.sql` : comptes employés (Gérant, Vendeur), fonction `join_staff`.
5. `supabase/photos.sql` : bucket de stockage « photos ».
6. `supabase/compte.sql` : bouton « Supprimer mon compte » (fonction `delete_my_account`).
7. `supabase/admin.sql` : suppression d’un commerce ou d’un compte par un admin.

**Pages légales** : `sources/src/legal.tsx` (mentions légales, confidentialité, conditions). Compléter l’objet `EDITOR` en haut du fichier (responsables, statut, adresse, directeur de la publication) avant de publier sur le site officiel.

- **Photos** : enregistrées dans le stockage Supabase (bucket `photos/<id du commerce>/…`). Les anciennes photos enregistrées en texte sont déplacées automatiquement la première fois que le commerçant, un gérant ou un admin ouvre le site.
- **Rafraîchissement** : un compte connecté ne recharge que les lignes modifiées toutes les 90 s, et tout le catalogue toutes les 15 min.
- **Outil Excel** : `assets/xlsx-0.18.5.min.js` n'est chargé que sur la page Import (il n'est plus dans la page du site).
- **Comptes employés** : Pro > Équipe (forfait Premium) > Inviter un membre. On envoie le lien et le code à l'employé, qui se connecte avec son propre compte sur `#/rejoindre-equipe`.
