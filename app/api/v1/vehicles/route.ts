import { ensureDb, getD1 } from "../../../../db/runtime";
import { parseVehicle, publicJson, publicVehicleStatuses } from "../../../api-helpers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(60, Math.max(1, Number(url.searchParams.get("limit") || 24)));
  const sort = url.searchParams.get("sort") ?? "updated";
  const filters = [`status IN (${publicVehicleStatuses.map(() => "?").join(",")})`];
  const bindings: unknown[] = [...publicVehicleStatuses];
  for (const [param, column] of [["make","make"],["model","model"],["bodyType","body_type"],["year","year"],["status","status"]] as const) {
    const value = url.searchParams.get(param)?.trim();
    if (!value) continue;
    if (param === "status" && !publicVehicleStatuses.includes(value as typeof publicVehicleStatuses[number])) continue;
    filters.push(`${column} = ?`);
    bindings.push(param === "year" ? Number(value) : value);
  }
  const minPriceParam = url.searchParams.get("minPrice")?.trim();
  const maxPriceParam = url.searchParams.get("maxPrice")?.trim();
  const minPrice = minPriceParam ? Number(minPriceParam) : Number.NaN;
  const maxPrice = maxPriceParam ? Number(maxPriceParam) : Number.NaN;
  if (Number.isFinite(minPrice) && minPrice >= 0) { filters.push("price >= ?"); bindings.push(minPrice); }
  if (Number.isFinite(maxPrice) && maxPrice >= 0) { filters.push("price <= ?"); bindings.push(maxPrice); }
  const order = sort === "price_asc" ? "price ASC" : sort === "price_desc" ? "price DESC" : "updated_at DESC";
  await ensureDb();
  const result = await getD1().prepare(`SELECT * FROM vehicles WHERE ${filters.join(" AND ")} ORDER BY ${order}`).bind(...bindings).all<Record<string, unknown>>();
  const search = (url.searchParams.get("search") ?? url.searchParams.get("q") ?? "").trim().toLowerCase();
  const allVehicles = result.results.map((row) => {
    const vehicle = parseVehicle(row);
    return { ...vehicle, images: vehicle.images.map((src: string) => new URL(src, request.url).href) };
  }).filter((vehicle) => !search || `${vehicle.title} ${vehicle.make} ${vehicle.model} ${vehicle.variant}`.toLowerCase().includes(search));
  const start = (page - 1) * limit;
  const vehicles = allVehicles.slice(start, start + limit);
  return publicJson({ data: vehicles, meta: { count: vehicles.length, total: allVehicles.length, page, limit, pages: Math.max(1, Math.ceil(allVehicles.length / limit)) } });
}

export async function OPTIONS() { return publicJson(null, { status: 204 }); }

export async function POST() { return publicJson({ error: "Use /api/admin/vehicles" }, { status: 405 }); }
