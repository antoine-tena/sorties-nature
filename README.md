# INFO633-Sorties

appli web pour gérer des sorties natures (rando, vtt, ski...)

## lancer le projet

```bash
npm install
node init_db.js
node server.js
```

ouvrir http://localhost:3000

## ce qui est fait
- liste des sorties avec filtres
- ajout d'une sortie (avec upload gpx)
- page detail avec suppression
- design responsive basique

## technologies
- node.js + express
- sqlite (better-sqlite3)
- html / css / js