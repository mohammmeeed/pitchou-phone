<?php
// backend/api/customers.php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

$pdo = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGet($pdo);
        break;
    case 'POST':
        handlePost($pdo);
        break;
    case 'PUT':
        handlePut($pdo);
        break;
    default:
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Méthode non autorisée"]);
        break;
}

function syncCustomerStats(PDO $pdo): void {
    $sql = "UPDATE customers c
            LEFT JOIN (
                SELECT customer_phone, COUNT(*) AS ord_count, SUM(CASE WHEN status != 'Annulée' THEN total_amount ELSE 0 END) AS ord_spent
                FROM orders GROUP BY customer_phone
            ) o ON TRIM(c.phone) = TRIM(o.customer_phone)
            SET c.total_orders = GREATEST(COALESCE(c.total_orders, 0), COALESCE(o.ord_count, 0)),
                c.total_spent = GREATEST(COALESCE(c.total_spent, 0), COALESCE(o.ord_spent, 0))";
    $pdo->exec($sql);
}

function handleGet(PDO $pdo): void {
    // Toujours recalculer et synchroniser les commandes réelles et dépenses cumulées
    syncCustomerStats($pdo);

    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
        $stmt->execute([(int)$_GET['id']]);
        $customer = $stmt->fetch();
        if ($customer) {
            echo json_encode(["success" => true, "data" => $customer]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Client non trouvé"]);
        }
        return;
    }

    $stmt = $pdo->query("SELECT * FROM customers ORDER BY id DESC");
    $customers = $stmt->fetchAll();
    echo json_encode(["success" => true, "data" => $customers, "count" => count($customers)]);
}

function handlePut(PDO $pdo): void {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?? [];
    $id = (int)($_GET['id'] ?? ($input['id'] ?? 0));

    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID du client manquant."]);
        return;
    }

    $checkStmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
    $checkStmt->execute([$id]);
    $existing = $checkStmt->fetch();

    if (!$existing) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Client introuvable."]);
        return;
    }

    $name = trim($input['name'] ?? $existing['name']);
    $phone = trim($input['phone'] ?? $existing['phone']);
    $email = trim($input['email'] ?? $existing['email']);
    $address = trim($input['address'] ?? $existing['address']);

    if (empty($name)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Le nom complet est obligatoire."]);
        return;
    }

    if (empty($phone)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Le numéro de téléphone est obligatoire."]);
        return;
    }

    // Vérifier si le téléphone est déjà utilisé par un autre client
    if ($phone !== $existing['phone']) {
        $checkPhone = $pdo->prepare("SELECT id FROM customers WHERE phone = ? AND id != ? LIMIT 1");
        $checkPhone->execute([$phone, $id]);
        if ($checkPhone->fetch()) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Ce numéro de téléphone est déjà associé à un autre client."]);
            return;
        }
    }

    // Mettre à jour les informations du client
    $updateStmt = $pdo->prepare("UPDATE customers SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?");
    $updateStmt->execute([$name, $phone, $email, $address, $id]);

    // Si le numéro de téléphone a changé, répercuter sur les commandes et les comptes utilisateurs
    if ($phone !== $existing['phone']) {
        $updateOrders = $pdo->prepare("UPDATE orders SET customer_phone = ?, customer_name = ? WHERE customer_phone = ?");
        $updateOrders->execute([$phone, $name, $existing['phone']]);

        $updateUsers = $pdo->prepare("UPDATE users SET name = ?, phone = ?, email = COALESCE(NULLIF(?, ''), email) WHERE phone = ?");
        $updateUsers->execute([$name, $phone, $email, $existing['phone']]);
    } else {
        $updateOrders = $pdo->prepare("UPDATE orders SET customer_name = ? WHERE customer_phone = ?");
        $updateOrders->execute([$name, $phone]);

        if (!empty($existing['phone'])) {
            $updateUsers = $pdo->prepare("UPDATE users SET name = ?, email = COALESCE(NULLIF(?, ''), email) WHERE phone = ?");
            $updateUsers->execute([$name, $email, $existing['phone']]);
        }
    }

    // Recalculer les totaux
    syncCustomerStats($pdo);

    $resStmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
    $resStmt->execute([$id]);
    $updated = $resStmt->fetch();

    echo json_encode([
        "success" => true,
        "message" => "Informations du client modifiées avec succès.",
        "data" => $updated
    ]);
}

function handlePost(PDO $pdo): void {
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    $input = is_array($json) ? $json : $_POST;

    $name = trim($input['name'] ?? ($input['fullName'] ?? ''));
    $email = trim($input['email'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $password = trim($input['password'] ?? '');
    $address = trim($input['address'] ?? 'Alger');

    if (empty($name)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Le nom complet est obligatoire."]);
        return;
    }

    if (empty($phone)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Le numéro de téléphone est obligatoire."]);
        return;
    }

    // 1. Insertion ou mise à jour dans la table customers
    $checkCust = $pdo->prepare("SELECT id FROM customers WHERE phone = ? OR (email != '' AND email = ?) LIMIT 1");
    $checkCust->execute([$phone, $email]);
    $existingCust = $checkCust->fetch();

    if ($existingCust) {
        $stmtCust = $pdo->prepare("UPDATE customers SET name = ?, email = ?, address = COALESCE(NULLIF(?, ''), address) WHERE id = ?");
        $stmtCust->execute([$name, $email, $address, $existingCust['id']]);
        $customerId = (int)$existingCust['id'];
    } else {
        $stmtCust = $pdo->prepare("INSERT INTO customers (name, email, phone, address, total_orders, total_spent, created_at) VALUES (?, ?, ?, ?, 0, 0.00, NOW())");
        $stmtCust->execute([$name, $email, $phone, $address]);
        $customerId = (int)$pdo->lastInsertId();
    }

    // 2. Insertion ou mise à jour dans la table users (pour authentification)
    if (!empty($password)) {
        $checkUser = $pdo->prepare("SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1");
        $checkUser->execute([$email, $phone]);
        $existingUser = $checkUser->fetch();
        $hashed = password_hash($password, PASSWORD_DEFAULT);

        if ($existingUser) {
            $stmtUser = $pdo->prepare("UPDATE users SET name = ?, password = ?, phone = ? WHERE id = ?");
            $stmtUser->execute([$name, $hashed, $phone, $existingUser['id']]);
        } else {
            $userEmail = !empty($email) ? $email : ($phone . '@tiktokshop.dz');
            $stmtUser = $pdo->prepare("INSERT INTO users (name, email, phone, password, role, created_at) VALUES (?, ?, ?, ?, 'customer', NOW())");
            $stmtUser->execute([$name, $userEmail, $phone, $hashed]);
        }
    }

    // Récupérer le profil complet enregistré
    $fetchStmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
    $fetchStmt->execute([$customerId]);
    $savedCustomer = $fetchStmt->fetch();

    http_response_code(201);
    echo json_encode([
        "success" => true,
        "message" => "Compte client créé avec succès dans la base de données",
        "data" => $savedCustomer
    ]);
}

