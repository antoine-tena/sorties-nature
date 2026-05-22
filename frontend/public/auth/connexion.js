/*
 * Ce fichier gere le formulaire de connexion du site.
 * Il recupere l'email et le mot de passe, envoie la requete a l'API,
 * puis affiche un message propre avant de rediriger vers la bonne page.
 * Toute la logique de connexion cote navigateur est centralisee ici.
 */

// Cette fonction initialise la page de connexion et branche l'envoi du formulaire.
(async function initPage() {
    await (window.SortiesGuestPage || Promise.resolve());

    document.getElementById('form-connexion').addEventListener('submit', async (event) => {
        event.preventDefault();

        const msg = document.getElementById('msg');
        const body = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        };

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(body)
        });

        if (res.ok) {
            const next = new URLSearchParams(window.location.search).get('next') || '/';
            msg.className = 'msg-ok';
            msg.textContent = 'Connexion reussie.';
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