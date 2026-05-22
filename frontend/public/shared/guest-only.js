/*
 * Ce fichier fait l'inverse de la protection classique des pages connectees.
 * Il sert sur les pages comme connexion et inscription pour eviter qu'un utilisateur
 * deja authentifie revienne dessus alors qu'il peut directement aller a l'accueil.
 * Ca garde une navigation plus propre dans l'application.
 */

// Cette ligne redirige vers l'accueil si un utilisateur connecte tente d'ouvrir une page visiteur.
window.SortiesGuestPage = window.SortiesSession
    ? window.SortiesSession.redirectAuthenticatedHome()
    : Promise.resolve(null);