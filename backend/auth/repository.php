<?php

/*
 * Ce fichier regroupe les acces a la table des utilisateurs.
 * Il sert surtout pendant l'inscription, la connexion et la mise a jour
 * du hash du mot de passe quand un ancien format est detecte.
 * L'idee est de garder les requetes SQL auth dans un seul endroit.
 */

declare(strict_types=1);

// Cette fonction cherche un utilisateur a partir de son email pour la connexion ou les controles d'unicite.
function auth_find_user_by_email(string $email): ?array
{
    $stmt = app_db()->prepare('SELECT id, nom, email, mot_de_passe_hash FROM utilisateurs WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    return $user ?: null;
}

// Cette fonction verifie rapidement si un email est deja pris avant de creer un compte.
function auth_email_exists(string $email): bool
{
    return auth_find_user_by_email($email) !== null;
}

// Cette fonction ajoute un nouvel utilisateur en base et renvoie les infos utiles pour la session.
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

// Cette fonction remplace le hash stocke quand un mot de passe doit etre re-hashe.
function auth_update_password_hash(int $userId, string $passwordHash): void
{
    $stmt = app_db()->prepare('UPDATE utilisateurs SET mot_de_passe_hash = ? WHERE id = ?');
    $stmt->execute([$passwordHash, $userId]);
}
