CREATE TABLE `signing_jobs` (
	`id` varchar(64) NOT NULL,
	`status` enum('pending','uploading','signing','done','error') NOT NULL DEFAULT 'pending',
	`originalIpaName` varchar(255),
	`signedIpaUrl` text,
	`manifestUrl` text,
	`appName` varchar(255),
	`bundleId` varchar(255),
	`appVersion` varchar(64),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `signing_jobs_id` PRIMARY KEY(`id`)
);
