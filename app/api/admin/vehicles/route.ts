import { ensureDb, getD1 } from "../../../../db/runtime";
import { auditRequest, getVehicleRows, normalizeAffiliateUrl, parseVehicle, requireAdminRequest, slugify, validateVehicle, type VehicleInput } from "../../../api-helpers";

export async function GET(request: Request) {
  if (!(await requireAdminRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ data: await getVehicleRows() });
}

export async function POST(request: Request) {
  if (!(await requireAdminRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const input = await request.json() as VehicleInput;
  const errors = validateVehicle(input);
  if (errors.length) return Response.json({ errors }, { status: 400 });
  await ensureDb();
  const db = getD1();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const slug = slugify(input.slug || `${input.year}-${input.make}-${input.model}-${input.variant || ""}` || id);
  try {
    await db.prepare("INSERT INTO vehicles (id, slug, title, make, model, variant, year, price, mileage, condition, body_type, transmission, fuel_type, exterior_color, interior_color, short_description, description, dealer_name, contact_url, images, attributes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, slug, input.title?.trim(), input.make?.trim(), input.model?.trim(), input.variant?.trim() ?? "", Number(input.year), Number(input.price), Number(input.mileage), input.condition?.trim() || "used", input.bodyType, input.transmission?.trim() || "automatic", input.fuelType?.trim() || "petrol", input.exteriorColor?.trim() ?? "", input.interiorColor?.trim() ?? "", input.shortDescription?.trim() ?? "", input.description?.trim() ?? "", input.dealerName?.trim() ?? "", normalizeAffiliateUrl(input.contactUrl), JSON.stringify(input.images ?? []), JSON.stringify(input.attributes ?? {}), input.status, now, now).run();
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create vehicle" }, { status: 409 });
  }
  await auditRequest(request,"create","vehicle",id,input.title?.trim()||slug);
  const row = await db.prepare("SELECT * FROM vehicles WHERE id = ?").bind(id).first<Record<string, unknown>>();
  return Response.json({ data: row ? parseVehicle(row) : null }, { status: 201 });
}
