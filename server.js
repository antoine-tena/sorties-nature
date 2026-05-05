// serveur principal express
const express = require('express');
const Database = require('better-sqlite3');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const db = new Database('sorties.db');
db.pragma('foreign_keys = ON');

// dossier pour les fichiers gpx uploades
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// recupere toutes les sorties
app.get('/api/sorties', (req, res) => {
    const sorties = db.prepare(`
        select s.*, t.nom as type_nom
        from sorties s
        left join types_sortie t on s.id_type_sortie = t.id
        order by s.id desc
    `).all();
    res.json(sorties);
});

// recupere une sortie par son id
app.get('/api/sorties/:id', (req, res) => {
    const s = db.prepare(`
        select s.*, t.nom as type_nom
        from sorties s
        left join types_sortie t on s.id_type_sortie = t.id
        where s.id = ?
    `).get(req.params.id);

    if (!s) return res.status(404).json({ error: 'pas trouve' });
    res.json(s);
});

// ajouter une sortie
app.post('/api/sorties', upload.single('gpx'), (req, res) => {
    const { titre, description, distance, denivele_positif, difficulte, chien_autorise, id_type_sortie, is_public } = req.body;

    const gpx = req.file ? '/uploads/' + req.file.filename : null;

    const r = db.prepare(`
        insert into sorties (titre, description, distance, denivele_positif, difficulte, chien_autorise, id_type_sortie, is_public, trace_gpx)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(titre, description || null, distance || null, denivele_positif || null, difficulte || null,
           chien_autorise == '1' ? 1 : 0, id_type_sortie || null, is_public == '0' ? 0 : 1, gpx);

    res.json({ id: r.lastInsertRowid });
});

// supprimer une sortie
app.delete('/api/sorties/:id', (req, res) => {
    db.prepare('delete from sorties where id = ?').run(req.params.id);
    res.json({ ok: true });
});

// recupere les types
app.get('/api/types', (req, res) => {
    res.json(db.prepare('select * from types_sortie').all());
});

app.listen(3000, () => console.log('serveur sur http://localhost:3000'));
