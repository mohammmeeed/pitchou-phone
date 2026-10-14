<?php
// backend/api/upload.php
// Téléversement d'images de produits depuis l'appareil (ordinateur / téléphone)

require_once __DIR__ . '/../config/cors.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit();
}

$frontendUploadDir = realpath(__DIR__ . '/../../frontend/public') ? realpath(__DIR__ . '/../../frontend/public') . DIRECTORY_SEPARATOR . 'uploads' : __DIR__ . '/../../frontend/public/uploads';
$backendUploadDir = __DIR__ . '/../uploads';

// Créer les dossiers de destination s'ils n'existent pas
if (!file_exists($frontendUploadDir)) {
    @mkdir($frontendUploadDir, 0777, true);
}
if (!file_exists($backendUploadDir)) {
    @mkdir($backendUploadDir, 0777, true);
}

// 1. Cas d'un fichier multipart form-data ($_FILES)
if (!empty($_FILES['image']) || !empty($_FILES['file'])) {
    $file = !empty($_FILES['image']) ? $_FILES['image'] : $_FILES['file'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Erreur lors du téléversement du fichier (code: ' . $file['error'] . ')']);
        exit();
    }

    // Vérification de la taille (max 10MB)
    if ($file['size'] > 10 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'La photo est trop volumineuse (maximum 10 Mo).']);
        exit();
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
    if (!in_array($ext, $allowed)) {
        $ext = 'jpg';
    }

    $filename = 'prod_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $targetFrontend = $frontendUploadDir . DIRECTORY_SEPARATOR . $filename;
    $targetBackend = $backendUploadDir . DIRECTORY_SEPARATOR . $filename;

    if (move_uploaded_file($file['tmp_name'], $targetFrontend)) {
        @copy($targetFrontend, $targetBackend);
        echo json_encode([
            'success' => true,
            'url' => '/uploads/' . $filename,
            'filename' => $filename,
            'message' => 'Image téléversée avec succès'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Impossible d\'enregistrer le fichier sur le serveur.']);
        exit();
    }
}

// 2. Cas d'une image base64 JSON
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!empty($data['image']) && strpos($data['image'], 'data:image') === 0) {
    $parts = explode(',', $data['image']);
    $header = $parts[0];
    $base64 = $parts[1] ?? '';

    $ext = 'jpg';
    if (strpos($header, 'png') !== false) $ext = 'png';
    else if (strpos($header, 'webp') !== false) $ext = 'webp';
    else if (strpos($header, 'gif') !== false) $ext = 'gif';

    $filename = 'prod_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $decoded = base64_decode($base64);

    if ($decoded !== false) {
        file_put_contents($frontendUploadDir . DIRECTORY_SEPARATOR . $filename, $decoded);
        file_put_contents($backendUploadDir . DIRECTORY_SEPARATOR . $filename, $decoded);

        echo json_encode([
            'success' => true,
            'url' => '/uploads/' . $filename,
            'filename' => $filename,
            'message' => 'Image base64 enregistrée avec succès'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Aucun fichier valide reçu.']);
