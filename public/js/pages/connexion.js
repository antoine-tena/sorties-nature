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