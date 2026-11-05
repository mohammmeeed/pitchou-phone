<?php
// backend/api/attributes.php
// Gestion des attributs (Catégories & Langues) pour le catalogue

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$db = Database::getConnectionSafe();

if ($db !== null) {
    // Assurer l'existence de la table `settings`
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS `settings` (
            `setting_key` VARCHAR(100) PRIMARY KEY,
            `setting_value` TEXT NULL,
            `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Exception $e) {}
}

$defaultCategories = [];

$defaultBrands = [
    'Apple',
    'Samsung',
    'OnePlus',
    'Xiaomi',
    'Realme',
    'Google Pixel',
    'Huawei',
    'Oppo',
    'Infinix',
    'Tecno',
    'Hoco',
    'Anker',
    'Baseus'
];

$defaultLanguages = [
    'Français',
    'Anglais',
    'Arabe'
];

$rawWilayas = [
    ['name' => '01 - Adrar', 'price' => 1000, 'bureau' => 700],
    ['name' => '02 - Chlef', 'price' => 550, 'bureau' => 350],
    ['name' => '03 - Laghouat', 'price' => 750, 'bureau' => 500],
    ['name' => '04 - Oum El Bouaghi', 'price' => 850, 'bureau' => 600],
    ['name' => '05 - Batna', 'price' => 800, 'bureau' => 550],
    ['name' => '06 - Béjaïa', 'price' => 700, 'bureau' => 450],
    ['name' => '07 - Biskra', 'price' => 850, 'bureau' => 600],
    ['name' => '08 - Béchar', 'price' => 900, 'bureau' => 650],
    ['name' => '09 - Blida', 'price' => 600, 'bureau' => 350],
    ['name' => '10 - Bouira', 'price' => 650, 'bureau' => 450],
    ['name' => '11 - Tamanrasset', 'price' => 1200, 'bureau' => 900],
    ['name' => '12 - Tébessa', 'price' => 850, 'bureau' => 600],
    ['name' => '13 - Tlemcen', 'price' => 500, 'bureau' => 350],
    ['name' => '14 - Tiaret', 'price' => 600, 'bureau' => 400],
    ['name' => '15 - Tizi Ouzou', 'price' => 700, 'bureau' => 450],
    ['name' => '16 - Alger', 'price' => 600, 'bureau' => 350],
    ['name' => '17 - Djelfa', 'price' => 750, 'bureau' => 500],
    ['name' => '18 - Jijel', 'price' => 800, 'bureau' => 550],
    ['name' => '19 - Sétif', 'price' => 750, 'bureau' => 500],
    ['name' => '20 - Saïda', 'price' => 600, 'bureau' => 400],
    ['name' => '21 - Skikda', 'price' => 800, 'bureau' => 550],
    ['name' => '22 - Sidi Bel Abbès', 'price' => 450, 'bureau' => 300],
    ['name' => '23 - Annaba', 'price' => 800, 'bureau' => 550],
    ['name' => '24 - Guelma', 'price' => 800, 'bureau' => 550],
    ['name' => '25 - Constantine', 'price' => 800, 'bureau' => 550],
    ['name' => '26 - Médéa', 'price' => 650, 'bureau' => 450],
    ['name' => '27 - Mostaganem', 'price' => 450, 'bureau' => 300],
    ['name' => '28 - M\'Sila', 'price' => 750, 'bureau' => 500],
    ['name' => '29 - Mascara', 'price' => 450, 'bureau' => 300],
    ['name' => '30 - Ouargla', 'price' => 950, 'bureau' => 700],
    ['name' => '31 - Oran', 'price' => 350, 'bureau' => 250],
    ['name' => '32 - El Bayadh', 'price' => 850, 'bureau' => 600],
    ['name' => '33 - Illizi', 'price' => 1200, 'bureau' => 900],
    ['name' => '34 - Bordj Bou Arreridj', 'price' => 750, 'bureau' => 500],
    ['name' => '35 - Boumerdès', 'price' => 650, 'bureau' => 400],
    ['name' => '36 - El Tarf', 'price' => 850, 'bureau' => 600],
    ['name' => '37 - Tindouf', 'price' => 1100, 'bureau' => 850],
    ['name' => '38 - Tissemsilt', 'price' => 600, 'bureau' => 400],
    ['name' => '39 - El Oued', 'price' => 950, 'bureau' => 700],
    ['name' => '40 - Khenchela', 'price' => 850, 'bureau' => 600],
    ['name' => '41 - Souk Ahras', 'price' => 850, 'bureau' => 600],
    ['name' => '42 - Tipaza', 'price' => 600, 'bureau' => 400],
    ['name' => '43 - Mila', 'price' => 800, 'bureau' => 550],
    ['name' => '44 - Aïn Defla', 'price' => 600, 'bureau' => 400],
    ['name' => '45 - Naâma', 'price' => 850, 'bureau' => 600],
    ['name' => '46 - Aïn Témouchent', 'price' => 450, 'bureau' => 300],
    ['name' => '47 - Ghardaïa', 'price' => 900, 'bureau' => 650],
    ['name' => '48 - Relizane', 'price' => 500, 'bureau' => 350],
    ['name' => '49 - Timimoun', 'price' => 1000, 'bureau' => 750],
    ['name' => '50 - Bordj Badji Mokhtar', 'price' => 1400, 'bureau' => 1000],
    ['name' => '51 - Ouled Djellal', 'price' => 850, 'bureau' => 600],
    ['name' => '52 - Béni Abbès', 'price' => 950, 'bureau' => 700],
    ['name' => '53 - In Salah', 'price' => 1100, 'bureau' => 850],
    ['name' => '54 - In Guezzam', 'price' => 1400, 'bureau' => 1000],
    ['name' => '55 - Touggourt', 'price' => 950, 'bureau' => 700],
    ['name' => '56 - Djanet', 'price' => 1300, 'bureau' => 950],
    ['name' => '57 - El M\'Ghair', 'price' => 950, 'bureau' => 700],
    ['name' => '58 - El Meniaa', 'price' => 900, 'bureau' => 650]
];

$defaultWilayas = [];
foreach ($rawWilayas as $rw) {
    $defaultWilayas[] = [
        'name' => $rw['name'],
        'price_bureau' => (float)$rw['bureau'],
        'price_domicile' => (float)$rw['price'],
        'price' => (float)$rw['price']
    ];
}

function normalizeWilayasList(array $list, array $defaultWilayas): array {
    if (empty($list)) return $defaultWilayas;
    $normalized = [];
    foreach ($list as $item) {
        if (is_array($item) && !empty($item['name'])) {
            $oldPrice = isset($item['price']) ? (float)$item['price'] : 500.0;
            $pDom = isset($item['price_domicile']) ? (float)$item['price_domicile'] : (isset($item['domicile_price']) ? (float)$item['domicile_price'] : $oldPrice);
            $pBur = isset($item['price_bureau']) ? (float)$item['price_bureau'] : (isset($item['bureau_price']) ? (float)$item['bureau_price'] : max(250.0, $pDom - 200.0));
            $normalized[] = [
                'name' => trim($item['name']),
                'price' => $pDom,
                'price_domicile' => $pDom,
                'price_bureau' => $pBur
            ];
        } elseif (is_string($item) && trim($item) !== '') {
            $normalized[] = [
                'name' => trim($item),
                'price' => 500.0,
                'price_domicile' => 500.0,
                'price_bureau' => 350.0
            ];
        }
    }
    return !empty($normalized) ? $normalized : $defaultWilayas;
}

function getStoredAttributes(?PDO $db, array $defaultCategories, array $defaultLanguages, array $defaultWilayas = [], array $defaultBrands = []): array {
    if ($db === null) {
        $fallbackFile = __DIR__ . '/../database/settings_fallback.json';
        $rows = [];
        if (file_exists($fallbackFile)) {
            $rows = json_decode(file_get_contents($fallbackFile), true) ?? [];
        }
        $categories = $defaultCategories;
        if (isset($rows['attributes_categories'])) {
            $decoded = json_decode($rows['attributes_categories'], true);
            if (is_array($decoded)) {
                $categories = array_values(array_filter(array_map('trim', $decoded)));
            }
        }
        $subcategories = [];
        if (isset($rows['attributes_subcategories'])) {
            $decoded = json_decode($rows['attributes_subcategories'], true);
            if (is_array($decoded)) {
                $subcategories = $decoded;
            }
        }
        $wilayas = $defaultWilayas;
        if (!empty($rows['attributes_wilayas'])) {
            $decoded = json_decode($rows['attributes_wilayas'], true);
            if (is_array($decoded)) {
                $wilayas = normalizeWilayasList($decoded, $defaultWilayas);
            }
        }
        $brands = $defaultBrands;
        if (!empty($rows['attributes_brands'])) {
            $decoded = json_decode($rows['attributes_brands'], true);
            if (is_array($decoded) && count($decoded) > 0) {
                $brands = array_values(array_filter(array_map('trim', $decoded)));
            }
        }
        return [
            'categories' => $categories,
            'subcategories' => $subcategories,
            'category_images' => json_decode($rows['attributes_category_images'] ?? '{}', true) ?? [],
            'languages' => $defaultLanguages,
            'wilayas' => $wilayas,
            'brands' => $brands
        ];
    }

    $stmt = $db->prepare("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('attributes_categories', 'attributes_subcategories', 'attributes_category_images', 'attributes_languages', 'attributes_wilayas', 'attributes_brands')");
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

    $categories = $defaultCategories;
    if (isset($rows['attributes_categories'])) {
        $decoded = json_decode($rows['attributes_categories'], true);
        if (is_array($decoded)) {
            $categories = array_values(array_filter(array_map('trim', $decoded)));
        }
    }

    $subcategories = [];
    if (isset($rows['attributes_subcategories'])) {
        $decoded = json_decode($rows['attributes_subcategories'], true);
        if (is_array($decoded)) {
            $subcategories = $decoded;
        }
    }

    $categoryImages = [];
    if (!empty($rows['attributes_category_images'])) {
        $decoded = json_decode($rows['attributes_category_images'], true);
        if (is_array($decoded)) {
            $categoryImages = $decoded;
        }
    }

    $languages = $defaultLanguages;
    if (!empty($rows['attributes_languages'])) {
        $decoded = json_decode($rows['attributes_languages'], true);
        if (is_array($decoded) && count($decoded) > 0) {
            $languages = array_values(array_filter(array_map('trim', $decoded)));
        }
    }

    $wilayas = $defaultWilayas;
    if (isset($rows['attributes_wilayas'])) {
        $decoded = json_decode($rows['attributes_wilayas'], true);
        if (is_array($decoded)) {
            $wilayas = normalizeWilayasList($decoded, $defaultWilayas);
        }
    }

    // Dédoublonnage strict insensible à la casse pour les catégories
    $seenLower = [];
    $dedupedCategories = [];
    foreach ($categories as $cat) {
        $clean = html_entity_decode(trim($cat), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $lower = mb_strtolower($clean, 'UTF-8');
        if ($clean !== '' && !isset($seenLower[$lower])) {
            $seenLower[$lower] = true;
            $dedupedCategories[] = $clean;
        }
    }

    $seenLang = [];
    $dedupedLanguages = [];
    foreach ($languages as $lang) {
        $clean = trim($lang);
        $lower = mb_strtolower($clean, 'UTF-8');
        if ($clean !== '' && !isset($seenLang[$lower])) {
            $seenLang[$lower] = true;
            $dedupedLanguages[] = $clean;
        }
    }

    $brands = $defaultBrands;
    if (!empty($rows['attributes_brands'])) {
        $decoded = json_decode($rows['attributes_brands'], true);
        if (is_array($decoded) && count($decoded) > 0) {
            $brands = array_values(array_filter(array_map('trim', $decoded)));
        }
    }
    $seenBrand = [];
    $dedupedBrands = [];
    foreach ($brands as $b) {
        $clean = trim($b);
        $lower = mb_strtolower($clean, 'UTF-8');
        if ($clean !== '' && !isset($seenBrand[$lower])) {
            $seenBrand[$lower] = true;
            $dedupedBrands[] = $clean;
        }
    }
    return [
        'categories' => $dedupedCategories,
        'subcategories' => $subcategories,
        'category_images' => $categoryImages,
        'languages' => $dedupedLanguages,
        'wilayas' => $wilayas,
        'brands' => $dedupedBrands
    ];
}

function saveStoredAttributes(?PDO $db, array $categories, array $languages, array $wilayas, array $categoryImages = [], array $subcategories = [], array $brands = []): void {
    if ($db === null) {
        $fallbackFile = __DIR__ . '/../database/settings_fallback.json';
        $data = [];
        if (file_exists($fallbackFile)) {
            $data = json_decode(file_get_contents($fallbackFile), true) ?? [];
        }
        $data['attributes_categories'] = json_encode(array_values(array_unique($categories)), JSON_UNESCAPED_UNICODE);
        $data['attributes_subcategories'] = json_encode($subcategories, JSON_UNESCAPED_UNICODE);
        $data['attributes_languages'] = json_encode(array_values(array_unique($languages)), JSON_UNESCAPED_UNICODE);
        $data['attributes_wilayas'] = json_encode(array_values($wilayas), JSON_UNESCAPED_UNICODE);
        $data['attributes_category_images'] = json_encode($categoryImages, JSON_UNESCAPED_UNICODE);
        $data['attributes_brands'] = json_encode(array_values(array_unique($brands)), JSON_UNESCAPED_UNICODE);
        @file_put_contents($fallbackFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        return;
    }
    $stmt = $db->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
    $stmt->execute(['attributes_categories', json_encode(array_values(array_unique($categories)), JSON_UNESCAPED_UNICODE)]);
    $stmt->execute(['attributes_subcategories', json_encode($subcategories, JSON_UNESCAPED_UNICODE)]);
    $stmt->execute(['attributes_languages', json_encode(array_values(array_unique($languages)), JSON_UNESCAPED_UNICODE)]);
    $stmt->execute(['attributes_wilayas', json_encode(array_values($wilayas), JSON_UNESCAPED_UNICODE)]);
    $stmt->execute(['attributes_category_images', json_encode($categoryImages, JSON_UNESCAPED_UNICODE)]);
    $stmt->execute(['attributes_brands', json_encode(array_values(array_unique($brands)), JSON_UNESCAPED_UNICODE)]);
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $data = getStoredAttributes($db, $defaultCategories, $defaultLanguages, $defaultWilayas, $defaultBrands);
        echo json_encode([
            'success' => true,
            'categories' => $data['categories'],
            'subcategories' => $data['subcategories'] ?? (object)[],
            'category_images' => $data['category_images'] ?? (object)[],
            'languages' => $data['languages'],
            'wilayas' => $data['wilayas'],
            'brands' => $data['brands']
        ], JSON_UNESCAPED_UNICODE);
        break;

    case 'POST':
    case 'PUT':
        $raw = file_get_contents('php://input');
        $input = json_decode($raw, true) ?? $_POST;
        $action = $input['action'] ?? 'save_all';

        $current = getStoredAttributes($db, $defaultCategories, $defaultLanguages, $defaultWilayas, $defaultBrands);
        $categories = $current['categories'];
        $subcategories = $current['subcategories'] ?? [];
        $categoryImages = $current['category_images'] ?? [];
        $languages = $current['languages'];
        $wilayas = $current['wilayas'];
        $brands = $current['brands'] ?? [];

        if ($action === 'save_all') {
            if (isset($input['categories']) && is_array($input['categories'])) {
                $categories = array_values(array_filter(array_map('trim', $input['categories'])));
            }
            if (isset($input['subcategories']) && is_array($input['subcategories'])) {
                $subcategories = $input['subcategories'];
            }
            if (isset($input['category_images']) && is_array($input['category_images'])) {
                $categoryImages = $input['category_images'];
            }
            if (isset($input['languages']) && is_array($input['languages'])) {
                $languages = array_values(array_filter(array_map('trim', $input['languages'])));
            }
            if (isset($input['brands']) && is_array($input['brands'])) {
                $brands = array_values(array_filter(array_map('trim', $input['brands'])));
            }
            if (isset($input['wilayas']) && is_array($input['wilayas'])) {
                $wNorm = [];
                foreach ($input['wilayas'] as $w) {
                    if (is_array($w) && !empty($w['name'])) {
                        $wNorm[] = [
                            'name' => trim($w['name']),
                            'price' => isset($w['price']) ? (float)$w['price'] : 500.0
                        ];
                    } elseif (is_string($w) && trim($w) !== '') {
                        $wNorm[] = [
                            'name' => trim($w),
                            'price' => 500.0
                        ];
                    }
                }
                $wilayas = $wNorm;
            }
        } elseif ($action === 'add_brand') {
            $name = trim($input['name'] ?? '');
            if ($name !== '' && !in_array($name, $brands, true)) {
                $brands[] = $name;
            }
        } elseif ($action === 'edit_brand') {
            $oldName = trim($input['oldName'] ?? '');
            $newName = trim($input['newName'] ?? '');
            if ($oldName !== '' && $newName !== '') {
                $idx = array_search($oldName, $brands, true);
                if ($idx !== false) {
                    $brands[$idx] = $newName;
                }
                if ($db !== null) {
                    try {
                        $uStmt = $db->prepare("UPDATE products SET brand = ? WHERE brand = ?");
                        $uStmt->execute([$newName, $oldName]);
                    } catch (Exception $e) {}
                    try {
                        $uStmt2 = $db->prepare("UPDATE products SET author = ? WHERE author = ?");
                        $uStmt2->execute([$newName, $oldName]);
                    } catch (Exception $e) {}
                }
            }
        } elseif ($action === 'delete_brand') {
            $name = trim($input['name'] ?? '');
            if ($name !== '') {
                $brands = array_values(array_filter($brands, fn($b) => $b !== $name));
            }
        } elseif ($action === 'save_all_brands') {
            if (isset($input['brands']) && is_array($input['brands'])) {
                $brands = array_values(array_filter(array_map('trim', $input['brands'])));
            }
        } elseif ($action === 'add_category') {
            $name = trim($input['name'] ?? '');
            $img = trim($input['image'] ?? '');
            if ($name !== '' && !in_array($name, $categories, true)) {
                $categories[] = $name;
                if (!isset($subcategories[$name])) {
                    $subcategories[$name] = [];
                }
                if ($img !== '') {
                    $categoryImages[$name] = $img;
                }
            }
        } elseif ($action === 'edit_category') {
            $oldName = trim($input['oldName'] ?? '');
            $newName = trim($input['newName'] ?? '');
            $hasImageField = array_key_exists('image', $input);
            $newImg = $hasImageField ? trim($input['image'] ?? '') : null;

            if ($oldName !== '' && $newName !== '') {
                $index = array_search($oldName, $categories, true);
                if ($index !== false) {
                    $categories[$index] = $newName;
                }

                if ($oldName !== $newName && isset($subcategories[$oldName])) {
                    $subcategories[$newName] = $subcategories[$oldName];
                    unset($subcategories[$oldName]);
                }

                // Synchroniser l'image personnalisée de la catégorie
                $existingImg = $categoryImages[$oldName] ?? '';
                if ($oldName !== $newName) {
                    unset($categoryImages[$oldName]);
                }
                if ($hasImageField) {
                    if ($newImg !== '') {
                        $categoryImages[$newName] = $newImg;
                    } else {
                        unset($categoryImages[$newName]);
                    }
                } elseif ($existingImg !== '') {
                    $categoryImages[$newName] = $existingImg;
                }

                // Mettre à jour les produits correspondants
                try {
                    $uStmt = $db->prepare("UPDATE products SET category = ? WHERE category = ?");
                    $uStmt->execute([$newName, $oldName]);
                } catch (Exception $e) {}
            }
        } elseif ($action === 'delete_category') {
            $name = trim($input['name'] ?? '');
            $categories = array_values(array_filter($categories, fn($c) => $c !== $name));
            unset($categoryImages[$name]);
            if (isset($subcategories[$name])) {
                foreach ($subcategories[$name] as $sub) {
                    unset($categoryImages[$sub]);
                }
                unset($subcategories[$name]);
            }
        } elseif ($action === 'add_subcategory') {
            $parent = trim($input['parentCategory'] ?? ($input['parent'] ?? ''));
            $name = trim($input['name'] ?? '');
            $img = trim($input['image'] ?? '');
            if ($parent !== '' && $name !== '') {
                if (!isset($subcategories[$parent]) || !is_array($subcategories[$parent])) {
                    $subcategories[$parent] = [];
                }
                if (!in_array($name, $subcategories[$parent], true)) {
                    $subcategories[$parent][] = $name;
                }
                if ($img !== '') {
                    $categoryImages[$name] = $img;
                }
            }
        } elseif ($action === 'edit_subcategory') {
            $parent = trim($input['parentCategory'] ?? ($input['parent'] ?? ''));
            $oldName = trim($input['oldName'] ?? '');
            $newName = trim($input['newName'] ?? '');
            $hasImageField = array_key_exists('image', $input);
            $newImg = $hasImageField ? trim($input['image'] ?? '') : null;
            if ($parent !== '' && $oldName !== '' && $newName !== '') {
                if (isset($subcategories[$parent]) && is_array($subcategories[$parent])) {
                    $idx = array_search($oldName, $subcategories[$parent], true);
                    if ($idx !== false) {
                        $subcategories[$parent][$idx] = $newName;
                    }
                }
                if ($oldName !== $newName) {
                    unset($categoryImages[$oldName]);
                }
                if ($hasImageField) {
                    if ($newImg !== '') {
                        $categoryImages[$newName] = $newImg;
                    } else {
                        unset($categoryImages[$newName]);
                    }
                }
            }
        } elseif ($action === 'delete_subcategory') {
            $parent = trim($input['parentCategory'] ?? ($input['parent'] ?? ''));
            $name = trim($input['name'] ?? '');
            if ($parent !== '' && isset($subcategories[$parent]) && is_array($subcategories[$parent])) {
                $subcategories[$parent] = array_values(array_filter($subcategories[$parent], fn($s) => $s !== $name));
                unset($categoryImages[$name]);
            }
        } elseif ($action === 'set_category_image' || $action === 'set_subcategory_image') {
            $name = trim($input['name'] ?? ($input['subcategory'] ?? ($input['category'] ?? '')));
            $img = trim($input['image'] ?? '');
            if ($name !== '') {
                if ($img !== '') {
                    $categoryImages[$name] = $img;
                } else {
                    unset($categoryImages[$name]);
                }
            }
        } elseif ($action === 'add_language') {
            $name = trim($input['name'] ?? '');
            if ($name !== '' && !in_array($name, $languages, true)) {
                $languages[] = $name;
            }
        } elseif ($action === 'edit_language') {
            $oldName = trim($input['oldName'] ?? '');
            $newName = trim($input['newName'] ?? '');
            if ($oldName !== '' && $newName !== '') {
                $index = array_search($oldName, $languages, true);
                if ($index !== false) {
                    $languages[$index] = $newName;
                }
            }
        } elseif ($action === 'delete_language') {
            $name = trim($input['name'] ?? '');
            $languages = array_values(array_filter($languages, fn($l) => $l !== $name));
        } elseif ($action === 'add_wilaya') {
            $name = trim($input['name'] ?? '');
            $pDom = isset($input['price_domicile']) ? (float)$input['price_domicile'] : (isset($input['price']) ? (float)$input['price'] : 500.0);
            $pBur = isset($input['price_bureau']) ? (float)$input['price_bureau'] : max(250.0, $pDom - 200.0);
            if ($name !== '') {
                $exists = false;
                foreach ($wilayas as &$w) {
                    if (strcasecmp($w['name'], $name) === 0) {
                        $w['price_domicile'] = $pDom;
                        $w['price_bureau'] = $pBur;
                        $w['price'] = $pDom;
                        $exists = true;
                        break;
                    }
                }
                unset($w);
                if (!$exists) {
                    $wilayas[] = [
                        'name' => $name,
                        'price' => $pDom,
                        'price_domicile' => $pDom,
                        'price_bureau' => $pBur
                    ];
                }
            }
        } elseif ($action === 'edit_wilaya') {
            $oldName = trim($input['oldName'] ?? '');
            $newName = trim($input['newName'] ?? ($input['name'] ?? ''));
            $pDom = isset($input['price_domicile']) ? (float)$input['price_domicile'] : (isset($input['price']) ? (float)$input['price'] : null);
            $pBur = isset($input['price_bureau']) ? (float)$input['price_bureau'] : null;

            if ($oldName !== '') {
                foreach ($wilayas as &$w) {
                    if (strcasecmp($w['name'], $oldName) === 0) {
                        if ($newName !== '') {
                            $w['name'] = $newName;
                        }
                        if ($pDom !== null) {
                            $w['price_domicile'] = $pDom;
                            $w['price'] = $pDom;
                        }
                        if ($pBur !== null) {
                            $w['price_bureau'] = $pBur;
                        }
                        break;
                    }
                }
                unset($w);
            }
        } elseif ($action === 'delete_wilaya') {
            $name = trim($input['name'] ?? '');
            if ($name !== '') {
                $wilayas = array_values(array_filter($wilayas, fn($w) => strcasecmp($w['name'], $name) !== 0));
            }
        } elseif ($action === 'update_wilaya_price') {
            $name = trim($input['name'] ?? '');
            $pDom = isset($input['price_domicile']) ? (float)$input['price_domicile'] : (isset($input['price']) ? (float)$input['price'] : null);
            $pBur = isset($input['price_bureau']) ? (float)$input['price_bureau'] : null;
            if ($name !== '') {
                foreach ($wilayas as &$w) {
                    if (strcasecmp($w['name'], $name) === 0) {
                        if ($pDom !== null) {
                            $w['price_domicile'] = $pDom;
                            $w['price'] = $pDom;
                        }
                        if ($pBur !== null) {
                            $w['price_bureau'] = $pBur;
                        }
                        break;
                    }
                }
                unset($w);
            }
        }

        // Si la liste complète des wilayas est envoyée, synchroniser directement
        if (isset($input['wilayas']) && is_array($input['wilayas'])) {
            $wilayas = normalizeWilayasList($input['wilayas'], $defaultWilayas);
        }

        // Synchroniser également category_images et subcategories si envoyés dans la requête
        if (isset($input['category_images']) && is_array($input['category_images'])) {
            foreach ($input['category_images'] as $k => $v) {
                $cleanKey = trim($k);
                if (is_string($v) && trim($v) !== '') {
                    $categoryImages[$cleanKey] = trim($v);
                } elseif ($v === '' || $v === null) {
                    unset($categoryImages[$cleanKey]);
                }
            }
        }
        if (isset($input['subcategories']) && is_array($input['subcategories'])) {
            $subcategories = $input['subcategories'];
        }

        saveStoredAttributes($db, $categories, $languages, $wilayas, $categoryImages, $subcategories, $brands);

        echo json_encode([
            'success' => true,
            'message' => 'Attributs enregistrés avec succès',
            'categories' => $categories,
            'subcategories' => $subcategories,
            'category_images' => $categoryImages,
            'languages' => $languages,
            'wilayas' => $wilayas,
            'brands' => $brands
        ], JSON_UNESCAPED_UNICODE);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
        break;
}
