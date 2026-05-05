-- Suppression des tables si elles existent (pour repartir de zéro lors de l'init)
DROP TABLE IF EXISTS realisations;
DROP TABLE IF EXISTS sorties;
DROP TABLE IF EXISTS types_sortie;
DROP TABLE IF EXISTS stats_eco;

-- 1. Table des types de sorties (Rando, Vélo, etc.)
CREATE TABLE types_sortie (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL UNIQUE
);

-- Insertion des types de base
INSERT INTO types_sortie (nom) VALUES ('Randonnée pédestre'), ('Vélo / VTT'), ('Ski / Raquettes'), ('Trail');

-- 2. Table des sorties (Point 1 du CDC : géo-référencement et caractéristiques)
CREATE TABLE sorties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    description TEXT,
    id_type_sortie INTEGER,
    difficulte TEXT, -- Facile, Moyen, Difficile
    distance REAL, -- en km
    denivele_positif INTEGER, -- en m
    chien_autorise INTEGER DEFAULT 1, -- 1 pour Oui, 0 pour Non
    trace_gpx TEXT, -- Chemin vers le fichier
    latitude REAL, -- Point de départ géo-référencé
    longitude REAL, -- Point de départ géo-référencé
    is_public INTEGER DEFAULT 1,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_type_sortie) REFERENCES types_sortie(id)
);

-- 3. Table des réalisations (Point 2 du CDC : dates multiples et commentaires)
CREATE TABLE realisations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_sortie INTEGER NOT NULL,
    date_realisation DATE NOT NULL,
    commentaire TEXT,
    FOREIGN KEY (id_sortie) REFERENCES sorties(id) ON DELETE CASCADE
);

-- 4. Table pour l'éco-conception (Point 4 : Statistiques centralisées côté SGBD)
CREATE TABLE stats_eco (
    label TEXT PRIMARY KEY,
    valeur INTEGER DEFAULT 0
);

INSERT INTO stats_eco (label, valeur) VALUES ('nb_total_sorties', 0);

-- 5. Trigger SGBD (Point 4 : Automatisation côté serveur de base de données)
-- Ce trigger incrémente automatiquement le compteur global à chaque nouvelle sortie
CREATE TRIGGER incrementer_stats_sorties
AFTER INSERT ON sorties
BEGIN
    UPDATE stats_eco 
    SET valeur = valeur + 1 
    WHERE label = 'nb_total_sorties';
END;

-- 6. Exemple de données pour tester
INSERT INTO sorties (titre, description, id_type_sortie, difficulte, distance, denivele_positif, latitude, longitude)
VALUES ('Tour du Lac d''Annecy', 'Une classique avec vue sur le lac.', 2, 'Moyen', 42.0, 300, 45.899247, 6.129384);

INSERT INTO realisations (id_sortie, date_realisation, commentaire)
VALUES (1, '2024-03-15', 'Beau temps, beaucoup de monde sur la piste.');