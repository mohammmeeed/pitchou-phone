<?php
// backend/database/seed_categories.php
require_once __DIR__ . '/../config/database.php';

$pdo = Database::getConnection();

$categories = [
    'Téléphones',
    'Accessoires',
    'Batteries',
    'Chargeurs & Câbles',
    'Écrans & Pièces'
];

$subcategories = [
    'Téléphones' => [
        'Samsung',
        'Apple iPhone',
        'Xiaomi',
        'Oppo',
        'OnePlus',
        'Realme',
        'Infinix & Tecno'
    ],
    'Accessoires' => [
        'Écouteurs & Casques',
        'Coques & Étuis',
        'Protections d\'écran',
        'Supports voiture & bureau'
    ],
    'Batteries' => [
        'Batteries internes',
        'Powerbanks (Batteries externes)'
    ],
    'Chargeurs & Câbles' => [
        'Chargeurs rapides',
        'Câbles USB-C & Lightning'
    ],
    'Écrans & Pièces' => [
        'Écrans & Vitres',
        'Connecteurs de charge'
    ]
];

$categoryImages = [
    'Téléphones' => '/assets/images/categories/telephones.svg',
    'Samsung' => '/assets/images/categories/samsung.svg',
    'Apple iPhone' => '/assets/images/categories/iphone.svg',
    'Xiaomi' => '/assets/images/categories/xiaomi.svg',
    'Oppo' => '/assets/images/categories/oppo.svg',
    'OnePlus' => '/assets/images/categories/oneplus.svg',
    'Realme' => '/assets/images/categories/realme.svg',
    'Infinix & Tecno' => '/assets/images/categories/infinix.svg',
    'Accessoires' => '/assets/images/categories/accessoires.svg',
    'Écouteurs & Casques' => '/assets/images/categories/ecouteurs.svg',
    'Coques & Étuis' => '/assets/images/categories/coques.svg',
    'Protections d\'écran' => '/assets/images/categories/protection.svg',
    'Supports voiture & bureau' => '/assets/images/categories/supports.svg',
    'Batteries' => '/assets/images/categories/batteries.svg',
    'Batteries internes' => '/assets/images/categories/batteries-internes.svg',
    'Powerbanks (Batteries externes)' => '/assets/images/categories/powerbanks.svg',
    'Chargeurs & Câbles' => '/assets/images/categories/chargeurs.svg',
    'Chargeurs rapides' => '/assets/images/categories/chargeurs-rapides.svg',
    'Câbles USB-C & Lightning' => '/assets/images/categories/cables.svg',
    'Écrans & Pièces' => '/assets/images/categories/pieces.svg',
    'Écrans & Vitres' => '/assets/images/categories/ecrans.svg',
    'Connecteurs de charge' => '/assets/images/categories/connecteurs.svg'
];

$stmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");

$stmt->execute(['attributes_categories', json_encode($categories, JSON_UNESCAPED_UNICODE)]);
$stmt->execute(['attributes_subcategories', json_encode($subcategories, JSON_UNESCAPED_UNICODE)]);
$stmt->execute(['attributes_category_images', json_encode($categoryImages, JSON_UNESCAPED_UNICODE)]);

$fallbackFile = __DIR__ . '/settings_fallback.json';
$rows = $pdo->query("SELECT setting_key, setting_value FROM settings")->fetchAll(PDO::FETCH_KEY_PAIR);
file_put_contents($fallbackFile, json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

echo "Pitchou categories and subcategories successfully saved in database pitchou-db and settings_fallback.json!\n";
