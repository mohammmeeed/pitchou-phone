<?php
// backend/database/seed_wilayas.php
// Script pour initialiser les 58 Wilayas d'Algérie avec tarifs de livraison au départ d'Oran (31)

require_once __DIR__ . '/../config/database.php';

$wilayasFromOran = [
    ['name' => '01 - Adrar', 'price' => 1000],
    ['name' => '02 - Chlef', 'price' => 550],
    ['name' => '03 - Laghouat', 'price' => 750],
    ['name' => '04 - Oum El Bouaghi', 'price' => 850],
    ['name' => '05 - Batna', 'price' => 800],
    ['name' => '06 - Béjaïa', 'price' => 700],
    ['name' => '07 - Biskra', 'price' => 850],
    ['name' => '08 - Béchar', 'price' => 900],
    ['name' => '09 - Blida', 'price' => 600],
    ['name' => '10 - Bouira', 'price' => 650],
    ['name' => '11 - Tamanrasset', 'price' => 1200],
    ['name' => '12 - Tébessa', 'price' => 850],
    ['name' => '13 - Tlemcen', 'price' => 500],
    ['name' => '14 - Tiaret', 'price' => 600],
    ['name' => '15 - Tizi Ouzou', 'price' => 700],
    ['name' => '16 - Alger', 'price' => 600],
    ['name' => '17 - Djelfa', 'price' => 750],
    ['name' => '18 - Jijel', 'price' => 800],
    ['name' => '19 - Sétif', 'price' => 750],
    ['name' => '20 - Saïda', 'price' => 600],
    ['name' => '21 - Skikda', 'price' => 800],
    ['name' => '22 - Sidi Bel Abbès', 'price' => 450],
    ['name' => '23 - Annaba', 'price' => 800],
    ['name' => '24 - Guelma', 'price' => 800],
    ['name' => '25 - Constantine', 'price' => 800],
    ['name' => '26 - Médéa', 'price' => 650],
    ['name' => '27 - Mostaganem', 'price' => 450],
    ['name' => '28 - M\'Sila', 'price' => 750],
    ['name' => '29 - Mascara', 'price' => 450],
    ['name' => '30 - Ouargla', 'price' => 950],
    ['name' => '31 - Oran', 'price' => 350],
    ['name' => '32 - El Bayadh', 'price' => 850],
    ['name' => '33 - Illizi', 'price' => 1200],
    ['name' => '34 - Bordj Bou Arreridj', 'price' => 750],
    ['name' => '35 - Boumerdès', 'price' => 650],
    ['name' => '36 - El Tarf', 'price' => 850],
    ['name' => '37 - Tindouf', 'price' => 1100],
    ['name' => '38 - Tissemsilt', 'price' => 600],
    ['name' => '39 - El Oued', 'price' => 950],
    ['name' => '40 - Khenchela', 'price' => 850],
    ['name' => '41 - Souk Ahras', 'price' => 850],
    ['name' => '42 - Tipaza', 'price' => 600],
    ['name' => '43 - Mila', 'price' => 800],
    ['name' => '44 - Aïn Defla', 'price' => 600],
    ['name' => '45 - Naâma', 'price' => 850],
    ['name' => '46 - Aïn Témouchent', 'price' => 450],
    ['name' => '47 - Ghardaïa', 'price' => 900],
    ['name' => '48 - Relizane', 'price' => 500],
    ['name' => '49 - Timimoun', 'price' => 1000],
    ['name' => '50 - Bordj Badji Mokhtar', 'price' => 1400],
    ['name' => '51 - Ouled Djellal', 'price' => 850],
    ['name' => '52 - Béni Abbès', 'price' => 950],
    ['name' => '53 - In Salah', 'price' => 1100],
    ['name' => '54 - In Guezzam', 'price' => 1400],
    ['name' => '55 - Touggourt', 'price' => 950],
    ['name' => '56 - Djanet', 'price' => 1300],
    ['name' => '57 - El M\'Ghair', 'price' => 950],
    ['name' => '58 - El Meniaa', 'price' => 900]
];

try {
    $pdo = Database::getConnection();

    // S'assurer que la table settings existe
    $pdo->exec("CREATE TABLE IF NOT EXISTS `settings` (
        `setting_key` VARCHAR(100) PRIMARY KEY,
        `setting_value` TEXT NULL,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $json = json_encode($wilayasFromOran, JSON_UNESCAPED_UNICODE);

    $stmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
    $stmt->execute(['attributes_wilayas', $json]);

    echo "OK: " . count($wilayasFromOran) . " wilayas enregistrées dans la base de données avec succès !\n";

    // Synchroniser également dans backend/database/tiktok_shop.sql
    $sqlFile = __DIR__ . '/tiktok_shop.sql';
    if (file_exists($sqlFile)) {
        $content = file_get_contents($sqlFile);
        if (strpos($content, 'attributes_wilayas') === false) {
            $escaped = str_replace(["\\", "'"], ["\\\\", "\\'"], $json);
            $newEntry = ",('attributes_wilayas','" . $escaped . "','" . date('Y-m-d H:i:s') . "');";
            $content = preg_replace('/;\s*(\/\*!40000 ALTER TABLE `settings` ENABLE KEYS \*\/;)/m', $newEntry . "\n$1", $content, 1);
            file_put_contents($sqlFile, $content);
            echo "OK: tiktok_shop.sql synchronisé avec les 58 wilayas !\n";
        }
    }
} catch (Exception $e) {
    echo "ERREUR: " . $e->getMessage() . "\n";
}
