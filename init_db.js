const fs = require('fs');
const mysql = require('mysql2/promise');

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'sorties_user',
    password: process.env.DB_PASSWORD || 'sorties_password',
    database: process.env.DB_NAME || 'sorties_natures',
    multipleStatements: true
};

function sqlForMysql2(sql) {
    return sql
        .replace(/^DELIMITER\s+\/\/\s*$/gm, '')
        .replace(/^DELIMITER\s+;\s*$/gm, '')
        .replace(/END\/\/\s*/g, 'END;');
}

async function main() {
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
