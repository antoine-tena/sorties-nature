<?php

declare(strict_types=1);

function auth_find_user_by_email(string $email): ?array
{
    $stmt = app_db()->prepare('SELECT id, nom, email, mot_de_passe_hash FROM utilisateurs WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    return $user ?: null;
}

function auth_email_exists(string $email): bool
{
    return auth_find_user_by_email($email) !== null;
}

function auth_create_user(string $nom, string $email, string $passwordHash): array
{
    $stmt = app_db()->prepare('INSERT INTO utilisateurs (nom, email, mot_de_passe_hash) VALUES (?, ?, ?)');
    $stmt->execute([$nom, $email, $passwordHash]);

    return [
        'id' => (int) app_db()->lastInsertId(),
        'nom' => $nom,
        'email' => $email,
    ];
}
