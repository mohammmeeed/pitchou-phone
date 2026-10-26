<?php
// backend/api/orders.php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/mailer.php';

$pdo = Database::getConnectionSafe();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

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

function handleGet(?PDO $pdo): void {
    if ($pdo === null) {
        $fallbackFile = __DIR__ . '/../database/orders_fallback.json';
        $orders = [];
        if (file_exists($fallbackFile)) {
            $orders = json_decode(file_get_contents($fallbackFile), true) ?? [];
        }

        if (isset($_GET['id'])) {
            $id = (int)$_GET['id'];
            $found = null;
            foreach ($orders as $ord) {
                if ((int)($ord['id'] ?? 0) === $id) {
                    $found = $ord;
                    break;
                }
            }
            echo json_encode(["success" => true, "data" => $found]);
            return;
        }

        $filtered = $orders;
        if (!empty($_GET['status'])) {
            $status = trim($_GET['status']);
            $filtered = array_filter($filtered, fn($o) => ($o['status'] ?? '') === $status);
        }
        if (!empty($_GET['phone'])) {
            $cleanPhone = preg_replace('/[\s\-\.\(\)\+]/', '', trim($_GET['phone']));
            $filtered = array_filter($filtered, function($o) use ($cleanPhone) {
                $cp = preg_replace('/[\s\-\.\(\)\+]/', '', $o['customer_phone'] ?? '');
                return !empty($cleanPhone) && (stripos($cp, $cleanPhone) !== false || stripos($cleanPhone, $cp) !== false);
            });
        }
        if (!empty($_GET['email'])) {
            $email = trim($_GET['email']);
            $filtered = array_filter($filtered, fn($o) => strcasecmp($o['customer_email'] ?? '', $email) === 0);
        }
        if (!empty($_GET['order_number'])) {
            $on = trim($_GET['order_number']);
            $filtered = array_filter($filtered, fn($o) => stripos($o['order_number'] ?? '', $on) !== false);
        }
        if (!empty($_GET['search'])) {
            $s = trim($_GET['search']);
            $filtered = array_filter($filtered, fn($o) => 
                stripos($o['order_number'] ?? '', $s) !== false ||
                stripos($o['customer_phone'] ?? '', $s) !== false ||
                stripos($o['customer_name'] ?? '', $s) !== false ||
                stripos($o['customer_email'] ?? '', $s) !== false
            );
        }

        $filtered = array_values($filtered);
        usort($filtered, fn($a, $b) => ($b['id'] ?? 0) <=> ($a['id'] ?? 0));
        echo json_encode(["success" => true, "data" => $filtered, "count" => count($filtered)]);
        return;
    }

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
        $cleanPhone = preg_replace('/[\s\-\.\(\)\+]/', '', trim($_GET['phone']));
        $where[] = "(REPLACE(REPLACE(REPLACE(customer_phone, ' ', ''), '-', ''), '+', '') LIKE ? OR customer_phone LIKE ?)";
        $params[] = "%" . $cleanPhone . "%";
        $params[] = "%" . trim($_GET['phone']) . "%";
    }
    if (!empty($_GET['email'])) {
        $where[] = "customer_email = ?";
        $params[] = trim($_GET['email']);
    }
    if (!empty($_GET['order_number'])) {
        $where[] = "order_number LIKE ?";
        $params[] = "%" . trim($_GET['order_number']) . "%";
    }
    if (!empty($_GET['search'])) {
        $s = "%" . trim($_GET['search']) . "%";
        $where[] = "(order_number LIKE ? OR customer_phone LIKE ? OR customer_name LIKE ? OR customer_email LIKE ?)";
        $params[] = $s;
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

function handlePost(?PDO $pdo): void {
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
    $customerAddress = trim($input['customer_address'] ?? 'Alger');
    $deliveryType = trim($input['delivery_type'] ?? '');
    $wilaya = trim($input['wilaya'] ?? '');
    $commune = trim($input['commune'] ?? '');
    $addressDetails = trim($input['address_details'] ?? '');

    $notes = trim($input['notes'] ?? '');
    if (empty($notes) && !empty($deliveryType)) {
        $notes = "Mode: " . ($deliveryType === 'bureau' ? 'En Bureau (Stopdesk)' : 'À Domicile');
        if (!empty($wilaya)) $notes .= " | Wilaya: " . $wilaya;
        if (!empty($commune)) $notes .= " | Commune: " . $commune;
        if (!empty($addressDetails)) $notes .= " | Adresse: " . $addressDetails;
    }

    if ($pdo === null) {
        $fallbackFile = __DIR__ . '/../database/orders_fallback.json';
        $orders = [];
        if (file_exists($fallbackFile)) {
            $orders = json_decode(file_get_contents($fallbackFile), true) ?? [];
        }
        $newOrder = [
            'id' => count($orders) + 1,
            'order_number' => $orderNum,
            'customer_name' => trim($input['customer_name']),
            'customer_phone' => trim($input['customer_phone']),
            'customer_email' => trim($input['customer_email'] ?? ''),
            'customer_address' => $customerAddress,
            'delivery_type' => $deliveryType,
            'wilaya' => $wilaya,
            'commune' => $commune,
            'address_details' => $addressDetails,
            'subtotal' => $subtotal,
            'shipping_fee' => $shippingFee,
            'total_amount' => $totalAmount,
            'items_summary' => trim($input['items_summary'] ?? 'Livre'),
            'status' => $input['status'] ?? 'En attente',
            'notes' => $notes,
            'created_at' => date('Y-m-d H:i:s')
        ];
        $orders[] = $newOrder;
        @file_put_contents($fallbackFile, json_encode($orders, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        http_response_code(201);
        echo json_encode([
            "success" => true,
            "message" => "Commande créée avec succès",
            "order_number" => $orderNum,
            "data" => $newOrder
        ]);
        return;
    }

    // Migration automatique des colonnes de livraison si MySQL est disponible
    $hasExtraColumns = false;
    try {
        $cols = $pdo->query("SHOW COLUMNS FROM orders LIKE 'delivery_type'")->fetchAll();
        if (empty($cols)) {
            $pdo->exec("ALTER TABLE orders ADD COLUMN delivery_type VARCHAR(50) DEFAULT 'bureau', ADD COLUMN wilaya VARCHAR(100) DEFAULT NULL, ADD COLUMN commune VARCHAR(100) DEFAULT NULL, ADD COLUMN address_details TEXT DEFAULT NULL");
            $hasExtraColumns = true;
        } else {
            $hasExtraColumns = true;
        }
    } catch (Throwable $e) {
        $hasExtraColumns = false;
    }

    if ($hasExtraColumns) {
        $stmt = $pdo->prepare("INSERT INTO orders (order_number, customer_name, customer_phone, customer_email, customer_address, delivery_type, wilaya, commune, address_details, subtotal, shipping_fee, total_amount, items_summary, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $orderNum,
            trim($input['customer_name']),
            trim($input['customer_phone']),
            trim($input['customer_email'] ?? ''),
            $customerAddress,
            $deliveryType,
            $wilaya,
            $commune,
            $addressDetails,
            $subtotal,
            $shippingFee,
            $totalAmount,
            trim($input['items_summary'] ?? 'Livre'),
            $input['status'] ?? 'En attente',
            $notes
        ]);
    } else {
        $stmt = $pdo->prepare("INSERT INTO orders (order_number, customer_name, customer_phone, customer_email, customer_address, subtotal, shipping_fee, total_amount, items_summary, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $orderNum,
            trim($input['customer_name']),
            trim($input['customer_phone']),
            trim($input['customer_email'] ?? ''),
            $customerAddress,
            $subtotal,
            $shippingFee,
            $totalAmount,
            trim($input['items_summary'] ?? 'Livre'),
            $input['status'] ?? 'En attente',
            $notes
        ]);
    }

    $lastId = (int)$pdo->lastInsertId();

    // Mettre à jour automatiquement les dépenses du client dans la table customers
    syncCustomerStatsFromOrders($pdo);

    if ($lastId && !empty($input['status']) && (mb_strtolower($input['status']) === 'livrée' || mb_strtolower($input['status']) === 'livree')) {
        syncOrderToCashflow($pdo, $lastId, $input['status']);
    }

    // Déclencher les emails SMTP (Client & Administrateur) avec gabarit très simple et logo
    AppMailer::onOrderCreated($pdo, [
        'order_number' => $orderNum,
        'customer_name' => trim($input['customer_name'] ?? 'Client'),
        'customer_phone' => trim($input['customer_phone'] ?? ''),
        'customer_email' => trim($input['customer_email'] ?? ''),
        'customer_address' => trim($input['customer_address'] ?? 'Alger'),
        'subtotal' => $subtotal,
        'shipping_fee' => $shippingFee,
        'total_amount' => $totalAmount,
        'items_summary' => trim($input['items_summary'] ?? 'Livre'),
        'status' => $input['status'] ?? 'En attente'
    ]);

    http_response_code(201);
    echo json_encode([
        "success" => true,
        "message" => "Commande créée avec succès",
        "order_number" => $orderNum
    ]);
}

function handlePut(?PDO $pdo): void {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($_GET['id'] ?? ($input['id'] ?? 0));

    if (!$id || empty($input['status'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID et nouveau statut sont requis"]);
        return;
    }

    $newStatus = trim($input['status']);

    if ($pdo === null) {
        $fallbackFile = __DIR__ . '/../database/orders_fallback.json';
        $orders = [];
        if (file_exists($fallbackFile)) {
            $orders = json_decode(file_get_contents($fallbackFile), true) ?? [];
        }
        $updated = false;
        foreach ($orders as &$ord) {
            if ((int)($ord['id'] ?? 0) === $id) {
                $ord['status'] = $newStatus;
                $updated = true;
                break;
            }
        }
        unset($ord);
        if ($updated) {
            @file_put_contents($fallbackFile, json_encode($orders, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            echo json_encode(["success" => true, "message" => "Statut de la commande mis à jour avec succès"]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Commande introuvable"]);
        }
        return;
    }

    $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?");
    $stmt->execute([$newStatus, $id]);

    syncCustomerStatsFromOrders($pdo);
    syncOrderToCashflow($pdo, $id, $newStatus);

    echo json_encode(["success" => true, "message" => "Statut de la commande mis à jour avec succès"]);
}

function handleDelete(?PDO $pdo): void {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?? [];
    $id = (int)($_GET['id'] ?? ($input['id'] ?? 0));
    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID requis"]);
        return;
    }

    if ($pdo === null) {
        $fallbackFile = __DIR__ . '/../database/orders_fallback.json';
        $orders = [];
        if (file_exists($fallbackFile)) {
            $orders = json_decode(file_get_contents($fallbackFile), true) ?? [];
        }
        $filtered = array_values(array_filter($orders, fn($o) => (int)($o['id'] ?? 0) !== $id));
        @file_put_contents($fallbackFile, json_encode($filtered, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        echo json_encode(["success" => true, "message" => "Commande supprimée"]);
        return;
    }

    $orderStmt = $pdo->prepare("SELECT order_number FROM orders WHERE id = ?");
    $orderStmt->execute([$id]);
    $orderNumber = $orderStmt->fetchColumn();

    $stmt = $pdo->prepare("DELETE FROM orders WHERE id = ?");
    $stmt->execute([$id]);

    syncCustomerStatsFromOrders($pdo);
    if ($orderNumber) {
        removeOrderFromCashflow($pdo, $orderNumber);
    }

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

function syncOrderToCashflow(PDO $pdo, int $orderId, string $newStatus): void {
    $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
    $stmt->execute([$orderId]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        return;
    }

    $orderNum = trim($order['order_number']);
    $orderNumClean = ltrim($orderNum, '#');

    // Vérifier si la table cashflow_entries existe
    $tableExists = $pdo->query("SHOW TABLES LIKE 'cashflow_entries'")->fetchColumn();
    if (!$tableExists) {
        return;
    }

    $statusLower = mb_strtolower($newStatus);

    if ($statusLower === 'livrée' || $statusLower === 'livree') {
        // Vérifier si cette commande existe déjà dans le journal de caisse
        $checkStmt = $pdo->prepare("SELECT id FROM cashflow_entries WHERE ref_number = ? OR ref_number = ?");
        $checkStmt->execute([$orderNum, $orderNumClean]);
        $existingId = $checkStmt->fetchColumn();

        $subtotal = (float)$order['subtotal'];
        $shipping = (float)$order['shipping_fee'];
        $total = (float)$order['total_amount'];
        // Calcul du bénéfice réel d'après le Prix de Vente et le Prix d'Achat des produits commandés
        $profit = calculateOrderProfit($pdo, $order);

        $customerName = !empty($order['customer_name']) ? trim($order['customer_name']) : 'Client En Ligne';
        $customerPhone = !empty($order['customer_phone']) ? trim($order['customer_phone']) : '';
        $note = 'Commande boutique en ligne ' . $orderNum . (!empty($order['items_summary']) ? ' (' . $order['items_summary'] . ')' : '');

        if ($existingId) {
            $update = $pdo->prepare("UPDATE cashflow_entries SET 
                products_amount = ?, shipping_fee = ?, total_amount = ?, paid_amount = ?, remaining_amount = 0,
                profit_amount = ?, note = ?, status = 'LIVRÉE'
                WHERE id = ?");
            $update->execute([$subtotal, $shipping, $total, $total, $profit, $note, $existingId]);
        } else {
            $insert = $pdo->prepare("INSERT INTO cashflow_entries 
                (`type`, `ref_number`, `party_name`, `party_phone`, `order_type`, `source`, `products_amount`, `shipping_fee`, `total_amount`, `paid_amount`, `remaining_amount`, `profit_amount`, `note`, `status`, `operation_date`)
                VALUES ('VENTE', ?, ?, ?, 'COMMANDE EN LIGNE', 'BOUTIQUE WEB', ?, ?, ?, ?, 0, ?, ?, 'LIVRÉE', CURDATE())");
            $insert->execute([
                $orderNum,
                $customerName,
                $customerPhone,
                $subtotal,
                $shipping,
                $total,
                $total,
                $profit,
                $note
            ]);
        }
    } elseif ($statusLower === 'annulée' || $statusLower === 'annulee') {
        removeOrderFromCashflow($pdo, $orderNum);
    }
}

function removeOrderFromCashflow(PDO $pdo, string $orderNum): void {
    $orderNumClean = ltrim($orderNum, '#');
    $del = $pdo->prepare("DELETE FROM cashflow_entries WHERE (ref_number = ? OR ref_number = ?) AND type = 'VENTE'");
    $del->execute([$orderNum, $orderNumClean]);
}

/**
 * Calcule le bénéfice réel d'une commande selon le prix de vente et le prix d'achat des produits
 */
function calculateOrderProfit(PDO $pdo, array $order): float {
    $subtotal = (float)($order['subtotal'] ?? 0);
    $itemsSummary = trim($order['items_summary'] ?? '');

    if (empty($itemsSummary) || $subtotal <= 0) {
        return round($subtotal * 0.35, 2);
    }

    $parts = explode(',', $itemsSummary);
    $totalPurchaseCost = 0.0;
    $hasMatchedItems = false;

    $stmt = $pdo->prepare("SELECT id, price, purchase_price FROM products WHERE name = ? OR name LIKE ? LIMIT 1");

    foreach ($parts as $part) {
        $part = trim($part);
        if (preg_match('/^(\d+)\s*x\s*(.+)$/i', $part, $matches)) {
            $qty = max(1, (int)$matches[1]);
            $title = trim($matches[2]);
            $stmt->execute([$title, '%' . $title . '%']);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($product) {
                $hasMatchedItems = true;
                $purchasePrice = (float)($product['purchase_price'] ?? 0);
                if ($purchasePrice > 0) {
                    $totalPurchaseCost += ($purchasePrice * $qty);
                } else {
                    // Si prix d'achat non encore renseigné, coût estimé à 65% du prix de vente (marge 35%)
                    $sellingPrice = (float)($product['price'] ?? 0);
                    $itemBasePrice = $sellingPrice > 0 ? $sellingPrice : ($subtotal / $qty);
                    $totalPurchaseCost += ($itemBasePrice * 0.65 * $qty);
                }
            }
        }
    }

    if ($hasMatchedItems) {
        $profit = $subtotal - $totalPurchaseCost;
        return round(max(0, $profit), 2);
    }

    return round($subtotal * 0.35, 2);
}



