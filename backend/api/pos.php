<?php
// backend/api/pos.php
// Point de Vente (POS / Caisse Boutique)
// Gestion des ventes au comptoir, décrémentation de stock, écriture en caisse et génération de tickets

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$pdo = Database::getConnectionSafe();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

switch ($method) {
    case 'GET':
        handleGetPos($pdo);
        break;
    case 'POST':
        handleCreatePosSale($pdo);
        break;
    default:
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Méthode non autorisée"]);
        break;
}

function getPosShopSettings(?PDO $pdo): array {
    $settings = [
        'store_name' => 'Pitchou Phone',
        'admin_phone' => '0550 12 34 56',
        'address' => 'Boutique Pitchou Phone',
        'currency' => 'DA'
    ];

    if ($pdo !== null) {
        try {
            $stmt = $pdo->query("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('store_name', 'admin_phone', 'logo_text')");
            $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            if (!empty($rows['store_name'])) $settings['store_name'] = $rows['store_name'];
            elseif (!empty($rows['logo_text'])) $settings['store_name'] = $rows['logo_text'];
            if (!empty($rows['admin_phone'])) $settings['admin_phone'] = $rows['admin_phone'];
        } catch (Throwable $e) {}
    }

    return $settings;
}

function ensurePosTables(?PDO $pdo): void {
    if ($pdo === null) return;
    try {
        $prodCols = $pdo->query("SHOW COLUMNS FROM products LIKE 'barcode'")->fetchAll();
        if (empty($prodCols)) {
            $pdo->exec("ALTER TABLE products ADD COLUMN barcode VARCHAR(100) DEFAULT ''");
        }
        $cols = $pdo->query("SHOW COLUMNS FROM orders LIKE 'delivery_type'")->fetchAll();
        if (empty($cols)) {
            $pdo->exec("ALTER TABLE orders ADD COLUMN delivery_type VARCHAR(50) DEFAULT 'bureau', ADD COLUMN wilaya VARCHAR(100) DEFAULT NULL, ADD COLUMN commune VARCHAR(100) DEFAULT NULL, ADD COLUMN address_details TEXT DEFAULT NULL");
        }
        $pdo->exec("CREATE TABLE IF NOT EXISTS cashflow_entries (
            id int(11) NOT NULL AUTO_INCREMENT,
            type varchar(50) NOT NULL,
            ref_number varchar(100) DEFAULT NULL,
            party_name varchar(150) DEFAULT NULL,
            party_phone varchar(50) DEFAULT NULL,
            order_type varchar(100) DEFAULT 'À RÉCUPÉRER',
            source varchar(100) DEFAULT 'CAISSE POS',
            products_amount decimal(12,2) DEFAULT 0.00,
            shipping_fee decimal(12,2) DEFAULT 0.00,
            total_amount decimal(12,2) NOT NULL,
            paid_amount decimal(12,2) NOT NULL,
            remaining_amount decimal(12,2) DEFAULT 0.00,
            profit_amount decimal(12,2) DEFAULT 0.00,
            note text DEFAULT NULL,
            status varchar(50) DEFAULT 'RÉGLÉ',
            operation_date date NOT NULL,
            created_at datetime DEFAULT current_timestamp(),
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        $pdo->exec("CREATE TABLE IF NOT EXISTS customers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            phone VARCHAR(50) NOT NULL,
            email VARCHAR(255) NULL,
            address TEXT NULL,
            total_orders INT DEFAULT 0,
            total_spent DECIMAL(10,2) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )");
    } catch (Throwable $e) {}
}

function ensureOrderDeliveryColumns(?PDO $pdo): void {
    ensurePosTables($pdo);
}

function handleGetPos(?PDO $pdo): void {
    ensureOrderDeliveryColumns($pdo);
    $shop = getPosShopSettings($pdo);
    $products = [];
    $recentSales = [];

    if ($pdo !== null) {
        try {
            $stmt = $pdo->query("SELECT id, name, author, brand, category, categories, format, price, purchase_price, stock, image, images, video, videos, barcode FROM products ORDER BY stock DESC, name ASC");
            $rawProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $topCategories = ['Téléphones', 'Accessoires', 'Batteries', 'Chargeurs & Câbles', 'Écrans & Pièces', 'Livres'];
            $topCategoriesNorm = array_map(fn($c) => mb_strtolower(trim($c)), $topCategories);

            foreach ($rawProducts as $p) {
                // Décodage images
                $images = [];
                if (!empty($p['images'])) {
                    $dec = json_decode($p['images'], true);
                    if (is_array($dec)) $images = array_values(array_filter($dec, fn($x) => is_string($x) && trim($x) !== ''));
                }
                if (empty($images) && !empty($p['image']) && trim($p['image']) !== '') $images = [trim($p['image'])];

                // Décodage vidéos
                $videos = [];
                if (!empty($p['videos'])) {
                    $decVid = json_decode($p['videos'], true);
                    if (is_array($decVid)) $videos = array_values(array_filter($decVid, fn($x) => is_string($x) && trim($x) !== ''));
                }
                if (empty($videos) && !empty($p['video']) && trim($p['video']) !== '') $videos = [trim($p['video'])];

                // Décodage catégories
                $cats = [];
                if (!empty($p['categories'])) {
                    $decCats = json_decode($p['categories'], true);
                    if (is_array($decCats)) $cats = $decCats;
                    else $cats = array_map('trim', explode(',', $p['categories']));
                } elseif (!empty($p['category'])) {
                    $cats = array_map('trim', explode(',', $p['category']));
                }
                $cats = array_values(array_filter($cats));

                // Déduction sous-catégorie
                $sub = '';
                foreach ($cats as $c) {
                    $cTrim = trim($c);
                    $cNorm = mb_strtolower($cTrim);
                    if ($cTrim !== '' && !in_array($cNorm, $topCategoriesNorm, true)) {
                        $sub = $cTrim;
                        break;
                    }
                }
                if (empty($sub) && !empty($cats[0])) $sub = $cats[0];

                $brand = !empty($p['brand']) ? trim($p['brand']) : (!empty($p['author']) ? trim($p['author']) : '');

                $firstImg = !empty($images[0]) ? $images[0] : '';
                $firstVid = !empty($videos[0]) ? $videos[0] : '';

                $products[] = [
                    'id' => (int)$p['id'],
                    'name' => $p['name'],
                    'brand' => $brand,
                    'author' => $brand,
                    'category' => implode(', ', $cats),
                    'categories' => $cats,
                    'subcategory' => $sub,
                    'price' => (float)$p['price'],
                    'purchase_price' => (float)($p['purchase_price'] ?? 0),
                    'stock' => max(0, (int)($p['stock'] ?? 0)),
                    'image' => $firstImg ?: ($firstVid ? '' : '/assets/images/categories/telephones.svg'),
                    'images' => $images,
                    'video' => $firstVid ?: null,
                    'videos' => $videos,
                    'barcode' => trim($p['barcode'] ?? '')
                ];
            }

            // Récentes ventes POS du jour
            $salesStmt = $pdo->query("SELECT id, order_number, customer_name, total_amount, items_summary, created_at, status FROM orders WHERE delivery_type = 'boutique' OR order_number LIKE '#POS%' ORDER BY id DESC LIMIT 15");
            $recentSales = $salesStmt->fetchAll(PDO::FETCH_ASSOC);

            // Liste de tous les clients pour recherche / autocomplétion POS
            $custStmt = $pdo->query("SELECT id, name, phone, email, address, total_orders, total_spent FROM customers ORDER BY total_orders DESC, name ASC");
            $customers = $custStmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
            return;
        }
    } else {
        $fallbackCustFile = __DIR__ . '/../database/customers_fallback.json';
        if (file_exists($fallbackCustFile)) {
            $customers = json_decode(file_get_contents($fallbackCustFile), true) ?? [];
        }
    }

    echo json_encode([
        "success" => true,
        "shop" => $shop,
        "products" => $products,
        "customers" => $customers ?? [],
        "recent_sales" => $recentSales,
        "count" => count($products)
    ]);
}

function handleCreatePosSale(?PDO $pdo): void {
    ensurePosTables($pdo);
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $items = is_array($input['items'] ?? null) ? $input['items'] : [];
    if (empty($items)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Le panier de vente est vide."]);
        return;
    }

    $totalAmount = (float)($input['total_amount'] ?? 0);
    $subtotal = (float)($input['subtotal'] ?? $totalAmount);
    $discount = (float)($input['discount'] ?? 0);
    $amountReceived = isset($input['amount_received']) ? (float)$input['amount_received'] : $totalAmount;
    $changeGiven = max(0, $amountReceived - $totalAmount);
    $paymentMethod = trim($input['payment_method'] ?? 'Espèces');
    $customerName = trim($input['customer_name'] ?? 'Client Comptoir');
    if ($customerName === '') $customerName = 'Client Comptoir';
    $customerPhone = trim($input['customer_phone'] ?? '');
    $notes = trim($input['notes'] ?? 'Vente Caisse POS (Boutique)');

    $orderNum = "#POS-" . rand(1000, 9999);
    $shop = getPosShopSettings($pdo);

    // Résumé des articles et calcul du coût d'achat
    $summaryParts = [];
    $totalPurchaseCost = 0.0;

    foreach ($items as $item) {
        $qty = max(1, (int)($item['quantity'] ?? 1));
        $name = trim($item['name'] ?? 'Produit');
        $price = (float)($item['price'] ?? 0);
        $purchasePrice = (float)($item['purchase_price'] ?? 0);

        $summaryParts[] = "{$qty}x {$name}";
        $totalPurchaseCost += ($purchasePrice > 0 ? $purchasePrice * $qty : $price * 0.65 * $qty);
    }

    $itemsSummary = implode(', ', $summaryParts);
    $profitAmount = max(0, $totalAmount - $totalPurchaseCost);

    if ($pdo !== null) {
        try {
            $pdo->beginTransaction();

            // 1. Décrémenter le stock dans la table products
            $updateStockStmt = $pdo->prepare("UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?");
            foreach ($items as $item) {
                if (!empty($item['id'])) {
                    $qty = max(1, (int)($item['quantity'] ?? 1));
                    $updateStockStmt->execute([$qty, (int)$item['id']]);
                }
            }

            // 2. Insérer dans la table orders (statut Livrée, delivery_type boutique)

            $stmtOrder = $pdo->prepare("INSERT INTO orders (order_number, customer_name, customer_phone, customer_email, customer_address, delivery_type, wilaya, commune, address_details, subtotal, shipping_fee, total_amount, items_summary, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmtOrder->execute([
                $orderNum,
                $customerName,
                $customerPhone,
                '',
                'Boutique',
                'boutique',
                'Boutique',
                'Comptoir',
                'Vente en magasin',
                $subtotal,
                0.00,
                $totalAmount,
                $itemsSummary,
                'Livrée',
                "POS - Paiement: {$paymentMethod}" . ($notes ? " | {$notes}" : '')
            ]);
            $orderId = (int)$pdo->lastInsertId();

            // 3. Insérer dans la table cashflow_entries pour le Journal de Caisse
            try {
                $stmtCashflow = $pdo->prepare("INSERT INTO `cashflow_entries` 
                    (`type`, `ref_number`, `party_name`, `party_phone`, `order_type`, `source`, `products_amount`, `shipping_fee`, `total_amount`, `paid_amount`, `remaining_amount`, `profit_amount`, `note`, `status`, `operation_date`, `created_at`)
                    VALUES ('VENTE', ?, ?, ?, 'VENTE COMPTOIR', 'CAISSE POS', ?, 0.00, ?, ?, 0.00, ?, ?, 'RÉGLÉ', CURDATE(), NOW())");

                $stmtCashflow->execute([
                    $orderNum,
                    $customerName,
                    $customerPhone,
                    $subtotal,
                    $totalAmount,
                    $totalAmount,
                    $profitAmount,
                    "Vente POS: " . $itemsSummary
                ]);
            } catch (Throwable $e) {
                error_log("POS Cashflow error: " . $e->getMessage());
            }

            // 4. Mettre à jour ou créer le profil client si nom ou téléphone renseigné
            $cleanCustName = trim($customerName);
            $isNotAnonymous = ($cleanCustName !== '' && mb_strtolower($cleanCustName) !== 'client comptoir');

            if ($isNotAnonymous || !empty($customerPhone)) {
                try {

                    $existingCustomer = null;
                    if (!empty($customerPhone)) {
                        $chk = $pdo->prepare("SELECT id, total_orders, total_spent, name, phone FROM customers WHERE phone = ? LIMIT 1");
                        $chk->execute([$customerPhone]);
                        $existingCustomer = $chk->fetch(PDO::FETCH_ASSOC);
                    }
                    if (!$existingCustomer && $isNotAnonymous) {
                        $chkName = $pdo->prepare("SELECT id, total_orders, total_spent, name, phone FROM customers WHERE LOWER(TRIM(name)) = LOWER(?) LIMIT 1");
                        $chkName->execute([$cleanCustName]);
                        $existingCustomer = $chkName->fetch(PDO::FETCH_ASSOC);
                    }

                    if ($existingCustomer) {
                        $upd = $pdo->prepare("UPDATE customers SET 
                            total_orders = total_orders + 1, 
                            total_spent = total_spent + ?,
                            phone = CASE WHEN (phone IS NULL OR phone = '' OR phone = '0555000000') AND ? != '' THEN ? ELSE phone END,
                            name = CASE WHEN (name IS NULL OR name = '' OR LOWER(name) = 'client comptoir') AND ? != '' THEN ? ELSE name END
                            WHERE id = ?");
                        $upd->execute([$totalAmount, $customerPhone, $customerPhone, $cleanCustName, $cleanCustName, $existingCustomer['id']]);
                    } else {
                        $newCustName = $isNotAnonymous ? $cleanCustName : 'Client Comptoir';
                        $ins = $pdo->prepare("INSERT INTO customers (name, phone, address, total_orders, total_spent, created_at) VALUES (?, ?, 'Boutique', 1, ?, NOW())");
                        $ins->execute([$newCustName, $customerPhone ?: '', $totalAmount]);
                    }
                } catch (Throwable $e) {
                    error_log("POS Customer error: " . $e->getMessage());
                }
            }

            if ($pdo->inTransaction()) { $pdo->commit(); }

        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Erreur lors de l'enregistrement de la vente: " . $e->getMessage()]);
            return;
        }
    }

    $receipt = [
        'ticket_number' => $orderNum,
        'date' => date('d/m/Y'),
        'time' => date('H:i'),
        'shop_name' => $shop['store_name'],
        'shop_phone' => $shop['admin_phone'],
        'shop_address' => $shop['address'],
        'customer_name' => $customerName,
        'customer_phone' => $customerPhone,
        'items' => array_map(function($i) {
            $qty = max(1, (int)($i['quantity'] ?? 1));
            $price = (float)($i['price'] ?? 0);
            return [
                'name' => trim($i['name'] ?? 'Article'),
                'brand' => trim($i['brand'] ?? ''),
                'quantity' => $qty,
                'price' => $price,
                'total' => $qty * $price
            ];
        }, $items),
        'subtotal' => $subtotal,
        'discount' => $discount,
        'total' => $totalAmount,
        'amount_received' => $amountReceived,
        'change_given' => $changeGiven,
        'payment_method' => $paymentMethod,
        'items_count' => count($items)
    ];

    echo json_encode([
        "success" => true,
        "message" => "Vente boutique validée avec succès !",
        "order_number" => $orderNum,
        "receipt" => $receipt
    ]);
}
