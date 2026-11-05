<?php
// backend/api/suppliers.php
// Gestion complète des Fournisseurs, Achats & Stocks, Versements et Dettes Fournisseurs

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

$pdo = Database::getConnection();

// Création automatique des tables si nécessaires (sans aucune donnée exemple)
initSuppliersTables($pdo);

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

function initSuppliersTables(PDO $pdo): void {
    $createSuppliers = "CREATE TABLE IF NOT EXISTS `suppliers` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `name` varchar(150) NOT NULL,
        `company` varchar(150) DEFAULT NULL,
        `phone` varchar(50) DEFAULT NULL,
        `email` varchar(100) DEFAULT NULL,
        `address` varchar(255) DEFAULT NULL,
        `notes` text DEFAULT NULL,
        `created_at` datetime DEFAULT current_timestamp(),
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $createPurchases = "CREATE TABLE IF NOT EXISTS `purchases` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `purchase_number` varchar(100) NOT NULL,
        `supplier_id` int(11) NOT NULL,
        `supplier_name` varchar(150) NOT NULL,
        `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
        `paid_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
        `remaining_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
        `payment_method` varchar(50) DEFAULT 'Espèces',
        `status` varchar(50) DEFAULT 'EN_COURS',
        `notes` text DEFAULT NULL,
        `purchase_date` date NOT NULL,
        `created_at` datetime DEFAULT current_timestamp(),
        PRIMARY KEY (`id`),
        KEY `idx_purchases_supplier_id` (`supplier_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $createPayments = "CREATE TABLE IF NOT EXISTS `supplier_payments` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `reference` varchar(100) NOT NULL,
        `supplier_id` int(11) NOT NULL,
        `supplier_name` varchar(150) NOT NULL,
        `purchase_id` int(11) DEFAULT NULL,
        `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
        `payment_method` varchar(50) DEFAULT 'Espèces',
        `notes` text DEFAULT NULL,
        `payment_date` date NOT NULL,
        `created_at` datetime DEFAULT current_timestamp(),
        PRIMARY KEY (`id`),
        KEY `idx_payments_supplier_id` (`supplier_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $pdo->exec($createSuppliers);
    $pdo->exec($createPurchases);
    $pdo->exec($createPayments);
}

function handleGet(PDO $pdo): void {
    $type = $_GET['type'] ?? 'suppliers';
    $search = trim($_GET['search'] ?? '');
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    // 1. Détails d'un fournisseur unique avec ses achats et versements
    if ($id > 0) {
        $stmt = $pdo->prepare("SELECT * FROM `suppliers` WHERE id = ?");
        $stmt->execute([$id]);
        $supplier = $stmt->fetch();

        if (!$supplier) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Fournisseur introuvable"]);
            return;
        }

        // Achats liés
        $stmtP = $pdo->prepare("SELECT * FROM `purchases` WHERE supplier_id = ? ORDER BY purchase_date DESC, id DESC");
        $stmtP->execute([$id]);
        $purchases = $stmtP->fetchAll();

        // Versements liés
        $stmtV = $pdo->prepare("SELECT * FROM `supplier_payments` WHERE supplier_id = ? ORDER BY payment_date DESC, id DESC");
        $stmtV->execute([$id]);
        $payments = $stmtV->fetchAll();

        // Totaux
        $totalPurchases = 0;
        foreach ($purchases as $p) {
            $totalPurchases += (float)$p['total_amount'];
        }

        $totalPaidDirectly = 0;
        foreach ($purchases as $p) {
            $totalPaidDirectly += (float)$p['paid_amount'];
        }

        $totalVersements = 0;
        foreach ($payments as $v) {
            $totalVersements += (float)$v['amount'];
        }

        $totalPaid = $totalPaidDirectly + $totalVersements;
        $balance = max(0, $totalPurchases - $totalPaid);
        $progress = $totalPurchases > 0 ? min(100, round(($totalPaid / $totalPurchases) * 100)) : 100;

        $supplier['total_purchases'] = $totalPurchases;
        $supplier['total_paid'] = $totalPaid;
        $supplier['balance'] = $balance;
        $supplier['progress'] = $progress;
        $supplier['purchases'] = $purchases;
        $supplier['payments'] = $payments;

        echo json_encode(["success" => true, "data" => $supplier]);
        return;
    }

    // 2. Liste des Achats (/admin/purchases)
    if ($type === 'purchases') {
        $sql = "SELECT p.*, s.company as supplier_company 
                FROM `purchases` p 
                LEFT JOIN `suppliers` s ON p.supplier_id = s.id 
                WHERE 1=1";
        $params = [];

        if (!empty($search)) {
            $sql .= " AND (p.purchase_number LIKE ? OR p.supplier_name LIKE ? OR p.notes LIKE ?)";
            $s = "%$search%";
            $params = [$s, $s, $s];
        }

        $sql .= " ORDER BY p.purchase_date DESC, p.id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $purchases = $stmt->fetchAll();

        // KPI Achats
        $totalPurchasesAmount = (float)$pdo->query("SELECT COALESCE(SUM(total_amount), 0) FROM `purchases`")->fetchColumn();
        $totalPaidAmount = (float)$pdo->query("SELECT COALESCE(SUM(paid_amount), 0) FROM `purchases`")->fetchColumn();
        $totalRemainingAmount = (float)$pdo->query("SELECT COALESCE(SUM(remaining_amount), 0) FROM `purchases`")->fetchColumn();

        echo json_encode([
            "success" => true,
            "data" => $purchases,
            "kpi" => [
                "total_purchases" => $totalPurchasesAmount,
                "total_paid" => $totalPaidAmount,
                "total_remaining" => $totalRemainingAmount,
                "count" => count($purchases)
            ]
        ]);
        return;
    }

    // 3. Liste des Versements Fournisseurs
    if ($type === 'payments') {
        $sql = "SELECT vp.*, s.company as supplier_company 
                FROM `supplier_payments` vp 
                LEFT JOIN `suppliers` s ON vp.supplier_id = s.id 
                WHERE 1=1";
        $params = [];

        if (!empty($search)) {
            $sql .= " AND (vp.reference LIKE ? OR vp.supplier_name LIKE ? OR vp.notes LIKE ?)";
            $s = "%$search%";
            $params = [$s, $s, $s];
        }

        $sql .= " ORDER BY vp.payment_date DESC, vp.id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $payments = $stmt->fetchAll();

        echo json_encode(["success" => true, "data" => $payments]);
        return;
    }

    // 4. Liste Principale des Fournisseurs (/admin/suppliers) avec calculs en temps réel
    $sql = "SELECT s.* FROM `suppliers` s WHERE 1=1";
    $params = [];

    if (!empty($search)) {
        $sql .= " AND (s.name LIKE ? OR s.company LIKE ? OR s.phone LIKE ? OR s.address LIKE ? OR s.notes LIKE ?)";
        $s = "%$search%";
        $params = [$s, $s, $s, $s, $s];
    }

    $sql .= " ORDER BY s.id DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $suppliers = $stmt->fetchAll();

    // Récupérer les totaux d'achats groupés par supplier_id
    $purchasesTotals = [];
    $ptStmt = $pdo->query("SELECT supplier_id, 
                                  COALESCE(SUM(total_amount), 0) as sum_total, 
                                  COALESCE(SUM(paid_amount), 0) as sum_paid 
                           FROM `purchases` 
                           GROUP BY supplier_id");
    while ($row = $ptStmt->fetch()) {
        $purchasesTotals[(int)$row['supplier_id']] = [
            'sum_total' => (float)$row['sum_total'],
            'sum_paid' => (float)$row['sum_paid']
        ];
    }

    // Récupérer les versements groupés par supplier_id
    $paymentsTotals = [];
    $payStmt = $pdo->query("SELECT supplier_id, COALESCE(SUM(amount), 0) as sum_versements 
                            FROM `supplier_payments` 
                            GROUP BY supplier_id");
    while ($row = $payStmt->fetch()) {
        $paymentsTotals[(int)$row['supplier_id']] = (float)$row['sum_versements'];
    }

    $globalTotalPurchases = 0;
    $globalTotalPaid = 0;
    $globalTotalDebt = 0;
    $debtorsCount = 0;

    foreach ($suppliers as &$sup) {
        $sId = (int)$sup['id'];
        $pData = $purchasesTotals[$sId] ?? ['sum_total' => 0, 'sum_paid' => 0];
        $vTotal = $paymentsTotals[$sId] ?? 0;

        $totPurchases = $pData['sum_total'];
        $totPaid = $pData['sum_paid'] + $vTotal;
        $balance = max(0, $totPurchases - $totPaid);
        $progress = $totPurchases > 0 ? min(100, round(($totPaid / $totPurchases) * 100)) : 100;

        $sup['total_purchases'] = $totPurchases;
        $sup['total_paid'] = $totPaid;
        $sup['balance'] = $balance;
        $sup['progress'] = $progress;

        $globalTotalPurchases += $totPurchases;
        $globalTotalPaid += $totPaid;
        $globalTotalDebt += $balance;
        if ($balance > 0) {
            $debtorsCount++;
        }
    }
    unset($sup);

    echo json_encode([
        "success" => true,
        "data" => $suppliers,
        "kpi" => [
            "total_suppliers" => count($suppliers),
            "total_purchases" => $globalTotalPurchases,
            "total_paid" => $globalTotalPaid,
            "total_debt" => $globalTotalDebt,
            "debtors_count" => $debtorsCount
        ]
    ]);
}

function handlePost(PDO $pdo): void {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Données JSON invalides"]);
        return;
    }

    $action = $input['action'] ?? 'create';

    // 1. Ajouter un Fournisseur
    if ($action === 'create') {
        $name = trim($input['name'] ?? '');
        $company = trim($input['company'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $email = trim($input['email'] ?? '');
        $address = trim($input['address'] ?? '');
        $notes = trim($input['notes'] ?? '');

        if (empty($name)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Le nom du fournisseur est obligatoire"]);
            return;
        }

        $stmt = $pdo->prepare("INSERT INTO `suppliers` (`name`, `company`, `phone`, `email`, `address`, `notes`) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$name, $company ?: $name, $phone, $email, $address, $notes]);

        $newId = (int)$pdo->lastInsertId();
        echo json_encode(["success" => true, "message" => "Fournisseur ajouté avec succès", "id" => $newId]);
        return;
    }

    // 2. Modifier un Fournisseur
    if ($action === 'update') {
        $id = (int)($input['id'] ?? 0);
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "ID du fournisseur invalide"]);
            return;
        }

        $name = trim($input['name'] ?? '');
        $company = trim($input['company'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $email = trim($input['email'] ?? '');
        $address = trim($input['address'] ?? '');
        $notes = trim($input['notes'] ?? '');

        $stmt = $pdo->prepare("UPDATE `suppliers` SET `name` = ?, `company` = ?, `phone` = ?, `email` = ?, `address` = ?, `notes` = ? WHERE `id` = ?");
        $stmt->execute([$name, $company, $phone, $email, $address, $notes, $id]);

        echo json_encode(["success" => true, "message" => "Fournisseur mis à jour avec succès"]);
        return;
    }

    // 3. Ajouter un Versement Fournisseur
    if ($action === 'add_payment') {
        $supplierId = (int)($input['supplier_id'] ?? 0);
        $amount = (float)($input['amount'] ?? 0);
        $paymentDate = !empty($input['payment_date']) ? $input['payment_date'] : date('Y-m-d');
        $paymentMethod = trim($input['payment_method'] ?? 'Espèces');
        $notes = trim($input['notes'] ?? '');
        $purchaseId = !empty($input['purchase_id']) ? (int)$input['purchase_id'] : null;

        if ($supplierId <= 0 || $amount <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Fournisseur et montant (> 0 DA) requis"]);
            return;
        }

        // Trouver le fournisseur
        $sStmt = $pdo->prepare("SELECT name, company FROM `suppliers` WHERE id = ?");
        $sStmt->execute([$supplierId]);
        $supplier = $sStmt->fetch();
        if (!$supplier) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Fournisseur introuvable"]);
            return;
        }

        $supplierName = $supplier['name'];

        // Générer une référence VRST-XX
        $lastPaymentId = (int)$pdo->query("SELECT MAX(id) FROM `supplier_payments`")->fetchColumn();
        $ref = !empty($input['reference']) ? trim($input['reference']) : ('VRST-' . ($lastPaymentId + 1));

        // Insérer dans supplier_payments
        $stmt = $pdo->prepare("INSERT INTO `supplier_payments` 
            (`reference`, `supplier_id`, `supplier_name`, `purchase_id`, `amount`, `payment_method`, `notes`, `payment_date`) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$ref, $supplierId, $supplierName, $purchaseId, $amount, $paymentMethod, $notes, $paymentDate]);
        $paymentId = (int)$pdo->lastInsertId();

        // Insérer automatiquement dans cashflow_entries pour le Journal de Caisse
        $cfStmt = $pdo->prepare("INSERT INTO `cashflow_entries` 
            (`type`, `ref_number`, `party_name`, `party_phone`, `order_type`, `source`, `products_amount`, `shipping_fee`, `total_amount`, `paid_amount`, `remaining_amount`, `profit_amount`, `note`, `status`, `operation_date`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $cfStmt->execute([
            'DEPENSE',
            $ref,
            $supplierName,
            '',
            'VERSEMENT FOURNISSEUR',
            'VERSEMENT',
            0,
            0,
            $amount,
            $amount,
            0,
            0,
            $notes ?: ("Versement au fournisseur " . $supplierName),
            'REÇU',
            $paymentDate
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Versement de " . number_format($amount, 0, ',', ' ') . " DA enregistré avec succès",
            "reference" => $ref,
            "id" => $paymentId
        ]);
        return;
    }

    // 4. Créer un Achat de Stock / Marchandise
    if ($action === 'create_purchase') {
        $supplierId = (int)($input['supplier_id'] ?? 0);
        $totalAmount = (float)($input['total_amount'] ?? 0);
        $paidAmount = (float)($input['paid_amount'] ?? 0);
        $purchaseDate = !empty($input['purchase_date']) ? $input['purchase_date'] : date('Y-m-d');
        $paymentMethod = trim($input['payment_method'] ?? 'Espèces');
        $notes = trim($input['notes'] ?? '');
        $purchaseNumber = trim($input['purchase_number'] ?? '');

        if ($supplierId <= 0 || $totalAmount <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Fournisseur et montant total (> 0 DA) requis"]);
            return;
        }

        // Trouver le nom du fournisseur
        $sStmt = $pdo->prepare("SELECT name, company FROM `suppliers` WHERE id = ?");
        $sStmt->execute([$supplierId]);
        $supplier = $sStmt->fetch();
        if (!$supplier) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Fournisseur introuvable"]);
            return;
        }
        $supplierName = $supplier['name'];

        // Générer le N° Facture s'il est vide
        if (empty($purchaseNumber)) {
            $lastPId = (int)$pdo->query("SELECT MAX(id) FROM `purchases`")->fetchColumn();
            $purchaseNumber = 'FACT-' . date('Ymd') . '-' . str_pad((string)($lastPId + 1), 3, '0', STR_PAD_LEFT);
        }

        $remainingAmount = max(0, $totalAmount - $paidAmount);
        $status = $remainingAmount <= 0 ? 'RÉGLÉ' : ($paidAmount > 0 ? 'EN_COURS' : 'IMPAYÉ');

        $stmt = $pdo->prepare("INSERT INTO `purchases` 
            (`purchase_number`, `supplier_id`, `supplier_name`, `total_amount`, `paid_amount`, `remaining_amount`, `payment_method`, `status`, `notes`, `purchase_date`) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $purchaseNumber,
            $supplierId,
            $supplierName,
            $totalAmount,
            $paidAmount,
            $remainingAmount,
            $paymentMethod,
            $status,
            $notes,
            $purchaseDate
        ]);
        $purchaseId = (int)$pdo->lastInsertId();

        // Si un acompte/paiement a été effectué à l'achat, l'inscrire dans cashflow_entries
        if ($paidAmount > 0) {
            $cfStmt = $pdo->prepare("INSERT INTO `cashflow_entries` 
                (`type`, `ref_number`, `party_name`, `party_phone`, `order_type`, `source`, `products_amount`, `shipping_fee`, `total_amount`, `paid_amount`, `remaining_amount`, `profit_amount`, `note`, `status`, `operation_date`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            
            $cfStmt->execute([
                'DEPENSE',
                $purchaseNumber,
                $supplierName,
                '',
                'ACHAT MARCHANDISE / STOCK',
                'FOURNISSEUR',
                $totalAmount,
                0,
                $totalAmount,
                $paidAmount,
                $remainingAmount,
                0,
                $notes ?: ("Achat matériel / stock - Réf: " . $purchaseNumber),
                $remainingAmount <= 0 ? 'RÉGLÉ' : 'ACOMPTE',
                $purchaseDate
            ]);
        }

        echo json_encode([
            "success" => true,
            "message" => "Facture d'achat " . $purchaseNumber . " enregistrée avec succès",
            "purchase_number" => $purchaseNumber,
            "id" => $purchaseId
        ]);
        return;
    }

    // 5. Modifier une Facture d'Achat
    if ($action === 'update_purchase') {
        $id = (int)($input['id'] ?? 0);
        $supplierId = (int)($input['supplier_id'] ?? 0);
        $totalAmount = (float)($input['total_amount'] ?? 0);
        $paidAmount = (float)($input['paid_amount'] ?? 0);
        $purchaseDate = !empty($input['purchase_date']) ? $input['purchase_date'] : date('Y-m-d');
        $paymentMethod = trim($input['payment_method'] ?? 'Espèces');
        $notes = trim($input['notes'] ?? '');
        $purchaseNumber = trim($input['purchase_number'] ?? '');

        if ($id <= 0 || $supplierId <= 0 || $totalAmount <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Données de facture invalides"]);
            return;
        }

        // Récupérer l'ancienne facture
        $oldP = $pdo->prepare("SELECT * FROM `purchases` WHERE id = ?");
        $oldP->execute([$id]);
        $existing = $oldP->fetch();
        if (!$existing) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Facture introuvable"]);
            return;
        }

        $sStmt = $pdo->prepare("SELECT name FROM `suppliers` WHERE id = ?");
        $sStmt->execute([$supplierId]);
        $supplier = $sStmt->fetch();
        $supplierName = $supplier ? $supplier['name'] : $existing['supplier_name'];

        if (empty($purchaseNumber)) {
            $purchaseNumber = $existing['purchase_number'];
        }

        $remainingAmount = max(0, $totalAmount - $paidAmount);
        $status = $remainingAmount <= 0 ? 'RÉGLÉ' : ($paidAmount > 0 ? 'EN_COURS' : 'IMPAYÉ');

        $upStmt = $pdo->prepare("UPDATE `purchases` SET 
            `purchase_number` = ?, 
            `supplier_id` = ?, 
            `supplier_name` = ?, 
            `total_amount` = ?, 
            `paid_amount` = ?, 
            `remaining_amount` = ?, 
            `payment_method` = ?, 
            `status` = ?, 
            `notes` = ?, 
            `purchase_date` = ? 
            WHERE `id` = ?");
        $upStmt->execute([
            $purchaseNumber,
            $supplierId,
            $supplierName,
            $totalAmount,
            $paidAmount,
            $remainingAmount,
            $paymentMethod,
            $status,
            $notes,
            $purchaseDate,
            $id
        ]);

        // Synchroniser le Journal de Caisse
        $oldNum = $existing['purchase_number'];
        $pdo->prepare("DELETE FROM `cashflow_entries` WHERE `ref_number` = ?")->execute([$oldNum]);
        if ($paidAmount > 0) {
            $cfStmt = $pdo->prepare("INSERT INTO `cashflow_entries` 
                (`type`, `ref_number`, `party_name`, `party_phone`, `supplier_id`, `order_type`, `source`, `products_amount`, `shipping_fee`, `total_amount`, `paid_amount`, `remaining_amount`, `profit_amount`, `note`, `status`, `operation_date`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $cfStmt->execute([
                'DEPENSE',
                $purchaseNumber,
                $supplierName,
                '',
                $supplierId,
                'ACHAT MARCHANDISE / STOCK',
                'FOURNISSEUR',
                $totalAmount,
                0,
                $totalAmount,
                $paidAmount,
                $remainingAmount,
                0,
                $notes ?: ("Achat matériel / stock - Réf: " . $purchaseNumber),
                $remainingAmount <= 0 ? 'RÉGLÉ' : 'ACOMPTE',
                $purchaseDate
            ]);
        }

        echo json_encode(["success" => true, "message" => "Facture d'achat mise à jour avec succès"]);
        return;
    }

    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Action non reconnue"]);
}

function handlePut(PDO $pdo): void {
    handlePost($pdo);
}

function handleDelete(PDO $pdo): void {
    $type = $_GET['type'] ?? 'supplier';
    $id = (int)($_GET['id'] ?? 0);

    if ($id <= 0) {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)($input['id'] ?? 0);
        $type = $input['type'] ?? $type;
    }

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID invalide pour la suppression"]);
        return;
    }

    // Supprimer un achat
    if ($type === 'purchase') {
        // Trouver la facture pour nettoyer cashflow
        $pStmt = $pdo->prepare("SELECT purchase_number FROM `purchases` WHERE id = ?");
        $pStmt->execute([$id]);
        $purchase = $pStmt->fetch();

        if ($purchase) {
            $pdo->prepare("DELETE FROM `cashflow_entries` WHERE `ref_number` = ?")->execute([$purchase['purchase_number']]);
        }

        $stmt = $pdo->prepare("DELETE FROM `purchases` WHERE `id` = ?");
        $stmt->execute([$id]);

        echo json_encode(["success" => true, "message" => "Facture d'achat supprimée avec succès"]);
        return;
    }

    // Supprimer un versement
    if ($type === 'payment') {
        $vStmt = $pdo->prepare("SELECT reference FROM `supplier_payments` WHERE id = ?");
        $vStmt->execute([$id]);
        $payment = $vStmt->fetch();

        if ($payment) {
            $pdo->prepare("DELETE FROM `cashflow_entries` WHERE `ref_number` = ?")->execute([$payment['reference']]);
        }

        $stmt = $pdo->prepare("DELETE FROM `supplier_payments` WHERE `id` = ?");
        $stmt->execute([$id]);

        echo json_encode(["success" => true, "message" => "Versement supprimé avec succès"]);
        return;
    }

    // Supprimer un fournisseur complet
    // Supprimer aussi ses versements et achats associés
    $delPayments = $pdo->prepare("DELETE FROM `supplier_payments` WHERE `supplier_id` = ?");
    $delPayments->execute([$id]);

    $delPurchases = $pdo->prepare("DELETE FROM `purchases` WHERE `supplier_id` = ?");
    $delPurchases->execute([$id]);

    $stmt = $pdo->prepare("DELETE FROM `suppliers` WHERE `id` = ?");
    $stmt->execute([$id]);

    echo json_encode(["success" => true, "message" => "Fournisseur supprimé avec succès"]);
}

