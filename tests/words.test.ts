import assert from "node:assert/strict";
import { test } from "node:test";
import { inWords } from "../src/lib/format";

test("bill totals in words, the Indian way", () => {
  assert.equal(inWords(1098), "Rupees One Thousand Ninety-Eight Only");
  assert.equal(inWords(101), "Rupees One Hundred One Only");
  assert.equal(inWords(40), "Rupees Forty Only");
  assert.equal(inWords(125000), "Rupees One Lakh Twenty-Five Thousand Only");
  assert.equal(inWords(9999999), "Rupees Ninety-Nine Lakh Ninety-Nine Thousand Nine Hundred Ninety-Nine Only");
  assert.equal(inWords(10000000), "Rupees One Crore Only");
  assert.equal(inWords(1234500789), "Rupees One Hundred Twenty-Three Crore Forty-Five Lakh Seven Hundred Eighty-Nine Only");
  assert.equal(inWords(0), "Rupees Zero Only");
});
