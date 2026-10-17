import assert from "node:assert/strict";
import { test } from "node:test";
import { sign, uploadPhoto } from "../src/lib/cloudinary";

test("signs like Cloudinary's own worked example", () => {
  const params = { timestamp: "1315060510", public_id: "sample_image", eager: "w_400,h_300,c_pad|w_260,h_200,c_crop" };
  assert.equal(sign(params, "abcd"), "bfd09f95f331f558cbd1320e67aa8d488770583e");
});

test("uploads to the Cloudinary account set in .env as products/<id>, signed, and returns the https address", async (t) => {
  Object.assign(process.env, { CLOUDINARY_CLOUD_NAME: "agarwal-demo", CLOUDINARY_API_KEY: "123456", CLOUDINARY_API_SECRET: "s3cret" });
  let sent: { url: string; body: FormData } | undefined;
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    sent = { url, body: init.body as FormData };
    return Response.json({ secure_url: "https://res.cloudinary.com/agarwal-demo/image/upload/v1/products/abc.jpg" });
  });
  const url = await uploadPhoto(new File(["jpeg bytes"], "photo.jpg", { type: "image/jpeg" }), "abc");

  assert.equal(url, "https://res.cloudinary.com/agarwal-demo/image/upload/v1/products/abc.jpg");
  assert.equal(sent!.url, "https://api.cloudinary.com/v1_1/agarwal-demo/image/upload");
  const body = sent!.body;
  assert.equal(body.get("public_id"), "products/abc");
  assert.equal(body.get("api_key"), "123456");
  assert.equal(body.get("signature"), sign({ public_id: "products/abc", timestamp: String(body.get("timestamp")) }, "s3cret"));
  assert.ok(body.get("file") instanceof File);
});

test("a refused upload says so instead of saving a broken photo", async (t) => {
  Object.assign(process.env, { CLOUDINARY_CLOUD_NAME: "agarwal-demo", CLOUDINARY_API_KEY: "123456", CLOUDINARY_API_SECRET: "s3cret" });
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: { message: "Invalid Signature" } }, { status: 401 }));
  t.mock.method(console, "error", () => {});
  await assert.rejects(uploadPhoto(new File(["x"], "photo.jpg", { type: "image/jpeg" }), "abc"), /couldn't upload the photo/);
});
