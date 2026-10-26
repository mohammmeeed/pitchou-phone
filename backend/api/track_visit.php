<?php
// backend/api/track_visit.php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = Database::getConnectionSafe();

    $input = file_get_contents('php://input');
    $data = json_decode($input, true) ?: $_POST ?: $_GET;

    // 1. Session ID
    $sessionId = $data['session_id'] ?? ($_SERVER['HTTP_X_VISITOR_ID'] ?? null);
    if (!$sessionId || strlen(trim($sessionId)) < 5) {
        $ipSeed = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $uaSeed = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $sessionId = 'sess_' . substr(md5($ipSeed . $uaSeed . date('Y-m-d')), 0, 16);
    }

    // 2. Page Path
    $pagePath = substr(trim($data['page_path'] ?? ($_SERVER['HTTP_REFERER'] ?? '/')), 0, 255);
    if (empty($pagePath)) {
        $pagePath = '/';
    }

    // 3. Extract Real Client IP
    $ip = '';
    $headersToCheck = [
        'HTTP_CF_CONNECTING_IP',
        'HTTP_X_REAL_IP',
        'HTTP_CLIENT_IP',
        'HTTP_X_FORWARDED_FOR',
        'REMOTE_ADDR'
    ];

    foreach ($headersToCheck as $header) {
        if (!empty($_SERVER[$header])) {
            $candidate = $_SERVER[$header];
            if (strpos($candidate, ',') !== false) {
                $parts = explode(',', $candidate);
                foreach ($parts as $part) {
                    $cleaned = trim($part);
                    if (filter_var($cleaned, FILTER_VALIDATE_IP)) {
                        $ip = $cleaned;
                        break 2;
                    }
                }
            } else {
                $candidate = trim($candidate);
                if (filter_var($candidate, FILTER_VALIDATE_IP)) {
                    $ip = $candidate;
                    break;
                }
            }
        }
    }
    if (empty($ip)) {
        $ip = '127.0.0.1';
    }

    // 4. Device Type Detection
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $screenWidth = isset($data['screen_width']) ? (int)$data['screen_width'] : 0;
    $deviceType = 'desktop';

    $isTablet = (bool)preg_match('/(tablet|ipad|playbook|silk)|(android(?!.*mobile))|(kindle)|(nexus (7|9|10))/i', $userAgent);
    $isMobile = (bool)preg_match('/(mobi|ipod|iphone|android.*mobile|blackberry|opera mini|iemobile|mobile|fennec|windows phone)/i', $userAgent);

    if ($isTablet || ($screenWidth > 0 && $screenWidth >= 600 && $screenWidth <= 1024)) {
        $deviceType = 'tablet';
    } elseif ($isMobile || ($screenWidth > 0 && $screenWidth < 600)) {
        $deviceType = 'mobile';
    }

    // 5. Country and City Detection
    $countryCode = '';
    $countryName = '';
    $city = '';

    // Country code to French label mapping
    $countryMap = [
        'DZ' => 'Algérie',
        'FR' => 'France',
        'US' => 'États-Unis',
        'CA' => 'Canada',
        'BE' => 'Belgique',
        'CH' => 'Suisse',
        'TN' => 'Tunisie',
        'MA' => 'Maroc',
        'ES' => 'Espagne',
        'DE' => 'Allemagne',
        'IT' => 'Italie',
        'GB' => 'Royaume-Uni',
        'UK' => 'Royaume-Uni',
        'TR' => 'Turquie',
        'SA' => 'Arabie Saoudite',
        'AE' => 'Émirats Arabes Unis',
        'QA' => 'Qatar',
        'EG' => 'Égypte',
        'SN' => 'Sénégal',
        'CI' => 'Côte d\'Ivoire',
        'NL' => 'Pays-Bas',
        'SE' => 'Suède',
        'RU' => 'Russie',
        'CN' => 'Chine',
        'JP' => 'Japon',
        'BR' => 'Brésil'
    ];

    // Priority 1: Cloudflare or Reverse Proxy Country Header
    $cfCountry = $_SERVER['HTTP_CF_IPCOUNTRY'] ?? $_SERVER['HTTP_X_COUNTRY_CODE'] ?? $_SERVER['GEOIP_COUNTRY_CODE'] ?? '';
    if (!empty($cfCountry) && strlen($cfCountry) === 2 && strtoupper($cfCountry) !== 'XX' && strtoupper($cfCountry) !== 'T1') {
        $countryCode = strtoupper($cfCountry);
    }

    // Priority 2: Client Timezone mapping (highly reliable for users on localhost or behind VPN/proxies)
    $timezone = trim($data['timezone'] ?? '');
    if (empty($countryCode) && !empty($timezone)) {
        $tzMap = [
            'Africa/Algiers' => 'DZ',
            'Europe/Paris' => 'FR',
            'Europe/Brussels' => 'BE',
            'Europe/Geneva' => 'CH',
            'Europe/Zurich' => 'CH',
            'Africa/Tunis' => 'TN',
            'Africa/Casablanca' => 'MA',
            'Europe/Madrid' => 'ES',
            'Europe/Rome' => 'IT',
            'Europe/Berlin' => 'DE',
            'Europe/London' => 'GB',
            'Asia/Dubai' => 'AE',
            'Asia/Riyadh' => 'SA',
            'Asia/Qatar' => 'QA',
            'Asia/Istanbul' => 'TR',
            'Africa/Cairo' => 'EG',
            'America/Montreal' => 'CA',
            'America/Toronto' => 'CA',
            'America/Vancouver' => 'CA',
            'America/New_York' => 'US',
            'America/Chicago' => 'US',
            'America/Los_Angeles' => 'US',
            'America/Denver' => 'US',
            'America/Phoenix' => 'US',
        ];

        if (isset($tzMap[$timezone])) {
            $countryCode = $tzMap[$timezone];
        } elseif (strpos($timezone, 'Africa/') === 0) {
            $countryCode = 'DZ';
        } elseif (strpos($timezone, 'Europe/') === 0) {
            $countryCode = 'FR';
        } elseif (strpos($timezone, 'America/') === 0) {
            $countryCode = 'US';
        }
    }

    // Priority 3: Browser Language header (e.g. fr-DZ, ar-DZ, fr-FR, en-US)
    if (empty($countryCode)) {
        $langHeader = $data['language'] ?? ($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '');
        if (preg_match('/[a-z]{2}-([A-Z]{2})/i', $langHeader, $m)) {
            $candidateCode = strtoupper($m[1]);
            if (isset($countryMap[$candidateCode])) {
                $countryCode = $candidateCode;
            }
        }
    }

    // Fallback default
    if (empty($countryCode)) {
        $countryCode = 'DZ';
    }

    $countryName = $countryMap[$countryCode] ?? $countryCode;
    if (empty($city)) {
        $city = ($countryCode === 'DZ') ? 'Alger' : (($countryCode === 'FR') ? 'Paris' : 'Local');
    }

    // 6. Database record with anti-flood debounce
    $alreadyLogged = false;
    if ($pdo !== null) {
        $recentStmt = $pdo->prepare("SELECT id FROM site_visits WHERE session_id = ? AND page_path = ? AND created_at >= (NOW() - INTERVAL 10 SECOND) LIMIT 1");
        $recentStmt->execute([$sessionId, $pagePath]);
        $alreadyLogged = (bool)$recentStmt->fetchColumn();

        if (!$alreadyLogged) {
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
        }
    }

    echo json_encode([
        "success" => true,
        "recorded" => ($pdo !== null && !$alreadyLogged),
        "data" => [
            "country_code" => $countryCode,
            "country_name" => $countryName,
            "device_type" => $deviceType,
            "ip" => $ip
        ]
    ]);
} catch (Throwable $e) {
    // Ne jamais bloquer ou polluer la console du client pour un échec de tracking
    echo json_encode([
        "success" => true,
        "recorded" => false,
        "fallback" => true,
        "message" => $e->getMessage()
    ]);
}

