import { ensureDb, getD1 } from "../../../../db/runtime";
import { publicJson } from "../../../api-helpers";

export async function GET() {
  await ensureDb();
  const db = getD1();
  const [attributes, options, categoryAttributes] = await Promise.all([
    db.prepare("SELECT * FROM attribute_definitions ORDER BY label").all(),
    db.prepare("SELECT * FROM attribute_options ORDER BY sort_order, label").all(),
    db.prepare("SELECT * FROM category_attributes ORDER BY category, sort_order").all(),
  ]);
  return publicJson({ data: { attributes: attributes.results, options: options.results, categoryAttributes: categoryAttributes.results } });
}

export async function OPTIONS() { return publicJson(null, { status: 204 }); }
