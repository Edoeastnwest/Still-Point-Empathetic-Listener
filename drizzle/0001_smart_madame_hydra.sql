CREATE TABLE `stillpoint_enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('active') NOT NULL DEFAULT 'active',
	`feeCents` int NOT NULL DEFAULT 999,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stillpoint_enrollments_id` PRIMARY KEY(`id`),
	CONSTRAINT `stillpoint_enrollment_user_uq` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `stillpoint_locks` (
	`id` varchar(32) NOT NULL,
	CONSTRAINT `stillpoint_locks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stillpoint_notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`inAppEnabled` boolean NOT NULL DEFAULT true,
	`emailEnabled` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stillpoint_notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `stillpoint_notification_preferences_user_uq` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `stillpoint_notifications` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`reservationId` varchar(36),
	`category` enum('enrollment','booking','update','reminder') NOT NULL DEFAULT 'update',
	`title` varchar(160) NOT NULL,
	`message` text NOT NULL,
	`tone` enum('success','info','warning') NOT NULL DEFAULT 'info',
	`readAt` timestamp,
	`dismissedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stillpoint_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stillpoint_reservations` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`units` int NOT NULL,
	`status` enum('requested','confirmed','completed','cancelled') NOT NULL DEFAULT 'requested',
	`paymentStatus` enum('demo_paid') NOT NULL DEFAULT 'demo_paid',
	`amountCents` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stillpoint_reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `stillpoint_enrollments` ADD CONSTRAINT `stillpoint_enrollments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stillpoint_notification_preferences` ADD CONSTRAINT `stillpoint_notification_preferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stillpoint_notifications` ADD CONSTRAINT `stillpoint_notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stillpoint_reservations` ADD CONSTRAINT `stillpoint_reservations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `stillpoint_notification_user_created_idx` ON `stillpoint_notifications` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `stillpoint_reservation_start_idx` ON `stillpoint_reservations` (`startsAt`);--> statement-breakpoint
CREATE INDEX `stillpoint_reservation_user_created_idx` ON `stillpoint_reservations` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `stillpoint_reservation_status_idx` ON `stillpoint_reservations` (`status`);
--> statement-breakpoint
INSERT INTO `stillpoint_locks` (`id`) VALUES ('booking-availability') ON DUPLICATE KEY UPDATE `id` = VALUES(`id`);
