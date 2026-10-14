<?php
// backend/api/orders.php
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
    case 'DELETE':
        handleDelete($pdo);
        break;
    default:
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Méthode non autorisée"]);
        break;
}

function handleGet(PDO $pdo): void {
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
        $stmt->execute([(int)$_GET['id']]);
        $order = $stmt->fetch();
        echo json_encode(["success" => true, "data" => $order]);
        return;
    }

    $sql = "SELECT * FROM orders";
    $params = [];
    $where = [];

    if (!empty($_GET['status'])) {
        $where[] = "status = ?";
        $params[] = $_GET['status'];
    }
    if (!empty($_GET['phone'])) {
        $where[] = "customer_phone LIKE ?";
        $params[] = "%" . trim($_GET['phone']) . "%";
    }
    if (!empty($_GET['order_number'])) {
        $where[] = "order_number LIKE ?";
        $params[] = "%" . trim($_GET['order_number']) . "%";
    }
    if (!empty($_GET['search'])) {
        $s = "%" . trim($_GET['search']) . "%";
        $where[] = "(order_number LIKE ? OR customer_phone LIKE ? OR customer_name LIKE ?)";
        $params[] = $s;
        $params[] = $s;
        $params[] = $s;
    }

    if (!empty($where)) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }
    $sql .= " ORDER BY id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $orders = $stmt->fetchAll();

    echo json_encode(["success" => true, "data" => $orders, "count" => count($orders)]);
}

function handlePost(PDO $pdo): void {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    if (empty($input['customer_name']) || empty($input['customer_phone']) || !isset($input['total_amount'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Nom, téléphone et montant total sont requis"]);
        return;
    }

    $orderNum = "#CMD-" . rand(1090, 9999);
    $totalAmount = (float)$input['total_amount'];
    $subtotal = isset($input['subtotal']) ? (float)$input['subtotal'] : $totalAmount;
    $shippingFee = isset($input['shipping_fee']) ? (float)$input['shipping_fee'] : max(0, $totalAmount - $subtotal);

    $stmt = $pdo->prepare("INSERT INTO orders (order_number, customer_name, customer_phone, customer_email, customer_address, subtotal, shipping_fee, total_amount, items_summary, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $orderNum,
        trim($input['customer_name']),
        trim($input['customer_phone']),
        trim($input['customer_email'] ?? ''),
        trim($input['customer_address'] ?? 'Alger'),
        $subtotal,
        $shippingFee,
        $totalAmount,
        trim($input['items_summary'] ?? 'Livre'),
        $input['status'] ?? 'En attente'
    ]);

    // Mettre à jour automatiquement les dépenses du client dans la table customers
    syncCustomerStatsFromOrders($pdo);

    http_response_code(201);
    echo json_encode([
        "success" => true,
        "message" => "Commande créée avec succès",
        "order_number" => $orderNum
    ]);
}

function handlePut(PDO $pdo): void {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($_GET['id'] ?? ($input['id'] ?? 0));

    if (!$id || empty($input['status'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID et nouveau statut sont requis"]);
        return;
    }

    $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?");
    $stmt->execute([trim($input['status']), $id]);

    syncCustomerStatsFromOrders($pdo);

    echo json_encode(["success" => true, "message" => "Statut de la commande mis à jour avec succès"]);
}

function handleDelete(PDO $pdo): void {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID requis"]);
        return;
    }

    $stmt = $pdo->prepare("DELETE FROM orders WHERE id = ?");
    $stmt->execute([$id]);

    syncCustomerStatsFromOrders($pdo);

    echo json_encode(["success" => true, "message" => "Commande supprimée"]);
}

function syncCustomerStatsFromOrders(PDO $pdo): void {
    $sql = "UPDATE customers c
            LEFT JOIN (
                SELECT customer_phone, COUNT(*) AS ord_count, SUM(CASE WHEN status != 'Annulée' THEN total_amount ELSE 0 END) AS ord_spent
                FROM orders GROUP BY customer_phone
            ) o ON TRIM(c.phone) = TRIM(o.customer_phone)
            SET c.total_orders = GREATEST(COALESCE(c.total_orders, 0), COALESCE(o.ord_count, 0)),
                c.total_spent = GREATEST(COALESCE(c.total_spent, 0), COALESCE(o.ord_spent, 0))";
    $pdo->exec($sql);
}

