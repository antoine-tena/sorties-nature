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

function jsonResponse(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function db(): PDO
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

function requestMethod(): string
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

    if ($method === 'POST') {
        if (!empty($_POST['_method'])) {
            return strtoupper((string) $_POST['_method']);
        }

        if (!empty($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
            return strtoupper((string) $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']);
        }
    }

    return $method;
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if (trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        jsonResponse(['error' => 'json invalide'], 400);
    }

    return $decoded;
}

function requestData(): array
{
    $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
    if (str_starts_with($contentType, 'application/json')) {
        return readJsonBody();
    }

    return $_POST;
}

function toNullableNumber(mixed $value): int|float|null
{
    if ($value === null || $value === '') {
        return null;
    }

    if (!is_numeric($value)) {
        return null;
    }

    return str_contains((string) $value, '.') ? (float) $value : (int) $value;
}

function toBooleanInt(mixed $value, int $default = 0): int
{
    if ($value === null || $value === '') {
        return $default;
    }

    return in_array($value, [true, 1, '1', 'true', 'on'], true) ? 1 : 0;
}

function uploadsDirectory(): string
{
    $path = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'uploads';
    if (!is_dir($path)) {
        mkdir($path, 0777, true);
    }

    return $path;
}

function saveUploadedFile(?array $file): ?string
{
    if (!$file || (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE)) {
        return null;
    }

    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
        jsonResponse(['error' => 'upload gpx impossible'], 400);
    }

    $name = bin2hex(random_bytes(16));
    $target = uploadsDirectory() . DIRECTORY_SEPARATOR . $name;

    if (!move_uploaded_file((string) $file['tmp_name'], $target)) {
        jsonResponse(['error' => 'impossible de sauvegarder le fichier gpx'], 500);
    }

    return '/uploads/' . $name;
}

function sortiePayload(array $body, ?array $gpxFile = null, ?string $existingTrace = null): array
{
    $trace = $existingTrace ?? (($body['trace_gpx'] ?? null) ?: null);
    $uploadedTrace = saveUploadedFile($gpxFile);
    if ($uploadedTrace) {
        $trace = $uploadedTrace;
    }

    return [
        'titre' => trim((string) ($body['titre'] ?? '')),
        'description' => ($body['description'] ?? '') !== '' ? (string) $body['description'] : null,
        'id_type_sortie' => toNullableNumber($body['id_type_sortie'] ?? null),
        'difficulte' => ($body['difficulte'] ?? '') !== '' ? (string) $body['difficulte'] : null,
        'distance' => toNullableNumber($body['distance'] ?? null),
        'denivele_positif' => toNullableNumber($body['denivele_positif'] ?? null),
        'chien_autorise' => toBooleanInt($body['chien_autorise'] ?? null, 1),
        'is_public' => toBooleanInt($body['is_public'] ?? null, 1),
        'trace_gpx' => $trace,
        'latitude' => toNullableNumber($body['latitude'] ?? null),
        'longitude' => toNullableNumber($body['longitude'] ?? null),
    ];
}

function getSortieById(int $id): ?array
{
    $stmt = db()->prepare(
        'SELECT s.*, t.nom AS type_nom
         FROM sorties s
         LEFT JOIN types_sortie t ON s.id_type_sortie = t.id
         WHERE s.id = ?'
    );
    $stmt->execute([$id]);
    $sortie = $stmt->fetch();

    return $sortie ?: null;
}

function resolveTypeId(PDO $pdo, array $sortie): int|null
{
    if (!empty($sortie['id_type_sortie'])) {
        return (int) $sortie['id_type_sortie'];
    }

    $typeNom = trim((string) ($sortie['type_nom'] ?? ''));
    if ($typeNom === '') {
        return null;
    }

    $stmt = $pdo->prepare('SELECT id FROM types_sortie WHERE nom = ?');
    $stmt->execute([$typeNom]);
    $existing = $stmt->fetch();
    if ($existing) {
        return (int) $existing['id'];
    }

    $insert = $pdo->prepare('INSERT INTO types_sortie (nom) VALUES (?)');
    $insert->execute([$typeNom]);

    return (int) $pdo->lastInsertId();
}

function currentUser(): ?array
{
    return $_SESSION['user'] ?? null;
}

function exposeUser(array $user): array
{
    return [
        'id' => (int) $user['id'],
        'nom' => $user['nom'],
        'email' => $user['email'],
    ];
}

function hashPassword(string $password): string
{
    return hash('sha256', $password);
}

function apiSegments(): array
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/api', PHP_URL_PATH) ?: '/api';
    if (str_starts_with($path, '/api')) {
        $path = substr($path, 4);
    }

    $path = trim($path, '/');
    if ($path === '') {
        return [];
    }

    return array_values(array_filter(explode('/', $path), static fn ($segment) => $segment !== ''));
}