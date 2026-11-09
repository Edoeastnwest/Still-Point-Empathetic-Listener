CREATE TABLE `stillpoint_demo_payments` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`reservationId` varchar(36),
	`kind` enum('enrollment','booking') NOT NULL,
	`idempotencyKey` varchar(80) NOT NULL,
	`amountCents` int NOT NULL,
	`status` enum('demo_confirmed') NOT NULL DEFAULT 'demo_confirmed',
	`termsVersion` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stillpoint_demo_payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `stillpoint_payment_user_key_uq` UNIQUE(`userId`,`idempotencyKey`),
	CONSTRAINT `stillpoint_payment_reservation_uq` UNIQUE(`reservationId`)
);
--> statement-breakpoint
ALTER TABLE `stillpoint_notifications` ADD `actorUserId` int;--> statement-breakpoint
ALTER TABLE `stillpoint_reservations` ADD `timeZone` varchar(64) DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE `stillpoint_demo_payments` ADD CONSTRAINT `stillpoint_demo_payments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stillpoint_demo_payments` ADD CONSTRAINT `stillpoint_payment_res_fk` FOREIGN KEY (`reservationId`) REFERENCES `stillpoint_reservations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stillpoint_notifications` ADD CONSTRAINT `stillpoint_notice_res_fk` FOREIGN KEY (`reservationId`) REFERENCES `stillpoint_reservations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stillpoint_notifications` ADD CONSTRAINT `stillpoint_notice_actor_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
