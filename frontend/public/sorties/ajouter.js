/*
 * Ce fichier gere la creation d'une nouvelle sortie depuis le formulaire.
 * Il charge les types, recupere les champs saisis, ajoute eventuellement
 * un GPX genere depuis la carte puis envoie le tout au backend.
 * C'est la logique principale de la page d'ajout.
 */

const traceEditorAjout = window.TraceMapEditor
    ? window.TraceMapEditor.create({
        mapId: 'carte-trace-ajout',
        latInputId: 'latitude',
        lngInputId: 'longitude',
        fileInputId: 'gpx',
        exportButtonId: 'export-gpx',
        clearButtonId: 'vider-trace',
        infoId: 'trace-info'
    })
    : null;

// Cette fonction charge les types disponibles pour remplir la liste deroulante du formulaire.
async function chargerTypesAjout() {
    const res = await window.apiFetch('/api/types');
    const types = await res.json();
    const sel = document.getElementById('id_type_sortie');
    types.forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.nom;
        sel.appendChild(opt);
    });
}

// Cette fonction prepare l'envoi du formulaire d'ajout puis gere le message de retour.
async function soumettreAjout(e) {
    e.preventDefault();
    const msg = document.getElementById('msg');
    const formData = new FormData(e.currentTarget);

    if (traceEditorAjout) {
        traceEditorAjout.appendGeneratedTraceFile(formData, formData.get('titre'));
    }

    if (!e.currentTarget.querySelector('[name="chien_autorise"]').checked) {
        formData.set('chien_autorise', '0');
    }

    try {
        const res = await window.apiFetch('/api/sorties', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            const data = await res.json();
            msg.textContent = 'Sortie ajoutee !';
            msg.className = 'msg-ok';
            setTimeout(() => {
                window.location.href = '/sorties/detail.html?id=' + data.id;
            }, 800);
            return;
        }

        const err = await res.json().catch(() => ({ error: 'erreur inconnue' }));
        msg.textContent = 'Erreur : ' + (err.error || 'erreur inconnue');
        msg.className = 'msg-err';
    } catch (err) {
        msg.textContent = 'Erreur : ' + err.message;
        msg.className = 'msg-err';
    }
}

// Cette fonction initialise la page d'ajout une fois la session verifiee.
(async function initPage() {
    const session = await (window.SortiesProtectedPage || Promise.resolve({ user: true }));
    if (!session || !session.user) return;
    await chargerTypesAjout();
    document.getElementById('form-ajout').addEventListener('submit', soumettreAjout);
})();