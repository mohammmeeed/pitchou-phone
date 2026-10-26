<?php
// backend/api/auth.php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

$pdo = Database::getConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Méthode non autorisée"]);
    exit();
}

$raw = file_get_contents('php://input');
$json = json_decode($raw, true);
$input = is_array($json) ? $json : $_POST;
$email = trim($input['email'] ?? ($input['phone'] ?? ($input['username'] ?? '')));
$password = trim($input['password'] ?? '');

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Identifiant et mot de passe requis"]);
    exit();
}

// Check database first by email, phone, name, or 'leerbook' / 'admin'
$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? OR phone = ? OR name = ? OR (role = 'admin' AND (? = 'admin' OR ? = 'leerbook')) LIMIT 1");
$stmt->execute([$email, $email, $email, $email, $email]);
$user = $stmt->fetch();

$isValidPassword = false;
if ($user && password_verify($password, $user['password'])) {
    $isValidPassword = true;
}

if ($isValidPassword && $user) {
    $customerId = (int)$user['id'];
    $phone = $user['phone'] ?? '';
    $userEmail = $user['email'] ?? '';

    // Trouver le vrai ID client dans la table customers
    if (!empty($phone) || !empty($userEmail)) {
        $cStmt = $pdo->prepare("SELECT id, name, phone, email, address FROM customers WHERE (phone != '' AND phone = ?) OR (email != '' AND email = ?) LIMIT 1");
        $cStmt->execute([$phone, $userEmail]);
        $custRow = $cStmt->fetch();
        if ($custRow) {
            $customerId = (int)$custRow['id'];
        }
    }

    echo json_encode([
        "success" => true,
        "message" => "Connexion réussie",
        "token" => "tk_user_" . bin2hex(random_bytes(16)),
        "user" => [
            "id" => $customerId,
            "user_id" => (int)$user['id'],
            "name" => $user['name'],
            "email" => $userEmail,
            "phone" => $phone,
            "role" => $user['role'] ?? 'customer'
        ]
    ]);
} else {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Identifiant ou mot de passe incorrect"]);
}
