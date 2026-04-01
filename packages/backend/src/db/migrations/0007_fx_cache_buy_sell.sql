ALTER TABLE `fx_cache` RENAME COLUMN `rate` TO `sell`;--> statement-breakpoint
ALTER TABLE `fx_cache` ADD `buy` real NOT NULL DEFAULT 0;
