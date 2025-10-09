<?php
// transform.php

// Datenbankverbindung

$data = require 'extract.php';
$result = [];

// Alle Datensätze durchlaufen
foreach ($data['results'] as $item) {
    // Relevante Felder extrahieren & transformieren
    $result[] = [
        'parkhaus_id'       => $item['id'],
        'name'              => $item['name'],
        'address'           => $item['address'],
        'publication_time'  => date('Y-m-d 00:00:00', strtotime($item['published'])), // Nur Datumsteil behalten
        'total'             => $item['total'] ?? 0,
        'free'              => $item['free'] ?? 0,
        'status'            => strtolower($item['status']) === 'offen' ? 1 : 0,
        'created_at'        => date('Y-m-d H:i:s')
    ];
}

return json_encode($result);
?>
