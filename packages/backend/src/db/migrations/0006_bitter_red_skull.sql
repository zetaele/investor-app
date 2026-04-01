PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`google_id` text,
	`name` text,
	`avatar_url` text,
	`password_hash` text,
	`plan` text DEFAULT 'TRIAL' NOT NULL,
	`trial_expires_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "google_id", "name", "avatar_url", "password_hash", "plan", "created_at") SELECT "id", "email", "google_id", "name", "avatar_url", "password_hash", "plan", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_id_unique` ON `users` (`google_id`);