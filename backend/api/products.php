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

function formatProduct(array $product): array {
    // Decode images array
    $images = [];
    if (!empty($product['images'])) {
        $decoded = json_decode($product['images'], true);
        if (is_array($decoded)) {
            $images = $decoded;
        } else {
            $images = array_filter(array_map('trim', explode(',', $product['images'])));
        }
    }
    if (empty($images) && !empty($product['image'])) {
        $images = [$product['image']];
    }
    $product['images'] = array_values($images);
    if (empty($product['image']) && !empty($product['images'])) {
        $product['image'] = $product['images'][0];
    }

    // Decode videos array
    $videos = [];
    if (!empty($product['videos'])) {
        $decoded = json_decode($product['videos'], true);
        if (is_array($decoded)) {
            $videos = $decoded;
        } else {
            $videos = array_filter(array_map('trim', explode(',', $product['videos'])));
        }
    }
    if (empty($videos) && !empty($product['video'])) {
        $videos = [$product['video']];
    }
    $product['videos'] = array_values($videos);
    if (empty($product['video']) && !empty($product['videos'])) {
        $product['video'] = $product['videos'][0];
    }

    // Decode categories array
    $categories = [];
    if (!empty($product['categories'])) {
        $decoded = json_decode($product['categories'], true);
        if (is_array($decoded)) {
            $categories = $decoded;
        } else {
            $categories = array_filter(array_map('trim', explode(',', $product['categories'])));
        }
    } elseif (!empty($product['category'])) {
        $categories = array_filter(array_map('trim', explode(',', $product['category'])));
    }
    $product['categories'] = array_values($categories);
    $product['category'] = !empty($product['categories']) ? implode(', ', $product['categories']) : ($product['category'] ?? '');

    return $product;
}

function handleGet(PDO $pdo): void {
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([(int)$_GET['id']]);
        $product = $stmt->fetch();
        if ($product) {
            echo json_encode(["success" => true, "data" => formatProduct($product)]);
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

    $formatted = array_map('formatProduct', $products);
    echo json_encode(["success" => true, "data" => $formatted, "count" => count($formatted)]);
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

    // Multi-categories
    $categories = [];
    if (!empty($input['categories'])) {
        $categories = is_array($input['categories']) ? $input['categories'] : (json_decode($input['categories'], true) ?? [$input['categories']]);
    } elseif (!empty($input['category'])) {
        $categories = is_array($input['category']) ? $input['category'] : array_map('trim', explode(',', $input['category']));
    }
    $categories = array_values(array_filter($categories));
    $categoriesStr = implode(', ', $categories);
    $categoriesJson = !empty($categories) ? json_encode($categories, JSON_UNESCAPED_UNICODE) : null;

    // Multi-images
    $images = [];
    if (!empty($input['images'])) {
        $images = is_array($input['images']) ? $input['images'] : json_decode($input['images'], true) ?? [$input['images']];
    } elseif (!empty($input['image'])) {
        $images = [$input['image']];
    }
    $images = array_values(array_filter($images));
    $mainImage = !empty($images) ? $images[0] : ($input['image'] ?? '/assets/images/books/book1.jpg');
    $imagesJson = !empty($images) ? json_encode($images) : json_encode([$mainImage]);

    // Multi-videos
    $videos = [];
    if (!empty($input['videos'])) {
        $videos = is_array($input['videos']) ? $input['videos'] : json_decode($input['videos'], true) ?? [$input['videos']];
    } elseif (!empty($input['video'])) {
        $videos = [$input['video']];
    }
    $videos = array_values(array_filter($videos));
    $mainVideo = !empty($videos) ? $videos[0] : ($input['video'] ?? null);
    $videosJson = !empty($videos) ? json_encode($videos) : ($mainVideo ? json_encode([$mainVideo]) : null);

    $stmt = $pdo->prepare("INSERT INTO products (name, author, format, price, stock, category, categories, rating, image, images, video, videos, bio, languages, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        trim($input['name']),
        trim($input['author'] ?? ''),
        trim($input['format'] ?? ''),
        (float)$input['price'],
        (int)($input['stock'] ?? 10),
        $categoriesStr,
        $categoriesJson,
        (float)($input['rating'] ?? 5.0),
        $mainImage,
        $imagesJson,
        $mainVideo,
        $videosJson,
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

    // Multi-categories
    $categories = [];
    if (isset($input['categories'])) {
        $categories = is_array($input['categories']) ? $input['categories'] : (json_decode($input['categories'], true) ?? [$input['categories']]);
    } elseif (!empty($input['category'])) {
        $categories = is_array($input['category']) ? $input['category'] : array_map('trim', explode(',', $input['category']));
    }
    $categories = array_values(array_filter($categories));
    $categoriesStr = implode(', ', $categories);
    $categoriesJson = !empty($categories) ? json_encode($categories, JSON_UNESCAPED_UNICODE) : null;

    // Multi-images
    $images = [];
    if (isset($input['images'])) {
        $images = is_array($input['images']) ? $input['images'] : json_decode($input['images'], true) ?? [$input['images']];
    } elseif (!empty($input['image'])) {
        $images = [$input['image']];
    }
    $images = array_values(array_filter($images));
    $mainImage = !empty($images) ? $images[0] : ($input['image'] ?? '/assets/images/books/book1.jpg');
    $imagesJson = !empty($images) ? json_encode($images) : json_encode([$mainImage]);

    // Multi-videos
    $videos = [];
    if (isset($input['videos'])) {
        $videos = is_array($input['videos']) ? $input['videos'] : json_decode($input['videos'], true) ?? [$input['videos']];
    } elseif (!empty($input['video'])) {
        $videos = [$input['video']];
    }
    $videos = array_values(array_filter($videos));
    $mainVideo = !empty($videos) ? $videos[0] : ($input['video'] ?? null);
    $videosJson = !empty($videos) ? json_encode($videos) : ($mainVideo ? json_encode([$mainVideo]) : null);

    $stmt = $pdo->prepare("UPDATE products SET name = ?, author = ?, format = ?, price = ?, stock = ?, category = ?, categories = ?, image = ?, images = ?, video = ?, videos = ?, bio = ?, languages = ?, is_featured = ? WHERE id = ?");
    $stmt->execute([
        trim($input['name']),
        trim($input['author'] ?? ''),
        trim($input['format'] ?? ''),
        (float)$input['price'],
        (int)($input['stock'] ?? 10),
        $categoriesStr,
        $categoriesJson,
        $mainImage,
        $imagesJson,
        $mainVideo,
        $videosJson,
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
