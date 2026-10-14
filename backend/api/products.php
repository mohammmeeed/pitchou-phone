<?php
// backend/api/products.php
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
        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([(int)$_GET['id']]);
        $product = $stmt->fetch();
        if ($product) {
            echo json_encode(["success" => true, "data" => $product]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Produit non trouvé"]);
        }
        return;
    }

    $sql = "SELECT * FROM products";
    $params = [];
    if (!empty($_GET['search'])) {
        $sql .= " WHERE name LIKE ? OR author LIKE ? OR category LIKE ?";
        $q = "%" . $_GET['search'] . "%";
        $params = [$q, $q, $q];
    }
    $sql .= " ORDER BY id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll();

    echo json_encode(["success" => true, "data" => $products, "count" => count($products)]);
}

function handlePost(PDO $pdo): void {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    if (empty($input['name']) || !isset($input['price'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Le nom et le prix sont obligatoires"]);
        return;
    }

    $languages = is_array($input['languages'] ?? null) 
        ? implode(', ', array_filter($input['languages'])) 
        : trim($input['languages'] ?? '');

    $stmt = $pdo->prepare("INSERT INTO products (name, author, format, price, stock, category, rating, image, video, bio, languages, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        trim($input['name']),
        trim($input['author'] ?? ''),
        trim($input['format'] ?? ''),
        (float)$input['price'],
        (int)($input['stock'] ?? 10),
        trim($input['category'] ?? ''),
        (float)($input['rating'] ?? 5.0),
        $input['image'] ?? '/assets/images/books/book1.jpg',
        $input['video'] ?? null,
        trim($input['bio'] ?? ''),
        $languages,
        (int)($input['is_featured'] ?? 1)
    ]);

    $newId = $pdo->lastInsertId();
    http_response_code(201);
    echo json_encode([
        "success" => true, 
        "message" => "Produit ajouté avec succès", 
        "id" => $newId
    ]);
}

function handlePut(PDO $pdo): void {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($_GET['id'] ?? ($input['id'] ?? 0));

    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID du produit requis"]);
        return;
    }

    $languages = is_array($input['languages'] ?? null) 
        ? implode(', ', array_filter($input['languages'])) 
        : trim($input['languages'] ?? '');

    $stmt = $pdo->prepare("UPDATE products SET name = ?, author = ?, format = ?, price = ?, stock = ?, category = ?, image = ?, video = ?, bio = ?, languages = ?, is_featured = ? WHERE id = ?");
    $stmt->execute([
        trim($input['name']),
        trim($input['author'] ?? ''),
        trim($input['format'] ?? ''),
        (float)$input['price'],
        (int)($input['stock'] ?? 10),
        trim($input['category'] ?? ''),
        $input['image'] ?? '/assets/images/books/book1.jpg',
        $input['video'] ?? null,
        trim($input['bio'] ?? ''),
        $languages,
        (int)($input['is_featured'] ?? 1),
        $id
    ]);

    echo json_encode(["success" => true, "message" => "Produit mis à jour avec succès"]);
}

function handleDelete(PDO $pdo): void {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID requis"]);
        return;
    }

    $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
    $stmt->execute([$id]);

    echo json_encode(["success" => true, "message" => "Produit supprimé avec succès"]);
}
