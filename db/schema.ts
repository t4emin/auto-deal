import { integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const vehicles = sqliteTable("vehicles", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  variant: text("variant").notNull().default(""),
  year: integer("year").notNull(),
  price: integer("price").notNull().default(0),
  mileage: integer("mileage").notNull().default(0),
  condition: text("condition").notNull().default("used"),
  bodyType: text("body_type").notNull(),
  transmission: text("transmission").notNull().default("automatic"),
  fuelType: text("fuel_type").notNull().default("petrol"),
  exteriorColor: text("exterior_color").notNull().default(""),
  interiorColor: text("interior_color").notNull().default(""),
  shortDescription: text("short_description").notNull().default(""),
  description: text("description").notNull().default(""),
  dealerName: text("dealer_name").notNull().default(""),
  contactUrl: text("contact_url").notNull().default(""),
  images: text("images", { mode: "json" }).$type<string[]>().notNull().default([]),
  attributes: text("attributes", { mode: "json" }).$type<Record<string, string | number | boolean | string[]>>().notNull().default({}),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("vehicles_slug_idx").on(table.slug)]);

export const attributeDefinitions = sqliteTable("attribute_definitions", {
  id: text("id").primaryKey(), code: text("code").notNull(), label: text("label").notNull(), valueType: text("value_type").notNull(),
  allowMultiple: integer("allow_multiple", { mode: "boolean" }).notNull().default(false), unit: text("unit"),
  useForDisplay: integer("use_for_display", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("attribute_definitions_code_idx").on(table.code)]);

export const attributeOptions = sqliteTable("attribute_options", {
  id: text("id").primaryKey(), attributeId: text("attribute_id").notNull().references(() => attributeDefinitions.id, { onDelete: "cascade" }),
  value: text("value").notNull(), label: text("label").notNull(), sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [uniqueIndex("attribute_options_value_idx").on(table.attributeId, table.value)]);

export const categoryAttributes = sqliteTable("category_attributes", {
  category: text("category").notNull(), attributeId: text("attribute_id").notNull().references(() => attributeDefinitions.id, { onDelete: "cascade" }),
  required: integer("required", { mode: "boolean" }).notNull().default(false), sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [primaryKey({ columns: [table.category, table.attributeId] })]);

export const imageObjects = sqliteTable("image_objects", {
  key: text("key").primaryKey(), filename: text("filename").notNull(), contentType: text("content_type").notNull(), size: integer("size").notNull(), createdAt: text("created_at").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  passwordIterations: integer("password_iterations").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  approvedAt: text("approved_at"),
  approvedBy: text("approved_by"),
  lastLoginAt: text("last_login_at"),
}, (table) => [uniqueIndex("users_username_idx").on(table.username)]);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const loginAttempts = sqliteTable("login_attempts", {
  username: text("username").primaryKey(),
  failures: integer("failures").notNull().default(0),
  windowStartedAt: text("window_started_at").notNull(),
  lockedUntil: text("locked_until"),
});
