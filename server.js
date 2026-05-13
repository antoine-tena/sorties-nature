// serveur principal express
const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'sorties_user',
    password: process.env.DB_PASSWORD || 'sorties_password',
    database: process.env.DB_NAME || 'sorties_natures',
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true
});

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

function toNullableNumber(value) {
    if (value === undefined || value === null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function toBooleanInt(value, defaultValue = 0) {
    if (value === undefined || value === null || value === '') return defaultValue;
    return value === true || value === 'true' || value === '1' || value === 1 ? 1 : 0;
}

function sortiePayload(body, file) {
    return {
        titre: body.titre,
        description: body.description || null,
        id_type_sortie: toNullableNumber(body.id_type_sortie),
        difficulte: body.difficulte || null,
        distance: toNullableNumber(body.distance),
        denivele_positif: toNullableNumber(body.denivele_positif),
        chien_autorise: toBooleanInt(body.chien_autorise, 1),
        is_public: toBooleanInt(body.is_public, 1),
        trace_gpx: file ? '/uploads/' + file.filename : body.trace_gpx || null,
        latitude: toNullableNumber(body.latitude),
        longitude: toNullableNumber(body.longitude)
    };
}

async function getSortieById(id) {
    const [rows] = await pool.execute(`
        SELECT s.*, t.nom AS type_nom
        FROM sorties s
        LEFT JOIN types_sortie t ON s.id_type_sortie = t.id
        WHERE s.id = ?
    `, [id]);
    return rows[0];
}

function asyncRoute(handler) {
    return async (req, res, next) => {
        try {
            await handler(req, res, next);
        } catch (err) {
            next(err);
        }
    };
}

async function resolveTypeId(conn, sortie) {
    if (sortie.id_type_sortie) return sortie.id_type_sortie;
    if (!sortie.type_nom) return null;

    const [existing] = await conn.execute('SELECT id FROM types_sortie WHERE nom = ?', [sortie.type_nom]);
    if (existing[0]) return existing[0].id;

    const [created] = await conn.execute('INSERT INTO types_sortie (nom) VALUES (?)', [sortie.type_nom]);
    return created.insertId;
}

// recupere toutes les sorties
app.get('/api/sorties', asyncRoute(async (req, res) => {
    const [rows] = await pool.execute(`
        SELECT s.*, t.nom AS type_nom
        FROM sorties s
        LEFT JOIN types_sortie t ON s.id_type_sortie = t.id
        ORDER BY s.id DESC
    `);
    res.json(rows);
}));

// export JSON de toutes les sorties avec leurs realisations
app.get('/api/export', asyncRoute(async (req, res) => {
    const [sorties] = await pool.execute(`
        SELECT s.*, t.nom AS type_nom
        FROM sorties s
        LEFT JOIN types_sortie t ON s.id_type_sortie = t.id
        ORDER BY s.id
    `);
    const [realisations] = await pool.execute('SELECT * FROM realisations ORDER BY id_sortie, date_realisation DESC');

    const realisationsParSortie = new Map();
    realisations.forEach((realisation) => {
        const liste = realisationsParSortie.get(realisation.id_sortie) || [];
        liste.push(realisation);
        realisationsParSortie.set(realisation.id_sortie, liste);
    });

    res.json({
        format: 'sorties-natures-json-v1',
        exported_at: new Date().toISOString(),
        sorties: sorties.map((sortie) => ({
            ...sortie,
            realisations: realisationsParSortie.get(sortie.id) || []
        }))
    });
}));

// import JSON de sorties. Accepte soit { sorties: [...] }, soit directement [...]
app.post('/api/import', asyncRoute(async (req, res) => {
    const sorties = Array.isArray(req.body) ? req.body : req.body.sorties;
    if (!Array.isArray(sorties)) {
        return res.status(400).json({ error: 'format invalide: tableau de sorties attendu' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        let imported = 0;

        for (const item of sorties) {
            if (!item.titre) continue;
            const payload = sortiePayload(item);
            payload.id_type_sortie = await resolveTypeId(conn, item);
            const [result] = await conn.execute(`
                INSERT INTO sorties
                    (titre, description, id_type_sortie, difficulte, distance, denivele_positif,
                     chien_autorise, is_public, trace_gpx, latitude, longitude)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                payload.titre,
                payload.description,
                payload.id_type_sortie,
                payload.difficulte,
                payload.distance,
                payload.denivele_positif,
                payload.chien_autorise,
                payload.is_public,
                payload.trace_gpx,
                payload.latitude,
                payload.longitude
            ]);

            if (Array.isArray(item.realisations)) {
                for (const realisation of item.realisations) {
                    if (!realisation.date_realisation) continue;
                    await conn.execute(`
                        INSERT INTO realisations (id_sortie, date_realisation, commentaire)
                        VALUES (?, ?, ?)
                    `, [result.insertId, realisation.date_realisation, realisation.commentaire || null]);
                }
            }
            imported += 1;
        }

        await conn.commit();
        res.json({ imported });
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}));

// recupere une sortie par son id
app.get('/api/sorties/:id', asyncRoute(async (req, res) => {
    const sortie = await getSortieById(req.params.id);
    if (!sortie) return res.status(404).json({ error: 'sortie introuvable' });
    res.json(sortie);
}));

// ajouter une sortie
app.post('/api/sorties', upload.single('gpx'), asyncRoute(async (req, res) => {
    const payload = sortiePayload(req.body, req.file);
    if (!payload.titre) return res.status(400).json({ error: 'titre obligatoire' });

    const [result] = await pool.execute(`
        INSERT INTO sorties
            (titre, description, id_type_sortie, difficulte, distance, denivele_positif,
             chien_autorise, is_public, trace_gpx, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        payload.titre,
        payload.description,
        payload.id_type_sortie,
        payload.difficulte,
        payload.distance,
        payload.denivele_positif,
        payload.chien_autorise,
        payload.is_public,
        payload.trace_gpx,
        payload.latitude,
        payload.longitude
    ]);

    res.status(201).json({ id: result.insertId });
}));

// modifier une sortie
app.put('/api/sorties/:id', upload.single('gpx'), asyncRoute(async (req, res) => {
    const existing = await getSortieById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'sortie introuvable' });

    const payload = sortiePayload({ ...existing, ...req.body }, req.file);
    if (!payload.titre) return res.status(400).json({ error: 'titre obligatoire' });

    await pool.execute(`
        UPDATE sorties
        SET titre = ?, description = ?, id_type_sortie = ?, difficulte = ?, distance = ?,
            denivele_positif = ?, chien_autorise = ?, is_public = ?, trace_gpx = ?,
            latitude = ?, longitude = ?
        WHERE id = ?
    `, [
        payload.titre,
        payload.description,
        payload.id_type_sortie,
        payload.difficulte,
        payload.distance,
        payload.denivele_positif,
        payload.chien_autorise,
        payload.is_public,
        payload.trace_gpx,
        payload.latitude,
        payload.longitude,
        req.params.id
    ]);

    res.json({ ok: true });
}));

// supprimer une sortie
app.delete('/api/sorties/:id', asyncRoute(async (req, res) => {
    await pool.execute('DELETE FROM sorties WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
}));

// recupere les types
app.get('/api/types', asyncRoute(async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM types_sortie ORDER BY nom');
    res.json(rows);
}));

// statistiques calculees cote base de donnees
app.get('/api/stats', asyncRoute(async (req, res) => {
    const [rows] = await pool.execute('SELECT label, valeur FROM stats_eco ORDER BY label');
    res.json(rows);
}));

// recupere les realisations d'une sortie
app.get('/api/realisations/:id', asyncRoute(async (req, res) => {
    const [rows] = await pool.execute(
        'SELECT * FROM realisations WHERE id_sortie = ? ORDER BY date_realisation DESC',
        [req.params.id]
    );
    res.json(rows);
}));

// ajouter une realisation
app.post('/api/realisations', asyncRoute(async (req, res) => {
    const { id_sortie, date_realisation, commentaire } = req.body;
    if (!id_sortie || !date_realisation) {
        return res.status(400).json({ error: 'id_sortie et date_realisation obligatoires' });
    }

    const [result] = await pool.execute(`
        INSERT INTO realisations (id_sortie, date_realisation, commentaire)
        VALUES (?, ?, ?)
    `, [id_sortie, date_realisation, commentaire || null]);

    res.status(201).json({ id: result.insertId });
}));

// modifier une realisation
app.put('/api/realisations/:id', asyncRoute(async (req, res) => {
    const { date_realisation, commentaire } = req.body;
    if (!date_realisation) return res.status(400).json({ error: 'date_realisation obligatoire' });

    await pool.execute(`
        UPDATE realisations
        SET date_realisation = ?, commentaire = ?
        WHERE id = ?
    `, [date_realisation, commentaire || null, req.params.id]);

    res.json({ ok: true });
}));

// supprimer une realisation
app.delete('/api/realisations/:id', asyncRoute(async (req, res) => {
    await pool.execute('DELETE FROM realisations WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
}));

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'erreur serveur' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`serveur sur http://localhost:${port}`));
