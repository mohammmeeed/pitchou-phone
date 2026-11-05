<?php
// backend/api/products.php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

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

function formatProduct(array $product): array {
    // Decode images array
    $images = [];
    if (!empty($product['images'])) {
        $decoded = json_decode($product['images'], true);
        if (is_array($decoded)) {
            $images = array_values(array_filter($decoded, fn($x) => is_string($x) && trim($x) !== ''));
        } else {
            $images = array_values(array_filter(array_map('trim', explode(',', $product['images']))));
        }
    }
    if (empty($images) && !empty($product['image']) && trim($product['image']) !== '') {
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
            $videos = array_values(array_filter($decoded, fn($x) => is_string($x) && trim($x) !== ''));
        } else {
            $videos = array_values(array_filter(array_map('trim', explode(',', $product['videos']))));
        }
    }
    if (empty($videos) && !empty($product['video']) && trim($product['video']) !== '') {
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
    $product['etat'] = $product['format'] ?? '';
    $brandVal = !empty($product['brand']) ? trim($product['brand']) : (!empty($product['author']) ? trim($product['author']) : '');
    if (empty($brandVal)) {
        $titleLower = strtolower($product['name'] ?? '');
        if (strpos($titleLower, 'iphone') !== false || strpos($titleLower, 'apple') !== false) {
            $brandVal = 'Apple';
        } elseif (strpos($titleLower, 'samsung') !== false) {
            $brandVal = 'Samsung';
        } elseif (strpos($titleLower, 'hoco') !== false) {
            $brandVal = 'Hoco';
        } elseif (strpos($titleLower, 'anker') !== false) {
            $brandVal = 'Anker';
        } elseif (strpos($titleLower, 'oneplus') !== false || strpos($titleLower, 'one plus') !== false) {
            $brandVal = 'OnePlus';
        } elseif (strpos($titleLower, 'xiaomi') !== false || strpos($titleLower, 'redmi') !== false) {
            $brandVal = 'Xiaomi';
        } elseif (strpos($titleLower, 'realme') !== false) {
            $brandVal = 'Realme';
        }
    }
    $product['brand'] = $brandVal;
    $product['marque'] = $brandVal;
    if (empty($product['author']) && !empty($brandVal)) {
        $product['author'] = $brandVal;
    }
    $product['purchase_price'] = isset($product['purchase_price']) ? (float)$product['purchase_price'] : 0.0;
    $product['model_glb'] = trim($product['model_glb'] ?? '');
    $product['model_usdz'] = trim($product['model_usdz'] ?? '');
    $product['barcode'] = trim($product['barcode'] ?? '');

    // Déterminer la sous-catégorie du produit (exclure les catégories principales et les marques)
    $topCategories = ['Téléphones', 'Accessoires', 'Batteries', 'Chargeurs & Câbles', 'Écrans & Pièces', 'Livres'];
    $topCategoriesNorm = array_map(fn($c) => mb_strtolower(trim($c)), $topCategories);
    $knownBrandsNorm = ['apple', 'samsung', 'xiaomi', 'oneplus', 'one plus', 'realme', 'google pixel', 'pixel', 'huawei', 'oppo', 'infinix', 'tecno', 'honor', 'hoco', 'anker', 'baseus', 'sony', 'redmi', 'poco'];
    $brandNorm = !empty($brandVal) ? mb_strtolower(trim($brandVal)) : '';

    $subCategory = '';
    if (!empty($product['categories']) && is_array($product['categories'])) {
        foreach ($product['categories'] as $c) {
            $cTrim = trim($c);
            $cNorm = mb_strtolower($cTrim);
            if ($cTrim !== '' && !in_array($cNorm, $topCategoriesNorm, true) && !in_array($cNorm, $knownBrandsNorm, true) && $cNorm !== $brandNorm) {
                $subCategory = $cTrim;
                break;
            }
        }
    }
    // Si vide, vérifier si le format/état contient une sous-catégorie valide (Sous blister, Très bon état, etc.)
    if (empty($subCategory) && !empty($product['format'])) {
        $fTrim = trim($product['format']);
        $fNorm = mb_strtolower($fTrim);
        if ($fTrim !== '' && !in_array($fNorm, $topCategoriesNorm, true) && !in_array($fNorm, $knownBrandsNorm, true) && $fNorm !== $brandNorm) {
            $subCategory = $fTrim;
        }
    }
    $product['subcategory'] = $subCategory;
    $product['sub_category'] = $subCategory;
    $product['sous_categorie'] = $subCategory;

    return $product;
}

function handleGet(?PDO $pdo): void {
    $fallbackFile = __DIR__ . '/../database/products_fallback.json';

    if ($pdo === null) {
        $products = [];
        if (file_exists($fallbackFile)) {
            $products = json_decode(file_get_contents($fallbackFile), true) ?? [];
        }

        if (isset($_GET['id'])) {
            $id = (int)$_GET['id'];
            foreach ($products as $p) {
                if ((int)($p['id'] ?? 0) === $id) {
                    echo json_encode(["success" => true, "data" => formatProduct($p)]);
                    return;
                }
            }
            echo json_encode(["success" => false, "data" => null, "message" => "Produit non trouvé"]);
            return;
        }

        if (!empty($_GET['search'])) {
            $search = mb_strtolower(trim($_GET['search']));
            $products = array_filter($products, function($p) use ($search) {
                return (
                    (isset($p['name']) && mb_stripos($p['name'], $search) !== false) ||
                    (isset($p['author']) && mb_stripos($p['author'], $search) !== false) ||
                    (isset($p['category']) && mb_stripos($p['category'], $search) !== false)
                );
            });
        }

        if (!empty($_GET['random']) || (!empty($_GET['order']) && $_GET['order'] === 'random')) {
            shuffle($products);
        }

        $formatted = array_map('formatProduct', array_values($products));
        echo json_encode(["success" => true, "data" => $formatted, "count" => count($formatted), "fallback" => true]);
        return;
    }

    try {
        if (isset($_GET['id'])) {
            $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
            $stmt->execute([(int)$_GET['id']]);
            $product = $stmt->fetch();
            if ($product) {
                echo json_encode(["success" => true, "data" => formatProduct($product)]);
            } else {
                // Secondary check in fallback file if not found
                if (file_exists($fallbackFile)) {
                    $fbProducts = json_decode(file_get_contents($fallbackFile), true) ?? [];
                    foreach ($fbProducts as $p) {
                        if ((int)($p['id'] ?? 0) === (int)$_GET['id']) {
                            echo json_encode(["success" => true, "data" => formatProduct($p)]);
                            return;
                        }
                    }
                }
                echo json_encode(["success" => false, "data" => null, "message" => "Produit non trouvé"]);
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
        if (!empty($_GET['random']) || (!empty($_GET['order']) && $_GET['order'] === 'random')) {
            $sql .= " ORDER BY RAND()";
        } else {
            $sql .= " ORDER BY id DESC";
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll();

        // Update fallback cache periodically when all products are fetched
        if (empty($_GET['search']) && empty($_GET['random']) && !empty($products)) {
            @file_put_contents($fallbackFile, json_encode($products, JSON_UNESCAPED_UNICODE));
        }

        $formatted = array_map('formatProduct', $products);
        echo json_encode(["success" => true, "data" => $formatted, "count" => count($formatted)]);
    } catch (Throwable $e) {
        if (file_exists($fallbackFile)) {
            $products = json_decode(file_get_contents($fallbackFile), true) ?? [];
            $formatted = array_map('formatProduct', array_values($products));
            echo json_encode(["success" => true, "data" => $formatted, "count" => count($formatted), "fallback" => true]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }
}

/**
 * Récupère les colonnes existantes de la table products et migre automatiquement les colonnes manquantes
 */
function getProductColumns(PDO $pdo): array {
    static $cols = null;
    if ($cols !== null) {
        return $cols;
    }
    $cols = [];
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM products");
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
        foreach ($rows as $row) {
            $cols[strtolower($row['Field'])] = true;
        }
    } catch (Throwable $e) {}

    // Tentatives d'auto-migration pour les colonnes récemment ajoutées
    $missingToCreate = [
        'purchase_price' => "ALTER TABLE products ADD COLUMN purchase_price DECIMAL(10,2) DEFAULT 0.00",
        'categories'     => "ALTER TABLE products ADD COLUMN categories TEXT DEFAULT NULL",
        'videos'         => "ALTER TABLE products ADD COLUMN videos TEXT DEFAULT NULL",
        'languages'      => "ALTER TABLE products ADD COLUMN languages TEXT DEFAULT NULL",
        'format'         => "ALTER TABLE products ADD COLUMN format VARCHAR(100) DEFAULT ''",
        'location'       => "ALTER TABLE products ADD COLUMN location VARCHAR(150) DEFAULT ''",
        'brand'          => "ALTER TABLE products ADD COLUMN brand VARCHAR(150) DEFAULT ''",
        'model_glb'      => "ALTER TABLE products ADD COLUMN model_glb TEXT DEFAULT NULL",
        'model_usdz'     => "ALTER TABLE products ADD COLUMN model_usdz TEXT DEFAULT NULL",
        'barcode'        => "ALTER TABLE products ADD COLUMN barcode VARCHAR(100) DEFAULT ''"
    ];

    foreach ($missingToCreate as $colName => $alterSql) {
        if (!isset($cols[$colName])) {
            try {
                $pdo->exec($alterSql);
                $cols[$colName] = true;
            } catch (Throwable $e) {}
        }
    }

    return $cols;
}

function handlePost(?PDO $pdo): void {
    if ($pdo === null) {
        http_response_code(503);
        echo json_encode(["success" => false, "message" => "Base de données non connectée"]);
        return;
    }
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    if (empty($input['name']) || !isset($input['price'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Le nom et le prix sont obligatoires"]);
        return;
    }

    try {
        $existingCols = getProductColumns($pdo);

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
        $images = array_values(array_filter($images, fn($x) => is_string($x) && trim($x) !== ''));
        $mainImage = !empty($images) ? $images[0] : (!empty($input['image']) && trim($input['image']) !== '' ? $input['image'] : '');
        $imagesJson = !empty($images) ? json_encode($images) : (!empty($mainImage) ? json_encode([$mainImage]) : json_encode([]));

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

        $purchasePrice = isset($input['purchase_price']) && $input['purchase_price'] !== '' ? (float)$input['purchase_price'] : 0.0;

        // Construction dynamique de l'INSERT
        $cols = ['name', 'price'];
        $vals = [trim($input['name']), (float)$input['price']];

        $brandVal = trim($input['brand'] ?? ($input['marque'] ?? ($input['author'] ?? '')));
        if (isset($existingCols['author'])) {
            $cols[] = 'author';
            $vals[] = $brandVal;
        }
        if (isset($existingCols['brand'])) {
            $cols[] = 'brand';
            $vals[] = $brandVal;
        }
        if (isset($existingCols['format'])) {
            $cols[] = 'format';
            $vals[] = trim($input['format'] ?? ($input['etat'] ?? ''));
        }
        if (isset($existingCols['purchase_price'])) {
            $cols[] = 'purchase_price';
            $vals[] = $purchasePrice;
        }
        if (isset($existingCols['stock'])) {
            $cols[] = 'stock';
            $vals[] = (int)($input['stock'] ?? 10);
        }
        if (isset($existingCols['category'])) {
            $cols[] = 'category';
            $vals[] = $categoriesStr;
        }
        if (isset($existingCols['categories'])) {
            $cols[] = 'categories';
            $vals[] = $categoriesJson;
        }
        if (isset($existingCols['model_glb'])) {
            $cols[] = 'model_glb';
            $vals[] = trim($input['model_glb'] ?? '');
        }
        if (isset($existingCols['model_usdz'])) {
            $cols[] = 'model_usdz';
            $vals[] = trim($input['model_usdz'] ?? '');
        }
        if (isset($existingCols['barcode'])) {
            $cols[] = 'barcode';
            $vals[] = trim($input['barcode'] ?? '');
        }
        if (isset($existingCols['rating'])) {
            $cols[] = 'rating';
            $vals[] = (float)($input['rating'] ?? 5.0);
        }
        if (isset($existingCols['image'])) {
            $cols[] = 'image';
            $vals[] = $mainImage;
        }
        if (isset($existingCols['images'])) {
            $cols[] = 'images';
            $vals[] = $imagesJson;
        }
        if (isset($existingCols['video'])) {
            $cols[] = 'video';
            $vals[] = $mainVideo;
        }
        if (isset($existingCols['videos'])) {
            $cols[] = 'videos';
            $vals[] = $videosJson;
        }
        if (isset($existingCols['bio'])) {
            $cols[] = 'bio';
            $vals[] = trim($input['bio'] ?? '');
        }
        if (isset($existingCols['languages'])) {
            $cols[] = 'languages';
            $vals[] = $languages;
        }
        if (isset($existingCols['is_featured'])) {
            $cols[] = 'is_featured';
            $vals[] = (int)($input['is_featured'] ?? 1);
        }

        $placeholders = array_fill(0, count($cols), '?');
        $sql = "INSERT INTO products (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $placeholders) . ")";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($vals);

        $newId = $pdo->lastInsertId();
        http_response_code(201);
        echo json_encode([
            "success" => true, 
            "message" => "Produit ajouté avec succès", 
            "id" => $newId
        ]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false, 
            "message" => "Erreur lors de l'ajout du produit: " . $e->getMessage()
        ]);
    }
}

function handlePut(?PDO $pdo): void {
    if ($pdo === null) {
        http_response_code(503);
        echo json_encode(["success" => false, "message" => "Base de données non connectée"]);
        return;
    }

    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    $id = (int)($_GET['id'] ?? ($input['id'] ?? 0));

    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID du produit requis"]);
        return;
    }

    try {
        $existingCols = getProductColumns($pdo);

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
        $images = array_values(array_filter($images, fn($x) => is_string($x) && trim($x) !== ''));
        $mainImage = !empty($images) ? $images[0] : (!empty($input['image']) && trim($input['image']) !== '' ? $input['image'] : '');
        $imagesJson = !empty($images) ? json_encode($images) : (!empty($mainImage) ? json_encode([$mainImage]) : json_encode([]));

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

        $purchasePrice = isset($input['purchase_price']) && $input['purchase_price'] !== '' ? (float)$input['purchase_price'] : 0.0;

        // Construction dynamique de la requête UPDATE en fonction des colonnes réelles
        $fields = [];
        $params = [];

        if (isset($input['name'])) {
            $fields[] = "name = ?";
            $params[] = trim($input['name']);
        }
        $brandVal = trim($input['brand'] ?? ($input['marque'] ?? ($input['author'] ?? '')));
        if (isset($existingCols['author'])) {
            $fields[] = "author = ?";
            $params[] = $brandVal;
        }
        if (isset($existingCols['brand'])) {
            $fields[] = "brand = ?";
            $params[] = $brandVal;
        }
        if (isset($existingCols['format'])) {
            $fields[] = "format = ?";
            $params[] = trim($input['format'] ?? ($input['etat'] ?? ''));
        }
        if (isset($input['price'])) {
            $fields[] = "price = ?";
            $params[] = (float)$input['price'];
        }
        if (isset($existingCols['purchase_price'])) {
            $fields[] = "purchase_price = ?";
            $params[] = $purchasePrice;
        }
        if (isset($existingCols['stock'])) {
            $fields[] = "stock = ?";
            $params[] = isset($input['stock']) ? (int)$input['stock'] : 0;
        }
        if (isset($existingCols['category'])) {
            $fields[] = "category = ?";
            $params[] = $categoriesStr;
        }
        if (isset($existingCols['categories'])) {
            $fields[] = "categories = ?";
            $params[] = $categoriesJson;
        }
        if (isset($existingCols['model_glb']) && array_key_exists('model_glb', $input)) {
            $fields[] = "model_glb = ?";
            $params[] = trim($input['model_glb'] ?? '');
        }
        if (isset($existingCols['model_usdz']) && array_key_exists('model_usdz', $input)) {
            $fields[] = "model_usdz = ?";
            $params[] = trim($input['model_usdz'] ?? '');
        }
        if (isset($existingCols['barcode']) && array_key_exists('barcode', $input)) {
            $fields[] = "barcode = ?";
            $params[] = trim($input['barcode'] ?? '');
        }
        if (isset($existingCols['image'])) {
            $fields[] = "image = ?";
            $params[] = $mainImage;
        }
        if (isset($existingCols['images'])) {
            $fields[] = "images = ?";
            $params[] = $imagesJson;
        }
        if (isset($existingCols['video'])) {
            $fields[] = "video = ?";
            $params[] = $mainVideo;
        }
        if (isset($existingCols['videos'])) {
            $fields[] = "videos = ?";
            $params[] = $videosJson;
        }
        if (isset($existingCols['bio'])) {
            $fields[] = "bio = ?";
            $params[] = trim($input['bio'] ?? '');
        }
        if (isset($existingCols['languages'])) {
            $fields[] = "languages = ?";
            $params[] = $languages;
        }
        if (isset($existingCols['is_featured'])) {
            $fields[] = "is_featured = ?";
            $params[] = (int)($input['is_featured'] ?? 1);
        }

        if (empty($fields)) {
            echo json_encode(["success" => true, "message" => "Aucune modification à apporter"]);
            return;
        }

        $params[] = $id;
        $sql = "UPDATE products SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // Mettre à jour le fichier fallback si existant
        $fallbackFile = __DIR__ . '/../database/products_fallback.json';
        if (file_exists($fallbackFile)) {
            $fb = json_decode(file_get_contents($fallbackFile), true) ?? [];
            foreach ($fb as &$prod) {
                if ((int)($prod['id'] ?? 0) === $id) {
                    $prod['languages'] = $languages;
                    if (isset($input['name'])) $prod['name'] = trim($input['name']);
                    if (isset($input['author'])) $prod['author'] = trim($input['author']);
                    if (isset($input['price'])) $prod['price'] = (float)$input['price'];
                    if (isset($input['stock'])) $prod['stock'] = (int)$input['stock'];
                    if (isset($input['format']) || isset($input['etat'])) $prod['format'] = trim($input['format'] ?? ($input['etat'] ?? ''));
                    if (isset($input['barcode'])) $prod['barcode'] = trim($input['barcode']);
                    if (!empty($categories)) {
                        $prod['categories'] = $categories;
                        $prod['category'] = $categoriesStr;
                    }
                    break;
                }
            }
            unset($prod);
            @file_put_contents($fallbackFile, json_encode($fb, JSON_UNESCAPED_UNICODE));
        }

        echo json_encode(["success" => true, "message" => "Produit mis à jour avec succès"]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false, 
            "message" => "Erreur lors de la mise à jour: " . $e->getMessage()
        ]);
    }
}

function handleDelete(?PDO $pdo): void {
    if ($pdo === null) {
        http_response_code(503);
        echo json_encode(["success" => false, "message" => "Base de données non connectée"]);
        return;
    }
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID requis"]);
        return;
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$id]);

        echo json_encode(["success" => true, "message" => "Produit supprimé avec succès"]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false, 
            "message" => "Erreur lors de la suppression: " . $e->getMessage()
        ]);
    }
}
