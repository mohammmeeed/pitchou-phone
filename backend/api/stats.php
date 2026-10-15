<?php
// backend/api/stats.php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = Database::getConnection();

    // 1. Total Revenue (DA)
    $revStmt = $pdo->query("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != 'Annulée'");
    $totalRevenue = (float)$revStmt->fetchColumn();

    // 2. Total Orders
    $ordStmt = $pdo->query("SELECT COUNT(*) as total FROM orders");
    $totalOrders = (int)$ordStmt->fetchColumn();

    // 3. Pending Orders
    $pendingStmt = $pdo->query("SELECT COUNT(*) as total FROM orders WHERE status = 'En attente'");
    $pendingOrders = (int)$pendingStmt->fetchColumn();

    // 4. Total Products
    $prodStmt = $pdo->query("SELECT COUNT(*) as total FROM products");
    $totalProducts = (int)$prodStmt->fetchColumn();

    // 5. Total Customers
    $custStmt = $pdo->query("SELECT COUNT(*) as total FROM customers");
    $totalCustomers = (int)$custStmt->fetchColumn();

    // 6. Recent Orders (Last 5)
    $recentStmt = $pdo->query("SELECT * FROM orders ORDER BY id DESC LIMIT 5");
    $recentOrders = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

    // 7. Sales Chart (Real daily aggregation for the current week / last 7 days)
    $dayNamesFr = [
        'Mon' => 'Lun',
        'Tue' => 'Mar',
        'Wed' => 'Mer',
        'Thu' => 'Jeu',
        'Fri' => 'Ven',
        'Sat' => 'Sam',
        'Sun' => 'Dim'
    ];

    $weeklyChart = [];
    $today = new DateTime();
    
    // Last 7 days sales
    for ($i = 6; $i >= 0; $i--) {
        $d = (clone $today)->modify("-{$i} days");
        $dStr = $d->format('Y-m-d');
        $dayShort = $dayNamesFr[$d->format('D')] ?? $d->format('D');

        $salesStmt = $pdo->prepare("SELECT COALESCE(SUM(total_amount), 0) as sales, COUNT(*) as orders_count FROM orders WHERE DATE(created_at) = ? AND status != 'Annulée'");
        $salesStmt->execute([$dStr]);
        $dayData = $salesStmt->fetch(PDO::FETCH_ASSOC);

        $weeklyChart[] = [
            "day" => $dayShort,
            "date" => $d->format('d M'),
            "sales" => (float)($dayData['sales'] ?? 0),
            "orders" => (int)($dayData['orders_count'] ?? 0)
        ];
    }

    // 8. Real Traffic & Live Visits evolution from `site_visits` table
    $ensureTable = $pdo->exec("CREATE TABLE IF NOT EXISTS site_visits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL,
        ip_address VARCHAR(45) DEFAULT '127.0.0.1',
        country_code VARCHAR(5) DEFAULT 'DZ',
        country_name VARCHAR(50) DEFAULT 'Algérie',
        city VARCHAR(50) DEFAULT 'Alger',
        device_type VARCHAR(20) DEFAULT 'mobile',
        page_path VARCHAR(255) DEFAULT '/',
        user_agent VARCHAR(500) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created (created_at),
        INDEX idx_country (country_code),
        INDEX idx_device (device_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Helper to build real series for N days up to today
    $getTrafficSeries = function(int $daysCount, int $step = 1) use ($pdo, $today) {
        $dates = [];
        $totalVisits = [];
        $uniqueVisitors = [];

        // Prepare map of DB data
        $startDate = (clone $today)->modify("-" . ($daysCount - 1) . " days")->format('Y-m-d 00:00:00');
        $stmt = $pdo->prepare("SELECT DATE(created_at) as v_date, COUNT(*) as tot, COUNT(DISTINCT session_id) as uniq FROM site_visits WHERE created_at >= ? GROUP BY v_date");
        $stmt->execute([$startDate]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $dataByDate = [];
        foreach ($rows as $r) {
            $dataByDate[$r['v_date']] = [
                'tot' => (int)$r['tot'],
                'uniq' => (int)$r['uniq']
            ];
        }

        // Loop through required days
        for ($i = $daysCount - 1; $i >= 0; $i -= $step) {
            $cur = (clone $today)->modify("-{$i} days");
            $curDateStr = $cur->format('Y-m-d');
            $dates[] = $cur->format('d M'); // e.g. "15 Oct"
            $totalVisits[] = $dataByDate[$curDateStr]['tot'] ?? 0;
            $uniqueVisitors[] = $dataByDate[$curDateStr]['uniq'] ?? 0;
        }

        return [
            "dates" => $dates,
            "totalVisits" => $totalVisits,
            "uniqueVisitors" => $uniqueVisitors
        ];
    };

    $traffic7 = $getTrafficSeries(7, 1);
    $traffic14 = $getTrafficSeries(14, 1);
    $traffic30 = $getTrafficSeries(30, 2); // 15 points evenly spaced

    // Real countries breakdown
    $totalVisitsCount = (int)$pdo->query("SELECT COUNT(*) FROM site_visits")->fetchColumn();
    if ($totalVisitsCount === 0) $totalVisitsCount = 1;

    $countryStmt = $pdo->query("SELECT country_code as code, country_name as name, COUNT(*) as visits FROM site_visits GROUP BY country_code, country_name ORDER BY visits DESC LIMIT 5");
    $countriesRaw = $countryStmt->fetchAll(PDO::FETCH_ASSOC);

    $countries = [];
    foreach ($countriesRaw as $c) {
        $pct = round(($c['visits'] / $totalVisitsCount) * 100, 1);
        $countries[] = [
            "code" => $c['code'],
            "name" => $c['name'],
            "visits" => (int)$c['visits'],
            "percentage" => $pct
        ];
    }
    if (empty($countries)) {
        $countries = [
            ["code" => "DZ", "name" => "Algérie", "visits" => 1, "percentage" => 100.0]
        ];
    }

    // Real devices breakdown
    $deviceStmt = $pdo->query("SELECT device_type, COUNT(*) as cnt FROM site_visits GROUP BY device_type");
    $deviceRows = $deviceStmt->fetchAll(PDO::FETCH_ASSOC);
    $devices = ["mobile" => 0, "desktop" => 0, "tablet" => 0];
    foreach ($deviceRows as $dr) {
        $type = strtolower($dr['device_type']);
        if (isset($devices[$type])) {
            $devices[$type] = (int)$dr['cnt'];
        } else {
            $devices['mobile'] += (int)$dr['cnt'];
        }
    }

    $trafficStats = [
        "7" => $traffic7,
        "14" => $traffic14,
        "30" => $traffic30,
        "countries" => $countries,
        "devices" => $devices
    ];

    echo json_encode([
        "success" => true,
        "data" => [
            "totalRevenue" => $totalRevenue,
            "totalOrders" => $totalOrders,
            "pendingOrders" => $pendingOrders,
            "totalProducts" => $totalProducts,
            "totalCustomers" => $totalCustomers,
            "currency" => "DA",
            "recentOrders" => $recentOrders,
            "weeklyChart" => $weeklyChart,
            "trafficStats" => $trafficStats
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
