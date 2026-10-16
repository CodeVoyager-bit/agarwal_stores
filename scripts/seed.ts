// Sample crackers so the catalog isn't empty on day one. Only runs on an empty catalog.
// 7 real branded items per shelf (Ayyan, Standard, Vadivel, Sony, Cock Brand…), photos linked from
// the brands' and Sivakasi shops' sites until the shop takes its own.
import mongoose from "mongoose";
import { connectDB, Product } from "../src/lib/db";

const items: [name: string, category: string, unit: string, mrp: number, price: number, image: string][] = [
  ["Ayyan Electric Sparklers 10 cm", "Sparklers", "1 box", 90, 35, "https://ayyansworld.com/wp-content/uploads/2024/02/10cm-Electric-Saprklers-10-box.png"],
  ["Ayyan Coloured Sparklers 15 cm", "Sparklers", "1 box", 225, 90, "https://ayyansworld.com/wp-content/uploads/2024/02/15cm-Coloured-Sparklers-10-box.png"],
  ["Ayyan Electric Sparklers 50 cm", "Sparklers", "1 box", 475, 190, "https://ayyansworld.com/wp-content/uploads/2024/02/50cm-electric-sparklers.png"],
  ["Vadivel Glittering Sparklers 12 cm", "Sparklers", "1 box", 117, 47, "https://vadivelpyrotechs.com/images/product-images/gsparkles-01.jpg"],
  ["Standard Bobby Gold Sparklers 7 cm", "Sparklers", "10 pcs", 100, 20, "https://standardcrackers.in/assets/uploads/product-featured-26.jpg"],
  ["Sony 5 in 1 Sparklers 10 cm Gift Pack", "Sparklers", "1 pack", 495, 243, "https://www.sonnyvinayagashop.com/wp-content/uploads/2023/09/5_in_one-scaled.jpg"],
  ["Ramesh Rainbow Collections 10 cm Sparklers", "Sparklers", "5 boxes", 490, 245, "https://cdn.shopify.com/s/files/1/0029/8011/8646/products/TOP_5_A.jpg?v=1531822145"],
  ["Ayyan Ground Chakkar Special", "Chakri", "10 pcs", 400, 160, "https://ayyansworld.com/wp-content/uploads/2024/02/Ground-Chakkar-Special.png"],
  ["Ayyan Zodiac Spinners", "Chakri", "5 pcs", 440, 175, "https://ayyansworld.com/wp-content/uploads/2024/02/Zodiac-Spinners-5-Pcs.png"],
  ["Vadivel Ground Chakkar Deluxe", "Chakri", "1 box", 482, 193, "https://vadivelpyrotechs.com/images/product-images/ground-chakkar-01.jpg"],
  ["Vadivel Ground Chakkar Super Deluxe", "Chakri", "1 box", 702, 281, "https://vadivelpyrotechs.com/images/product-images/chakkar-sd-01.jpg"],
  ["Standard Zamin Chakkars Special", "Chakri", "10 pcs", 1000, 200, "https://standardcrackers.in/assets/uploads/product-featured-247.jpg"],
  ["Sony Ground Chakkar Big", "Chakri", "10 pcs", 104, 51, "https://www.sonnyvinayagashop.com/wp-content/uploads/2018/09/106.jpg"],
  ["Cock Brand 45 cm Ground Chakkar", "Chakri", "1 box", 253, 110, "https://siyafireworks.com/wp-content/uploads/2020/10/1603536193695.-scaled.jpg"],
  ["Ayyan Flower Pots Special", "Anar", "10 pcs", 575, 230, "https://ayyansworld.com/wp-content/uploads/2024/02/Flower-Pots-Special-600x600-1.png"],
  ["Ayyan Colour Koti Deluxe", "Anar", "10 pcs", 1890, 755, "https://ayyansworld.com/wp-content/uploads/2024/05/Untitled-1_0005_Untitled-1-12_0002_Layer-12.jpg"],
  ["Vadivel Flower Pots Big", "Anar", "1 box", 310, 124, "https://vadivelpyrotechs.com/images/product-images/flower-pots-big-01.jpg"],
  ["Vadivel Flower Pots Ashoka", "Anar", "1 box", 510, 204, "https://vadivelpyrotechs.com/images/product-images/flower-pots-01.jpg"],
  ["Standard Flowerpots Deluxe", "Anar", "5 pcs", 1600, 320, "https://standardcrackers.in/assets/uploads/product-featured-129.jpg"],
  ["Standard Flowerpots Small", "Anar", "10 pcs", 500, 100, "https://standardcrackers.in/assets/uploads/product-featured-5.jpg"],
  ["Sony Flowerpots Deluxe", "Anar", "1 box", 545, 267, "https://www.sonnyvinayagashop.com/wp-content/uploads/2018/09/115.jpg"],
  ["Ayyan Rocket Bomb", "Rockets", "1 box", 400, 160, "https://ayyansworld.com/wp-content/uploads/2024/02/Rocket-Bomb.png"],
  ["Ayyan Parachute Rocket", "Rockets", "1 box", 1050, 420, "https://ayyansworld.com/wp-content/uploads/2024/02/Parachute-Rocket.png"],
  ["Vadivel Lunik Express Rocket", "Rockets", "1 box", 457, 183, "https://vadivelpyrotechs.com/images/product-images/lunik-express-01.jpg"],
  ["Vadivel Shatabdi Colour Rocket", "Rockets", "1 box", 476, 190, "https://vadivelpyrotechs.com/images/product-images/shatabdi-rocket-01.jpg"],
  ["Vadivel Sky Whistling Rocket", "Rockets", "1 box", 833, 333, "https://vadivelpyrotechs.com/images/product-images/sky-whistling-01.jpg"],
  ["Standard Surveyor Rockets", "Rockets", "10 pcs", 525, 105, "https://standardcrackers.in/assets/uploads/product-featured-13.jpg"],
  ["Standard Rohini Rockets", "Rockets", "10 pcs", 1500, 300, "https://standardcrackers.in/assets/uploads/product-featured-191.jpg"],
  ["Ayyan Hydrogen Bomb Foils", "Bombs", "1 box", 275, 110, "https://ayyansworld.com/wp-content/uploads/2024/02/Hydrogen-bomb-Foils.png"],
  ["Ayyan Shogun Bomb", "Bombs", "1 box", 490, 195, "https://ayyansworld.com/wp-content/uploads/2024/02/Shogun-Bomb.png"],
  ["Vadivel King of Kingo Green Bomb", "Bombs", "1 box", 376, 150, "https://vadivelpyrotechs.com/images/product-images/king-kingo-green-01.jpg"],
  ["Vadivel Hydro Green Bomb", "Bombs", "1 box", 205, 82, "https://vadivelpyrotechs.com/images/product-images/hydro-bomb-01.jpg"],
  ["Standard Bullet Bombs", "Bombs", "10 pcs", 300, 60, "https://standardcrackers.in/assets/uploads/product-featured-10.jpg"],
  ["Standard Atom Bombs", "Bombs", "10 pcs", 675, 135, "https://standardcrackers.in/assets/uploads/product-featured-181.jpg"],
  ["Sony Bijili Red Crackers", "Bombs", "1 bag", 135, 66, "https://www.sonnyvinayagashop.com/wp-content/uploads/2018/09/117.jpg"],
  ["Ayyan Sky Storm 12 Shot Crackling", "Sky Shots", "1 box", 600, 240, "https://ayyansworld.com/wp-content/uploads/2024/02/Sky-Storm-12-shot-crackling.png"],
  ["Ayyan Wonder Night 60 Shot", "Sky Shots", "1 box", 4100, 1640, "https://ayyansworld.com/wp-content/uploads/2024/02/Wonder-night-60-shot-four-colour.png"],
  ["Vadivel Badiya 50 Shot", "Sky Shots", "1 box", 370, 148, "https://vadivelpyrotechs.com/images/product-images/badiy-01.jpg"],
  ["Standard 12 Shots Flipper", "Sky Shots", "1 box", 1150, 230, "https://standardcrackers.in/assets/uploads/product-featured-18.jpg"],
  ["Standard 30 Shots DTH", "Sky Shots", "1 box", 4750, 950, "https://standardcrackers.in/assets/uploads/product-featured-29.jpg"],
  ["Sony 12 Monkeys 12 Shot", "Sky Shots", "1 box", 385, 189, "https://www.sonnyvinayagashop.com/wp-content/uploads/2018/09/1028.jpg"],
  ["Cock Brand Penta Sky Flash", "Sky Shots", "1 box", 338, 145, "https://siyafireworks.com/wp-content/uploads/2020/10/1603535104336.-scaled.jpg"],
  ["Ayyan Pop Pop", "Kids Special", "1 box", 175, 70, "https://ayyansworld.com/wp-content/uploads/2024/02/Pop-Pop.png"],
  ["Ayyan Pencil", "Kids Special", "20 pcs", 400, 160, "https://ayyansworld.com/wp-content/uploads/2024/02/Pencil.png"],
  ["Vadivel Jil Jil Twinkler", "Kids Special", "1 box", 122, 49, "https://vadivelpyrotechs.com/images/product-images/jil-jil-01.jpg"],
  ["Standard Twinkling Star 45 cm", "Kids Special", "10 pcs", 300, 60, "https://standardcrackers.in/assets/uploads/product-featured-7.jpg"],
  ["Standard Magic Whip", "Kids Special", "1 box", 550, 110, "https://standardcrackers.in/assets/uploads/product-featured-171.jpg"],
  ["Sony Big Serpent Egg", "Kids Special", "1 box", 50, 25, "https://www.sonnyvinayagashop.com/wp-content/uploads/2018/09/050.jpg"],
  ["Robin VIP 10 in 1 Colour Matches", "Kids Special", "1 pack", 480, 240, "https://standardcrackers.in/assets/uploads/product-featured-101.jpg"],
  ["Ayyan Gift Box A 24 Items", "Gift Boxes", "1 box", 2000, 800, "https://ayyansworld.com/wp-content/uploads/2024/02/Gift-Box-A-24-items-by-customer.png"],
  ["Ayyan Gift Box B 28 Items", "Gift Boxes", "1 box", 2875, 1150, "https://ayyansworld.com/wp-content/uploads/2024/02/Gift-Box-B-28-items.png"],
  ["Ayyan Gift Box C 30 Items", "Gift Boxes", "1 box", 4125, 1650, "https://ayyansworld.com/wp-content/uploads/2024/02/40117583_1-ayyan-fireworks-crackers-assorted-box-c.jpg"],
  ["Ayyan Gift Box Dino 40 Items", "Gift Boxes", "1 box", 4750, 1900, "https://ayyansworld.com/wp-content/uploads/2024/02/Gift-Box-Dino-40-items.png"],
  ["Standard God's Gift 25 Gift Box", "Gift Boxes", "1 box", 3750, 750, "https://standardcrackers.in/assets/uploads/product-featured-76.jpeg"],
  ["Standard Great 31 Gift Box", "Gift Boxes", "1 box", 5000, 1000, "https://standardcrackers.in/assets/uploads/product-featured-83.jpeg"],
  ["Standard Khushi 42 Gift Box", "Gift Boxes", "1 box", 8250, 1650, "https://standardcrackers.in/assets/uploads/product-featured-89.jpeg"],
];

await connectDB();
if (await Product.countDocuments()) {
  console.log("Catalog already has products; nothing added.");
} else {
  await Product.insertMany(items.map(([name, category, unit, mrp, price, image]) => ({ name, category, unit, mrp, price, image, stock: 50 })));
  console.log(`Added ${items.length} sample products.`);
}
await mongoose.disconnect();
