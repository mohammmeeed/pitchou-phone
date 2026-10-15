<?php
// backend/api/track_visit.php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = Database::getConnection();

    $data = json_decode(file_get_contents('php://input'), true) ?: $_GET;

    $sessionId = $data['session_id'] ?? ($_SERVER['HTTP_X_VISITOR_ID'] ?? null);
    if (!$sessionId) {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $sessionId = 'sess_' . substr(md5($ip . date('Y-m-d')), 0, 16);
    }

    $pagePath = substr($data['page_path'] ?? ($_SERVER['HTTP_REFERER'] ?? '/'), 0, 255);
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
    if (strpos($ip, ',') !== false) {
        $ip = trim(explode(',', $ip)[0]);
    }

    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $deviceType = 'desktop';
    if (preg_match('/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i', $userAgent)) {
        $deviceType = 'tablet';
    } elseif (preg_match('/(mobi|ipod|iphone|blackberry|opera mini|iemobile|mobile)/i', $userAgent)) {
        $deviceType = 'mobile';
    }

    $countryCode = 'DZ';
    $countryName = 'Algérie';
    $city = 'Alger';

    if (!empty($_SERVER['HTTP_CF_IPCOUNTRY'])) {
        $countryCode = strtoupper(trim($_SERVER['HTTP_CF_IPCOUNTRY']));
        if ($countryCode === 'FR') $countryName = 'France';
        elseif ($countryCode === 'US') $countryName = 'États-Unis';
        elseif ($countryCode === 'CA') $countryName = 'Canada';
        elseif ($countryCode === 'TN') $countryName = 'Tunisie';
        elseif ($countryCode === 'MA') $countryName = 'Maroc';
    }

    $stmt = $pdo->prepare("INSERT INTO site_visits (session_id, ip_address, country_code, country_name, city, device_type, page_path, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())");
    $stmt->execute([
        $sessionId,
        $ip,
        $countryCode,
        $countryName,
        $city,
        $deviceType,
        $pagePath,
        substr($userAgent, 0, 500)
    ]);

    echo json_encode(["success" => true]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
