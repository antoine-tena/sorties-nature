# INFO633-Sorties

Application web pour gérer des sorties nature : randonnée, vélo, ski, trail, etc.

## Lancer le projet

```bash
docker compose up -d --build
```

Ouvrir ensuite http://localhost:3000

La base MySQL est initialisée automatiquement au premier lancement du conteneur avec `backend/database/schema.sql`.
L'application web est désormais servie par PHP/Apache, et l'acces a la base se fait via le dossier `backend`.

## Réorganisation du dépôt

- `backend` : code serveur, organise par fonctionnalite (`auth`, `sorties`, `realisations`, `meta`, `shared`).
- `frontend/public` : site web public, organise par fonctionnalite (`auth`, `sorties`, `shared`).
- `backend/database/schema.sql` : schema et donnees de demonstration.
- `backend/tools/init-db.js` : script local de reinitialisation.
- `docker/php` : configuration de l'image Apache/PHP.
- `docs` : fichiers annexes (`mcd.txt`, `presentation.txt`, `git.md`, exemple GPX).

## Réinitialiser la base

Si le volume Docker existe déjà, MySQL ne rejoue pas automatiquement le script SQL.

```bash
docker compose down -v
docker compose up -d
```

Ou, si le conteneur MySQL tourne déjà :

```bash
npm install
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

- PHP + Apache
- MySQL 8 via Docker Compose
- HTML / CSS / JavaScript
- Node.js uniquement pour le script local de réinitialisation `npm run db:init`
