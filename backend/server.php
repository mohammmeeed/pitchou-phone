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
    return false; // serve requested file as-is
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
