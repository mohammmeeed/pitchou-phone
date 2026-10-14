<?php
// backend/api/parameters.php
// Configuration générale, Apparence & Configuration SMTP

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
} catch (Exception $e) {
    // Continuer même si la table existe déjà
}

$defaultSettings = [
    // Boutique & Devise
    'store_name' => 'TikTok Shop Algérie',
    'currency' => 'DA (Dinar Algérien)',
    'delivery_cost' => '500',
    'admin_phone' => '0550 12 34 56',
    'admin_email' => 'admin@tiktokshop.dz',
    
    // Apparence
    'theme_mode' => 'light', // light | dark | auto
    'accent_color' => '#fe2c55', // TikTok Red par défaut
    'logo_image' => '', // URL du logo de la boutique
    'logo_text' => 'TikTok Shop',
    'top_banner_enabled' => '1',
    'top_banner_text' => '🔥 Livraison Express 58 Wilayas | Paiement à la réception | 100% Satisfait',
    'catalog_layout' => 'grid-3',
    'products_per_page' => '12',
    
    // Configuration SMTP
    'smtp_enabled' => '1',
    'smtp_host' => 'smtp.gmail.com',
    'smtp_port' => '587',
    'smtp_encryption' => 'tls', // tls | ssl | none
    'smtp_username' => 'contact@tiktokshop.dz',
    'smtp_password' => '',
    'smtp_from_name' => 'TikTok Shop Algérie',
    'smtp_reply_to' => 'support@tiktokshop.dz',
    'smtp_notify_customer' => '1',
    'smtp_notify_admin' => '1'
];

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        try {
            $stmt = $db->query("SELECT setting_key, setting_value FROM settings");
            $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            
            $settings = array_merge($defaultSettings, $rows);
            
            echo json_encode([
                'success' => true,
                'settings' => $settings
            ], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            echo json_encode([
                'success' => true,
                'settings' => $defaultSettings,
                'warning' => 'Utilisation des paramètres par défaut'
            ], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'POST':
    case 'PUT':
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?? $_POST;
        $action = $data['action'] ?? 'save';

        // Action: Test de connexion SMTP
        if ($action === 'test_smtp') {
            $host = trim($data['smtp_host'] ?? 'smtp.gmail.com');
            $port = intval($data['smtp_port'] ?? 587);

            if (empty($host) || $port <= 0) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Hôte SMTP et port valides obligatoires.'
                ]);
                break;
            }

            // Test de socket TCP avec timeout 3s
            $errno = 0;
            $errstr = '';
            $fp = @fsockopen($host, $port, $errno, $errstr, 3);
            if ($fp) {
                // Lecture bannière SMTP
                $response = fgets($fp, 512);
                fclose($fp);
                echo json_encode([
                    'success' => true,
                    'message' => "Connexion au serveur SMTP ($host:$port) réussie avec succès ! " . ($response ? trim($response) : '')
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => "Impossible d'établir une connexion avec le serveur SMTP ($host:$port) : $errstr (Code: $errno)"
                ]);
            }
            break;
        }

        // Action: Enregistrement des paramètres
        $settingsToSave = $data['settings'] ?? $data;
        if (!is_array($settingsToSave)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Format de données invalide']);
            break;
        }

        try {
            $stmt = $db->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");

            $db->beginTransaction();
            foreach ($settingsToSave as $k => $v) {
                if (is_array($v) || is_object($v)) {
                    $v = json_encode($v, JSON_UNESCAPED_UNICODE);
                }
                $stmt->execute([strval($k), strval($v)]);
            }
            $db->commit();

            // Recharger les paramètres complets
            $stmt = $db->query("SELECT setting_key, setting_value FROM settings");
            $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            $merged = array_merge($defaultSettings, $rows);

            echo json_encode([
                'success' => true,
                'message' => 'Paramètres système enregistrés avec succès dans MySQL !',
                'settings' => $merged
            ], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la sauvegarde : ' . $e->getMessage()
            ]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
        break;
}
