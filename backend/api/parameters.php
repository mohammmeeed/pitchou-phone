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

$db = Database::getConnectionSafe();
$fallbackFile = __DIR__ . '/../database/settings_fallback.json';

// Assurer l'existence de la table `settings` si MySQL est disponible
if ($db !== null) {
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS `settings` (
            `setting_key` VARCHAR(100) PRIMARY KEY,
            `setting_value` TEXT NULL,
            `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Exception $e) {
        // Continuer même si la table existe déjà
    }
}

$defaultSettings = [
    // Boutique & Devise
    'store_name' => 'TikTok Shop Algérie',
    'currency' => 'DA (Dinar Algérien)',
    'delivery_cost' => '500',
    'admin_phone' => '0550 12 34 56',
    'admin_email' => 'admin@tiktokshop.dz',
    
    // Apparence
    'accent_color' => '#fe2c55', // TikTok Red par défaut
    'logo_image' => '', // URL du logo de la boutique
    'logo_text' => 'TikTok Shop',
    'top_banner_enabled' => '1',
    'top_banner_text' => '🔥 Livraison Express 58 Wilayas | Paiement à la réception | 100% Satisfait',
    'catalog_layout' => 'grid-3',
    'category_card_style' => 'home_card',
    'products_per_page' => '12',
    
    // Sécurité & Protection
    'block_f12' => '0', // 0 = débloqué, 1 = bloqué
    
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

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

switch ($method) {
    case 'GET':
        $settings = $defaultSettings;
        if (file_exists($fallbackFile)) {
            $cached = json_decode(file_get_contents($fallbackFile), true);
            if (is_array($cached)) {
                $settings = array_merge($settings, $cached);
            }
        }
        if ($db !== null) {
            try {
                $stmt = $db->query("SELECT setting_key, setting_value FROM settings");
                $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
                $settings = array_merge($settings, $rows);
                @file_put_contents($fallbackFile, json_encode($settings, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            } catch (Exception $e) {
                // Utiliser settings existants
            }
        }
        echo json_encode([
            'success' => true,
            'settings' => $settings
        ], JSON_UNESCAPED_UNICODE);
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

        // Action: Envoyer un email de test réel avec le logo
        if ($action === 'send_test_email') {
            require_once __DIR__ . '/../config/mailer.php';
            $settings = AppMailer::getSettings($db);
            $target = trim($data['email'] ?? ($settings['admin_email'] ?? ''));
            if (empty($target) || !filter_var($target, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Adresse email de test invalide']);
                break;
            }
            $title = "Email de test - " . ($settings['store_name'] ?? 'Boutique');
            $content = "<p style=\"margin: 0 0 14px 0;\">Ceci est un email de test envoyé depuis votre panneau d'administration.</p><p style=\"margin: 0;\">Votre configuration SMTP et votre logo fonctionnent parfaitement !</p>";
            $html = AppMailer::buildSimpleTemplate($title, $content, $settings);
            $sent = AppMailer::send($target, $title, $html, $settings);
            echo json_encode([
                'success' => $sent,
                'message' => $sent 
                    ? "Email de test envoyé avec succès à {$target} !" 
                    : "Impossible d'envoyer l'email. Vérifiez vos identifiants SMTP ou si votre serveur autorise les connexions sortantes."
            ]);
            break;
        }

        // Action: Enregistrement des paramètres
        $settingsToSave = $data['settings'] ?? $data;
        if (!is_array($settingsToSave)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Format de données invalide']);
            break;
        }

        // Mettre à jour le fichier fallback local
        $existing = $defaultSettings;
        if (file_exists($fallbackFile)) {
            $cached = json_decode(file_get_contents($fallbackFile), true);
            if (is_array($cached)) {
                $existing = array_merge($existing, $cached);
            }
        }
        foreach ($settingsToSave as $k => $v) {
            $existing[strval($k)] = (is_array($v) || is_object($v)) ? json_encode($v, JSON_UNESCAPED_UNICODE) : strval($v);
        }
        @file_put_contents($fallbackFile, json_encode($existing, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

        if ($db !== null) {
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
                $existing = array_merge($existing, $rows);
            } catch (Exception $e) {
                if ($db->inTransaction()) {
                    $db->rollBack();
                }
            }
        }

        echo json_encode([
            'success' => true,
            'message' => 'Paramètres système enregistrés avec succès !',
            'settings' => $existing
        ], JSON_UNESCAPED_UNICODE);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
        break;
}
