import { isValidObjectId } from "mongoose";
import { connectDB, Photo } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) return new Response(null, { status: 404 });
  await connectDB();
  const photo = await Photo.findById(id);
  if (!photo) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    // addresses carry ?v=<upload time>, so a new photo gets a new address
    headers: { "Content-Type": photo.type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
