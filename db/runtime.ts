import { env } from "cloudflare:workers";

let initialization: Promise<void> | null = null;

const attributes = [
  ["attr_engine_size", "engine_size", "Engine Size", "text", 0, "L"],
  ["attr_horsepower", "horsepower", "Horsepower", "number", 0, "hp"],
  ["attr_drivetrain", "drivetrain", "Drivetrain", "select", 0, null],
  ["attr_doors", "doors", "Doors", "number", 0, null],
  ["attr_seats", "seats", "Seats", "number", 0, null],
  ["attr_registration_year", "registration_year", "Registration Year", "number", 0, null],
  ["attr_engine_code", "engine_code", "Engine Code", "text", 0, null],
  ["attr_vin", "vin", "VIN", "text", 0, null],
  ["attr_battery_capacity", "battery_capacity", "Battery Capacity", "number", 0, "kWh"],
  ["attr_range_km", "range_km", "Range", "number", 0, "km"],
  ["attr_warranty", "warranty", "Warranty", "text", 0, null],
] as const;

const options = [
  ["opt_fwd", "attr_drivetrain", "FWD", "FWD"],
  ["opt_rwd", "attr_drivetrain", "RWD", "RWD"],
  ["opt_awd", "attr_drivetrain", "AWD", "AWD"],
  ["opt_4wd", "attr_drivetrain", "4WD", "4WD"],
] as const;

const bodyTypes = ["sedan","hatchback","suv","pickup","coupe","convertible","van","wagon","mpv","other"];
const categoryMap: Record<string, Array<[string, boolean]>> = Object.fromEntries(
  bodyTypes.map((bodyType) => [bodyType, [
    ["attr_engine_size", false], ["attr_horsepower", false], ["attr_drivetrain", false],
    ["attr_doors", false], ["attr_seats", false], ["attr_registration_year", false],
    ["attr_engine_code", false], ["attr_vin", false], ["attr_battery_capacity", false],
    ["attr_range_km", false], ["attr_warranty", false],
  ]])
);

export function getD1() {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

export async function ensureDb() {
  if (!initialization) initialization = initialize();
  await initialization;
}

async function initialize() {
  const db = getD1();
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS vehicles (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, make TEXT NOT NULL, model TEXT NOT NULL, variant TEXT NOT NULL DEFAULT '', year INTEGER NOT NULL, price INTEGER NOT NULL DEFAULT 0, mileage INTEGER NOT NULL DEFAULT 0, condition TEXT NOT NULL DEFAULT 'used', body_type TEXT NOT NULL, transmission TEXT NOT NULL DEFAULT 'automatic', fuel_type TEXT NOT NULL DEFAULT 'petrol', exterior_color TEXT NOT NULL DEFAULT '', interior_color TEXT NOT NULL DEFAULT '', short_description TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', dealer_name TEXT NOT NULL DEFAULT '', contact_url TEXT NOT NULL DEFAULT '', images TEXT NOT NULL DEFAULT '[]', attributes TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS attribute_definitions (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, label TEXT NOT NULL, value_type TEXT NOT NULL, allow_multiple INTEGER NOT NULL DEFAULT 0, unit TEXT, use_for_display INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS attribute_options (id TEXT PRIMARY KEY, attribute_id TEXT NOT NULL, value TEXT NOT NULL, label TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, UNIQUE(attribute_id, value), FOREIGN KEY(attribute_id) REFERENCES attribute_definitions(id) ON DELETE CASCADE)"),
    db.prepare("CREATE TABLE IF NOT EXISTS category_attributes (category TEXT NOT NULL, attribute_id TEXT NOT NULL, required INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(category, attribute_id), FOREIGN KEY(attribute_id) REFERENCES attribute_definitions(id) ON DELETE CASCADE)"),
    db.prepare("CREATE TABLE IF NOT EXISTS image_objects (key TEXT PRIMARY KEY, filename TEXT NOT NULL, content_type TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, password_iterations INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, approved_at TEXT, approved_by TEXT, last_login_at TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)"),
    db.prepare("CREATE TABLE IF NOT EXISTS login_attempts (username TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0, window_started_at TEXT NOT NULL, locked_until TEXT)"),
    db.prepare("CREATE INDEX IF NOT EXISTS vehicles_body_status_idx ON vehicles(body_type, status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS vehicles_make_model_idx ON vehicles(make, model)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at)"),
  ]);

  const now = new Date().toISOString();
  await db.batch(attributes.map(([id, code, label, valueType, multiple, unit]) =>
    db.prepare("INSERT OR IGNORE INTO attribute_definitions (id, code, label, value_type, allow_multiple, unit, use_for_display, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)").bind(id, code, label, valueType, multiple, unit, now)
  ));
  await db.batch(options.map(([id, attributeId, value, label], index) =>
    db.prepare("INSERT OR IGNORE INTO attribute_options (id, attribute_id, value, label, sort_order) VALUES (?, ?, ?, ?, ?)").bind(id, attributeId, value, label, index)
  ));
  const categoryStatements: D1PreparedStatement[] = [];
  for (const [category, fields] of Object.entries(categoryMap)) {
    for (const [index, [attributeId, required]] of fields.entries()) {
      categoryStatements.push(db.prepare("INSERT OR IGNORE INTO category_attributes (category, attribute_id, required, sort_order) VALUES (?, ?, ?, ?)").bind(category, attributeId, required ? 1 : 0, index));
    }
  }
  await db.batch(categoryStatements);
  await seedVehicles(db, now);
}

async function seedVehicles(db: D1Database, now: string) {
  const vehicles = [
    ["veh_gr86", "2025-toyota-gr86", "2025 Toyota GR86", "Toyota", "GR86", "", 2025, 2949000, 8500, "used", "coupe", "automatic", "petrol", "Crystal White", "Black", "Fictional Demo Motors", "https://example.com/contact/gr86", "available", { engine_size: "2.4", horsepower: 234, drivetrain: "RWD", doors: 2, seats: 4, warranty: "Demo warranty until 2028" }],
    ["veh_civic", "2024-honda-civic-rs", "2024 Honda Civic RS", "Honda", "Civic", "RS", 2024, 1249000, 12000, "used", "sedan", "automatic", "petrol", "Sonic Gray", "Black", "Fictional Demo Motors", "https://example.com/contact/civic", "available", { engine_size: "1.5", horsepower: 178, drivetrain: "FWD", doors: 4, seats: 5 }],
    ["veh_modely", "2025-tesla-model-y-long-range", "2025 Tesla Model Y Long Range", "Tesla", "Model Y", "Long Range", 2025, 3290000, 2400, "used", "suv", "automatic", "electric", "Pearl White", "Black", "North Star Demo Dealer", "https://example.com/contact/model-y", "reserved", { horsepower: 384, drivetrain: "AWD", doors: 5, seats: 5, battery_capacity: 75, range_km: 533 }],
    ["veh_ranger", "2023-ford-ranger-wildtrak", "2023 Ford Ranger Wildtrak", "Ford", "Ranger", "Wildtrak", 2023, 1090000, 32000, "used", "pickup", "automatic", "diesel", "Cyber Orange", "Black", "North Star Demo Dealer", "https://example.com/contact/ranger", "available", { engine_size: "2.0", horsepower: 210, drivetrain: "4WD", doors: 4, seats: 5 }],
    ["veh_mazda3", "2022-mazda-3-fastback", "2022 Mazda 3 Fastback", "Mazda", "3", "Fastback", 2022, 829000, 41000, "used", "hatchback", "automatic", "petrol", "Soul Red", "Black", "Cityline Demo Auto", "https://example.com/contact/mazda3", "sold", { engine_size: "2.0", horsepower: 165, drivetrain: "FWD", doors: 5, seats: 5 }],
    ["veh_crv", "2024-honda-cr-v-e-hev", "2024 Honda CR-V e:HEV", "Honda", "CR-V", "e:HEV", 2024, 1729000, 9000, "used", "suv", "automatic", "hybrid", "Meteoroid Gray", "Brown", "Cityline Demo Auto", "https://example.com/contact/crv", "available", { engine_size: "2.0", horsepower: 207, drivetrain: "FWD", doors: 5, seats: 5 }],
    ["veh_mx5", "2021-mazda-mx-5-rf", "2021 Mazda MX-5 RF", "Mazda", "MX-5", "RF", 2021, 2190000, 18000, "used", "convertible", "manual", "petrol", "Machine Gray", "Tan", "Fictional Demo Motors", "https://example.com/contact/mx5", "hidden", { engine_size: "2.0", horsepower: 181, drivetrain: "RWD", doors: 2, seats: 2 }],
    ["veh_alphard", "2024-toyota-alphard-hybrid", "2024 Toyota Alphard Hybrid", "Toyota", "Alphard", "Hybrid", 2024, 4390000, 6000, "used", "mpv", "automatic", "hybrid", "Black", "Beige", "Executive Demo Cars", "https://example.com/contact/alphard", "available", { engine_size: "2.5", horsepower: 250, drivetrain: "AWD", doors: 5, seats: 7 }],
    ["veh_vclass", "2023-mercedes-benz-v-220-d", "2023 Mercedes-Benz V 220 d", "Mercedes-Benz", "V-Class", "V 220 d", 2023, 3990000, 22000, "used", "van", "automatic", "diesel", "Obsidian Black", "Black", "Executive Demo Cars", "https://example.com/contact/vclass", "draft", { engine_size: "2.0", horsepower: 161, drivetrain: "RWD", doors: 5, seats: 7 }],
    ["veh_outback", "2022-subaru-outback-touring", "2022 Subaru Outback Touring", "Subaru", "Outback", "Touring", 2022, 1790000, 30000, "used", "wagon", "automatic", "petrol", "Autumn Green", "Black", "North Star Demo Dealer", "https://example.com/contact/outback", "available", { engine_size: "2.5", horsepower: 182, drivetrain: "AWD", doors: 5, seats: 5 }],
  ] as const;
  await db.batch(vehicles.map((vehicle) => {
    const [id, slug, title, make, model, variant, year, price, mileage, condition, bodyType, transmission, fuelType, exteriorColor, interiorColor, dealerName, contactUrl, status, attrs] = vehicle;
    return db.prepare("INSERT OR IGNORE INTO vehicles (id, slug, title, make, model, variant, year, price, mileage, condition, body_type, transmission, fuel_type, exterior_color, interior_color, short_description, description, dealer_name, contact_url, images, attributes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, slug, title, make, model, variant, year, price, mileage, condition, bodyType, transmission, fuelType, exteriorColor, interiorColor, `${year} ${make} ${model} demo listing.`, "Fictional demo vehicle data for local development and template previews.", dealerName, contactUrl, JSON.stringify([]), JSON.stringify(attrs), status, now, now);
  }));
}
