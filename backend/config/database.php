<?php
// backend/config/database.php
// Configuration et connexion résiliente à la base de données MySQL
// Supporte StackCP Production (shareddb-r.hosting.stackcp.net) et Local Windows XAMPP

class Database {
    private static ?PDO $pdo = null;

    // Configuration Base de Données StackCP (Production pitchou.biyyi.com)
    public static string $host = 'shareddb-r.hosting.stackcp.net';
    public static int $port = 3306; // StackCP utilise le port MySQL standard 3306
    public static string $dbName = 'pitchou-313233f97d';
    public static string $username = 'pitchou-313233f97d';
    public static string $password = 'focus1408';
    public static string $charset = 'utf8mb4';

    // Alias pour garantir la rétrocompatibilité totale
    public static string $defaultHost = 'shareddb-r.hosting.stackcp.net';
    public static int $defaultPort = 3306;
    public static string $defaultDbName = 'pitchou-313233f97d';
    public static string $defaultUsername = 'pitchou-313233f97d';
    public static string $defaultPassword = 'focus1408';

    /**
     * Charge automatiquement le fichier .env s'il existe
     */
    private static function loadEnv(): void {
        static $loaded = false;
        if ($loaded) return;
        $loaded = true;

        $paths = [
            __DIR__ . '/../../.env',
            __DIR__ . '/../.env',
            __DIR__ . '/.env'
        ];

        foreach ($paths as $path) {
            if (file_exists($path) && is_readable($path)) {
                $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ($lines as $line) {
                    $line = trim($line);
                    if ($line === '' || $line[0] === '#') continue;
                    if (strpos($line, '=') !== false) {
                        list($key, $val) = explode('=', $line, 2);
                        $key = trim($key);
                        $val = trim($val, " \t\n\r\0\x0B\"'");
                        if (!isset($_SERVER[$key]) && !isset($_ENV[$key])) {
                            putenv("{$key}={$val}");
                            $_ENV[$key] = $val;
                            $_SERVER[$key] = $val;
                        }
                    }
                }
                break;
            }
        }
    }

    public static function getConnectionSafe(): ?PDO {
        try {
            return self::getConnection();
        } catch (Throwable $e) {
            return null;
        }
    }

    public static function getConnection(): PDO {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        self::loadEnv();

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
            PDO::ATTR_TIMEOUT            => 4
        ];

        // Résolution du port pour StackCP : toujours 3306 sur stackcp.net (3307 étant réservé au local)
        $resolvedPort = self::$port;
        if (strpos(self::$host, 'stackcp.net') !== false && ($resolvedPort === 3307 || $resolvedPort === 0)) {
            $resolvedPort = 3306;
        }

        // Liste des configurations de connexion par ordre de priorité :
        $configsToTry = [];

        // 1. Priorité aux variables d'environnement si présentes
        if (getenv('DB_HOST')) {
            $configsToTry[] = [
                'host' => getenv('DB_HOST'),
                'port' => (int)(getenv('DB_PORT') ?: 3306),
                'db'   => getenv('DB_DATABASE') ?: self::$dbName,
                'user' => getenv('DB_USERNAME') ?: self::$username,
                'pass' => getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : self::$password
            ];
        }

        // 2. Configuration Production StackCP (pitchou.biyyi.com)
        $configsToTry[] = [
            'host' => self::$host,
            'port' => $resolvedPort,
            'db'   => self::$dbName,
            'user' => self::$username,
            'pass' => self::$password
        ];

        // 3. Configuration Locale XAMPP Windows (port 3307)
        $configsToTry[] = [
            'host' => '127.0.0.1',
            'port' => 3307,
            'db'   => 'pitchou-db',
            'user' => 'root',
            'pass' => ''
        ];

        // 4. Configuration Locale Standard (port 3306)
        $configsToTry[] = [
            'host' => '127.0.0.1',
            'port' => 3306,
            'db'   => 'pitchou-db',
            'user' => 'root',
            'pass' => ''
        ];

        // 5. Configuration Localhost socket (Linux cPanel)
        $configsToTry[] = [
            'host' => 'localhost',
            'port' => 3306,
            'db'   => self::$dbName,
            'user' => self::$username,
            'pass' => self::$password
        ];

        $lastException = null;

        foreach ($configsToTry as $cfg) {
            $h = $cfg['host'];
            $p = $cfg['port'];
            $d = $cfg['db'];
            $u = $cfg['user'];
            $pw = $cfg['pass'];

            $dsn = "mysql:host={$h};port={$p};dbname={$d};charset=" . self::$charset;
            try {
                self::$pdo = new PDO($dsn, $u, $pw, $options);
                return self::$pdo;
            } catch (PDOException $e) {
                $lastException = $e;

                // Erreur 1049 : la base de données n'existe pas encore sur le serveur -> tentative de création automatique
                if ($e->getCode() === 1049) {
                    try {
                        $rootDsn = "mysql:host={$h};port={$p};charset=" . self::$charset;
                        $tempPdo = new PDO($rootDsn, $u, $pw, $options);
                        $tempPdo->exec("CREATE DATABASE IF NOT EXISTS `{$d}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                        self::$pdo = new PDO($dsn, $u, $pw, $options);
                        self::initMySQLSchema(self::$pdo);
                        return self::$pdo;
                    } catch (PDOException $subEx) {
                        $lastException = $subEx;
                    }
                }

                // Essayer la configuration suivante
                continue;
            }
        }

        self::sendError("Erreur de connexion MySQL sur " . self::$host . " : " . ($lastException ? $lastException->getMessage() : "Impossible de se connecter"));
    }

    private static function initMySQLSchema(PDO $pdo): void {
        $sqlFile = __DIR__ . '/../database/pitchou-db.sql';
        if (!file_exists($sqlFile)) {
            $sqlFile = __DIR__ . '/../database/tiktok_shop.sql';
        }
        if (file_exists($sqlFile)) {
            $sql = file_get_contents($sqlFile);
            $pdo->exec($sql);
        }
    }

    private static function sendError(string $msg): void {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "Erreur MySQL",
            "message" => $msg
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit();
    }
}
