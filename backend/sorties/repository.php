<?php

declare(strict_types=1);

function sorties_find_by_id(int $id): ?array
{
    $stmt = app_db()->prepare(
        'SELECT s.*, t.nom AS type_nom
         FROM sorties s
         LEFT JOIN types_sortie t ON s.id_type_sortie = t.id
         WHERE s.id = ?'
    );
    $stmt->execute([$id]);
    $sortie = $stmt->fetch();

    return $sortie ?: null;
}

function sorties_list_all(): array
{
    return app_db()->query(
        'SELECT s.*, t.nom AS type_nom
         FROM sorties s
         LEFT JOIN types_sortie t ON s.id_type_sortie = t.id
         ORDER BY s.id DESC'
    )->fetchAll();
}

function sorties_create(array $payload): int
{
    $stmt = app_db()->prepare(
        'INSERT INTO sorties
            (titre, description, id_type_sortie, difficulte, distance, denivele_positif,
             chien_autorise, is_public, trace_gpx, latitude, longitude)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $payload['titre'],
        $payload['description'],
        $payload['id_type_sortie'],
        $payload['difficulte'],
        $payload['distance'],
        $payload['denivele_positif'],
        $payload['chien_autorise'],
        $payload['is_public'],
        $payload['trace_gpx'],
        $payload['latitude'],
        $payload['longitude'],
    ]);

    return (int) app_db()->lastInsertId();
}

function sorties_update(int $id, array $payload): void
{
    $stmt = app_db()->prepare(
        'UPDATE sorties
         SET titre = ?, description = ?, id_type_sortie = ?, difficulte = ?, distance = ?,
             denivele_positif = ?, chien_autorise = ?, is_public = ?, trace_gpx = ?,
             latitude = ?, longitude = ?
         WHERE id = ?'
    );
    $stmt->execute([
        $payload['titre'],
        $payload['description'],
        $payload['id_type_sortie'],
        $payload['difficulte'],
        $payload['distance'],
        $payload['denivele_positif'],
        $payload['chien_autorise'],
        $payload['is_public'],
        $payload['trace_gpx'],
        $payload['latitude'],
        $payload['longitude'],
        $id,
    ]);
}

function sorties_delete(int $id): void
{
    $stmt = app_db()->prepare('DELETE FROM sorties WHERE id = ?');
    $stmt->execute([$id]);
}

function sorties_list_types(): array
{
    return app_db()->query('SELECT * FROM types_sortie ORDER BY nom')->fetchAll();
}

function sorties_list_stats(): array
{
    return app_db()->query('SELECT label, valeur FROM stats_eco ORDER BY label')->fetchAll();
}

function sorties_export_all(): array
{
    $sorties = app_db()->query(
        'SELECT s.*, t.nom AS type_nom
         FROM sorties s
         LEFT JOIN types_sortie t ON s.id_type_sortie = t.id
         ORDER BY s.id'
    )->fetchAll();
    $realisations = app_db()->query('SELECT * FROM realisations ORDER BY id_sortie, date_realisation DESC')->fetchAll();

    $grouped = [];
    foreach ($realisations as $realisation) {
        $grouped[$realisation['id_sortie']][] = $realisation;
    }

    return array_map(static function (array $sortie) use ($grouped): array {
        $sortie['realisations'] = $grouped[$sortie['id']] ?? [];
        return $sortie;
    }, $sorties);
}

function sorties_resolve_type_id(PDO $pdo, array $sortie): ?int
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

function sorties_import_many(array $sorties): int
{
    $pdo = app_db();
    $pdo->beginTransaction();

    try {
        $insertSortie = $pdo->prepare(
            'INSERT INTO sorties
                (titre, description, id_type_sortie, difficulte, distance, denivele_positif,
                 chien_autorise, is_public, trace_gpx, latitude, longitude)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $insertRealisation = $pdo->prepare(
            'INSERT INTO realisations (id_sortie, date_realisation, commentaire)
             VALUES (?, ?, ?)'
        );

        $imported = 0;
        foreach ($sorties as $item) {
            if (!is_array($item) || empty($item['titre'])) {
                continue;
            }

            $payload = app_build_sortie_payload($item, null, $item['trace_gpx'] ?? null);
            $payload['id_type_sortie'] = sorties_resolve_type_id($pdo, $item);

            $insertSortie->execute([
                $payload['titre'],
                $payload['description'],
                $payload['id_type_sortie'],
                $payload['difficulte'],
                $payload['distance'],
                $payload['denivele_positif'],
                $payload['chien_autorise'],
                $payload['is_public'],
                $payload['trace_gpx'],
                $payload['latitude'],
                $payload['longitude'],
            ]);

            $sortieId = (int) $pdo->lastInsertId();
            foreach (($item['realisations'] ?? []) as $realisation) {
                if (!is_array($realisation) || empty($realisation['date_realisation'])) {
                    continue;
                }

                $insertRealisation->execute([
                    $sortieId,
                    $realisation['date_realisation'],
                    $realisation['commentaire'] ?? null,
                ]);
            }

            $imported++;
        }

        $pdo->commit();
        return $imported;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}
