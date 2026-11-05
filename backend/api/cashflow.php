<?php
// backend/api/cashflow.php
// Gestion du Journal de Caisse (Recettes, Dépenses, Ventes, Versements, Créances et Dettes)

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

$pdo = Database::getConnection();

// Création automatique de la table si elle n'existe pas
initCashflowTable($pdo);

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

function initCashflowTable(PDO $pdo): void {
    $createSql = "CREATE TABLE IF NOT EXISTS `cashflow_entries` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `type` varchar(50) NOT NULL, -- 'VENTE', 'DEPENSE', 'RECETTE', 'VERSEMENT'
        `ref_number` varchar(100) DEFAULT NULL,
        `party_name` varchar(150) DEFAULT NULL,
        `party_phone` varchar(50) DEFAULT NULL,
        `order_type` varchar(100) DEFAULT 'À RÉCUPÉRER',
        `source` varchar(100) DEFAULT 'CAISSE POS',
        `products_amount` decimal(12,2) DEFAULT 0.00,
        `shipping_fee` decimal(12,2) DEFAULT 0.00,
        `total_amount` decimal(12,2) NOT NULL,
        `paid_amount` decimal(12,2) NOT NULL,
        `remaining_amount` decimal(12,2) DEFAULT 0.00,
        `profit_amount` decimal(12,2) DEFAULT 0.00,
        `note` text DEFAULT NULL,
        `attachment_url` varchar(255) DEFAULT NULL,
        `status` varchar(50) DEFAULT 'RÉGLÉ',
        `operation_date` date NOT NULL,
        `created_at` datetime DEFAULT current_timestamp(),
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $pdo->exec($createSql);

    try {
        $pdo->exec("ALTER TABLE `cashflow_entries` ADD COLUMN `attachment_url` VARCHAR(255) DEFAULT NULL AFTER `note`");
    } catch (Exception $e) {}

    try {
        $pdo->exec("ALTER TABLE `cashflow_entries` ADD COLUMN `customer_id` INT(11) DEFAULT NULL AFTER `party_phone`");
        $pdo->exec("ALTER TABLE `cashflow_entries` ADD COLUMN `supplier_id` INT(11) DEFAULT NULL AFTER `customer_id`");
    } catch (Exception $e) {}
}

function handleGet(PDO $pdo): void {
    $tab = $_GET['tab'] ?? 'all';
    $search = trim($_GET['search'] ?? '');

    $sql = "SELECT * FROM `cashflow_entries` WHERE 1=1";
    $params = [];

    if ($tab === 'recettes') {
        $sql .= " AND type = 'RECETTE'";
    } elseif ($tab === 'depenses') {
        $sql .= " AND type = 'DEPENSE'";
    } elseif ($tab === 'recettes_depenses') {
        $sql .= " AND type IN ('RECETTE', 'DEPENSE')";
    } elseif ($tab === 'ventes') {
        $sql .= " AND type = 'VENTE'";
    } elseif ($tab === 'achats') {
        $sql .= " AND type = 'DEPENSE' AND (order_type LIKE '%ACHAT%' OR source = 'FOURNISSEUR')";
    } elseif ($tab === 'versements_clients') {
        $sql .= " AND (type IN ('VERSEMENT', 'RECETTE')) AND (order_type LIKE '%CLIENT%' OR party_name LIKE '%Client%' OR customer_id IS NOT NULL)";
    } elseif ($tab === 'versements_fournisseurs') {
        $sql .= " AND (type IN ('DEPENSE', 'VERSEMENT')) AND (order_type LIKE '%FOURNISSEUR%' OR source = 'FOURNISSEUR' OR supplier_id IS NOT NULL)";
    }

    if (!empty($search)) {
        $sql .= " AND (ref_number LIKE ? OR party_name LIKE ? OR party_phone LIKE ? OR note LIKE ?)";
        $s = "%" . $search . "%";
        $params[] = $s;
        $params[] = $s;
        $params[] = $s;
        $params[] = $s;
    }

    $sql .= " ORDER BY operation_date DESC, id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $items = $stmt->fetchAll();

    // Calcul des Totaux KPI globaux
    $kpiSql = "SELECT 
        COALESCE(SUM(CASE WHEN type = 'VENTE' THEN paid_amount ELSE 0 END), 0) AS total_ventes_encaissees,
        COALESCE(SUM(CASE WHEN type = 'VENTE' THEN products_amount ELSE 0 END), 0) AS ventes_produits,
        COALESCE(SUM(CASE WHEN type = 'VENTE' THEN shipping_fee ELSE 0 END), 0) AS ventes_livraison,
        
        COALESCE(SUM(CASE WHEN type = 'DEPENSE' AND (order_type LIKE '%ACHAT%' OR source = 'FOURNISSEUR') THEN paid_amount ELSE 0 END), 0) AS decaissements_achats,
        COALESCE(SUM(CASE WHEN type = 'DEPENSE' AND (order_type LIKE '%ACHAT%' OR source = 'FOURNISSEUR') THEN paid_amount ELSE 0 END), 0) AS acomptes_achats,
        
        COALESCE(SUM(CASE WHEN type = 'RECETTE' THEN paid_amount ELSE 0 END), 0) AS autres_recettes,
        COALESCE(SUM(CASE WHEN type = 'DEPENSE' AND NOT (order_type LIKE '%ACHAT%' OR source = 'FOURNISSEUR') THEN paid_amount ELSE 0 END), 0) AS autres_depenses,
        
        COALESCE(SUM(CASE WHEN type = 'VENTE' THEN remaining_amount ELSE 0 END), 0) AS creances_clients,
        COALESCE(SUM(CASE WHEN type = 'DEPENSE' THEN remaining_amount ELSE 0 END), 0) AS dettes_fournisseurs,

        COALESCE(SUM(CASE WHEN type IN ('VENTE', 'RECETTE', 'VERSEMENT') THEN paid_amount ELSE -paid_amount END), 0) AS solde_caisse,
        COALESCE(SUM(profit_amount), 0) AS total_benefice,
        
        COALESCE(SUM(CASE 
            WHEN operation_date = CURDATE() 
            THEN (
                CASE 
                    WHEN type = 'VENTE' THEN profit_amount
                    WHEN type = 'RECETTE' THEN COALESCE(NULLIF(profit_amount, 0), paid_amount)
                    WHEN type = 'DEPENSE' THEN -paid_amount
                    ELSE 0 
                END
            )
            ELSE 0 
        END), 0) AS benefice_journalier,

        COALESCE(SUM(CASE 
            WHEN operation_date = CURDATE() AND type = 'VENTE' THEN profit_amount
            ELSE 0 
        END), 0) AS benefice_journalier_ventes,

        COALESCE(SUM(CASE 
            WHEN operation_date = CURDATE() AND type = 'RECETTE' THEN COALESCE(NULLIF(profit_amount, 0), paid_amount)
            ELSE 0 
        END), 0) AS benefice_journalier_recettes
    FROM `cashflow_entries`";

    $kpi = $pdo->query($kpiSql)->fetch();

    // Comptages par onglet
    $counts = [
        'all' => (int)$pdo->query("SELECT COUNT(*) FROM `cashflow_entries`")->fetchColumn(),
        'recettes' => (int)$pdo->query("SELECT COUNT(*) FROM `cashflow_entries` WHERE type = 'RECETTE'")->fetchColumn(),
        'depenses' => (int)$pdo->query("SELECT COUNT(*) FROM `cashflow_entries` WHERE type = 'DEPENSE'")->fetchColumn(),
        'recettes_depenses' => (int)$pdo->query("SELECT COUNT(*) FROM `cashflow_entries` WHERE type IN ('RECETTE', 'DEPENSE')")->fetchColumn(),
        'ventes' => (int)$pdo->query("SELECT COUNT(*) FROM `cashflow_entries` WHERE type = 'VENTE'")->fetchColumn(),
        'achats' => (int)$pdo->query("SELECT COUNT(*) FROM `cashflow_entries` WHERE type = 'DEPENSE' AND (order_type LIKE '%ACHAT%' OR source = 'FOURNISSEUR')")->fetchColumn(),
        'versements_clients' => (int)$pdo->query("SELECT COUNT(*) FROM `cashflow_entries` WHERE (type IN ('VERSEMENT', 'RECETTE')) AND (order_type LIKE '%CLIENT%' OR party_name LIKE '%Client%' OR customer_id IS NOT NULL)")->fetchColumn(),
        'versements_fournisseurs' => (int)$pdo->query("SELECT COUNT(*) FROM `cashflow_entries` WHERE (type IN ('DEPENSE', 'VERSEMENT')) AND (order_type LIKE '%FOURNISSEUR%' OR source = 'FOURNISSEUR' OR supplier_id IS NOT NULL)")->fetchColumn()
    ];

    echo json_encode([
        "success" => true,
        "data" => $items,
        "kpi" => $kpi,
        "counts" => $counts
    ]);
}

function handlePost(PDO $pdo): void {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Données JSON invalides"]);
        return;
    }

    $type = strtoupper($input['type'] ?? 'RECETTE'); // 'RECETTE' ou 'DEPENSE'
    $amount = (float)($input['amount'] ?? 0);
    $operationDate = !empty($input['operation_date']) ? $input['operation_date'] : date('Y-m-d');
    $note = trim($input['note'] ?? '');
    $partyName = trim($input['party_name'] ?? ($type === 'RECETTE' ? 'Client / Recette Divers' : 'Fournisseur / Dépense Divers'));
    $partyPhone = trim($input['party_phone'] ?? '');
    $orderType = trim($input['order_type'] ?? ($type === 'RECETTE' ? 'AUTRE RECETTE' : 'AUTRE DÉPENSE'));
    $source = trim($input['source'] ?? 'CAISSE');
    $attachmentUrl = !empty($input['attachment_url']) ? trim($input['attachment_url']) : null;

    if ($amount <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Le montant doit être supérieur à zéro"]);
        return;
    }

    $tierType = strtolower(trim($input['tier_type'] ?? '')); // 'fournisseur' | 'client' | ''
    $tierId = !empty($input['tier_id']) ? (int)$input['tier_id'] : null;
    $customerId = null;
    $supplierId = null;

    $prefix = $type === 'RECETTE' ? 'REC' : 'DEP';
    $refNumber = $prefix . '-' . date('Ymd-His');

    // Détection & Liaison automatique Fournisseur
    if ($tierType === 'fournisseur' || stripos($orderType, 'FOURNISSEUR') !== false) {
        $supStmt = null;
        if ($tierId) {
            $supStmt = $pdo->prepare("SELECT * FROM `suppliers` WHERE id = ?");
            $supStmt->execute([$tierId]);
        } elseif (!empty($partyName)) {
            $supStmt = $pdo->prepare("SELECT * FROM `suppliers` WHERE name = ? OR company = ? LIMIT 1");
            $supStmt->execute([$partyName, $partyName]);
        }
        $supplier = $supStmt ? $supStmt->fetch() : null;

        if ($supplier) {
            $supplierId = (int)$supplier['id'];
            $partyName = $supplier['name'];
            if (empty($partyPhone) && !empty($supplier['phone'])) {
                $partyPhone = $supplier['phone'];
            }
        }

        // Si c'est une dépense/versement fournisseur
        if ($type === 'DEPENSE' && ($tierType === 'fournisseur' || stripos($orderType, 'FOURNISSEUR') !== false || $supplierId !== null)) {
            $lastPaymentId = (int)$pdo->query("SELECT MAX(id) FROM `supplier_payments`")->fetchColumn();
            $refNumber = 'VRST-' . ($lastPaymentId + 1);
            $source = 'VERSEMENT';
            $orderType = 'VERSEMENT FOURNISSEUR';

            if ($supplierId) {
                $spStmt = $pdo->prepare("INSERT INTO `supplier_payments` 
                    (`reference`, `supplier_id`, `supplier_name`, `amount`, `payment_method`, `notes`, `payment_date`) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)");
                $spStmt->execute([
                    $refNumber,
                    $supplierId,
                    $partyName,
                    $amount,
                    'Espèces',
                    $note,
                    $operationDate
                ]);
            }
        }
    }

    // Détection & Liaison automatique Client
    if ($tierType === 'client' || stripos($orderType, 'CLIENT') !== false) {
        $clStmt = null;
        if ($tierId) {
            $clStmt = $pdo->prepare("SELECT * FROM `customers` WHERE id = ?");
            $clStmt->execute([$tierId]);
        } elseif (!empty($partyPhone)) {
            $clStmt = $pdo->prepare("SELECT * FROM `customers` WHERE TRIM(phone) = ? LIMIT 1");
            $clStmt->execute([trim($partyPhone)]);
        } elseif (!empty($partyName)) {
            $clStmt = $pdo->prepare("SELECT * FROM `customers` WHERE TRIM(name) = ? LIMIT 1");
            $clStmt->execute([trim($partyName)]);
        }
        $client = $clStmt ? $clStmt->fetch() : null;

        if ($client) {
            $customerId = (int)$client['id'];
            $partyName = $client['name'];
            if (empty($partyPhone) && !empty($client['phone'])) {
                $partyPhone = $client['phone'];
            }
        }

        if ($type === 'RECETTE' || $type === 'VERSEMENT') {
            $orderType = 'VERSEMENT CLIENT';
            $source = 'VERSEMENT';
        }
    }

    $stmt = $pdo->prepare("INSERT INTO `cashflow_entries`
        (`type`, `ref_number`, `party_name`, `party_phone`, `customer_id`, `supplier_id`, `order_type`, `source`, `products_amount`, `shipping_fee`, `total_amount`, `paid_amount`, `remaining_amount`, `profit_amount`, `note`, `attachment_url`, `status`, `operation_date`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    $profit = ($type === 'RECETTE' && stripos($orderType, 'VERSEMENT') === false) ? $amount : 0;
    $status = 'RÉGLÉ';

    $stmt->execute([
        $type,
        $refNumber,
        $partyName,
        $partyPhone,
        $customerId,
        $supplierId,
        $orderType,
        $source,
        0,
        0,
        $amount,
        $amount,
        0,
        $profit,
        $note,
        $attachmentUrl,
        $status,
        $operationDate
    ]);

    $id = (int)$pdo->lastInsertId();

    echo json_encode([
        "success" => true,
        "message" => "Écriture comptable enregistrée avec succès",
        "id" => $id,
        "ref_number" => $refNumber
    ]);
}

function handlePut(PDO $pdo): void {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($input['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID d'écriture requis"]);
        return;
    }

    $stmt = $pdo->prepare("UPDATE `cashflow_entries` SET 
        `party_name` = COALESCE(?, `party_name`),
        `note` = COALESCE(?, `note`),
        `paid_amount` = COALESCE(?, `paid_amount`),
        `total_amount` = COALESCE(?, `total_amount`),
        `attachment_url` = COALESCE(?, `attachment_url`),
        `status` = COALESCE(?, `status`),
        `operation_date` = COALESCE(?, `operation_date`)
        WHERE `id` = ?");

    $stmt->execute([
        $input['party_name'] ?? null,
        $input['note'] ?? null,
        isset($input['paid_amount']) ? (float)$input['paid_amount'] : null,
        isset($input['total_amount']) ? (float)$input['total_amount'] : null,
        $input['attachment_url'] ?? null,
        $input['status'] ?? null,
        $input['operation_date'] ?? null,
        $id
    ]);

    echo json_encode(["success" => true, "message" => "Écriture mise à jour"]);
}

function handleDelete(PDO $pdo): void {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)($input['id'] ?? 0);
    }

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID invalide pour la suppression"]);
        return;
    }

    $stmt = $pdo->prepare("DELETE FROM `cashflow_entries` WHERE `id` = ?");
    $stmt->execute([$id]);

    echo json_encode(["success" => true, "message" => "Écriture supprimée"]);
}
