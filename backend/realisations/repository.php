<?php

declare(strict_types=1);

function realisations_list_by_sortie(int $sortieId): array
{
    $stmt = app_db()->prepare('SELECT * FROM realisations WHERE id_sortie = ? ORDER BY date_realisation DESC');
    $stmt->execute([$sortieId]);
    return $stmt->fetchAll();
}

function realisations_create(int $sortieId, string $date, ?string $commentaire): int
{
    $stmt = app_db()->prepare('INSERT INTO realisations (id_sortie, date_realisation, commentaire) VALUES (?, ?, ?)');
    $stmt->execute([$sortieId, $date, $commentaire]);
    return (int) app_db()->lastInsertId();
}

function realisations_update(int $id, string $date, ?string $commentaire): void
{
    $stmt = app_db()->prepare('UPDATE realisations SET date_realisation = ?, commentaire = ? WHERE id = ?');
    $stmt->execute([$date, $commentaire, $id]);
}

function realisations_delete(int $id): void
{
    $stmt = app_db()->prepare('DELETE FROM realisations WHERE id = ?');
    $stmt->execute([$id]);
}
