import { ensureDb, getD1 } from "../../../../../db/runtime";
import { auditRequest, normalizeAffiliateUrl, parseVehicle, requireAdminRequest, slugify, validateVehicle, type VehicleInput } from "../../../../api-helpers";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const input = await request.json() as VehicleInput;
  const errors = validateVehicle(input);
  if (errors.length) return Response.json({ errors }, { status: 400 });
  const { id } = await params;
  await ensureDb();
  const now = new Date().toISOString();
  const db = getD1();
  await db.prepare("UPDATE vehicles SET slug = ?, title = ?, make = ?, model = ?, variant = ?, year = ?, price = ?, mileage = ?, condition = ?, body_type = ?, transmission = ?, fuel_type = ?, exterior_color = ?, interior_color = ?, short_description = ?, description = ?, dealer_name = ?, contact_url = ?, images = ?, attributes = ?, status = ?, updated_at = ? WHERE id = ?")
    .bind(slugify(input.slug || `${input.year}-${input.make}-${input.model}-${input.variant || ""}` || id), input.title?.trim(), input.make?.trim(), input.model?.trim(), input.variant?.trim() ?? "", Number(input.year), Number(input.price), Number(input.mileage), input.condition?.trim() || "used", input.bodyType, input.transmission?.trim() || "automatic", input.fuelType?.trim() || "petrol", input.exteriorColor?.trim() ?? "", input.interiorColor?.trim() ?? "", input.shortDescription?.trim() ?? "", input.description?.trim() ?? "", input.dealerName?.trim() ?? "", normalizeAffiliateUrl(input.contactUrl), JSON.stringify(input.images ?? []), JSON.stringify(input.attributes ?? {}), input.status, now, id).run();
  const row = await db.prepare("SELECT * FROM vehicles WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!row) return Response.json({ error: "Vehicle not found" }, { status: 404 });
  await auditRequest(request,"update","vehicle",id,input.title?.trim()||id);
  return Response.json({ data: parseVehicle(row) });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await ensureDb();
  const result = await getD1().prepare("DELETE FROM vehicles WHERE id = ?").bind(id).run();
  if(result.meta.changes>0)await auditRequest(request,"delete","vehicle",id);
  return Response.json({ deleted: result.meta.changes > 0 });
}
