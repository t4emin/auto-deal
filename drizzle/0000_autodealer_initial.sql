CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`variant` text DEFAULT '' NOT NULL,
	`year` integer NOT NULL,
	`price` integer DEFAULT 0 NOT NULL,
	`mileage` integer DEFAULT 0 NOT NULL,
	`condition` text DEFAULT 'used' NOT NULL,
	`body_type` text NOT NULL,
	`transmission` text DEFAULT 'automatic' NOT NULL,
	`fuel_type` text DEFAULT 'petrol' NOT NULL,
	`exterior_color` text DEFAULT '' NOT NULL,
	`interior_color` text DEFAULT '' NOT NULL,
	`short_description` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`dealer_name` text DEFAULT '' NOT NULL,
	`contact_url` text DEFAULT '' NOT NULL,
	`images` text DEFAULT '[]' NOT NULL,
	`attributes` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
CREATE UNIQUE INDEX `vehicles_slug_idx` ON `vehicles` (`slug`);
CREATE INDEX `vehicles_body_status_idx` ON `vehicles` (`body_type`,`status`);
CREATE INDEX `vehicles_make_model_idx` ON `vehicles` (`make`,`model`);

CREATE TABLE `attribute_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`label` text NOT NULL,
	`value_type` text NOT NULL,
	`allow_multiple` integer DEFAULT false NOT NULL,
	`unit` text,
	`use_for_display` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
CREATE UNIQUE INDEX `attribute_definitions_code_idx` ON `attribute_definitions` (`code`);

CREATE TABLE `attribute_options` (
	`id` text PRIMARY KEY NOT NULL,
	`attribute_id` text NOT NULL,
	`value` text NOT NULL,
	`label` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`attribute_id`) REFERENCES `attribute_definitions`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `attribute_options_value_idx` ON `attribute_options` (`attribute_id`,`value`);

CREATE TABLE `category_attributes` (
	`category` text NOT NULL,
	`attribute_id` text NOT NULL,
	`required` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`category`, `attribute_id`),
	FOREIGN KEY (`attribute_id`) REFERENCES `attribute_definitions`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `image_objects` (
	`key` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL
);

CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
CREATE INDEX `audit_logs_created_idx` ON `audit_logs` (`created_at`);

CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_iterations` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`approved_at` text,
	`approved_by` text,
	`last_login_at` text
);
CREATE UNIQUE INDEX `users_username_idx` ON `users` (`username`);

CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);
CREATE INDEX `sessions_expiry_idx` ON `sessions` (`expires_at`);

CREATE TABLE `login_attempts` (
	`username` text PRIMARY KEY NOT NULL,
	`failures` integer DEFAULT 0 NOT NULL,
	`window_started_at` text NOT NULL,
	`locked_until` text
);
