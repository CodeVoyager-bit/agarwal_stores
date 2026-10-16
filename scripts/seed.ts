// Sample crackers so the catalog isn't empty on day one. Only runs on an empty catalog.
// Photos are borrowed from Sivakasi cracker shops' sites until the shop takes its own.
import mongoose from "mongoose";
import { connectDB, Product } from "../src/lib/db";

const items: [name: string, category: string, unit: string, mrp: number, price: number, image: string][] = [
  ["Electric Sparklers 10 cm", "Sparklers", "10 pcs", 60, 24, "https://sakthicrackers.com/wp-content/uploads/2023/09/10-cm-Electric-Sparklers.png"],
  ["Colour Sparklers 15 cm", "Sparklers", "10 pcs", 100, 40, "https://sakthicrackers.com/wp-content/uploads/2023/09/15-cm-Colour-Sparklers.png"],
  ["Crackling Sparklers 30 cm", "Sparklers", "5 pcs", 250, 100, "https://malarcrackers.odoo.com/web/image/product.product/36/image_1024"],
  ["Ground Chakri Big", "Chakri", "10 pcs", 200, 80, "https://sakthicrackers.com/wp-content/uploads/2023/09/ground-big.jpg"],
  ["Ground Chakri Special", "Chakri", "10 pcs", 300, 120, "https://sakthicrackers.com/wp-content/uploads/2026/07/ground-chakara-special.jpg"],
  ["Spinner Wheel Deluxe", "Chakri", "5 pcs", 350, 140, "https://sakthicrackers.com/wp-content/uploads/2026/07/spinni.jpg"],
  ["Anar Small (Flower Pot)", "Anar", "10 pcs", 250, 100, "https://sakthicrackers.com/wp-content/uploads/2026/07/flower-pot-asoka.jpg"],
  ["Anar Big", "Anar", "10 pcs", 450, 180, "https://sakthicrackers.com/wp-content/uploads/2026/07/flower-bigg.jpg"],
  ["Colour Koti Anar", "Anar", "5 pcs", 600, 240, "https://sakthicrackers.com/wp-content/uploads/2026/07/colour-kot.jpg"],
  ["Baby Rocket", "Rockets", "10 pcs", 150, 60, "https://sakthicrackers.com/wp-content/uploads/2023/09/Baby-Rocket.png"],
  ["Lunik Rocket", "Rockets", "10 pcs", 300, 120, "https://sakthicrackers.com/wp-content/uploads/2023/09/Lunik-Rockets.png"],
  ["Whistling Rocket", "Rockets", "10 pcs", 450, 180, "https://sakthicrackers.com/wp-content/uploads/2023/09/Whistling-Rocket.png"],
  ["Laxmi Bomb", "Bombs", "10 pcs", 120, 48, "https://malarcrackers.odoo.com/web/image/product.product/47/image_1024"],
  ["Hydro Bomb", "Bombs", "10 pcs", 250, 100, "https://sakthicrackers.com/wp-content/uploads/2026/07/hydro-bomb.png"],
  ["1000 Wala Ladi", "Bombs", "1 roll", 600, 240, "https://sakthicrackers.com/wp-content/uploads/2023/09/1000-star-cracker.png"],
  ["12 Shot Multicolour", "Sky Shots", "1 box", 500, 200, "https://sakthicrackers.com/wp-content/uploads/2023/09/12-shot-multi-colour.jpg"],
  ["30 Shot Rider", "Sky Shots", "1 box", 1200, 480, "https://sakthicrackers.com/wp-content/uploads/2023/09/30-shot-multi-color-1.jpg"],
  ["60 Shot Celebration", "Sky Shots", "1 box", 2500, 1000, "https://sakthicrackers.com/wp-content/uploads/2023/09/60-multicolor-shots.png"],
  ["Pencil Crackers", "Kids Special", "10 pcs", 120, 48, "https://sakthicrackers.com/wp-content/uploads/2026/07/pencil.jpg"],
  ["Snake Tablets", "Kids Special", "1 box", 60, 24, "https://sakthicrackers.com/wp-content/uploads/2023/09/serpent-big.png"],
  ["Magic Popper", "Kids Special", "10 pcs", 100, 40, "https://sakthicrackers.com/wp-content/uploads/2026/07/MAGIC-POPS.jpg"],
  ["Family Gift Box (21 items)", "Gift Boxes", "1 box", 2000, 800, "https://crackersshop.in/wp-content/uploads/2026/10/titan-gift-box.webp"],
  ["Kids Gift Box (15 items)", "Gift Boxes", "1 box", 1200, 480, "https://crackersshop.in/wp-content/uploads/2026/10/kids-zone-gift-box.jpeg"],
  ["Mega Diwali Box (40 items)", "Gift Boxes", "1 box", 5000, 2000, "https://malarcrackers.odoo.com/web/image/product.product/110/image_1024"],
];

await connectDB();
if (await Product.countDocuments()) {
  console.log("Catalog already has products; nothing added.");
} else {
  await Product.insertMany(items.map(([name, category, unit, mrp, price, image]) => ({ name, category, unit, mrp, price, image, stock: 50 })));
  console.log(`Added ${items.length} sample products.`);
}
await mongoose.disconnect();
