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

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/http/response.php';
require_once __DIR__ . '/http/request.php';
require_once __DIR__ . '/auth/session.php';
require_once __DIR__ . '/domain/sortie_payload.php';
require_once __DIR__ . '/repositories/auth_repository.php';
require_once __DIR__ . '/repositories/sortie_repository.php';
require_once __DIR__ . '/repositories/realisation_repository.php';
require_once __DIR__ . '/controllers/auth_controller.php';
require_once __DIR__ . '/controllers/sortie_controller.php';
require_once __DIR__ . '/controllers/meta_controller.php';
require_once __DIR__ . '/controllers/realisation_controller.php';
require_once __DIR__ . '/router/api_router.php';