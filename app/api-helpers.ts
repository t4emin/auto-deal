import { ensureDb, getD1 } from "../db/runtime";
import { getSessionUser,isOwner,isSameOrigin } from "./auth";
import { normalizeAffiliateUrl } from "./url-utils";
export { normalizeAffiliateUrl } from "./url-utils";

export const bodyTypes = ["sedan","hatchback","suv","pickup","coupe","convertible","van","wagon","mpv","other"] as const;
export const categories = bodyTypes;
export const vehicleStatuses = ["draft","available","reserved","sold","hidden"] as const;
export const publicVehicleStatuses = ["available","reserved","sold"] as const;

export type VehicleInput = {
  id?: string; slug?: string; title?: string; make?: string; model?: string; variant?: string;
  year?: number; price?: number; mileage?: number; condition?: string; bodyType?: string;
  transmission?: string; fuelType?: string; exteriorColor?: string; interiorColor?: string;
  shortDescription?: string; description?: string; dealerName?: string; contactUrl?: string;
  images?: string[]; attributes?: Record<string, unknown>; status?: string;
};

export type ProductInput = VehicleInput;

export function publicJson(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function parseVehicle(row: Record<string, unknown>) {
  return {
    id: row.id, slug: row.slug, title: row.title, make: row.make, model: row.model,
    variant: row.variant, year: row.year, price: row.price, mileage: row.mileage,
    condition: row.condition, bodyType: row.body_type, transmission: row.transmission,
    fuelType: row.fuel_type, exteriorColor: row.exterior_color, interiorColor: row.interior_color,
    shortDescription: row.short_description, description: row.description,
    dealerName: row.dealer_name, contactUrl: row.contact_url,
    images: safeJson(row.images, []), attributes: safeJson(row.attributes, {}),
    status: row.status, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export const parseProduct = parseVehicle;

export function safeJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return (value as T) ?? fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9ก-๙]+/g, "-").replace(/^-|-$/g, "");
}

export function validateVehicle(input: VehicleInput) {
  const errors: string[] = [];
  if (!input.title?.trim()) errors.push("title is required");
  if (!input.make?.trim()) errors.push("make is required");
  if (!input.model?.trim()) errors.push("model is required");
  if (!bodyTypes.includes(input.bodyType as typeof bodyTypes[number])) errors.push("invalid bodyType");
  if (!vehicleStatuses.includes(input.status as typeof vehicleStatuses[number])) errors.push("invalid status");
  if (!Number.isInteger(Number(input.year)) || Number(input.year) < 1886) errors.push("year must be valid");
  if (!Number.isFinite(Number(input.price)) || Number(input.price) < 0) errors.push("price must be a positive number");
  if (!Number.isFinite(Number(input.mileage)) || Number(input.mileage) < 0) errors.push("mileage must be a positive number");
  const contactUrl = normalizeAffiliateUrl(input.contactUrl);
  if (contactUrl) {
    try {
      if (new URL(contactUrl).protocol !== "https:") errors.push("contactUrl must use https");
    } catch {
      errors.push("contactUrl must be a valid URL");
    }
  }
  return errors;
}

export const validateProduct = validateVehicle;

export async function requireAdminRequest(request: Request) {
  if(request.method!=="GET"&&!isSameOrigin(request))return false;
  return Boolean(await getSessionUser(request));
}

export async function auditRequest(request:Request,action:string,targetType:string,targetId:string,summary=""){
  const user=await getSessionUser(request);
  await ensureDb();
  await getD1().prepare("INSERT INTO audit_logs (id, actor, action, target_type, target_id, summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(),user?.username||"system",action,targetType,targetId,summary,new Date().toISOString()).run();
}

export async function requireOwnerRequest(request:Request){
  if(request.method!=="GET"&&!isSameOrigin(request))return false;
  return isOwner(await getSessionUser(request));
}

export async function getVehicleRows(where = "", bindings: unknown[] = []) {
  await ensureDb();
  const query = `SELECT * FROM vehicles ${where} ORDER BY updated_at DESC`;
  const result = await getD1().prepare(query).bind(...bindings).all<Record<string, unknown>>();
  return result.results.map(parseVehicle);
}

export const getProductRows = getVehicleRows;
