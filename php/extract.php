<?php

/* ============================================================================
   HANDLUNGSANWEISUNG (extract.php)
   1) Lade Konfiguration/Constants (API-URL, Parameter, ggf. Zeitzone).
   2) Baue die Request-URL (Query-Params sauber via http_build_query).
   3) Initialisiere cURL (curl_init) mit der Ziel-URL.
   4) Setze cURL-Optionen (RETURNTRANSFER, TIMEOUT, HTTP-Header, FOLLOWLOCATION).
   5) Führe Request aus (curl_exec) und prüfe Transportfehler (curl_error).
   6) Prüfe HTTP-Status & Content-Type (JSON erwartet), sonst früh abbrechen.
   7) Dekodiere JSON robust (json_decode(..., true)).
   8) Normalisiere/prüfe Felder (defensive Defaults, Typen casten).
   9) Gib die Rohdaten als PHP-Array ZURÜCK (kein echo) für den Transform-Schritt.
  10) Fehlerfälle: Exception/Fehlerobjekt nach oben reichen (kein HTML ausgeben).
   ============================================================================ */

function fetchParkingData()
{
    $url = "https://data.bs.ch/api/explore/v2.1/catalog/datasets/100088/records?limit=20";

    // Initialisiert eine cURL-Sitzung
    $ch = curl_init($url);


    // Setzt Optionen
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    


    // Führt die cURL-Sitzung aus und erhält den Inhalt
    $response = curl_exec($ch);
    
    // echo $response;
    // echo "<br><br>";
    //print_r($response);


    // Schließt die cURL-Sitzung
    curl_close($ch);
    



    // Dekodiert die JSON-Antwort und gibt Daten zurück
    $data = json_decode($response, true);
    return $data;

}

// Gibt die Daten zurück, wenn dieses Skript eingebunden ist
return fetchParkingData();
