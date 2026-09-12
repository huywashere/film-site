import assert from "node:assert/strict";
import test from "node:test";
import {
  parseRomanOrArabic,
  parsePartInfo,
  normalizeBaseTitle,
  findUniverseParts,
} from "./movie-parts.ts";

test("parseRomanOrArabic converts both arabic and roman numbers", () => {
  assert.equal(parseRomanOrArabic("1"), 1);
  assert.equal(parseRomanOrArabic("9"), 9);
  assert.equal(parseRomanOrArabic("I"), 1);
  assert.equal(parseRomanOrArabic("II"), 2);
  assert.equal(parseRomanOrArabic("III"), 3);
  assert.equal(parseRomanOrArabic("IV"), 4);
  assert.equal(parseRomanOrArabic("IX"), 9);
  assert.equal(parseRomanOrArabic("invalid"), null);
});

test("parsePartInfo extracts base title and part number from Vietnamese titles", () => {
  const p1 = parsePartInfo("Marvel's Luke Cage (Phần 1)", "Marvel's Luke Cage (Season 1)", "marvels-luke-cage-phan-1");
  assert.ok(p1);
  assert.equal(p1.partNumber, 1);
  assert.equal(p1.partLabel, "Phần 1");
  assert.equal(p1.baseTitle, "Marvel's Luke Cage");
  assert.equal(p1.baseSlug, "marvels-luke-cage");

  const p2 = parsePartInfo("Người Hùng Tia Chớp (Phần 9)", "The Flash (Season 9)", "nguoi-hung-tia-chop-phan-9");
  assert.ok(p2);
  assert.equal(p2.partNumber, 9);
  assert.equal(p2.partLabel, "Phần 9");
  assert.equal(p2.baseTitle, "Người Hùng Tia Chớp");

  const p3 = parsePartInfo("Loki (Phần 2)", "Loki (Season 2)", "loki-phan-2");
  assert.ok(p3);
  assert.equal(p3.partNumber, 2);
  assert.equal(p3.partLabel, "Phần 2");
  assert.equal(p3.baseTitle, "Loki");

  const p4 = parsePartInfo("John Wick: Phần 4", "John Wick: Chapter 4", "john-wick-phan-4");
  assert.ok(p4);
  assert.equal(p4.partNumber, 4);
  assert.equal(p4.partLabel, "Phần 4");
  assert.equal(p4.baseTitle, "John Wick");
});

test("parsePartInfo handles roman numeral parts", () => {
  const roman = parsePartInfo("Siêu Nhân Mù (Phần III)", "Daredevil Season 3", "daredevil-3");
  assert.ok(roman);
  assert.equal(roman.partNumber, 3);
  assert.equal(roman.partLabel, "Phần 3");
});

test("parsePartInfo returns null for standalone films without parts", () => {
  const single = parsePartInfo("Inception", "Inception", "inception");
  assert.equal(single, null);
});

test("findUniverseParts discovers multi-season films in catalog", async () => {
  const parts = await findUniverseParts({
    name: "Marvel's Luke Cage (Phần 1)",
    origin_name: "Marvel's Luke Cage (Season 1)",
    slug: "marvels-luke-cage-phan-1",
  });

  assert.ok(parts.length >= 2);
  assert.equal(parts[0].partNumber, 1);
  assert.equal(parts[0].partLabel, "Phần 1");
  assert.equal(parts[1].partNumber, 2);
  assert.equal(parts[1].partLabel, "Phần 2");
  assert.equal(parts[0].isCurrent, true);
});

test("findUniverseParts discovers DC series with multiple parts", async () => {
  const parts = await findUniverseParts({
    name: "Người Hùng Tia Chớp (Phần 3)",
    origin_name: "The Flash (Season 3)",
    slug: "nguoi-hung-tia-chop-phan-3",
  });

  assert.ok(parts.length >= 2);
  const p3 = parts.find((p) => p.partNumber === 3);
  assert.ok(p3);
  assert.equal(p3.isCurrent, true);
});
