-- Reinitialisation complete : utile en developpement et lors du premier lancement Docker.
DROP TABLE IF EXISTS utilisateurs;
DROP TABLE IF EXISTS realisations;
DROP TABLE IF EXISTS sorties;
DROP TABLE IF EXISTS types_sortie;
DROP TABLE IF EXISTS stats_eco;

-- Comptes applicatifs pour la connexion, l'inscription et la deconnexion.
CREATE TABLE utilisateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Catalogue des types de sorties pour eviter les valeurs libres incoherentes.
CREATE TABLE types_sortie (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO types_sortie (nom) VALUES
    ('Randonnée pédestre'),
    ('Vélo / VTT'),
    ('Ski / Raquettes'),
    ('Trail');

-- Entite principale du projet : une sortie possede un depart geolocalise,
-- un parcours decrit ou GPX, et des caracteristiques pratiques.
CREATE TABLE sorties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(150) NOT NULL,
    description TEXT,
    id_type_sortie INT,
    difficulte VARCHAR(50),
    distance DECIMAL(8, 2),
    denivele_positif INT,
    chien_autorise TINYINT(1) DEFAULT 1,
    trace_gpx VARCHAR(255),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    is_public TINYINT(1) DEFAULT 1,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Si un type est supprime, la sortie reste consultable sans type associe.
    CONSTRAINT fk_sorties_type
        FOREIGN KEY (id_type_sortie) REFERENCES types_sortie(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- Historique des realisations : une sortie peut etre effectuee plusieurs fois.
CREATE TABLE realisations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_sortie INT NOT NULL,
    date_realisation DATE NOT NULL,
    commentaire TEXT,
    -- Les realisations n'ont pas de sens sans leur sortie.
    CONSTRAINT fk_realisations_sortie
        FOREIGN KEY (id_sortie) REFERENCES sorties(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- Table volontairement simple pour centraliser des compteurs calcules cote SGBD.
CREATE TABLE stats_eco (
    label VARCHAR(100) PRIMARY KEY,
    valeur INT DEFAULT 0
);

INSERT INTO stats_eco (label, valeur) VALUES ('nb_total_sorties', 0);

INSERT INTO utilisateurs (nom, email, mot_de_passe_hash)
VALUES ('Demo', 'demo@sorties.local', SHA2('demo1234', 256));

DELIMITER //
-- Exemple de logique cote base : le compteur est mis a jour sans code applicatif.
CREATE TRIGGER incrementer_stats_sorties
AFTER INSERT ON sorties
FOR EACH ROW
BEGIN
    UPDATE stats_eco
    SET valeur = valeur + 1
    WHERE label = 'nb_total_sorties';
END//
DELIMITER ;

INSERT INTO sorties
    (titre, description, id_type_sortie, difficulte, distance, denivele_positif, latitude, longitude, is_public)
VALUES
    ('Tour du Lac d''Annecy', 'Une classique avec vue sur le lac.', 2, 'Moyen', 42.0, 300, 45.8992470, 6.1293840, 1);

INSERT INTO realisations (id_sortie, date_realisation, commentaire)
VALUES (1, '2024-03-15', 'Beau temps, beaucoup de monde sur la piste.');
