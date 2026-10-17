import { currentUser } from "@/lib/auth";
import { connectDB, Product } from "@/lib/db";
import { can } from "@/lib/roles";
import { xlsx, xlsxName } from "@/lib/xlsx";

/** Today's catalog as an Excel file in the import layout: edit it, upload it back. */
export async function GET() {
  const user = await currentUser();
  if (!user || !can(user.role, "catalog")) return new Response("Not allowed", { status: 403 });
  await connectDB();
  const products = await Product.find({}).sort({ category: 1, price: 1 }).lean();
  const file = xlsx([
    {
      name: "Price list",
      rows: [
        ["Name", "Category", "Pack", "MRP", "Price", "Stock", "On sale", "Photo", "Description"],
        // uploaded photos stay as they are; only https links travel in the sheet
        ...products.map((p) => [p.name, p.category, p.unit ?? "", p.mrp, p.price, p.stock, p.active ? "yes" : "no", p.image?.startsWith("https://") ? p.image : "", p.description ?? ""]),
      ],
    },
  ]);
  return new Response(file as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${xlsxName("Crackers price list")}"`,
    },
  });
}
