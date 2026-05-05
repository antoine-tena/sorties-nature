// script pour creer la bdd depuis le fichier sql
const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('sorties.db');
const sql = fs.readFileSync('bdd.sql', 'utf8');

sql.split(';').map(s => s.trim()).filter(s => s.length > 0).forEach(s => {
    db.exec(s + ';');
});

console.log('bdd creee');
db.close();
