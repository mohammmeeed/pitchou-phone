<?php
// backend/api/messages.php
// API pour la messagerie et le chat en direct entre l'Admin et les Clients

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $db = Database::getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}

// Auto-migration: assurer que la colonne 'is_read' existe
try {
    $colCheck = $db->query("SHOW COLUMNS FROM messages LIKE 'is_read'")->fetch();
    if (!$colCheck) {
        $db->exec("ALTER TABLE messages ADD COLUMN is_read TINYINT(1) NOT NULL DEFAULT 0");
        $db->exec("UPDATE messages SET is_read = 1 WHERE sender = 'admin'");
    }
} catch (Exception $e) {}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Compteur global de messages non lus (pour le badge rouge dans la barre latérale)
        if (isset($_GET['unread_count']) || isset($_GET['count_only'])) {
            $stmt = $db->query("SELECT COUNT(*) AS unread_count FROM messages WHERE sender = 'customer' AND is_read = 0");
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode([
                'success' => true,
                'unread_count' => (int)($row['unread_count'] ?? 0)
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }

        $customerId = isset($_GET['customer_id']) ? intval($_GET['customer_id']) : null;

        if ($customerId) {
            // Si la requête provient de l'admin (&admin=1), marquer tous les messages reçus de ce client comme lus
            if (!empty($_GET['admin'])) {
                try {
                    $upd = $db->prepare("UPDATE messages SET is_read = 1 WHERE customer_id = ? AND sender = 'customer' AND is_read = 0");
                    $upd->execute([$customerId]);
                } catch (Exception $e) {}
            }

            // Récupérer tous les messages d'un client spécifique
            $stmt = $db->prepare("
                SELECT id, customer_id, sender, message, is_read, created_at
                FROM messages
                WHERE customer_id = ?
                ORDER BY created_at ASC, id ASC
            ");
            $stmt->execute([$customerId]);
            $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Infos du client
            $custStmt = $db->prepare("SELECT id, name, phone, email, address FROM customers WHERE id = ?");
            $custStmt->execute([$customerId]);
            $customer = $custStmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'customer' => $customer,
                'messages' => $messages
            ], JSON_UNESCAPED_UNICODE);
        } else {
            // Récupérer uniquement les discussions réelles existantes (qui contiennent des messages)
            $stmt = $db->query("
                SELECT 
                    c.id AS customer_id,
                    c.name AS customer_name,
                    c.phone AS customer_phone,
                    c.email AS customer_email,
                    c.address AS customer_address,
                    m.message AS last_message,
                    m.created_at AS last_message_time,
                    m.sender AS last_sender,
                    (SELECT COUNT(*) FROM messages WHERE customer_id = c.id AND sender = 'customer' AND is_read = 0) AS unread_count
                FROM customers c
                INNER JOIN messages m ON m.id = (
                    SELECT id FROM messages WHERE customer_id = c.id ORDER BY id DESC LIMIT 1
                )
                ORDER BY m.created_at DESC
            ");
            $conversations = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $totalUnreadStmt = $db->query("SELECT COUNT(*) FROM messages WHERE sender = 'customer' AND is_read = 0");
            $totalUnread = (int)$totalUnreadStmt->fetchColumn();

            echo json_encode([
                'success' => true,
                'unread_count' => $totalUnread,
                'conversations' => $conversations
            ], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'POST':
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        // Action spéciale: marquer comme lu
        if ($data && ($data['action'] ?? '') === 'mark_read') {
            $cid = intval($data['customer_id'] ?? 0);
            if ($cid > 0) {
                $db->prepare("UPDATE messages SET is_read = 1 WHERE customer_id = ? AND sender = 'customer'")->execute([$cid]);
            } else {
                $db->exec("UPDATE messages SET is_read = 1 WHERE sender = 'customer'");
            }
            echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
            exit();
        }

        if (!$data || empty($data['customer_id']) || empty(trim($data['message'] ?? ''))) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Champs obligatoires manquants: customer_id et message.'
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }

        $customerId = intval($data['customer_id']);
        $sender = in_array($data['sender'] ?? '', ['admin', 'customer']) ? $data['sender'] : 'admin';
        $message = trim($data['message']);
        $isRead = ($sender === 'admin') ? 1 : 0;

        // S'assurer que le client existe dans la table customers pour respecter la clé étrangère
        $cCheck = $db->prepare("SELECT id FROM customers WHERE id = ?");
        $cCheck->execute([$customerId]);
        if (!$cCheck->fetch()) {
            $cName = trim($data['customer_name'] ?? ('Client #' . $customerId));
            $cPhone = trim($data['customer_phone'] ?? ('05' . str_pad((string)$customerId, 8, '0', STR_PAD_LEFT)));
            $cEmail = trim($data['customer_email'] ?? '');
            $cAddr = trim($data['customer_address'] ?? 'Alger');
            try {
                $insC = $db->prepare("INSERT INTO customers (id, name, phone, email, address) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)");
                $insC->execute([$customerId, $cName, $cPhone, $cEmail, $cAddr]);
            } catch (Exception $e) {}
        }

        $stmt = $db->prepare("
            INSERT INTO messages (customer_id, sender, message, is_read, created_at)
            VALUES (?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$customerId, $sender, $message, $isRead]);
        $newId = $db->lastInsertId();

        $getStmt = $db->prepare("SELECT * FROM messages WHERE id = ?");
        $getStmt->execute([$newId]);
        $inserted = $getStmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'message' => 'Message envoyé avec succès',
            'data' => $inserted
        ], JSON_UNESCAPED_UNICODE);
        break;

    case 'DELETE':
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?? [];
        $customerId = isset($_GET['customer_id']) ? intval($_GET['customer_id']) : intval($data['customer_id'] ?? 0);
        $messageId = isset($_GET['id']) ? intval($_GET['id']) : intval($data['id'] ?? 0);

        if ($customerId) {
            $stmt = $db->prepare("DELETE FROM messages WHERE customer_id = ?");
            $stmt->execute([$customerId]);
            echo json_encode([
                'success' => true,
                'message' => 'Discussion supprimée avec succès'
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }

        if ($messageId) {
            $stmt = $db->prepare("DELETE FROM messages WHERE id = ?");
            $stmt->execute([$messageId]);
            echo json_encode([
                'success' => true,
                'message' => 'Message supprimé avec succès'
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }

        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'customer_id ou id de message manquant.'
        ], JSON_UNESCAPED_UNICODE);
        exit();
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
        break;
}
