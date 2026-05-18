let toutesLesSorties = [];

async function chargerSorties() {
    const res = await window.apiFetch('/api/sorties');
    toutesLesSorties = await res.json();
    afficherSorties(toutesLesSorties);
    await chargerTypes();
}

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
        html += `
        <div class="carte">
            <h3>${s.titre}</h3>
            <div>
                ${s.type_nom ? '<span class="badge">' + s.type_nom + '</span>' : ''}
                ${s.difficulte ? '<span class="badge">' + s.difficulte + '</span>' : ''}
                ${s.chien_autorise ? '<span class="badge">chien ok</span>' : ''}
            </div>
            ${s.description ? '<p class="carte-desc">' + s.description.substring(0, 80) + (s.description.length > 80 ? '...' : '') + '</p>' : ''}
            <p class="infos">
                ${s.distance ? s.distance + ' km' : ''}
                ${s.distance && s.denivele_positif ? ' • ' : ''}
                ${s.denivele_positif ? '+' + s.denivele_positif + 'm' : ''}
            </p>
            <a href="sortie.html?id=${s.id}" class="btn btn-vert">Voir</a>
        </div>`;
    });
    html += '</div>';
    div.innerHTML = html;
}

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

(async function initPage() {
    const session = await (window.SortiesProtectedPage || Promise.resolve({ user: true }));
    if (!session || !session.user) return;
    await chargerSorties();
})();