<?php

require_once 'config.php';

try {
    // Erstellt eine PDO-Verbindung
 $pdo = new PDO($dsn, $username, $password, $options);


    $sql = "SELECT * FROM `User`";

    $stmt = $pdo->query($sql);

    $users = $stmt->fetchAll();

    foreach ($users as $user) {
        echo $user['firstname'] . "<br>";
    }


} catch (PDOException $e) {
    // Fehlerbehandlung
    die ("Datenbankverbindungsfehler:" . $e->getMessage());

}


