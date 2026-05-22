<?php

declare(strict_types=1);

function app_to_nullable_number(mixed $value): int|float|null
{
    if ($value === null || $value === '') {
        return null;
    }

    if (!is_numeric($value)) {
        return null;
    }

    return str_contains((string) $value, '.') ? (float) $value : (int) $value;
}

function app_to_boolean_int(mixed $value, int $default = 0): int
{
    if ($value === null || $value === '') {
        return $default;
    }

    return in_array($value, [true, 1, '1', 'true', 'on'], true) ? 1 : 0;
}

function app_uploads_directory(): string
{
    $path = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'uploads';
    if (!is_dir($path)) {
        mkdir($path, 0777, true);
    }

    return $path;
}

function app_save_uploaded_file(?array $file): ?string
{
    if (!$file || (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE)) {
        return null;
    }

    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
        app_json_response(['error' => 'upload gpx impossible'], 400);
    }

    $name = bin2hex(random_bytes(16));
    $target = app_uploads_directory() . DIRECTORY_SEPARATOR . $name;

    if (!move_uploaded_file((string) $file['tmp_name'], $target)) {
        app_json_response(['error' => 'impossible de sauvegarder le fichier gpx'], 500);
    }

    return '/uploads/' . $name;
}

function app_build_sortie_payload(array $body, ?array $gpxFile = null, ?string $existingTrace = null): array
{
    $trace = $existingTrace ?? (($body['trace_gpx'] ?? null) ?: null);
    $uploadedTrace = app_save_uploaded_file($gpxFile);
    if ($uploadedTrace) {
        $trace = $uploadedTrace;
    }

    return [
        'titre' => trim((string) ($body['titre'] ?? '')),
        'description' => ($body['description'] ?? '') !== '' ? (string) $body['description'] : null,
        'id_type_sortie' => app_to_nullable_number($body['id_type_sortie'] ?? null),
        'difficulte' => ($body['difficulte'] ?? '') !== '' ? (string) $body['difficulte'] : null,
        'distance' => app_to_nullable_number($body['distance'] ?? null),
        'denivele_positif' => app_to_nullable_number($body['denivele_positif'] ?? null),
        'chien_autorise' => app_to_boolean_int($body['chien_autorise'] ?? null, 1),
        'is_public' => app_to_boolean_int($body['is_public'] ?? null, 1),
        'trace_gpx' => $trace,
        'latitude' => app_to_nullable_number($body['latitude'] ?? null),
        'longitude' => app_to_nullable_number($body['longitude'] ?? null),
    ];
}
