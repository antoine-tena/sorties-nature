/*
 * Ce fichier pilote la page d'accueil qui liste toutes les sorties.
 * Il charge les donnees depuis l'API, remplit les filtres disponibles,
 * puis reconstruit l'affichage en fonction de la recherche de l'utilisateur.
 * C'est donc la logique principale de consultation du catalogue.
 */

const escapeHtml = window.SortiesHtml
    ? window.SortiesHtml.escape
    : (value) => String(value ?? '');

let toutesLesSorties = [];

// Cette fonction charge toutes les sorties puis demande aussi la liste des types disponibles.
async function chargerSorties() {
    const res = await window.apiFetch('/api/sorties');
    toutesLesSorties = await res.json();
    afficherSorties(toutesLesSorties);
    await chargerTypes();
}

// Cette fonction remplit le select des types a partir des donnees renvoyees par l'API.
async function chargerTypes() {
    const res = await window.apiFetch('/api/types');
    const types = await res.json();
    const sel = document.getElementById('filtre-type');
    sel.innerHTML = '<option value="">Tous les types</option>';
    types.forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t.nom;
        opt.textContent = t.nom;
        sel.appendChild(opt);
    });
}

// Cette fonction genere les cartes HTML de la liste a partir des sorties filtrees.
function afficherSorties(liste) {
    const div = document.getElementById('liste-sorties');
    const compteur = document.getElementById('compteur');
    compteur.textContent = liste.length + ' sortie(s) trouvée(s)';

    if (liste.length === 0) {
        div.innerHTML = '<p>Aucune sortie.</p>';
        return;
    }

    let html = '<div class="grille">';
    liste.forEach((s) => {
        const sortieId = Number(s.id) || 0;
        const description = typeof s.description === 'string' ? s.description : '';
        const descriptionResume = description.length > 80 ? `${description.substring(0, 80)}...` : description;

        html += `
        <div class="carte">
            <h3>${escapeHtml(s.titre)}</h3>
            <div>
                ${s.type_nom ? '<span class="badge">' + escapeHtml(s.type_nom) + '</span>' : ''}
                ${s.difficulte ? '<span class="badge">' + escapeHtml(s.difficulte) + '</span>' : ''}
                ${s.chien_autorise ? '<span class="badge">chien ok</span>' : ''}
            </div>
            ${description ? '<p class="carte-desc">' + escapeHtml(descriptionResume) + '</p>' : ''}
            <p class="infos">
                ${s.distance ? s.distance + ' km' : ''}
                ${s.distance && s.denivele_positif ? ' • ' : ''}
                ${s.denivele_positif ? '+' + s.denivele_positif + 'm' : ''}
            </p>
            <a href="/sorties/detail.html?id=${sortieId}" class="btn btn-vert">Voir</a>
        </div>`;
    });
    html += '</div>';
    div.innerHTML = html;
}

// Cette fonction applique les filtres saisis dans la page sur la liste complete en memoire.
function filtrer() {
    const texte = document.getElementById('recherche').value.toLowerCase();
    const type = document.getElementById('filtre-type').value;
    const difficulte = document.getElementById('filtre-difficulte').value;
    const chien = document.getElementById('filtre-chien').checked;

    const filtre = toutesLesSorties.filter((s) => {
        if (texte && !s.titre.toLowerCase().includes(texte)) return false;
        if (type && s.type_nom !== type) return false;
        if (difficulte && s.difficulte !== difficulte) return false;
        if (chien && !s.chien_autorise) return false;
        return true;
    });
    afficherSorties(filtre);
}

document.getElementById('recherche').addEventListener('input', filtrer);
document.getElementById('filtre-type').addEventListener('change', filtrer);
document.getElementById('filtre-difficulte').addEventListener('change', filtrer);
document.getElementById('filtre-chien').addEventListener('change', filtrer);

// Cette fonction initialise la page protegee puis lance le premier chargement des sorties.
(async function initPage() {
    const session = await (window.SortiesProtectedPage || Promise.resolve({ user: true }));
    if (!session || !session.user) return;
    await chargerSorties();
})();