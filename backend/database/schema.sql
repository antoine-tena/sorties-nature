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
VALUES ('Demo', 'demo@sorties.local', '$2y$12$JvzLSIf.RTfFx3JUjazvkOHvbFo40K43k0CmYUqb9dRGrKDk2hloW');

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
    (titre, description, id_type_sortie, difficulte, distance, denivele_positif, chien_autorise, latitude, longitude, is_public)
VALUES
    ('Tour du Lac d''Annecy', 'Grande boucle autour du lac, tres accessible et ideale pour une longue journee.', 1, 'Moyen', 42.0, 320, 1, 45.8992470, 6.1293840, 1),
    ('Mont Veyrier par le versant ouest', 'Montee soutenue avec une belle vue sur Annecy et le lac.', 1, 'Moyen', 11.8, 780, 0, 45.9184210, 6.1605120, 1),
    ('Semnoz depuis Les Puisots', 'Randonnee forestiere reguliere jusqu''au plateau du Semnoz.', 1, 'Facile', 13.5, 640, 1, 45.8603120, 6.1041450, 1),
    ('Cascade d''Angon', 'Itineraire court avec passage en foret et vue sur la chute.', 1, 'Facile', 5.4, 340, 1, 45.8079610, 6.2139000, 1),
    ('Roc de Chere', 'Boucle nature entre foret, falaise et panorama sur le lac.', 1, 'Facile', 7.2, 260, 1, 45.8572740, 6.2008500, 1),
    ('Plateau des Glieres', 'Parcours sur le plateau avec ambiance alpage et histoire locale.', 1, 'Moyen', 10.6, 420, 1, 46.0435170, 6.3295770, 1),
    ('Parmelan par le Grand Montoir', 'Randonnee plus alpine avec montee physique et lapiaz au sommet.', 1, 'Difficile', 12.9, 980, 0, 45.9524480, 6.2404740, 1),
    ('La Tournette depuis Montmin', 'Grande classique au-dessus du lac avec final rocheux spectaculaire.', 1, 'Difficile', 14.4, 1450, 0, 45.8026040, 6.2451900, 1),
    ('Col de la Forclaz et belvederes', 'Randonnee plus contemplative vers plusieurs points de vue sur le lac.', 1, 'Facile', 8.1, 390, 1, 45.8010500, 6.2419000, 1),
    ('Reserve du Bout du Lac', 'Balade tres accessible en zone protegee avec roselieres et passerelles.', 1, 'Facile', 4.8, 80, 1, 45.7844490, 6.2201130, 1);

INSERT INTO realisations (id_sortie, date_realisation, commentaire)
VALUES
    (1, '2024-03-15', 'Beau temps, beaucoup de monde sur la piste.'),
    (2, '2024-04-07', 'Vue degagee au sommet, montee assez seche.'),
    (3, '2024-05-18', 'Sortie reguliere, ideale pour debuter en denivele.'),
    (5, '2024-06-02', 'Boucle tres agreable en foret.'),
    (7, '2024-07-20', 'Terrain calcaire glissant par endroits.'),
    (8, '2024-08-11', 'Depart matinal conseille pour eviter la chaleur.'),
    (10, '2024-09-01', 'Balade courte et tres facile en famille.');
