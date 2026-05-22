<?php

declare(strict_types=1);

function app_current_user(): ?array
{
    return $_SESSION['user'] ?? null;
}

function app_expose_user(array $user): array
{
    return [
        'id' => (int) $user['id'],
        'nom' => $user['nom'],
        'email' => $user['email'],
    ];
}

function app_hash_password(string $password): string
{
    return password_hash($password, PASSWORD_DEFAULT);
}

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

function app_password_needs_rehash(string $storedHash): bool
{
    $hashInfo = password_get_info($storedHash);
    if (empty($hashInfo['algo'])) {
        return true;
    }

    return password_needs_rehash($storedHash, PASSWORD_DEFAULT);
}

function app_require_user(): array
{
    $user = app_current_user();
    if (!$user) {
        app_json_response(['error' => 'authentification requise'], 401);
    }

    return $user;
}

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
