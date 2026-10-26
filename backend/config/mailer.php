<?php
// backend/config/mailer.php
// Service d'envoi d'emails transactionnels (SMTP & standard) pour TikTok Shop / LeerBook

require_once __DIR__ . '/database.php';

class AppMailer {

    /**
     * Récupère les paramètres de la boutique et la configuration SMTP
     */
    public static function getSettings(PDO $pdo): array {
        $defaultSettings = [
            'store_name' => 'TikTok Shop Algérie',
            'admin_email' => 'admin@tiktokshop.dz',
            'logo_image' => '',
            'logo_text' => 'LeerBook',
            'smtp_enabled' => '1',
            'smtp_host' => 'smtp.gmail.com',
            'smtp_port' => '587',
            'smtp_encryption' => 'tls',
            'smtp_username' => '',
            'smtp_password' => '',
            'smtp_from_name' => 'TikTok Shop Algérie',
            'smtp_reply_to' => '',
            'smtp_notify_customer' => '1',
            'smtp_notify_admin' => '1'
        ];

        try {
            $stmt = $pdo->query("SELECT setting_key, setting_value FROM settings WHERE setting_key IN (
                'store_name', 'admin_email', 'logo_image', 'logo_text',
                'smtp_enabled', 'smtp_host', 'smtp_port', 'smtp_encryption',
                'smtp_username', 'smtp_password', 'smtp_from_name', 'smtp_reply_to',
                'smtp_notify_customer', 'smtp_notify_admin'
            )");
            $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            return array_merge($defaultSettings, $rows);
        } catch (Exception $e) {
            return $defaultSettings;
        }
    }

    /**
     * Résout l'URL absolue du logo de la boutique pour l'affichage dans les clients email
     */
    public static function resolveLogoHtml(array $settings): string {
        $logoImage = trim($settings['logo_image'] ?? '');
        $logoText = htmlspecialchars($settings['logo_text'] ?? ($settings['store_name'] ?? 'LeerBook'), ENT_QUOTES, 'UTF-8');

        if (!empty($logoImage)) {
            $logoUrl = $logoImage;
            if (strpos($logoImage, 'http://') !== 0 && strpos($logoImage, 'https://') !== 0 && strpos($logoImage, 'data:') !== 0) {
                $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
                $protocol = $isHttps ? 'https://' : 'http://';
                $host = $_SERVER['HTTP_HOST'] ?? 'localhost:8000';
                $logoUrl = $protocol . $host . (strpos($logoImage, '/') === 0 ? '' : '/') . $logoImage;
            }
            return '<img src="' . htmlspecialchars($logoUrl, ENT_QUOTES, 'UTF-8') . '" alt="' . $logoText . '" style="max-height: 48px; max-width: 190px; height: auto; object-fit: contain; display: inline-block; border: none; outline: none;" />';
        }

        return '<span style="font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif;">' . $logoText . '</span>';
    }

    /**
     * Gabarit HTML universel, très très simple, épuré, sans badges
     */
    public static function buildSimpleTemplate(string $title, string $contentHtml, array $settings): string {
        $logoHtml = self::resolveLogoHtml($settings);
        $storeName = htmlspecialchars($settings['store_name'] ?? 'Boutique', ENT_QUOTES, 'UTF-8');
        $safeTitle = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');

        return '<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>' . $safeTitle . '</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1f2937;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="table-layout: fixed;">
    <tr>
      <td align="center">
        <!-- Boîte de contenu principale -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e4e4e7; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          
          <!-- En-tête avec Logo -->
          <tr>
            <td align="center" style="padding: 28px 24px 20px; border-bottom: 1px solid #f4f4f5;">
              ' . $logoHtml . '
            </td>
          </tr>

          <!-- Titre & Corps du message -->
          <tr>
            <td style="padding: 28px 26px 24px; font-size: 14.5px; line-height: 1.6; color: #27272a;">
              <h2 style="font-size: 18px; font-weight: 700; color: #09090b; margin: 0 0 16px 0; line-height: 1.3;">
                ' . $safeTitle . '
              </h2>
              ' . $contentHtml . '
            </td>
          </tr>

          <!-- Pied de page très simple -->
          <tr>
            <td align="center" style="padding: 16px 24px; background-color: #fafafa; border-top: 1px solid #f4f4f5; font-size: 12px; color: #71717a;">
              ' . $storeName . ' • Message automatique
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
    }

    /**
     * Envoie un email en utilisant la configuration SMTP configurée
     */
    public static function send(string $to, string $subject, string $htmlBody, array $settings): bool {
        $to = trim($to);
        if (empty($to) || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $enabled = ($settings['smtp_enabled'] ?? '1') === '1';
        $fromName = trim($settings['smtp_from_name'] ?? ($settings['store_name'] ?? 'Boutique'));
        $fromEmail = trim($settings['smtp_username'] ?? ($settings['admin_email'] ?? 'contact@tiktokshop.dz'));
        if (empty($fromEmail)) {
            $fromEmail = 'noreply@' . ($_SERVER['HTTP_HOST'] ?? 'tiktokshop.dz');
        }
        $replyTo = !empty($settings['smtp_reply_to']) ? trim($settings['smtp_reply_to']) : $fromEmail;

        $host = trim($settings['smtp_host'] ?? '');
        $port = intval($settings['smtp_port'] ?? 587);
        $encryption = strtolower(trim($settings['smtp_encryption'] ?? 'tls'));
        $username = trim($settings['smtp_username'] ?? '');
        $password = trim($settings['smtp_password'] ?? '');

        // Si le SMTP est configuré et activé, tenter la transmission directe par socket
        if ($enabled && !empty($host) && $port > 0) {
            $smtpSuccess = self::sendViaSocketSmtp(
                $host,
                $port,
                $encryption,
                $username,
                $password,
                $fromEmail,
                $fromName,
                $to,
                $replyTo,
                $subject,
                $htmlBody
            );
            if ($smtpSuccess) {
                return true;
            }
        }

        // Repli transparent avec mail() PHP standard
        return self::sendViaPhpMail($fromEmail, $fromName, $to, $replyTo, $subject, $htmlBody);
    }

    /**
     * Client SMTP natif et autonome via socket PHP (zéro dépendance externe)
     */
    private static function sendViaSocketSmtp(
        string $host,
        int $port,
        string $encryption,
        string $username,
        string $password,
        string $fromEmail,
        string $fromName,
        string $toEmail,
        string $replyTo,
        string $subject,
        string $htmlBody
    ): bool {
        $socketHost = ($encryption === 'ssl') ? 'ssl://' . $host : $host;
        $timeout = 6;
        $errno = 0;
        $errstr = '';

        $socket = @fsockopen($socketHost, $port, $errno, $errstr, $timeout);
        if (!$socket) {
            return false;
        }

        stream_set_timeout($socket, $timeout);

        $readResponse = function() use ($socket): string {
            $data = '';
            while (!feof($socket)) {
                $line = fgets($socket, 512);
                if ($line === false) break;
                $data .= $line;
                // Si le 4ème caractère est un espace, c'est la dernière ligne de la réponse SMTP
                if (isset($line[3]) && $line[3] === ' ') break;
            }
            return $data;
        };

        $sendCommand = function(string $cmd) use ($socket, $readResponse): string {
            fputs($socket, $cmd . "\r\n");
            return $readResponse();
        };

        try {
            $banner = $readResponse();
            if (substr($banner, 0, 3) !== '220') {
                fclose($socket);
                return false;
            }

            $ehlo = $sendCommand("EHLO localhost");

            // Négociation TLS (Port 587)
            if ($encryption === 'tls') {
                $starttls = $sendCommand("STARTTLS");
                if (substr($starttls, 0, 3) === '220') {
                    $crypto = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                    if ($crypto) {
                        $sendCommand("EHLO localhost");
                    }
                }
            }

            // Authentification LOGIN si identifiants présents
            if (!empty($username) && !empty($password)) {
                $auth = $sendCommand("AUTH LOGIN");
                if (substr($auth, 0, 3) === '334') {
                    $uRes = $sendCommand(base64_encode($username));
                    if (substr($uRes, 0, 3) === '334') {
                        $pRes = $sendCommand(base64_encode($password));
                        if (substr($pRes, 0, 3) !== '235') {
                            // Échec authentification SMTP
                            fclose($socket);
                            return false;
                        }
                    }
                }
            }

            $mailFrom = $sendCommand("MAIL FROM:<" . $fromEmail . ">");
            if (substr($mailFrom, 0, 3) !== '250') {
                fclose($socket);
                return false;
            }

            $rcptTo = $sendCommand("RCPT TO:<" . $toEmail . ">");
            if (substr($rcptTo, 0, 3) !== '250') {
                fclose($socket);
                return false;
            }

            $dataCmd = $sendCommand("DATA");
            if (substr($dataCmd, 0, 3) !== '354') {
                fclose($socket);
                return false;
            }

            // Construction des en-têtes et du corps
            $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
            $encodedFromName = '=?UTF-8?B?' . base64_encode($fromName) . '?=';

            $headers = [];
            $headers[] = "From: {$encodedFromName} <{$fromEmail}>";
            $headers[] = "Reply-To: <{$replyTo}>";
            $headers[] = "To: <{$toEmail}>";
            $headers[] = "Subject: {$encodedSubject}";
            $headers[] = "Date: " . date('r');
            $headers[] = "MIME-Version: 1.0";
            $headers[] = "Content-Type: text/html; charset=UTF-8";
            $headers[] = "Content-Transfer-Encoding: 8bit";

            $payload = implode("\r\n", $headers) . "\r\n\r\n" . $htmlBody . "\r\n.\r\n";
            fputs($socket, $payload);
            $sendRes = $readResponse();

            $sendCommand("QUIT");
            fclose($socket);

            return substr($sendRes, 0, 3) === '250';
        } catch (Exception $e) {
            @fclose($socket);
            return false;
        }
    }

    /**
     * Envoi via mail() standard PHP
     */
    private static function sendViaPhpMail(
        string $fromEmail,
        string $fromName,
        string $toEmail,
        string $replyTo,
        string $subject,
        string $htmlBody
    ): bool {
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $encodedFromName = '=?UTF-8?B?' . base64_encode($fromName) . '?=';

        $headers = [
            "MIME-Version: 1.0",
            "Content-Type: text/html; charset=UTF-8",
            "From: {$encodedFromName} <{$fromEmail}>",
            "Reply-To: {$replyTo}",
            "X-Mailer: PHP/" . phpversion()
        ];

        return @mail($toEmail, $encodedSubject, $htmlBody, implode("\r\n", $headers));
    }

    // =========================================================================
    // DÉCLENCHEURS TRANSACTIONNELS (COMMANDE & COMPTE CLIENT)
    // =========================================================================

    /**
     * Déclenché lors de la création d'une commande
     * Envoie l'email au client et alerte l'administrateur
     */
    public static function onOrderCreated(PDO $pdo, array $order): void {
        try {
            $settings = self::getSettings($pdo);
            $orderNum = htmlspecialchars($order['order_number'] ?? '#CMD', ENT_QUOTES, 'UTF-8');
            $customerName = htmlspecialchars($order['customer_name'] ?? 'Client', ENT_QUOTES, 'UTF-8');
            $customerPhone = htmlspecialchars($order['customer_phone'] ?? '', ENT_QUOTES, 'UTF-8');
            $customerEmail = trim($order['customer_email'] ?? '');
            $customerAddress = htmlspecialchars($order['customer_address'] ?? 'Non spécifiée', ENT_QUOTES, 'UTF-8');
            $itemsSummary = htmlspecialchars($order['items_summary'] ?? 'Articles commandés', ENT_QUOTES, 'UTF-8');
            $shippingFee = number_format((float)($order['shipping_fee'] ?? 0), 0, ',', ' ');
            $totalAmount = number_format((float)($order['total_amount'] ?? 0), 0, ',', ' ');

            // 1. EMAIL AU CLIENT (Confirmation de commande)
            if (($settings['smtp_notify_customer'] ?? '1') === '1' && !empty($customerEmail) && filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
                $clientTitle = "Confirmation de votre commande " . $orderNum;
                $clientContent = '
                  <p style="margin: 0 0 16px 0;">Bonjour <strong>' . $customerName . '</strong>,</p>
                  <p style="margin: 0 0 20px 0;">Nous avons bien reçu votre commande et nous vous en remercions. Votre colis est en cours de préparation.</p>
                  
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0; border-collapse: collapse; font-size: 14px;">
                    <tr>
                      <td style="padding: 9px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Numéro de commande</td>
                      <td style="padding: 9px 0; font-weight: 700; color: #111827; text-align: right; border-bottom: 1px solid #f3f4f6;">' . $orderNum . '</td>
                    </tr>
                    <tr>
                      <td style="padding: 9px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Téléphone</td>
                      <td style="padding: 9px 0; font-weight: 600; color: #111827; text-align: right; border-bottom: 1px solid #f3f4f6;">' . $customerPhone . '</td>
                    </tr>
                    <tr>
                      <td style="padding: 9px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Adresse de livraison</td>
                      <td style="padding: 9px 0; font-weight: 600; color: #111827; text-align: right; border-bottom: 1px solid #f3f4f6;">' . $customerAddress . '</td>
                    </tr>
                    <tr>
                      <td style="padding: 9px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Articles</td>
                      <td style="padding: 9px 0; font-weight: 600; color: #111827; text-align: right; border-bottom: 1px solid #f3f4f6;">' . $itemsSummary . '</td>
                    </tr>
                    <tr>
                      <td style="padding: 9px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Livraison</td>
                      <td style="padding: 9px 0; font-weight: 600; color: #111827; text-align: right; border-bottom: 1px solid #f3f4f6;">' . $shippingFee . ' DA</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0 0; font-size: 15px; font-weight: 700; color: #111827; border-top: 1.5px solid #e5e7eb;">Total à payer</td>
                      <td style="padding: 12px 0 0; font-size: 16px; font-weight: 800; color: #111827; text-align: right; border-top: 1.5px solid #e5e7eb;">' . $totalAmount . ' DA</td>
                    </tr>
                  </table>

                  <p style="margin: 18px 0 0 0; font-size: 13.5px; color: #4b5563;">Le paiement s\'effectue à la livraison. Vous serez contacté par téléphone pour organiser la remise de votre colis.</p>
                ';

                $clientHtml = self::buildSimpleTemplate($clientTitle, $clientContent, $settings);
                self::send($customerEmail, $clientTitle, $clientHtml, $settings);
            }

            // 2. EMAIL À L'ADMINISTRATEUR (Alerte nouvelle commande)
            $adminEmail = trim($settings['admin_email'] ?? '');
            if (($settings['smtp_notify_admin'] ?? '1') === '1' && !empty($adminEmail) && filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) {
                $adminTitle = "Nouvelle commande reçue : " . $orderNum;
                $adminContent = '
                  <p style="margin: 0 0 16px 0;">Une nouvelle commande vient d\'être enregistrée sur votre boutique.</p>
                  
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0; border-collapse: collapse; font-size: 14px;">
                    <tr>
                      <td style="padding: 9px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Commande</td>
                      <td style="padding: 9px 0; font-weight: 700; color: #111827; text-align: right; border-bottom: 1px solid #f3f4f6;">' . $orderNum . '</td>
                    </tr>
                    <tr>
                      <td style="padding: 9px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Client</td>
                      <td style="padding: 9px 0; font-weight: 600; color: #111827; text-align: right; border-bottom: 1px solid #f3f4f6;">' . $customerName . '</td>
                    </tr>
                    <tr>
                      <td style="padding: 9px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Téléphone</td>
                      <td style="padding: 9px 0; font-weight: 600; color: #111827; text-align: right; border-bottom: 1px solid #f3f4f6;">' . $customerPhone . '</td>
                    </tr>
                    <tr>
                      <td style="padding: 9px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Email</td>
                      <td style="padding: 9px 0; font-weight: 600; color: #111827; text-align: right; border-bottom: 1px solid #f3f4f6;">' . (!empty($customerEmail) ? htmlspecialchars($customerEmail, ENT_QUOTES, 'UTF-8') : 'Non renseigné') . '</td>
                    </tr>
                    <tr>
                      <td style="padding: 9px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Adresse / Wilaya</td>
                      <td style="padding: 9px 0; font-weight: 600; color: #111827; text-align: right; border-bottom: 1px solid #f3f4f6;">' . $customerAddress . '</td>
                    </tr>
                    <tr>
                      <td style="padding: 9px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Articles</td>
                      <td style="padding: 9px 0; font-weight: 600; color: #111827; text-align: right; border-bottom: 1px solid #f3f4f6;">' . $itemsSummary . '</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0 0; font-size: 15px; font-weight: 700; color: #111827; border-top: 1.5px solid #e5e7eb;">Total commande</td>
                      <td style="padding: 12px 0 0; font-size: 16px; font-weight: 800; color: #111827; text-align: right; border-top: 1.5px solid #e5e7eb;">' . $totalAmount . ' DA</td>
                    </tr>
                  </table>

                  <p style="margin: 18px 0 0 0; font-size: 13px; color: #6b7280;">Vous pouvez consulter et gérer cette commande depuis votre panneau d\'administration.</p>
                ';

                $adminHtml = self::buildSimpleTemplate($adminTitle, $adminContent, $settings);
                self::send($adminEmail, $adminTitle, $adminHtml, $settings);
            }
        } catch (Exception $e) {
            // Journalisation discrète pour ne jamais faire échouer la création de commande
            error_log("Erreur AppMailer onOrderCreated: " . $e->getMessage());
        }
    }

    /**
     * Déclenché lors de la création d'un compte client
     * Envoie l'email de bienvenue au client et alerte l'administrateur
     */
    public static function onCustomerRegistered(PDO $pdo, array $customer): void {
        try {
            $settings = self::getSettings($pdo);
            $storeName = htmlspecialchars($settings['store_name'] ?? 'Boutique', ENT_QUOTES, 'UTF-8');
            $customerName = htmlspecialchars($customer['name'] ?? 'Client', ENT_QUOTES, 'UTF-8');
            $customerEmail = trim($customer['email'] ?? '');
            $customerPhone = htmlspecialchars($customer['phone'] ?? '', ENT_QUOTES, 'UTF-8');

            // 1. EMAIL AU CLIENT (Bienvenue & Confirmation de compte)
            if (!empty($customerEmail) && filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
                $clientTitle = "Bienvenue sur " . $storeName;
                $clientContent = '
                  <p style="margin: 0 0 16px 0;">Bonjour <strong>' . $customerName . '</strong>,</p>
                  <p style="margin: 0 0 20px 0;">Votre compte client a été créé avec succès sur notre boutique.</p>
                  
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0; border-collapse: collapse; font-size: 14px;">
                    <tr>
                      <td style="padding: 9px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Nom complet</td>
                      <td style="padding: 9px 0; font-weight: 600; color: #111827; text-align: right; border-bottom: 1px solid #f3f4f6;">' . $customerName . '</td>
                    </tr>
                    <tr>
                      <td style="padding: 9px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Adresse email</td>
                      <td style="padding: 9px 0; font-weight: 600; color: #111827; text-align: right; border-bottom: 1px solid #f3f4f6;">' . htmlspecialchars($customerEmail, ENT_QUOTES, 'UTF-8') . '</td>
                    </tr>
                    ' . (!empty($customerPhone) ? '
                    <tr>
                      <td style="padding: 9px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Téléphone</td>
                      <td style="padding: 9px 0; font-weight: 600; color: #111827; text-align: right; border-bottom: 1px solid #f3f4f6;">' . $customerPhone . '</td>
                    </tr>' : '') . '
                  </table>

                  <p style="margin: 18px 0 0 0; font-size: 13.5px; color: #4b5563;">Vous pouvez désormais vous connecter à tout moment pour suivre vos commandes et gérer vos achats.</p>
                ';

                $clientHtml = self::buildSimpleTemplate($clientTitle, $clientContent, $settings);
                self::send($customerEmail, $clientTitle, $clientHtml, $settings);
            }

            // 2. EMAIL À L'ADMINISTRATEUR (Nouveau client inscrit)
            $adminEmail = trim($settings['admin_email'] ?? '');
            if (($settings['smtp_notify_admin'] ?? '1') === '1' && !empty($adminEmail) && filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) {
                $adminTitle = "Nouveau client inscrit : " . $customerName;
                $adminContent = '
                  <p style="margin: 0 0 16px 0;">Un nouveau client vient de créer un compte sur votre boutique.</p>
                  
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0; border-collapse: collapse; font-size: 14px;">
                    <tr>
                      <td style="padding: 9px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Nom</td>
                      <td style="padding: 9px 0; font-weight: 700; color: #111827; text-align: right; border-bottom: 1px solid #f3f4f6;">' . $customerName . '</td>
                    </tr>
                    <tr>
                      <td style="padding: 9px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Email</td>
                      <td style="padding: 9px 0; font-weight: 600; color: #111827; text-align: right; border-bottom: 1px solid #f3f4f6;">' . (!empty($customerEmail) ? htmlspecialchars($customerEmail, ENT_QUOTES, 'UTF-8') : 'Non renseigné') . '</td>
                    </tr>
                    <tr>
                      <td style="padding: 9px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Téléphone</td>
                      <td style="padding: 9px 0; font-weight: 600; color: #111827; text-align: right; border-bottom: 1px solid #f3f4f6;">' . $customerPhone . '</td>
                    </tr>
                    <tr>
                      <td style="padding: 9px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Date d\'inscription</td>
                      <td style="padding: 9px 0; font-weight: 600; color: #111827; text-align: right; border-bottom: 1px solid #f3f4f6;">' . date('d/m/Y H:i') . '</td>
                    </tr>
                  </table>
                ';

                $adminHtml = self::buildSimpleTemplate($adminTitle, $adminContent, $settings);
                self::send($adminEmail, $adminTitle, $adminHtml, $settings);
            }
        } catch (Exception $e) {
            error_log("Erreur AppMailer onCustomerRegistered: " . $e->getMessage());
        }
    }
}
