<?php
// backend/api/admin_profile.php
// Gestion du compte et profil administrateur TikTok Shop

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $db = Database::getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur de connexion BDD: ' . $e->getMessage()]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Liste de tous les administrateurs
        if (isset($_GET['list'])) {
            $stmt = $db->query("SELECT id, name, email, phone, role, created_at FROM users WHERE role = 'admin' ORDER BY id ASC");
            $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'admins' => $admins], JSON_UNESCAPED_UNICODE);
            break;
        }

        // Récupérer le compte administrateur (par défaut id = 1 ou premier admin)
        $id = isset($_GET['id']) ? intval($_GET['id']) : 1;
        $stmt = $db->prepare("SELECT id, name, email, phone, role, created_at FROM users WHERE id = ? OR role = 'admin' ORDER BY id ASC LIMIT 1");
        $stmt->execute([$id]);
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$admin) {
            // Créer l'admin s'il n'existe pas encore
            $defaultPassword = password_hash('admin123', PASSWORD_BCRYPT);
            $insert = $db->prepare("INSERT INTO users (id, name, email, phone, password, role) VALUES (1, 'Administrateur', 'admin@tiktokshop.dz', '0550123456', ?, 'admin')");
            $insert->execute([$defaultPassword]);
            $admin = [
                'id' => 1,
                'name' => 'Administrateur',
                'email' => 'admin@tiktokshop.dz',
                'phone' => '0550123456',
                'role' => 'admin'
            ];
        }

        echo json_encode([
            'success' => true,
            'admin' => $admin
        ], JSON_UNESCAPED_UNICODE);
        break;

    case 'POST':
    case 'PUT':
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?? $_POST;
        $action = $data['action'] ?? 'update';

        // 1. Création d'un NOUVEL administrateur
        if ($action === 'create') {
            $name = trim($data['name'] ?? '');
            $email = trim($data['email'] ?? '');
            $phone = trim($data['phone'] ?? '');
            $password = trim($data['password'] ?? '');
            $role = trim($data['role'] ?? 'admin');

            if (empty($name) || empty($email) || empty($password)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Le nom, l\'adresse email et le mot de passe sont obligatoires pour créer un compte admin.'
                ], JSON_UNESCAPED_UNICODE);
                exit();
            }

            if (strlen($password) < 6) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Le mot de passe doit comporter au moins 6 caractères.'
                ], JSON_UNESCAPED_UNICODE);
                exit();
            }

            // Vérifier si l'adresse email existe déjà
            $check = $db->prepare("SELECT id FROM users WHERE email = ?");
            $check->execute([$email]);
            if ($check->fetch()) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Cette adresse email est déjà utilisée par un autre compte.'
                ], JSON_UNESCAPED_UNICODE);
                exit();
            }

            $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
            $insert = $db->prepare("INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)");
            $insert->execute([$name, $email, $phone, $hashedPassword, $role]);
            $newId = (int)$db->lastInsertId();

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Nouveau compte administrateur créé avec succès !',
                'admin' => [
                    'id' => $newId,
                    'name' => $name,
                    'email' => $email,
                    'phone' => $phone,
                    'role' => $role
                ]
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }

        // 2. Mise à jour du compte administrateur existant

        $id = isset($data['id']) ? intval($data['id']) : 1;
        $name = trim($data['name'] ?? '');
        $email = trim($data['email'] ?? '');
        $phone = trim($data['phone'] ?? '');
        $password = trim($data['password'] ?? '');

        if (empty($name) || empty($email)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Le nom et l\'adresse email sont obligatoires.'
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }

        // Vérifier si l'email n'est pas déjà pris par un autre utilisateur
        $checkStmt = $db->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $checkStmt->execute([$email, $id]);
        if ($checkStmt->fetch()) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Cette adresse email est déjà utilisée par un autre compte.'
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }

        // Mise à jour avec ou sans nouveau mot de passe
        if (!empty($password)) {
            if (strlen($password) < 6) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Le nouveau mot de passe doit comporter au moins 6 caractères.'
                ], JSON_UNESCAPED_UNICODE);
                exit();
            }

            $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
            $stmt = $db->prepare("UPDATE users SET name = ?, email = ?, phone = ?, password = ? WHERE id = ?");
            $stmt->execute([$name, $email, $phone, $hashedPassword, $id]);
        } else {
            $stmt = $db->prepare("UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?");
            $stmt->execute([$name, $email, $phone, $id]);
        }

        // Récupérer le profil mis à jour
        $getStmt = $db->prepare("SELECT id, name, email, phone, role FROM users WHERE id = ?");
        $getStmt->execute([$id]);
        $updated = $getStmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'message' => 'Compte administrateur mis à jour avec succès.',
            'admin' => $updated
        ], JSON_UNESCAPED_UNICODE);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
        break;
}
