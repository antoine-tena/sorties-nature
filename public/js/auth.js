(function () {
    async function fetchSession() {
        const res = await fetch('/api/auth/session');
        if (!res.ok) return { user: null };
        return res.json();
    }

    function renderAuthNav(session) {
        const container = document.getElementById('nav-auth');
        if (!container) return;

        if (session.user) {
            container.innerHTML = `
                <span class="nav-user">Bonjour ${session.user.nom}</span>
                <a href="deconnexion.html">Deconnexion</a>
            `;
            return;
        }

        container.innerHTML = `
            <a href="connexion.html">Connexion</a>
            <a href="inscription.html">Inscription</a>
        `;
    }

    document.addEventListener('DOMContentLoaded', async () => {
        const session = await fetchSession().catch(() => ({ user: null }));
        window.currentSession = session;
        renderAuthNav(session);
    });
})();