ALTER TABLE `signing_jobs` ADD `expiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `signing_jobs` ADD `isDeleted` int DEFAULT 0 NOT NULL;