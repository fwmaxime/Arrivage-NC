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
