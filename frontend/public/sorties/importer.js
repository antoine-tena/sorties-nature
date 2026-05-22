/*
 * Ce fichier s'occupe de l'import JSON des sorties depuis le navigateur.
 * Il lit le fichier choisi par l'utilisateur, verifie que le JSON est correct,
 * puis l'envoie au backend pour que l'import en base soit fait cote serveur.
 * La page reste volontairement simple et directe a utiliser.
 */

// Cette fonction initialise la page d'import et branche l'envoi du formulaire.
(async function initPage() {
    const session = await (window.SortiesProtectedPage || Promise.resolve({ user: true }));
    if (!session || !session.user) return;

    document.getElementById('form-import').addEventListener('submit', async (e) => {
        e.preventDefault();

        const fichier = document.getElementById('fichier').files[0];
        const msg = document.getElementById('msg');
        if (!fichier) return;

        const texte = await fichier.text();
        let data;
        try {
            data = JSON.parse(texte);
        } catch (err) {
            msg.className = 'msg-err';
            msg.textContent = 'Fichier JSON invalide.';
            return;
        }

        const res = await window.apiFetch('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            const result = await res.json();
            msg.className = 'msg-ok';
            msg.textContent = result.imported + ' sortie(s) importée(s) avec succès !';
        } else {
            const err = await res.json();
            msg.className = 'msg-err';
            msg.textContent = 'Erreur : ' + (err.error || 'inconnue');
        }
    });
})();