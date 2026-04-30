-- Désactiver les contraintes pour la recréation si besoin
PRAGMA foreign_keys = ON;

-- 1. Table des Types de Sorties
CREATE TABLE IF NOT EXISTS types_sortie (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL UNIQUE
);

-- 2. Table des Utilisateurs
CREATE TABLE IF NOT EXISTS utilisateurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pseudo TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

-- 3. Table des Sorties (Le parcours de base)
CREATE TABLE IF NOT EXISTS sorties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    description TEXT,
    point_depart_lat REAL,
    point_depart_lng REAL,
    trace_gpx TEXT, -- Stockage du contenu XML du fichier GPX ou chemin du fichier
    distance REAL,
    denivele_positif INTEGER,
    difficulte TEXT,
    chien_autorise BOOLEAN DEFAULT 1,
    id_type_sortie INTEGER,
    id_createur INTEGER,
    is_public BOOLEAN DEFAULT 1,
    FOREIGN KEY (id_type_sortie) REFERENCES types_sortie(id),
    FOREIGN KEY (id_createur) REFERENCES utilisateurs(id)
);

-- 4. Table des Réalisations (Historique des sorties faites)
CREATE TABLE IF NOT EXISTS realisations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_sortie INTEGER,
    id_utilisateur INTEGER,
    date_realisation DATE,
    commentaire TEXT,
    FOREIGN KEY (id_sortie) REFERENCES sorties(id) ON DELETE CASCADE,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id)
);

-- Insertion de quelques types de base
INSERT OR IGNORE INTO types_sortie (nom) VALUES ('Randonnée pédestre'), ('VTT'), ('Ski de rando'), ('Raquettes');