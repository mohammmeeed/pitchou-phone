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

try {
    $db = Database::getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur de connexion BDD: ' . $e->getMessage()]);
    exit();
}

// Assurer l'existence de la table `settings`
try {
    $db->exec("CREATE TABLE IF NOT EXISTS `settings` (
        `setting_key` VARCHAR(100) PRIMARY KEY,
        `setting_value` TEXT NULL,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
} catch (Exception $e) {}

$defaultCategories = [
    'Roman & Littérature',
    'Développement Personnel',
    'Histoire & Récits',
    'Fantasy & Mystère',
    'Philosophie & Poésie',
    'Roman Graphique'
];

$defaultLanguages = [
    'Français',
    'Anglais',
    'Arabe'
];

function getStoredAttributes(PDO $db, array $defaultCategories, array $defaultLanguages): array {
    $stmt = $db->prepare("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('attributes_categories', 'attributes_languages')");
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

    $categories = $defaultCategories;
    if (!empty($rows['attributes_categories'])) {
        $decoded = json_decode($rows['attributes_categories'], true);
        if (is_array($decoded)) {
            $categories = array_values(array_filter(array_map('trim', $decoded)));
        }
    }

    $languages = $defaultLanguages;
    if (!empty($rows['attributes_languages'])) {
        $decoded = json_decode($rows['attributes_languages'], true);
        if (is_array($decoded)) {
            $languages = array_values(array_filter(array_map('trim', $decoded)));
        }
    }

    // Fusionner également avec les catégories existantes des produits pour ne rien perdre
    try {
        $pStmt = $db->query("SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ''");
        $prodCats = $pStmt->fetchAll(PDO::FETCH_COLUMN);
        foreach ($prodCats as $pc) {
            $pc = trim($pc);
            if (!empty($pc) && !in_array($pc, $categories, true)) {
                $categories[] = $pc;
            }
        }
    } catch (Exception $e) {}

    return [
        'categories' => array_values(array_unique($categories)),
        'languages' => array_values(array_unique($languages))
    ];
}

function saveStoredAttributes(PDO $db, array $categories, array $languages): void {
    $stmt = $db->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
    $stmt->execute(['attributes_categories', json_encode(array_values(array_unique($categories)), JSON_UNESCAPED_UNICODE)]);
    $stmt->execute(['attributes_languages', json_encode(array_values(array_unique($languages)), JSON_UNESCAPED_UNICODE)]);
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $data = getStoredAttributes($db, $defaultCategories, $defaultLanguages);
        echo json_encode([
            'success' => true,
            'categories' => $data['categories'],
            'languages' => $data['languages']
        ], JSON_UNESCAPED_UNICODE);
        break;

    case 'POST':
    case 'PUT':
        $raw = file_get_contents('php://input');
        $input = json_decode($raw, true) ?? $_POST;
        $action = $input['action'] ?? 'save_all';

        $current = getStoredAttributes($db, $defaultCategories, $defaultLanguages);
        $categories = $current['categories'];
        $languages = $current['languages'];

        if ($action === 'save_all') {
            if (isset($input['categories']) && is_array($input['categories'])) {
                $categories = array_values(array_filter(array_map('trim', $input['categories'])));
            }
            if (isset($input['languages']) && is_array($input['languages'])) {
                $languages = array_values(array_filter(array_map('trim', $input['languages'])));
            }
        } elseif ($action === 'add_category') {
            $name = trim($input['name'] ?? '');
            if ($name !== '' && !in_array($name, $categories, true)) {
                $categories[] = $name;
            }
        } elseif ($action === 'edit_category') {
            $oldName = trim($input['oldName'] ?? '');
            $newName = trim($input['newName'] ?? '');
            if ($oldName !== '' && $newName !== '') {
                $index = array_search($oldName, $categories, true);
                if ($index !== false) {
                    $categories[$index] = $newName;
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
        }

        saveStoredAttributes($db, $categories, $languages);

        echo json_encode([
            'success' => true,
            'message' => 'Attributs enregistrés avec succès',
            'categories' => $categories,
            'languages' => $languages
        ], JSON_UNESCAPED_UNICODE);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
        break;
}
