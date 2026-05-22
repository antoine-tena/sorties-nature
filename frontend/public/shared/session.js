/*
 * Ce fichier gere la session cote navigateur et le petit bloc d'authentification
 * visible dans la navigation. Il sait verifier si quelqu'un est connecte,
 * preparer les redirections vers la connexion et proteger les textes injectes.
 * En pratique, c'est la base commune des pages du site.
 */

(function () {
    let sessionPromise = null;

    // Cette fonction echappe le HTML pour eviter d'injecter du contenu brut dans la page.
    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Cette fonction reconstruit l'URL courante pour revenir dessus apres la connexion.
    function nextTarget() {
        return encodeURIComponent(window.location.pathname + window.location.search);
    }

    // Cette fonction charge la session courante une fois puis reutilise la meme promesse si possible.
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

    // Cette fonction met a jour le menu en haut selon que l'utilisateur est connecte ou non.
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

    // Cette fonction initialise la navigation en recuperant la session puis en affichant le bon etat.
    async function initNavigation() {
        const session = await fetchSession();
        renderAuthNav(session);
        return session;
    }

    // Cette fonction envoie l'utilisateur sur la page de connexion avec l'URL de retour.
    function redirectToLogin() {
        window.location.replace(`/auth/connexion.html?next=${nextTarget()}`);
    }

    // Cette fonction bloque une page reservee aux utilisateurs connectes.
    async function requireAuthenticatedSession() {
        const session = await initNavigation();
        if (!session.user) {
            redirectToLogin();
            return null;
        }

        return session;
    }

    // Cette fonction empeche un utilisateur deja connecte de retourner sur les pages visiteur.
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