/*
 * Ce fichier gere le formulaire d'inscription des nouveaux utilisateurs.
 * Il envoie les champs saisis au backend, affiche le resultat dans la page
 * puis redirige vers l'accueil ou vers la destination demandee apres succes.
 * L'objectif est de garder une inscription simple et directe.
 */

// Cette fonction initialise la page d'inscription et prepare l'envoi du formulaire.
(async function initPage() {
    await (window.SortiesGuestPage || Promise.resolve());

    document.getElementById('form-inscription').addEventListener('submit', async (event) => {
        event.preventDefault();

        const msg = document.getElementById('msg');
        const body = {
            nom: document.getElementById('nom').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        };

        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(body)
        });

        if (res.ok) {
            const next = new URLSearchParams(window.location.search).get('next') || '/';
            msg.className = 'msg-ok';
            msg.textContent = 'Inscription reussie.';
            setTimeout(() => {
                window.location.href = next;
            }, 500);
            return;
        }

        const err = await res.json().catch(() => ({ error: 'erreur inconnue' }));
        msg.className = 'msg-err';
        msg.textContent = 'Erreur : ' + (err.error || 'erreur inconnue');
    });
})();