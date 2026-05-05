const Database = require('better-sqlite3');
const fs = require('fs');

// Connexion à la base de données
const db = new Database('sorties.db');

try {
    // Lecture du fichier SQL complet
    const sql = fs.readFileSync('bdd.sql', 'utf8');

    db.exec(sql);

    console.log('✅ Base de données créée avec succès (tables, triggers et données initiales).');
} catch (err) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données :');
    console.error(err.message);
} finally {
    db.close();
}