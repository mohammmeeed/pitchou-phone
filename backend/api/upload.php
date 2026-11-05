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

// 1. Dossier backend/uploads (dossier interne toujours présent)
$backendUploadDir = realpath(__DIR__ . '/../uploads') ?: (__DIR__ . '/../uploads');
if (!file_exists($backendUploadDir)) {
    @mkdir($backendUploadDir, 0777, true);
}

// 2. Dossier uploads à la racine du site (accessible directement par le serveur web Apache / Nginx)
$rootUploadDir = realpath(__DIR__ . '/../../uploads') ?: (__DIR__ . '/../../uploads');
if (!file_exists($rootUploadDir)) {
    @mkdir($rootUploadDir, 0777, true);
}

// 3. Dossier frontend/public/uploads (pour l'environnement de développement local Vite)
$frontendUploadDir = null;
if (file_exists(__DIR__ . '/../../frontend/public')) {
    $frontendUploadDir = __DIR__ . '/../../frontend/public/uploads';
    if (!file_exists($frontendUploadDir)) {
        @mkdir($frontendUploadDir, 0777, true);
    }
}

// Extensions autorisées
$allowedImageExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'];
$allowedVideoExts = ['mp4', 'webm', 'mov', 'ogg', 'm4v', 'quicktime'];
$allowedDocExts = ['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls'];
$allowedModelExts = ['glb', 'gltf', 'usdz'];

// Helper pour traiter un fichier individuel et le copier dans tous les dossiers cibles
function processUploadFile($file, $backendDir, $rootDir, $frontendDir, $allowedImageExts, $allowedVideoExts, $allowedDocExts = ['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls'], $allowedModelExts = ['glb', 'gltf', 'usdz']) {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $uploadErrors = [
            UPLOAD_ERR_INI_SIZE   => "Le fichier dépasse la taille maximale autorisée par le serveur (upload_max_filesize).",
            UPLOAD_ERR_FORM_SIZE  => "Le fichier dépasse la taille maximale spécifiée dans le formulaire.",
            UPLOAD_ERR_PARTIAL    => "Le fichier n'a été que partiellement téléversé.",
            UPLOAD_ERR_NO_FILE    => "Aucun fichier n'a été sélectionné.",
            UPLOAD_ERR_NO_TMP_DIR => "Dossier temporaire manquant sur le serveur.",
            UPLOAD_ERR_CANT_WRITE => "Impossible d'écrire le fichier sur le disque du serveur.",
            UPLOAD_ERR_EXTENSION  => "Une extension PHP a bloqué le téléversement."
        ];
        $msg = $uploadErrors[$file['error']] ?? ('Erreur de téléversement (code: ' . $file['error'] . ')');
        return ['success' => false, 'error' => $msg];
    }

    // Limite de taille : 100 Mo (idéal pour vidéos courtes, photos HD et justificatifs PDF)
    if ($file['size'] > 100 * 1024 * 1024) {
        return ['success' => false, 'error' => 'Le fichier dépasse la taille maximale de 100 Mo.'];
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $isVideo = in_array($ext, $allowedVideoExts);
    $isImage = in_array($ext, $allowedImageExts);
    $isDoc = in_array($ext, $allowedDocExts);
    $isModel = in_array($ext, $allowedModelExts);

    if (!$isVideo && !$isImage && !$isDoc && !$isModel) {
        // Fallback par détection mime
        $mime = $file['type'] ?? '';
        if (strpos($mime, 'video/') === 0) {
            $isVideo = true;
            $ext = 'mp4';
        } else if (strpos($mime, 'pdf') !== false || $mime === 'application/pdf') {
            $isDoc = true;
            $ext = 'pdf';
        } else if (strpos($mime, 'model/') === 0 || strpos($mime, 'gltf') !== false || strpos($mime, 'usdz') !== false) {
            $isModel = true;
            $ext = (strpos($mime, 'usdz') !== false) ? 'usdz' : 'glb';
        } else {
            $isImage = true;
            $ext = 'jpg';
        }
    }

    $prefix = $isVideo ? 'prod_vid_' : ($isModel ? 'prod_3d_' : ($isDoc ? 'facture_doc_' : 'prod_img_'));
    $fileType = $isVideo ? 'video' : ($isModel ? 'model' : ($isDoc ? 'document' : 'image'));
    $filename = $prefix . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;

    $targetBackend = $backendDir . DIRECTORY_SEPARATOR . $filename;
    $targetRoot = $rootDir . DIRECTORY_SEPARATOR . $filename;
    $targetFrontend = $frontendDir ? ($frontendDir . DIRECTORY_SEPARATOR . $filename) : null;

    $savedPath = null;

    // 1. Tenter d'enregistrer dans backend/uploads en premier
    if (@move_uploaded_file($file['tmp_name'], $targetBackend)) {
        $savedPath = $targetBackend;
    } elseif (@move_uploaded_file($file['tmp_name'], $targetRoot)) {
        // 2. Sinon tenter dans root uploads
        $savedPath = $targetRoot;
    } elseif ($targetFrontend && @move_uploaded_file($file['tmp_name'], $targetFrontend)) {
        // 3. Sinon tenter dans frontend uploads
        $savedPath = $targetFrontend;
    }

    if ($savedPath) {
        // Synchroniser le fichier vers tous les dossiers pour une disponibilité totale
        if ($savedPath !== $targetBackend && is_dir($backendDir)) {
            @copy($savedPath, $targetBackend);
        }
        if ($savedPath !== $targetRoot && is_dir($rootDir)) {
            @copy($savedPath, $targetRoot);
        }
        if ($targetFrontend && $savedPath !== $targetFrontend && $frontendDir && is_dir($frontendDir)) {
            @copy($savedPath, $targetFrontend);
        }

        return [
            'success' => true,
            'url' => '/uploads/' . $filename,
            'type' => $fileType,
            'filename' => $filename,
            'name' => $file['name'],
            'size' => $file['size']
        ];
    } else {
        return ['success' => false, 'error' => "Échec d'enregistrement sur le serveur. Vérifiez les permissions d'écriture sur le dossier uploads (chmod 755 ou 777)."];
    }
}

if (empty($_FILES) && empty($_POST) && isset($_SERVER['CONTENT_LENGTH']) && (int)$_SERVER['CONTENT_LENGTH'] > 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Le volume des fichiers envoyés dépasse la limite autorisée par le serveur (post_max_size).'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// 1. Cas de fichiers multiples dans $_FILES['files'] ou $_FILES['media']
$uploadedResults = [];
foreach (['files', 'media', 'photos', 'videos', 'models'] as $key) {
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
            $res = processUploadFile($subFile, $backendUploadDir, $rootUploadDir, $frontendUploadDir, $allowedImageExts, $allowedVideoExts, $allowedDocExts, $allowedModelExts);
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
foreach (['file', 'image', 'video', 'model', 'glb', 'usdz'] as $key) {
    if (!empty($_FILES[$key]) && !is_array($_FILES[$key]['name'])) {
        $res = processUploadFile($_FILES[$key], $backendUploadDir, $rootUploadDir, $frontendUploadDir, $allowedImageExts, $allowedVideoExts, $allowedDocExts, $allowedModelExts);
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
            @file_put_contents($backendUploadDir . DIRECTORY_SEPARATOR . $filename, $decoded);
            @file_put_contents($rootUploadDir . DIRECTORY_SEPARATOR . $filename, $decoded);
            if ($frontendUploadDir && is_dir($frontendUploadDir)) {
                @file_put_contents($frontendUploadDir . DIRECTORY_SEPARATOR . $filename, $decoded);
            }

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
