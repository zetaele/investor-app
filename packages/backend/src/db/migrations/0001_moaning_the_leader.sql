CREATE TABLE `instrument_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`instrument_id` integer NOT NULL,
	`coupon_rate` real,
	`coupon_frequency` integer,
	`first_coupon_date` text,
	`amortization_schedule` text,
	`capitalization_rate` real,
	`adjustment_coefficient` real,
	`adjustment_base` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`instrument_id`) REFERENCES `instruments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `instruments` ADD `flow_type` text DEFAULT 'BULLET' NOT NULL;