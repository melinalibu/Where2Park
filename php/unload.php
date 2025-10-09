<?php
require_once 'config.php'; 

header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = new PDO($dsn, $username, $password, $options);

  
    $sql = "SELECT * FROM `Where2Park`";
   
    // Wähle nur die gewünschten Spalten:
   //  $sql = "SELECT parkhaus_id, address, total, free, status, created_at FROM `Where2Park`";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Interner Serverfehler."]);
}
