<?php
// backend/config/database.php
// Connexion EXCLUSIVE à la base de données MySQL (port 3306)

class Database {
    private static ?PDO $pdo = null;

    // Paramètres MySQL configurables
    private static string $host = '127.0.0.1';
    private static int $port = 3306;
    private static string $dbName = 'tiktok_shop';
    private static string $username = 'root';
    private static string $password = '';
    private static string $charset = 'utf8mb4';

    public static function getConnectionSafe(): ?PDO {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $dsn = "mysql:host=" . self::$host . ";port=" . self::$port . ";dbname=" . self::$dbName . ";charset=" . self::$charset;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ];

        try {
            self::$pdo = new PDO($dsn, self::$username, self::$password, $options);
            return self::$pdo;
        } catch (Throwable $e) {
            return null;
        }
    }

    public static function getConnection(): PDO {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $dsn = "mysql:host=" . self::$host . ";port=" . self::$port . ";dbname=" . self::$dbName . ";charset=" . self::$charset;
        
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ];

        try {
            self::$pdo = new PDO($dsn, self::$username, self::$password, $options);
            return self::$pdo;
        } catch (PDOException $e) {
            // Si la base tiktok_shop n'existe pas encore, tentative de création automatique sur le serveur MySQL
            if ($e->getCode() === 1049) {
                try {
                    $rootDsn = "mysql:host=" . self::$host . ";port=" . self::$port . ";charset=" . self::$charset;
                    $tempPdo = new PDO($rootDsn, self::$username, self::$password, $options);
                    $tempPdo->exec("CREATE DATABASE IF NOT EXISTS `" . self::$dbName . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                    
                    // Reconnexion avec la base créée
                    self::$pdo = new PDO($dsn, self::$username, self::$password, $options);
                    self::initMySQLSchema(self::$pdo);
                    return self::$pdo;
                } catch (PDOException $subEx) {
                    self::sendError("Erreur création base MySQL: " . $subEx->getMessage());
                }
            }

            self::sendError("Erreur de connexion MySQL sur " . self::$host . ":" . self::$port . " : " . $e->getMessage());
        }
    }

    private static function initMySQLSchema(PDO $pdo): void {
        $sqlFile = __DIR__ . '/../database/tiktok_shop.sql';
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
            "message" => $msg,
            "config" => [
                "driver" => "mysql",
                "host" => self::$host,
                "port" => self::$port,
                "database" => self::$dbName
            ]
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit();
    }
}
