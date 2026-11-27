# ARRIVAGE NC

Site : https://arrivagenc.com (GitHub Pages, branche `main`, racine).

**Le site est en maintenance** : `index.html` est la page « ARRIVAGE revient bientôt ».

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
