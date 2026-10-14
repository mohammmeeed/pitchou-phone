-- backend/database/tiktok_shop.sql
-- Base de données MySQL pour TikTok Shop & Mediqu Admin Panel

CREATE DATABASE IF NOT EXISTS `tiktok_shop` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `tiktok_shop`;

-- 1. Table Utilisateurs (Administrateurs & Gestionnaires)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `phone` VARCHAR(50) NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) DEFAULT 'admin',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table Produits (Livres & Articles)
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `author` VARCHAR(255) NULL DEFAULT '',
  `format` VARCHAR(100) NULL DEFAULT '',
  `price` DECIMAL(10,2) NOT NULL,
  `stock` INT DEFAULT 15,
  `category` VARCHAR(100) NULL DEFAULT '',
  `rating` DECIMAL(3,1) DEFAULT 4.8,
  `image` VARCHAR(255) NULL,
  `video` VARCHAR(255) NULL,
  `bio` TEXT NULL,
  `languages` VARCHAR(255) NULL DEFAULT '',
  `location` VARCHAR(150) NULL DEFAULT '',
  `is_featured` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table Clients
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(191) NULL,
  `phone` VARCHAR(50) NOT NULL UNIQUE,
  `address` VARCHAR(255) NULL,
  `total_orders` INT DEFAULT 0,
  `total_spent` DECIMAL(10,2) DEFAULT 0.00,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table Commandes
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_number` VARCHAR(50) NOT NULL UNIQUE,
  `customer_name` VARCHAR(150) NOT NULL,
  `customer_phone` VARCHAR(50) NOT NULL,
  `customer_email` VARCHAR(191) NULL,
  `customer_address` VARCHAR(255) NOT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `items_summary` TEXT NOT NULL,
  `status` ENUM('En attente', 'Confirmée', 'Expédiée', 'Livrée', 'Annulée') DEFAULT 'En attente',
  `payment_method` VARCHAR(100) DEFAULT 'Paiement à la livraison',
  `notes` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================================
-- DONNÉES INITIALES (SEED DATA)
-- =======================================================

-- Admin par défaut (admin@tiktokshop.dz / admin123)
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`) VALUES
(1, 'Super Admin', 'admin@tiktokshop.dz', '0550123456', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON DUPLICATE KEY UPDATE `email`=`email`;

-- Livres du catalogue
INSERT INTO `products` (`id`, `name`, `author`, `format`, `price`, `stock`, `category`, `rating`, `image`, `video`, `bio`) VALUES
(1, 'The Chronicles of Autumn', 'Sophia Sterling', 'Édition Reliée', 2500.00, 14, 'Roman & Littérature', 4.9, '/assets/images/recent-pic/pic1.png', '/assets/videos/book1.mp4', 'Un voyage poétique au cœur des mystères d’automne où chaque page dévoile des vérités oubliées.'),
(2, 'The Art of Whispers', 'Alex Rivera', 'Broché Premium', 1850.00, 22, 'Développement Personnel', 4.7, '/assets/images/recent-pic/pic2.png', '/assets/videos/book2.mp4', 'Apprenez à maîtriser l’art subtil de la communication humaine et le pouvoir du silence constructif.'),
(3, 'Les Chroniques Oubliées', 'Amine Belkacem', 'Édition Collector', 2300.00, 8, 'Histoire & Récits', 4.8, '/assets/images/recent-pic/pic3.png', '/assets/videos/book3.mp4', 'Une immersion fascinante dans les mémoires et légendes d’Afrique du Nord traversant les âges.'),
(4, 'The Whispering Oak', 'Elena Rostova', 'Couverture Rigide', 2100.00, 19, 'Fantasy & Mystère', 4.9, '/assets/images/recent-pic/pic4.png', '/assets/videos/book4.mp4', 'Une forêt ancienne aux secrets que seuls les initiés osent déchiffrer au clair de lune.'),
(5, 'Le Chant du Silence', 'Karim Ziani', 'Édition Poche', 1950.00, 15, 'Philosophie & Poésie', 4.6, '/assets/images/recent-pic/pic5.png', '/assets/videos/book5.mp4', 'Des méditations profondes sur le calme intérieur, la résilience et la beauté du monde.'),
(6, 'Echos du Destin', 'Nadia Bensaid', 'Édition Limitée', 2700.00, 5, 'Roman Graphique', 4.9, '/assets/images/recent-pic/pic6.png', '/assets/videos/book6.mp4', 'Quand les choix d’une vie résonnent à travers les générations futures.')
ON DUPLICATE KEY UPDATE `name`=`name`;

-- Clients
INSERT INTO `customers` (`id`, `name`, `email`, `phone`, `address`, `total_orders`, `total_spent`) VALUES
(1, 'Mohamed Guedaoui', 'mohamed@email.com', '0550123456', 'Alger Centre', 1, 2500.00),
(2, 'Sara Benali', 'sara@gmail.com', '0770984512', 'Oran, Maraval', 1, 1850.00),
(3, 'Yacine Kaci', 'yacine@yahoo.fr', '0661239845', 'Constantine', 1, 4600.00),
(4, 'Amina Mansouri', 'amina@email.com', '0554321987', 'Annaba', 1, 2100.00),
(5, 'Karim Belhadj', 'karim@outlook.com', '0771234567', 'Sétif', 1, 1950.00)
ON DUPLICATE KEY UPDATE `phone`=`phone`;

-- Commandes initiales
INSERT INTO `orders` (`id`, `order_number`, `customer_name`, `customer_phone`, `customer_email`, `customer_address`, `total_amount`, `items_summary`, `status`, `payment_method`) VALUES
(1, '#CMD-1082', 'Mohamed Guedaoui', '0550123456', 'mohamed@email.com', 'Alger Centre', 2500.00, '1x The Chronicles of Autumn', 'Livrée', 'Paiement à la livraison'),
(2, '#CMD-1083', 'Sara Benali', '0770984512', 'sara@gmail.com', 'Oran, Maraval', 1850.00, '1x The Art of Whispers', 'Confirmée', 'Paiement à la livraison'),
(3, '#CMD-1084', 'Yacine Kaci', '0661239845', 'yacine@yahoo.fr', 'Constantine', 4600.00, '2x Les Chroniques Oubliées', 'En attente', 'Paiement à la livraison'),
(4, '#CMD-1085', 'Amina Mansouri', '0554321987', 'amina@email.com', 'Annaba', 2100.00, '1x The Whispering Oak', 'Expédiée', 'Paiement à la livraison'),
(5, '#CMD-1086', 'Karim Belhadj', '0771234567', 'karim@outlook.com', 'Sétif', 1950.00, '1x Le Chant du Silence', 'En attente', 'Paiement à la livraison')
ON DUPLICATE KEY UPDATE `order_number`=`order_number`;

-- 5. Table Messages (Chat Client - Admin)
CREATE TABLE IF NOT EXISTS `messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NOT NULL,
  `sender` ENUM('customer', 'admin') NOT NULL DEFAULT 'admin',
  `message` TEXT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages initiaux
INSERT INTO `messages` (`customer_id`, `sender`, `message`, `created_at`) VALUES
(1, 'customer', 'Bonjour, j''ai bien reçu mon livre The Chronicles of Autumn, l''emballage est superbe !', '2026-10-13 09:15:00'),
(1, 'admin', 'Bonjour Mohamed ! Merci beaucoup pour votre confiance, nous sommes ravis que cela vous plaise.', '2026-10-13 09:20:00'),
(1, 'customer', 'Est-ce que vous aurez bientôt le tome 2 disponible en stock ?', '2026-10-13 09:22:00'),
(2, 'customer', 'Bonjour, pouvez-vous me confirmer le délai de livraison sur Oran ?', '2026-10-13 10:05:00'),
(2, 'admin', 'Bonjour Sara ! Les livraisons sur Oran prennent entre 24h et 48h via Yalidine Express.', '2026-10-13 10:12:00'),
(2, 'customer', 'Parfait, merci pour votre réactivité !', '2026-10-13 10:14:00'),
(3, 'customer', 'Salam, j''ai commandé 2 exemplaires de Les Chroniques Oubliées. Est-ce possible de changer le numéro de contact ?', '2026-10-13 11:00:00'),
(3, 'admin', 'Salam Yacine, bien sûr ! Vous pouvez nous communiquer votre nouveau numéro ici.', '2026-10-13 11:05:00'),
(4, 'customer', 'Bonjour, le livre The Whispering Oak est-il bien en langue française ?', '2026-10-13 11:30:00'),
(4, 'admin', 'Bonjour Amina ! Oui, cette édition est traduite en français avec couverture rigide.', '2026-10-13 11:35:00'),
(5, 'customer', 'Bonjour, ma commande #CMD-1086 est-elle déjà prise en charge ?', '2026-10-13 12:00:00'),
(5, 'admin', 'Bonjour Karim, votre commande est en cours de préparation pour expédition vers Sétif.', '2026-10-13 12:10:00');

