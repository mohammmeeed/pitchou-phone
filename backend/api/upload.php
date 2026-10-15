<?php
// backend/api/upload.php
// Téléversement de photos et vidéos pour les produits (ordinateur / téléphone)

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

// Extensions autorisées
$allowedImageExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'];
$allowedVideoExts = ['mp4', 'webm', 'mov', 'ogg', 'm4v', 'quicktime'];

// Helper pour traiter un fichier individuel
function processUploadFile($file, $frontendDir, $backendDir, $allowedImageExts, $allowedVideoExts) {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return ['success' => false, 'error' => 'Erreur de téléversement (code: ' . $file['error'] . ')'];
    }

    // Limite de taille : 100 Mo (idéal pour vidéos courtes et photos HD)
    if ($file['size'] > 100 * 1024 * 1024) {
        return ['success' => false, 'error' => 'Le fichier dépasse la taille maximale de 100 Mo.'];
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $isVideo = in_array($ext, $allowedVideoExts);
    $isImage = in_array($ext, $allowedImageExts);

    if (!$isVideo && !$isImage) {
        // Fallback par détection mime
        $mime = $file['type'] ?? '';
        if (strpos($mime, 'video/') === 0) {
            $isVideo = true;
            $ext = 'mp4';
        } else {
            $isImage = true;
            $ext = 'jpg';
        }
    }

    $prefix = $isVideo ? 'prod_vid_' : 'prod_img_';
    $filename = $prefix . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $targetFrontend = $frontendDir . DIRECTORY_SEPARATOR . $filename;
    $targetBackend = $backendDir . DIRECTORY_SEPARATOR . $filename;

    if (move_uploaded_file($file['tmp_name'], $targetFrontend)) {
        @copy($targetFrontend, $targetBackend);
        return [
            'success' => true,
            'url' => '/uploads/' . $filename,
            'type' => $isVideo ? 'video' : 'image',
            'filename' => $filename,
            'name' => $file['name'],
            'size' => $file['size']
        ];
    } else {
        return ['success' => false, 'error' => 'Échec d\'enregistrement sur le serveur'];
    }
}

// 1. Cas de fichiers multiples dans $_FILES['files'] ou $_FILES['media']
$uploadedResults = [];
foreach (['files', 'media', 'photos', 'videos'] as $key) {
    if (!empty($_FILES[$key]) && is_array($_FILES[$key]['name'])) {
        $count = count($_FILES[$key]['name']);
        for ($i = 0; $i < $count; $i++) {
            $subFile = [
                'name' => $_FILES[$key]['name'][$i],
                'type' => $_FILES[$key]['type'][$i],
                'tmp_name' => $_FILES[$key]['tmp_name'][$i],
                'error' => $_FILES[$key]['error'][$i],
                'size' => $_FILES[$key]['size'][$i],
            ];
            $res = processUploadFile($subFile, $frontendUploadDir, $backendUploadDir, $allowedImageExts, $allowedVideoExts);
            if ($res['success']) {
                $uploadedResults[] = $res;
            }
        }
    }
}

if (!empty($uploadedResults)) {
    echo json_encode([
        'success' => true,
        'files' => $uploadedResults,
        'count' => count($uploadedResults),
        'url' => $uploadedResults[0]['url'],
        'type' => $uploadedResults[0]['type']
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// 2. Cas d'un seul fichier multipart ($_FILES['file'], $_FILES['image'], $_FILES['video'])
foreach (['file', 'image', 'video'] as $key) {
    if (!empty($_FILES[$key]) && !is_array($_FILES[$key]['name'])) {
        $res = processUploadFile($_FILES[$key], $frontendUploadDir, $backendUploadDir, $allowedImageExts, $allowedVideoExts);
        if ($res['success']) {
            echo json_encode($res, JSON_UNESCAPED_UNICODE);
            exit();
        } else {
            http_response_code(400);
            echo json_encode($res, JSON_UNESCAPED_UNICODE);
            exit();
        }
    }
}

// 3. Cas d'une image ou vidéo base64 JSON
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!empty($data['image']) || !empty($data['video']) || !empty($data['file'])) {
    $payload = $data['image'] ?? ($data['video'] ?? $data['file']);
    if (strpos($payload, 'data:') === 0) {
        $parts = explode(',', $payload);
        $header = $parts[0];
        $base64 = $parts[1] ?? '';

        $isVideo = strpos($header, 'video/') !== false;
        $ext = 'jpg';
        if ($isVideo) {
            $ext = 'mp4';
            if (strpos($header, 'webm') !== false) $ext = 'webm';
        } else {
            if (strpos($header, 'png') !== false) $ext = 'png';
            else if (strpos($header, 'webp') !== false) $ext = 'webp';
            else if (strpos($header, 'gif') !== false) $ext = 'gif';
        }

        $prefix = $isVideo ? 'prod_vid_' : 'prod_img_';
        $filename = $prefix . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $decoded = base64_decode($base64);

        if ($decoded !== false) {
            file_put_contents($frontendUploadDir . DIRECTORY_SEPARATOR . $filename, $decoded);
            file_put_contents($backendUploadDir . DIRECTORY_SEPARATOR . $filename, $decoded);

            echo json_encode([
                'success' => true,
                'url' => '/uploads/' . $filename,
                'type' => $isVideo ? 'video' : 'image',
                'filename' => $filename,
                'message' => 'Fichier base64 enregistré avec succès'
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }
    }
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Aucun fichier valide reçu.']);
