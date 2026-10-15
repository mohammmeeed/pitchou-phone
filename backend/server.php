<?php
// backend/server.php
// Router for PHP built-in server: php -S localhost:8000 backend/server.php

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Route API endpoints
if (preg_match('#^/api/([a-zA-Z0-9_-]+)(?:\.php)?#', $uri, $matches)) {
    $endpoint = $matches[1];
    $apiFile = __DIR__ . '/api/' . $endpoint . '.php';
    if (file_exists($apiFile)) {
        require $apiFile;
        exit();
    }
}

// Serve static files if they exist (uploads, images, assets)
$filePath = __DIR__ . $uri;
if ($uri !== '/' && file_exists($filePath) && !is_dir($filePath)) {
    $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    $mimes = [
        'webp' => 'image/webp',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png'  => 'image/png',
        'gif'  => 'image/gif',
        'svg'  => 'image/svg+xml',
        'mp4'  => 'video/mp4',
        'webm' => 'video/webm'
    ];
    $contentType = $mimes[$ext] ?? (function_exists('mime_content_type') ? mime_content_type($filePath) : 'application/octet-stream');
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: " . $contentType);
    header("Content-Length: " . filesize($filePath));
    readfile($filePath);
    exit();
}

// Fallback response for root
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
echo json_encode([
    "status" => "online",
    "service" => "TikTok Shop PHP Backend API",
    "version" => "1.0.0",
    "endpoints" => [
        "/api/stats.php",
        "/api/products.php",
        "/api/orders.php",
        "/api/customers.php",
        "/api/auth.php"
    ]
]);
