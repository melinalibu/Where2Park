<?php
/* ============================================================================
   HANDLUNGSANWEISUNG (load.php)
   1) Binde 001_config.php (PDO-Config) ein.
   2) Binde transform.php ein → erhalte TRANSFORM-JSON.
   3) json_decode(..., true) → Array mit Datensätzen.
   4) Stelle PDO-Verbindung her (ERRMODE_EXCEPTION, FETCH_ASSOC).
   5) Bereite INSERT/UPSERT-Statement mit Platzhaltern vor.
   6) Iteriere über Datensätze und führe execute(...) je Zeile aus.
   7) Optional: Transaktion verwenden (beginTransaction/commit) für Performance.
   8) Bei Erfolg: knappe Bestätigung ausgeben (oder still bleiben, je nach Kontext).
   9) Bei Fehlern: Exception fangen → generische Fehlermeldung/Code (kein Stacktrace).
  10) Keine Debug-Ausgaben in Produktion; sensible Daten nicht loggen.
   ============================================================================ */

$json = include 'transform.php';

$transformedData = json_decode($json, true);
if (empty($transformedData)) {
    die("❌ Keine Daten zum Laden vorhanden. Prüfe die Transformation.");
}
// print_r($transformedData);



// Binde die Datenbankkonfiguration ein
require_once 'config.php';

try {
    // PDO-Verbindung herstellen
    $pdo = new PDO($dsn, $username, $password, $options);

    // SQL-Query mit Platzhaltern für das Einfügen von Daten (UPSERT)
    $sql = "INSERT INTO `Where2Park` 
        (parkhaus_id, name, address, publication_time, total, free, status, created_at)
        VALUES 
        (:parkhaus_id, :name, :address, :publication_time, :total, :free, :status, :created_at)
        ON DUPLICATE KEY UPDATE 
            name = VALUES(name),
            address = VALUES(address),
            publication_time = VALUES(publication_time),
            total = VALUES(total),
            free = VALUES(free),
            status = VALUES(status),
            created_at = VALUES(created_at)";

    // Bereitet die SQL-Anweisung vor
    $stmt = $pdo->prepare($sql);

    // Fügt jedes Element im Array in die Datenbank ein
  

  foreach ($transformedData as $item){
    try {
        $stmt->execute([
            ':parkhaus_id'      => $item['parkhaus_id'],
            ':name'             => $item['name'],
            ':address'          => $item['address'],
            ':publication_time' => $item['publication_time'],
            ':total'            => $item['total'],
            ':free'             => $item['free'],
            ':status'           => $item['status'],
            ':created_at'       => $item['created_at']
        ]);
    } catch (PDOException $e) {
        echo "❌ Fehler beim Einfügen von parkhaus_id {$item['parkhaus_id']}: " . $e->getMessage() . "\n";
    }
  }


    echo "✅ Daten erfolgreich eingefügt.";

} catch (PDOException $e) {
    die("❌ Verbindung zur Datenbank konnte nicht hergestellt werden: " . $e->getMessage());
}
