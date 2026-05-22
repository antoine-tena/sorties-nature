<?php

/*
 * Ce fichier centralise la connexion PDO utilisee partout dans le backend.
 * Le but est d'ouvrir une seule connexion a la base puis de la reutiliser
 * dans les repositories, au lieu de recreer un acces MySQL a chaque appel.
 * Ca simplifie le code et garde la configuration au meme endroit.
 */

declare(strict_types=1);

// Cette fonction cree la connexion PDO une seule fois puis la renvoie a chaque appel suivant.
function app_db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = getenv('DB_HOST') ?: 'mysql';
    $port = getenv('DB_PORT') ?: '3306';
    $name = getenv('DB_NAME') ?: 'sorties_natures';
    $user = getenv('DB_USER') ?: 'sorties_user';
    $password = getenv('DB_PASSWORD') ?: 'sorties_password';

    $pdo = new PDO(
        sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name),
        $user,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );

    return $pdo;
}