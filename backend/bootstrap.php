<?php

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