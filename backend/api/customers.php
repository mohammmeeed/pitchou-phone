<?php
// backend/api/customers.php
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

function cleanCustomerAddress(?string $wilaya, ?string $commune, ?string $rawAddress): string {
    $wilaya = trim($wilaya ?? '');
    $commune = trim($commune ?? '');
    $raw = trim($rawAddress ?? '');

    // 1. Dédupliquer les répétitions du type "A - B - A - B"
    if (!empty($raw)) {
        $parts = array_map('trim', explode(' - ', $raw));
        $len = count($parts);
        if ($len >= 2 && $len % 2 === 0) {
            $half = (int)($len / 2);
            $firstHalf = array_slice($parts, 0, $half);
            $secondHalf = array_slice($parts, $half);
            if ($firstHalf === $secondHalf) {
                $parts = $firstHalf;
            }
        }
        $raw = implode(' - ', $parts);
    }

    // 2. Si on a à la fois la wilaya et la commune
    if (!empty($wilaya) && !empty($commune)) {
        $base = $wilaya . ' - ' . $commune;
        if (empty($raw) || $raw === $base || $raw === $wilaya || $raw === $commune) {
            return $base;
        }
        if (strpos($raw, $base . ' - ' . $base) !== false) {
            $raw = str_replace($base . ' - ' . $base, $base, $raw);
        }
        if (strpos($raw, $base) === 0) {
            $extra = trim(substr($raw, strlen($base)), " -");
            return !empty($extra) ? ($base . ' - ' . $extra) : $base;
        }
        if (stripos($raw, $commune) === false && stripos($raw, $wilaya) === false) {
            return $base . ' (' . $raw . ')';
        }
        return $raw;
    } elseif (!empty($wilaya)) {
        if (empty($raw) || $raw === $wilaya) return $wilaya;
        if (strpos($raw, $wilaya) === 0) return $raw;
        return $wilaya . ' - ' . $raw;
    }

    return $raw ?: 'Alger';
}

function handleGet(?PDO $pdo): void {
    if ($pdo === null) {
        $fallbackFile = __DIR__ . '/../database/customers_fallback.json';
        $customers = [];
        if (file_exists($fallbackFile)) {
            $customers = json_decode(file_get_contents($fallbackFile), true) ?? [];
        }
        if (empty($customers)) {
            $customers = [
                [
                    'id' => 1,
                    'name' => 'Mohamed Guedaoui',
                    'first_name' => 'Mohamed',
                    'last_name' => 'Guedaoui',
                    'email' => 'mohamed@email.com',
                    'phone' => '0550123456',
                    'password' => 'motdepasse123',
                    'address' => 'Alger Centre',
                    'wilaya' => '16 - Alger',
                    'commune' => 'Alger Centre',
                    'total_orders' => 1,
                    'total_spent' => 2500,
                    'created_at' => '2026-10-13 10:37:15'
                ]
            ];
            @file_put_contents($fallbackFile, json_encode($customers, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        }

        foreach ($customers as &$c) {
            if (empty($c['password'])) {
                $c['password'] = 'motdepasse123';
            }
            $c['address'] = cleanCustomerAddress($c['wilaya'] ?? '', $c['commune'] ?? '', $c['address'] ?? '');
        }
        unset($c);

        if (isset($_GET['id'])) {
            $id = (int)$_GET['id'];
            foreach ($customers as $c) {
                if ((int)$c['id'] === $id) {
                    echo json_encode(["success" => true, "data" => $c]);
                    return;
                }
            }
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Client non trouvé"]);
            return;
        }
        echo json_encode(["success" => true, "data" => $customers, "count" => count($customers)]);
        return;
    }

    try {
        $pdo->exec("ALTER TABLE customers ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT NULL");
        $pdo->exec("ALTER TABLE customers ADD COLUMN IF NOT EXISTS wilaya VARCHAR(100) DEFAULT NULL");
        $pdo->exec("ALTER TABLE customers ADD COLUMN IF NOT EXISTS commune VARCHAR(100) DEFAULT NULL");
    } catch (\Throwable $e) {}

    // Toujours recalculer et synchroniser les commandes réelles et dépenses cumulées
    syncCustomerStats($pdo);

    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
        $stmt->execute([(int)$_GET['id']]);
        $customer = $stmt->fetch();
        if ($customer) {
            if (empty($customer['password'])) {
                $customer['password'] = 'motdepasse123';
            }
            $customer['address'] = cleanCustomerAddress($customer['wilaya'] ?? '', $customer['commune'] ?? '', $customer['address'] ?? '');
            echo json_encode(["success" => true, "data" => $customer]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Client non trouvé"]);
        }
        return;
    }

    $stmt = $pdo->query("SELECT * FROM customers ORDER BY id DESC");
    $customers = $stmt->fetchAll();
    foreach ($customers as &$c) {
        if (empty($c['password'])) {
            $c['password'] = 'motdepasse123';
        }
        $c['address'] = cleanCustomerAddress($c['wilaya'] ?? '', $c['commune'] ?? '', $c['address'] ?? '');
    }
    unset($c);
    echo json_encode(["success" => true, "data" => $customers, "count" => count($customers)]);
}

function handlePut(?PDO $pdo): void {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?? [];
    $id = (int)($_GET['id'] ?? ($input['id'] ?? 0));

    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID du client manquant."]);
        return;
    }

    $firstName = trim($input['first_name'] ?? '');
    $lastName = trim($input['last_name'] ?? '');
    if (!empty($firstName) || !empty($lastName)) {
        $name = trim($lastName . ' ' . $firstName);
    } else {
        $name = trim($input['name'] ?? '');
    }

    $phone = trim($input['phone'] ?? '');
    $email = trim($input['email'] ?? '');
    $wilaya = trim($input['wilaya'] ?? '');
    $commune = trim($input['commune'] ?? '');
    $password = trim($input['password'] ?? '');
    $rawAddress = trim($input['address'] ?? '');

    $address = cleanCustomerAddress($wilaya, $commune, $rawAddress);

    if ($pdo === null) {
        $fallbackFile = __DIR__ . '/../database/customers_fallback.json';
        $customers = [];
        if (file_exists($fallbackFile)) {
            $customers = json_decode(file_get_contents($fallbackFile), true) ?? [];
        }
        $found = false;
        $updatedData = null;
        foreach ($customers as &$c) {
            if ((int)$c['id'] === $id) {
                if (!empty($name)) $c['name'] = $name;
                if (!empty($firstName)) $c['first_name'] = $firstName;
                if (!empty($lastName)) $c['last_name'] = $lastName;
                if (!empty($phone)) $c['phone'] = $phone;
                if (!empty($email)) $c['email'] = $email;
                if (!empty($wilaya)) $c['wilaya'] = $wilaya;
                if (!empty($commune)) $c['commune'] = $commune;
                if (!empty($password)) $c['password'] = $password;
                if (!empty($address)) $c['address'] = $address;
                $found = true;
                $updatedData = $c;
                break;
            }
        }
        if (!$found) {
            $newC = [
                'id' => $id,
                'name' => $name ?: 'Client',
                'first_name' => $firstName,
                'last_name' => $lastName,
                'phone' => $phone,
                'email' => $email,
                'wilaya' => $wilaya,
                'commune' => $commune,
                'password' => $password,
                'address' => $address,
                'total_orders' => 1,
                'total_spent' => 2500,
                'created_at' => date('Y-m-d H:i:s')
            ];
            $customers[] = $newC;
            $updatedData = $newC;
        }
        @file_put_contents($fallbackFile, json_encode($customers, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        echo json_encode([
            "success" => true,
            "message" => "Informations du client modifiées avec succès.",
            "data" => $updatedData
        ]);
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

    if (empty($name)) $name = $existing['name'];
    if (empty($phone)) $phone = $existing['phone'];
    if (empty($email)) $email = $existing['email'];
    if (empty($address)) $address = $existing['address'];

    if ($phone !== $existing['phone']) {
        $checkPhone = $pdo->prepare("SELECT id FROM customers WHERE phone = ? AND id != ? LIMIT 1");
        $checkPhone->execute([$phone, $id]);
        if ($checkPhone->fetch()) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Ce numéro de téléphone est déjà associé à un autre client."]);
            return;
        }
    }

    try {
        $pdo->exec("ALTER TABLE customers ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT NULL");
        $pdo->exec("ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) DEFAULT NULL");
        $pdo->exec("ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) DEFAULT NULL");
        $pdo->exec("ALTER TABLE customers ADD COLUMN IF NOT EXISTS wilaya VARCHAR(100) DEFAULT NULL");
        $pdo->exec("ALTER TABLE customers ADD COLUMN IF NOT EXISTS commune VARCHAR(100) DEFAULT NULL");
    } catch (Throwable $e) {}

    $updateStmt = $pdo->prepare("UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, password = COALESCE(NULLIF(?, ''), password) WHERE id = ?");
    $updateStmt->execute([$name, $phone, $email, $address, $password, $id]);

    try {
        $extra = $pdo->prepare("UPDATE customers SET first_name = ?, last_name = ?, wilaya = ?, commune = ? WHERE id = ?");
        $extra->execute([$firstName, $lastName, $wilaya, $commune, $id]);
    } catch (Throwable $e) {}

    // Mise à jour du mot de passe
    if (!empty($password)) {
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $uCheck = $pdo->prepare("SELECT id FROM users WHERE phone = ? OR (email != '' AND email = ?) LIMIT 1");
        $uCheck->execute([$phone, $email]);
        $uRow = $uCheck->fetch();
        if ($uRow) {
            $uUpdate = $pdo->prepare("UPDATE users SET password = ?, name = ?, email = COALESCE(NULLIF(?, ''), email), phone = ? WHERE id = ?");
            $uUpdate->execute([$hash, $name, $email, $phone, $uRow['id']]);
        } else {
            $uIns = $pdo->prepare("INSERT INTO users (name, email, phone, password, role, created_at) VALUES (?, ?, ?, ?, 'customer', NOW())");
            $uIns->execute([$name, $email ?: ($phone . '@customer.leerbook.dz'), $phone, $hash]);
        }
    }

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

function handlePost(?PDO $pdo): void {
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    $input = is_array($json) ? $json : $_POST;

    $name = trim($input['name'] ?? ($input['fullName'] ?? ''));
    $email = trim($input['email'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $password = trim($input['password'] ?? '');
    
    $address = cleanCustomerAddress($input['wilaya'] ?? '', $input['commune'] ?? '', $input['address'] ?? '');

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

    // Fonction d'aide pour normaliser les numéros de téléphone (supprimer préfixe 0/213/espaces)
    $normalizeNum = function(string $num): string {
        $clean = preg_replace('/[\s\-\.\(\)\+]/', '', trim($num));
        if (strpos($clean, '00213') === 0) {
            $clean = '0' . substr($clean, 5);
        } elseif (strpos($clean, '213') === 0) {
            $clean = '0' . substr($clean, 3);
        }
        return $clean;
    };
    $cleanPhone = $normalizeNum($phone);

    if ($pdo === null) {
        $fallbackFile = __DIR__ . '/../database/customers_fallback.json';
        $customers = [];
        if (file_exists($fallbackFile)) {
            $customers = json_decode(file_get_contents($fallbackFile), true) ?? [];
        }

        // Vérifier si le numéro existe déjà dans le fichier de secours
        foreach ($customers as $c) {
            $existingNorm = $normalizeNum($c['phone'] ?? '');
            if (!empty($existingNorm) && !empty($cleanPhone) && (
                $existingNorm === $cleanPhone || 
                (strlen($existingNorm) >= 9 && strlen($cleanPhone) >= 9 && substr($existingNorm, -9) === substr($cleanPhone, -9))
            )) {
                http_response_code(409);
                echo json_encode([
                    "success" => false,
                    "code" => "ACCOUNT_EXISTS",
                    "message" => "Ce numéro de téléphone est déjà associé à un compte existant. Veuillez vous connecter."
                ]);
                return;
            }
        }

        $newCustomer = [
            'id' => count($customers) + 1,
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'password' => $password ?: 'motdepasse123',
            'address' => $address,
            'wilaya' => $input['wilaya'] ?? '',
            'commune' => $input['commune'] ?? '',
            'total_orders' => 0,
            'total_spent' => 0,
            'created_at' => date('Y-m-d H:i:s')
        ];
        $customers[] = $newCustomer;
        @file_put_contents($fallbackFile, json_encode($customers, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        http_response_code(201);
        echo json_encode([
            "success" => true,
            "message" => "Compte client créé avec succès",
            "data" => $newCustomer
        ]);
        return;
    }

    try {
        $pdo->exec("ALTER TABLE customers ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT NULL");
        $pdo->exec("ALTER TABLE customers ADD COLUMN IF NOT EXISTS wilaya VARCHAR(100) DEFAULT NULL");
        $pdo->exec("ALTER TABLE customers ADD COLUMN IF NOT EXISTS commune VARCHAR(100) DEFAULT NULL");
    } catch (Throwable $e) {}

    // 1. Vérification stricte d'unicité : NE PAS créer de doublon et NE PAS écraser
    $suffix = (strlen($cleanPhone) >= 9) ? substr($cleanPhone, -9) : $cleanPhone;
    $checkCust = $pdo->prepare("SELECT id, name, phone FROM customers WHERE phone = ? OR REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), '.', '') LIKE ? LIMIT 1");
    $checkCust->execute([$phone, '%' . $suffix]);
    $existingCust = $checkCust->fetch();

    if ($existingCust) {
        http_response_code(409);
        echo json_encode([
            "success" => false,
            "code" => "ACCOUNT_EXISTS",
            "message" => "Ce numéro de téléphone est déjà associé à un compte existant. Veuillez vous connecter."
        ]);
        return;
    }

    // Vérifier aussi dans la table users (authentification)
    $checkUser = $pdo->prepare("SELECT id, phone, email FROM users WHERE phone = ? OR REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), '.', '') LIKE ? LIMIT 1");
    $checkUser->execute([$phone, '%' . $suffix]);
    $existingUser = $checkUser->fetch();

    if ($existingUser) {
        http_response_code(409);
        echo json_encode([
            "success" => false,
            "code" => "ACCOUNT_EXISTS",
            "message" => "Ce numéro de téléphone est déjà associé à un compte existant. Veuillez vous connecter."
        ]);
        return;
    }

    // Vérification email si renseigné
    if (!empty($email)) {
        $checkEmail = $pdo->prepare("SELECT id FROM customers WHERE email = ? AND email != '' LIMIT 1");
        $checkEmail->execute([$email]);
        if ($checkEmail->fetch()) {
            http_response_code(409);
            echo json_encode([
                "success" => false,
                "code" => "ACCOUNT_EXISTS",
                "message" => "Cette adresse email est déjà associée à un compte existant. Veuillez vous connecter."
            ]);
            return;
        }
    }

    // 2. Création du nouveau client dans la table customers
    $stmtCust = $pdo->prepare("INSERT INTO customers (name, email, phone, password, address, total_orders, total_spent, created_at) VALUES (?, ?, ?, ?, ?, 0, 0.00, NOW())");
    $stmtCust->execute([$name, $email, $phone, $password, $address]);
    $customerId = (int)$pdo->lastInsertId();

    // 3. Création dans la table users pour l'authentification
    if (!empty($password)) {
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $userEmail = !empty($email) ? $email : ($phone . '@tiktokshop.dz');
        $stmtUser = $pdo->prepare("INSERT INTO users (name, email, phone, password, role, created_at) VALUES (?, ?, ?, ?, 'customer', NOW())");
        $stmtUser->execute([$name, $userEmail, $phone, $hashed]);
    }


    // Récupérer le profil complet enregistré
    $fetchStmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
    $fetchStmt->execute([$customerId]);
    $savedCustomer = $fetchStmt->fetch();

    // Déclencher les emails SMTP (Bienvenue client & Alerte admin) avec gabarit très simple et logo
    if (!$existingCust || !empty($password)) {
        AppMailer::onCustomerRegistered($pdo, [
            'name' => $name,
            'email' => $email,
            'phone' => $phone
        ]);
    }

    http_response_code(201);
    echo json_encode([
        "success" => true,
        "message" => "Compte client créé avec succès dans la base de données",
        "data" => $savedCustomer
    ]);
}

function handleDelete(PDO $pdo): void {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?? [];
    $id = (int)($_GET['id'] ?? ($input['id'] ?? 0));

    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID du client manquant."]);
        return;
    }

    $stmt = $pdo->prepare("SELECT phone, email FROM customers WHERE id = ?");
    $stmt->execute([$id]);
    $customer = $stmt->fetch();

    if (!$customer) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Client introuvable."]);
        return;
    }

    // Supprimer le compte utilisateur lié dans la table users si existant (hors admin)
    if (!empty($customer['phone']) || !empty($customer['email'])) {
        $delUser = $pdo->prepare("DELETE FROM users WHERE role != 'admin' AND ((phone != '' AND phone = ?) OR (email != '' AND email = ?))");
        $delUser->execute([$customer['phone'], $customer['email']]);
    }

    // Supprimer les messages du client
    $delMsg = $pdo->prepare("DELETE FROM messages WHERE customer_id = ?");
    $delMsg->execute([$id]);

    // Supprimer le client
    $delCust = $pdo->prepare("DELETE FROM customers WHERE id = ?");
    $delCust->execute([$id]);

    echo json_encode(["success" => true, "message" => "Client supprimé avec succès."]);
}

