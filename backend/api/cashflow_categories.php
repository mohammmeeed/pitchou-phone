<?php
// backend/api/cashflow_categories.php
// Gestion des catégories d'opérations du Journal de Caisse (Recettes et Dépenses)

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $pdo = Database::getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur de connexion BDD: ' . $e->getMessage()]);
    exit();
}

// Assurer l'existence de la table `settings`
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `settings` (
        `setting_key` VARCHAR(100) PRIMARY KEY,
        `setting_value` TEXT NULL,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
} catch (Exception $e) {}

$defaultRecettes = [
    'VENTE BOUTIQUE / POS',
    'VERSEMENT CLIENT',
    'AUTRE RECETTE'
];

$defaultDepenses = [
    'ACHAT MARCHANDISE / STOCK',
    'FRAIS DE LIVRAISON',
    'FOURNITURES & EMBALLAGE',
    'MARKETING & PUBLICITÉ',
    'LOYER & CHARGES',
    'AUTRE DÉPENSE'
];

function getStoredCategories(PDO $pdo, array $defaultRecettes, array $defaultDepenses): array {
    $stmt = $pdo->prepare("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('cashflow_recettes', 'cashflow_depenses')");
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

    $recettes = $defaultRecettes;
    if (!empty($rows['cashflow_recettes'])) {
        $decoded = json_decode($rows['cashflow_recettes'], true);
        if (is_array($decoded) && count($decoded) > 0) {
            $recettes = array_values(array_filter(array_map('trim', $decoded)));
        }
    }

    $depenses = $defaultDepenses;
    if (!empty($rows['cashflow_depenses'])) {
        $decoded = json_decode($rows['cashflow_depenses'], true);
        if (is_array($decoded) && count($decoded) > 0) {
            $depenses = array_values(array_filter(array_map('trim', $decoded)));
        }
    }

    return [
        'recettes' => $recettes,
        'depenses' => $depenses
    ];
}

function saveStoredCategories(PDO $pdo, array $recettes, array $depenses): void {
    $stmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
    $stmt->execute(['cashflow_recettes', json_encode(array_values(array_unique($recettes)), JSON_UNESCAPED_UNICODE)]);
    $stmt->execute(['cashflow_depenses', json_encode(array_values(array_unique($depenses)), JSON_UNESCAPED_UNICODE)]);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $data = getStoredCategories($pdo, $defaultRecettes, $defaultDepenses);
    echo json_encode([
        'success' => true,
        'data' => $data,
        'recettes' => $data['recettes'],
        'depenses' => $data['depenses']
    ]);
    exit();
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $current = getStoredCategories($pdo, $defaultRecettes, $defaultDepenses);
    $recettes = $current['recettes'];
    $depenses = $current['depenses'];

    $action = $input['action'] ?? 'save_all';
    $targetType = strtoupper($input['type'] ?? 'DEPENSE'); // 'RECETTE' ou 'DEPENSE'

    if ($action === 'add') {
        $name = trim($input['name'] ?? '');
        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Le nom de la catégorie est obligatoire']);
            exit();
        }

        if ($targetType === 'RECETTE') {
            if (!in_array($name, $recettes)) {
                $recettes[] = $name;
            }
        } else {
            if (!in_array($name, $depenses)) {
                $depenses[] = $name;
            }
        }

        saveStoredCategories($pdo, $recettes, $depenses);
        echo json_encode([
            'success' => true,
            'message' => 'Catégorie ajoutée avec succès',
            'recettes' => $recettes,
            'depenses' => $depenses
        ]);
        exit();
    }

    if ($action === 'edit') {
        $oldName = trim($input['oldName'] ?? '');
        $newName = trim($input['newName'] ?? '');

        if (empty($oldName) || empty($newName)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ancien et nouveau nom sont obligatoires']);
            exit();
        }

        if ($targetType === 'RECETTE') {
            $recettes = array_map(function($c) use ($oldName, $newName) {
                return ($c === $oldName) ? $newName : $c;
            }, $recettes);
        } else {
            $depenses = array_map(function($c) use ($oldName, $newName) {
                return ($c === $oldName) ? $newName : $c;
            }, $depenses);
        }

        // Mettre à jour dans les écritures de caisse déjà enregistrées
        try {
            $upStmt = $pdo->prepare("UPDATE cashflow_entries SET order_type = ? WHERE order_type = ?");
            $upStmt->execute([$newName, $oldName]);
        } catch (Exception $e) {}

        saveStoredCategories($pdo, $recettes, $depenses);
        echo json_encode([
            'success' => true,
            'message' => 'Catégorie modifiée avec succès',
            'recettes' => $recettes,
            'depenses' => $depenses
        ]);
        exit();
    }

    if ($action === 'delete') {
        $name = trim($input['name'] ?? '');
        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nom de catégorie obligatoire']);
            exit();
        }

        if ($targetType === 'RECETTE') {
            $recettes = array_values(array_filter($recettes, function($c) use ($name) {
                return $c !== $name;
            }));
        } else {
            $depenses = array_values(array_filter($depenses, function($c) use ($name) {
                return $c !== $name;
            }));
        }

        saveStoredCategories($pdo, $recettes, $depenses);
        echo json_encode([
            'success' => true,
            'message' => 'Catégorie supprimée avec succès',
            'recettes' => $recettes,
            'depenses' => $depenses
        ]);
        exit();
    }

    if ($action === 'save_all') {
        if (isset($input['recettes']) && is_array($input['recettes'])) {
            $recettes = array_values(array_filter(array_map('trim', $input['recettes'])));
        }
        if (isset($input['depenses']) && is_array($input['depenses'])) {
            $depenses = array_values(array_filter(array_map('trim', $input['depenses'])));
        }

        saveStoredCategories($pdo, $recettes, $depenses);
        echo json_encode([
            'success' => true,
            'message' => 'Catégories enregistrées avec succès',
            'recettes' => $recettes,
            'depenses' => $depenses
        ]);
        exit();
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Action inconnue']);
}
