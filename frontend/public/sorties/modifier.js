const paramsModifier = new URLSearchParams(window.location.search);
const idModifier = paramsModifier.get('id');
const traceEditorModifier = window.TraceMapEditor
    ? window.TraceMapEditor.create({
        mapId: 'carte-trace-modifier',
        latInputId: 'latitude',
        lngInputId: 'longitude',
        fileInputId: 'gpx',
        exportButtonId: 'export-gpx',
        clearButtonId: 'vider-trace',
        infoId: 'trace-info'
    })
    : null;

if (!idModifier) {
    window.location.href = '/';
} else {
    document.getElementById('btn-annuler').href = '/sorties/detail.html?id=' + idModifier;
}

async function chargerTypesModifier() {
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

async function chargerSortieModifier() {
    await chargerTypesModifier();

    const res = await window.apiFetch('/api/sorties/' + idModifier);
    if (!res.ok) {
        alert('Sortie introuvable');
        window.location.href = '/';
        return;
    }

    const s = await res.json();
    document.getElementById('titre').value = s.titre || '';
    document.getElementById('description').value = s.description || '';
    document.getElementById('difficulte').value = s.difficulte || '';
    document.getElementById('distance').value = s.distance || '';
    document.getElementById('denivele_positif').value = s.denivele_positif || '';
    document.getElementById('latitude').value = s.latitude || '';
    document.getElementById('longitude').value = s.longitude || '';
    document.getElementById('chien_autorise').checked = !!s.chien_autorise;

    if (s.id_type_sortie) {
        document.getElementById('id_type_sortie').value = s.id_type_sortie;
    }

    if (traceEditorModifier) {
        if (s.trace_gpx) {
            await traceEditorModifier.loadFromUrl(s.trace_gpx);
        } else if (s.latitude && s.longitude) {
            traceEditorModifier.centerOn(s.latitude, s.longitude);
        }
    }
}

async function soumettreModification(e) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    formData.set('_method', 'PUT');

    if (traceEditorModifier) {
        traceEditorModifier.appendGeneratedTraceFile(formData, formData.get('titre'));
    }

    if (!document.getElementById('chien_autorise').checked) {
        formData.set('chien_autorise', '0');
    }

    const res = await window.apiFetch('/api/sorties/' + idModifier, {
        method: 'POST',
        body: formData
    });

    const msg = document.getElementById('msg');
    if (res.ok) {
        msg.className = 'msg-ok';
        msg.textContent = 'Sortie modifiée !';
        setTimeout(() => window.location.href = '/sorties/detail.html?id=' + idModifier, 800);
    } else {
        const err = await res.json();
        msg.className = 'msg-err';
        msg.textContent = 'Erreur : ' + (err.error || 'inconnue');
    }
}

(async function initPage() {
    const session = await (window.SortiesProtectedPage || Promise.resolve({ user: true }));
    if (!session || !session.user) return;
    await chargerSortieModifier();
    document.getElementById('form-modifier').addEventListener('submit', soumettreModification);
})();