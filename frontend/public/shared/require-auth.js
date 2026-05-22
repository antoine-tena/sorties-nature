/*
 * Ce fichier expose une promesse simple pour les pages qui demandent une session active.
 * L'idee est d'avoir une ligne reutilisable dans les scripts de page au lieu de recopier
 * la meme verification partout. Si la session n'est pas valide, la redirection est geree avant.
 */

// Cette ligne lance la verification de session pour toutes les pages reservees aux utilisateurs connectes.
window.SortiesProtectedPage = window.SortiesSession
    ? window.SortiesSession.requireAuthenticatedSession()
    : Promise.resolve(null);