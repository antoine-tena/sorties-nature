const fs = require('fs');
const mysql = require('mysql2/promise');

// Configuration identique a celle du serveur pour pouvoir reinitialiser la base
// locale avec la meme base MySQL que l'application.
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'sorties_user',
    password: process.env.DB_PASSWORD || 'sorties_password',
    database: process.env.DB_NAME || 'sorties_natures',
    multipleStatements: true
};

// Le client mysql2 n'interprete pas les directives DELIMITER du client mysql.
// On les retire uniquement pour executer le trigger depuis Node.js.
function sqlForMysql2(sql) {
    return sql
        .replace(/^DELIMITER\s+\/\/\s*$/gm, '')
        .replace(/^DELIMITER\s+;\s*$/gm, '')
        .replace(/END\/\/\s*/g, 'END;');
}

async function main() {
    // bdd.sql contient le schema complet : tables, contraintes, trigger et donnees de demo.
    const sql = sqlForMysql2(fs.readFileSync('bdd.sql', 'utf8'));
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
