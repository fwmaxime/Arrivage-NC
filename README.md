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
