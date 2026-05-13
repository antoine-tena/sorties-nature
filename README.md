# INFO633-Sorties

Application web pour gérer des sorties nature : randonnée, vélo, ski, trail, etc.

## Lancer le projet

```bash
npm install
docker compose up -d
npm start
```

Ouvrir ensuite http://localhost:3000

La base MySQL est initialisée automatiquement au premier lancement du conteneur avec `bdd.sql`.

## Réinitialiser la base

Si le volume Docker existe déjà, MySQL ne rejoue pas automatiquement le script SQL.

```bash
docker compose down -v
docker compose up -d
```

Ou, si le conteneur MySQL tourne déjà :

```bash
npm run db:init
```

## Configuration

Les valeurs par défaut sont compatibles avec `docker-compose.yml`.

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sorties_natures
DB_USER=sorties_user
DB_PASSWORD=sorties_password
```

## Fonctionnalités backend

- Liste, détail, ajout, modification et suppression de sorties.
- Upload et stockage du chemin d'un fichier GPX.
- Stockage du point de départ géoréférencé avec latitude et longitude.
- Gestion des types de sortie.
- Ajout, modification, suppression et consultation des réalisations.
- Export JSON global via `GET /api/export`.
- Import JSON via `POST /api/import`.
- Statistiques SQL via `GET /api/stats`.

## Technologies

- Node.js + Express
- MySQL 8 via Docker Compose
- HTML / CSS / JavaScript
