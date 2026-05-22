(function () {
    let sessionPromise = null;

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function nextTarget() {
        return encodeURIComponent(window.location.pathname + window.location.search);
    }

    async function fetchSession(force = false) {
        if (!sessionPromise || force) {
            sessionPromise = fetch('/api/auth/session', {
                credentials: 'same-origin'
            })
                .then(async (res) => {
                    if (!res.ok) return { user: null };
                    return res.json();
                })
                .catch(() => ({ user: null }));
        }

        return sessionPromise;
    }

    function renderAuthNav(session) {
        const container = document.getElementById('nav-auth');
        if (!container) return;

        if (session.user) {
            container.innerHTML = `
                <span class="nav-user">Bonjour ${escapeHtml(session.user.nom)}</span>
                <a href="/auth/deconnexion.html">Deconnexion</a>
            `;
            return;
        }

        container.innerHTML = `
            <a href="/auth/connexion.html">Connexion</a>
            <a href="/auth/inscription.html">Inscription</a>
        `;
    }

    async function initNavigation() {
        const session = await fetchSession();
        renderAuthNav(session);
        return session;
    }

    function redirectToLogin() {
        window.location.replace(`/auth/connexion.html?next=${nextTarget()}`);
    }

    async function requireAuthenticatedSession() {
        const session = await initNavigation();
        if (!session.user) {
            redirectToLogin();
            return null;
        }

        return session;
    }

    async function redirectAuthenticatedHome() {
        const session = await initNavigation();
        if (session.user) {
            window.location.replace('/');
        }

        return session;
    }

    document.addEventListener('DOMContentLoaded', () => {
        initNavigation();
    });

    window.SortiesSession = {
        fetchSession,
        initNavigation,
        requireAuthenticatedSession,
        redirectAuthenticatedHome,
        redirectToLogin
    };

    window.SortiesHtml = {
        escape: escapeHtml
    };
})();