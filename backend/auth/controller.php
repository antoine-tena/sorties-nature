<?php

declare(strict_types=1);

function dispatch_auth_route(array $segments, string $method): bool
{
    if (($segments[0] ?? '') !== 'auth') {
        return false;
    }

    $action = $segments[1] ?? '';

    if ($method === 'GET' && $action === 'session') {
        app_json_response(['user' => app_current_user()]);
    }

    if ($method === 'POST' && $action === 'register') {
        $body = app_request_data();
        $nom = trim((string) ($body['nom'] ?? ''));
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $password = (string) ($body['password'] ?? '');

        if ($nom === '' || $email === '' || $password === '') {
            app_json_response(['error' => 'nom, email et mot de passe obligatoires'], 400);
        }

        if (strlen($password) < 4) {
            app_json_response(['error' => 'mot de passe trop court'], 400);
        }

        if (auth_email_exists($email)) {
            app_json_response(['error' => 'email deja utilise'], 409);
        }

        $_SESSION['user'] = auth_create_user($nom, $email, app_hash_password($password));
        app_json_response(['user' => app_current_user()], 201);
    }

    if ($method === 'POST' && $action === 'login') {
        $body = app_request_data();
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $password = (string) ($body['password'] ?? '');

        if ($email === '' || $password === '') {
            app_json_response(['error' => 'email et mot de passe obligatoires'], 400);
        }

        $user = auth_find_user_by_email($email);
        if (!$user || !app_verify_password($password, (string) $user['mot_de_passe_hash'])) {
            app_json_response(['error' => 'identifiants invalides'], 401);
        }

        if (app_password_needs_rehash((string) $user['mot_de_passe_hash'])) {
            auth_update_password_hash((int) $user['id'], app_hash_password($password));
        }

        $_SESSION['user'] = app_expose_user($user);
        app_json_response(['user' => app_current_user()]);
    }

    if ($method === 'POST' && $action === 'logout') {
        app_logout_user();
        app_json_response(['ok' => true]);
    }

    return false;
}
