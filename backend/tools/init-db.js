const fs = require('fs');
const mysql = require('mysql2/promise');

/*
 * Ce script sert a reinitialiser rapidement la base MySQL en local.
 * Il relit le schema SQL du projet, adapte juste le format si besoin,
 * puis rejoue tout le contenu pour retrouver un etat propre de developpement.
 * C'est pratique quand on veut repartir de zero sans passer par Docker complet.
 */

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'sorties_user',
    password: process.env.DB_PASSWORD || 'sorties_password',
    database: process.env.DB_NAME || 'sorties_natures',
    multipleStatements: true
};

// Cette fonction adapte le schema SQL pour que mysql2 puisse executer correctement le trigger.
function sqlForMysql2(sql) {
    return sql
        .replace(/^DELIMITER\s+\/\/\s*$/gm, '')
        .replace(/^DELIMITER\s+;\s*$/gm, '')
        .replace(/END\/\/\s*/g, 'END;');
}

// Cette fonction relit le schema complet, ouvre la connexion puis rejoue l'initialisation de la base.
async function main() {
    const sqlPath = require('path').join(__dirname, '..', 'database', 'schema.sql');
    const sql = sqlForMysql2(fs.readFileSync(sqlPath, 'utf8'));
    const conn = await mysql.createConnection(config);

    try {
        await conn.query(sql);
        console.log('Base de donnees MySQL initialisee avec succes.');
    } finally {
        await conn.end();
    }
}

main().catch((err) => {
    console.error('Erreur lors de l initialisation de la base de donnees :');
    console.error(err.message);
    process.exit(1);
});
