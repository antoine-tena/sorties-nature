<?php

/*
 * Ce fichier regroupe la gestion de la session et des mots de passe.
 * Il expose l'utilisateur courant, prepare les donnees visibles cote front,
 * verifie les mots de passe et force l'authentification sur les routes protegees.
 * Toute la logique de session commune passe donc par ici.
 */

declare(strict_types=1);

// Cette fonction recupere l'utilisateur actuellement stocke dans la session PHP.
function app_current_user(): ?array
{
    return $_SESSION['user'] ?? null;
}

// Cette fonction garde seulement les champs utiles quand on expose un utilisateur au frontend.
function app_expose_user(array $user): array
{
    return [
        'id' => (int) $user['id'],
        'nom' => $user['nom'],
        'email' => $user['email'],
    ];
}

// Cette fonction cree le hash moderne du mot de passe avant stockage en base.
function app_hash_password(string $password): string
{
    return password_hash($password, PASSWORD_DEFAULT);
}

// Cette fonction verifie un mot de passe en acceptant aussi les anciens hashes du projet.
function app_verify_password(string $password, string $storedHash): bool
{
    if ($storedHash === '') {
        return false;
    }

    $hashInfo = password_get_info($storedHash);
    if (!empty($hashInfo['algo'])) {
        return password_verify($password, $storedHash);
    }

    return hash_equals(hash('sha256', $password), $storedHash);
}

// Cette fonction dit si le hash actuel doit etre remplace par un format plus recent.
function app_password_needs_rehash(string $storedHash): bool
{
    $hashInfo = password_get_info($storedHash);
    if (empty($hashInfo['algo'])) {
        return true;
    }

    return password_needs_rehash($storedHash, PASSWORD_DEFAULT);
}

// Cette fonction bloque l'acces quand aucun utilisateur connecte n'est present dans la session.
function app_require_user(): array
{
    $user = app_current_user();
    if (!$user) {
        app_json_response(['error' => 'authentification requise'], 401);
    }

    return $user;
}

// Cette fonction nettoie completement la session pour deconnecter l'utilisateur.
function app_logout_user(): void
{
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 3600,
            $params['path'],
            $params['domain'] ?? '',
            (bool) $params['secure'],
            (bool) $params['httponly']
        );
    }

    session_destroy();
}
