import { ensureDb, getD1 } from "../../../../../db/runtime";
import { parseVehicle, publicJson } from "../../../../api-helpers";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  await ensureDb();
  const { slug } = await params;
  const row = await getD1().prepare("SELECT * FROM vehicles WHERE slug = ? AND status IN ('available','reserved','sold') LIMIT 1").bind(slug).first<Record<string, unknown>>();
  if (!row) return publicJson({ error: "Vehicle not found" }, { status: 404 });
  const vehicle = parseVehicle(row);
  return publicJson({ data: { ...vehicle, images: vehicle.images.map((src: string) => new URL(src, request.url).href) } });
}

export async function OPTIONS() { return publicJson(null, { status: 204 }); }
