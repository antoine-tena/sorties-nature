<?php

/*
 * Ce fichier sert de point de depart pour tout le backend PHP du projet.
 * Il prepare la session, charge les fichiers communs et branche chaque module
 * qui gere l'authentification, les sorties, les realisations et les routes API.
 * En gros, c'est ici que l'application serveur est mise en place avant de repondre.
 */

declare(strict_types=1);

session_set_cookie_params([
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Lax'
]);

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

require_once __DIR__ . '/shared/db.php';
require_once __DIR__ . '/shared/response.php';
require_once __DIR__ . '/shared/request.php';
require_once __DIR__ . '/shared/session.php';
require_once __DIR__ . '/sorties/payload.php';
require_once __DIR__ . '/auth/repository.php';
require_once __DIR__ . '/sorties/repository.php';
require_once __DIR__ . '/realisations/repository.php';
require_once __DIR__ . '/auth/controller.php';
require_once __DIR__ . '/sorties/controller.php';
require_once __DIR__ . '/meta/controller.php';
require_once __DIR__ . '/realisations/controller.php';
require_once __DIR__ . '/shared/router.php';