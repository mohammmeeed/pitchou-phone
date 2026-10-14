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

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $customerId = isset($_GET['customer_id']) ? intval($_GET['customer_id']) : null;

        if ($customerId) {
            // Récupérer tous les messages d'un client spécifique
            $stmt = $db->prepare("
                SELECT id, customer_id, sender, message, created_at
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
            // Récupérer la liste de toutes les conversations avec le dernier message
            $stmt = $db->query("
                SELECT 
                    c.id AS customer_id,
                    c.name AS customer_name,
                    c.phone AS customer_phone,
                    c.email AS customer_email,
                    c.address AS customer_address,
                    COALESCE(m.message, 'Aucun message pour le moment') AS last_message,
                    COALESCE(m.created_at, c.created_at) AS last_message_time,
                    COALESCE(m.sender, 'system') AS last_sender
                FROM customers c
                LEFT JOIN messages m ON m.id = (
                    SELECT id FROM messages WHERE customer_id = c.id ORDER BY id DESC LIMIT 1
                )
                ORDER BY last_message_time DESC
            ");
            $conversations = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'conversations' => $conversations
            ], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'POST':
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

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

        $stmt = $db->prepare("
            INSERT INTO messages (customer_id, sender, message, created_at)
            VALUES (?, ?, ?, NOW())
        ");
        $stmt->execute([$customerId, $sender, $message]);
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

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
        break;
}
