// Serveur principal Express : expose l'API JSON et sert l'interface statique.
const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const upload = multer({ dest: 'uploads/' });
const sessions = new Map();

// Les fichiers GPX sont stockes sur disque ; la base garde uniquement leur chemin public.
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Pool de connexions MySQL partage par toutes les routes pour eviter de rouvrir
// une connexion a chaque requete HTTP.
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

// Convertit les champs numeriques optionnels du front en NULL SQL quand ils sont vides.
function toNullableNumber(value) {
    if (value === undefined || value === null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

// MySQL stocke les booleens sous forme TINYINT(1), donc on normalise ici les valeurs
// venant des formulaires HTML, du JSON ou des imports.
function toBooleanInt(value, defaultValue = 0) {
    if (value === undefined || value === null || value === '') return defaultValue;
    return value === true || value === 'true' || value === '1' || value === 1 ? 1 : 0;
}

// Centralise la forme d'une sortie avant insertion ou modification pour garder
// les routes POST, PUT et import JSON coherentes entre elles.
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

// Requete commune au detail et a la modification d'une sortie.
async function getSortieById(id) {
    const [rows] = await pool.execute(`
        SELECT s.*, t.nom AS type_nom
        FROM sorties s
        LEFT JOIN types_sortie t ON s.id_type_sortie = t.id
        WHERE s.id = ?
    `, [id]);
    return rows[0];
}

// Evite de repeter try/catch dans chaque route asynchrone Express.
function asyncRoute(handler) {
    return async (req, res, next) => {
        try {
            await handler(req, res, next);
        } catch (err) {
            next(err);
        }
    };
}

function parseCookies(req) {
    const raw = req.headers.cookie || '';
    return raw
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .reduce((cookies, part) => {
            const separatorIndex = part.indexOf('=');
            if (separatorIndex === -1) return cookies;

            const key = part.slice(0, separatorIndex).trim();
            const value = part.slice(separatorIndex + 1).trim();
            cookies[key] = decodeURIComponent(value);
            return cookies;
        }, {});
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function createSessionToken() {
    return crypto.randomBytes(24).toString('hex');
}

function setSessionCookie(res, token) {
    res.setHeader('Set-Cookie', `sorties_session=${token}; Path=/; HttpOnly; SameSite=Lax`);
}

function clearSessionCookie(res) {
    res.setHeader('Set-Cookie', 'sorties_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

function currentSession(req) {
    const cookies = parseCookies(req);
    const token = cookies.sorties_session;
    return token ? sessions.get(token) || null : null;
}

function exposeUser(user) {
    return {
        id: user.id,
        nom: user.nom,
        email: user.email
    };
}

// Pendant l'import, un fichier peut fournir seulement le nom du type.
// On reutilise le type existant ou on le cree si necessaire.
async function resolveTypeId(conn, sortie) {
    if (sortie.id_type_sortie) return sortie.id_type_sortie;
    if (!sortie.type_nom) return null;

    const [existing] = await conn.execute('SELECT id FROM types_sortie WHERE nom = ?', [sortie.type_nom]);
    if (existing[0]) return existing[0].id;

    const [created] = await conn.execute('INSERT INTO types_sortie (nom) VALUES (?)', [sortie.type_nom]);
    return created.insertId;
}

app.get('/api/auth/session', (req, res) => {
    const user = currentSession(req);
    res.json({ user: user ? exposeUser(user) : null });
});

app.post('/api/auth/register', asyncRoute(async (req, res) => {
    const nom = (req.body.nom || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!nom || !email || !password) {
        return res.status(400).json({ error: 'nom, email et mot de passe obligatoires' });
    }

    if (password.length < 4) {
        return res.status(400).json({ error: 'mot de passe trop court' });
    }

    try {
        const [result] = await pool.execute(`
            INSERT INTO utilisateurs (nom, email, mot_de_passe_hash)
            VALUES (?, ?, ?)
        `, [nom, email, hashPassword(password)]);

        const user = { id: result.insertId, nom, email };
        const token = createSessionToken();
        sessions.set(token, user);
        setSessionCookie(res, token);
        res.status(201).json({ user: exposeUser(user) });
    } catch (err) {
        if (err && err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'email deja utilise' });
        }
        throw err;
    }
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!email || !password) {
        return res.status(400).json({ error: 'email et mot de passe obligatoires' });
    }

    const [rows] = await pool.execute(`
        SELECT id, nom, email, mot_de_passe_hash
        FROM utilisateurs
        WHERE email = ?
    `, [email]);

    const user = rows[0];
    if (!user || user.mot_de_passe_hash !== hashPassword(password)) {
        return res.status(401).json({ error: 'identifiants invalides' });
    }

    const sessionUser = exposeUser(user);
    const token = createSessionToken();
    sessions.set(token, sessionUser);
    setSessionCookie(res, token);
    res.json({ user: sessionUser });
}));

app.post('/api/auth/logout', (req, res) => {
    const cookies = parseCookies(req);
    if (cookies.sorties_session) {
        sessions.delete(cookies.sorties_session);
    }
    clearSessionCookie(res);
    res.json({ ok: true });
});

// Liste toutes les sorties avec leur type pour l'affichage et les filtres.
app.get('/api/sorties', asyncRoute(async (req, res) => {
    const [rows] = await pool.execute(`
        SELECT s.*, t.nom AS type_nom
        FROM sorties s
        LEFT JOIN types_sortie t ON s.id_type_sortie = t.id
        ORDER BY s.id DESC
    `);
    res.json(rows);
}));

// Export global : chaque sortie embarque ses realisations pour produire un fichier autonome.
app.get('/api/export', asyncRoute(async (req, res) => {
    const [sorties] = await pool.execute(`
        SELECT s.*, t.nom AS type_nom
        FROM sorties s
        LEFT JOIN types_sortie t ON s.id_type_sortie = t.id
        ORDER BY s.id
    `);
    const [realisations] = await pool.execute('SELECT * FROM realisations ORDER BY id_sortie, date_realisation DESC');

    // Regroupe les realisations en memoire pour eviter une requete SQL par sortie.
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

// Import JSON de sorties. Accepte soit { sorties: [...] }, soit directement [...].
app.post('/api/import', asyncRoute(async (req, res) => {
    const sorties = Array.isArray(req.body) ? req.body : req.body.sorties;
    if (!Array.isArray(sorties)) {
        return res.status(400).json({ error: 'format invalide: tableau de sorties attendu' });
    }

    const conn = await pool.getConnection();
    try {
        // Transaction : soit tout l'import passe, soit aucune ligne partielle n'est gardee.
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

            // Les realisations importees sont rattachees au nouvel id genere localement.
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

// Detail d'une sortie.
app.get('/api/sorties/:id', asyncRoute(async (req, res) => {
    const sortie = await getSortieById(req.params.id);
    if (!sortie) return res.status(404).json({ error: 'sortie introuvable' });
    res.json(sortie);
}));

// Ajoute une sortie, avec un fichier GPX optionnel envoye en multipart/form-data.
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

// Modifie une sortie en conservant les anciennes valeurs quand un champ n'est pas renvoye.
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

// Supprime une sortie ; les realisations associees sont supprimees par la contrainte SQL.
app.delete('/api/sorties/:id', asyncRoute(async (req, res) => {
    await pool.execute('DELETE FROM sorties WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
}));

// Types disponibles pour les formulaires et filtres.
app.get('/api/types', asyncRoute(async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM types_sortie ORDER BY nom');
    res.json(rows);
}));

// Statistiques maintenues cote base de donnees, notamment via trigger SQL.
app.get('/api/stats', asyncRoute(async (req, res) => {
    const [rows] = await pool.execute('SELECT label, valeur FROM stats_eco ORDER BY label');
    res.json(rows);
}));

// Recupere l'historique des dates auxquelles une sortie a ete realisee.
app.get('/api/realisations/:id', asyncRoute(async (req, res) => {
    const [rows] = await pool.execute(
        'SELECT * FROM realisations WHERE id_sortie = ? ORDER BY date_realisation DESC',
        [req.params.id]
    );
    res.json(rows);
}));

// Ajoute une date de realisation avec un commentaire specifique.
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

// Modifie le commentaire ou la date d'une realisation existante.
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

// Supprime une realisation sans supprimer la sortie associee.
app.delete('/api/realisations/:id', asyncRoute(async (req, res) => {
    await pool.execute('DELETE FROM realisations WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
}));

app.use((err, req, res, next) => {
    // Dernier filet de securite : les erreurs SQL ou serveur restent journalisees,
    // mais la reponse envoyee au client reste simple.
    console.error(err);
    res.status(500).json({ error: 'erreur serveur' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`serveur sur http://localhost:${port}`));
