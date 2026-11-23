// Purpose: v0.13 — the engine's PDF reader (core/pdf.ts, docs/design.md §14): page counts, text and scanned pages, a
// copy holding only some pages, and what it does with files it cannot or must not copy.
// Input: synthetic PDFs (pdf-fixtures.ts); output: Node test assertions only.

import assert from "node:assert/strict";
import test from "node:test";
import { pagesWanted, pdfFacts, pdfWithPages } from "../../plugin/src/core/pdf.ts";
import { labelsIn, pdfFile } from "./pdf-fixtures.ts";

test("pdf: how many pages, and how many carry text, written plainly or packed into object streams", () => {
  assert.deepEqual(pdfFacts(pdfFile({ pages: 3 })), { pages: 3, textPages: 3 });
  assert.deepEqual(pdfFacts(pdfFile({ pages: 3, scanned: true })), { pages: 3, textPages: 0 });
  assert.deepEqual(pdfFacts(pdfFile({ pages: 4, scanned: [2, 3] })), { pages: 4, textPages: 2 });
  assert.deepEqual(pdfFacts(pdfFile({ pages: 5, packed: true })), { pages: 5, textPages: 5 });
  assert.deepEqual(pdfFacts(pdfFile({ pages: 2, packed: true, scanned: true })), { pages: 2, textPages: 0 });
});

test("pdf: a copy of some pages holds those pages only, in order, with what they took from the page tree", () => {
  for (const packed of [false, true]) {
    const file = pdfFile({ pages: 4, packed });
    const second = pdfWithPages(file, [2])!;
    assert.ok(second, `packed: ${packed}`);
    // The font came from the page tree; the copy's page has it itself, so the page still counts as text.
    assert.deepEqual(pdfFacts(second), { pages: 1, textPages: 1 });
    assert.deepEqual(labelsIn(second), ["PAGE-2"]);
    assert.match(second.toString("latin1"), /\/MediaBox \[0 0 200 200\]/);
    const two = pdfWithPages(file, [1, 4])!;
    assert.deepEqual(pdfFacts(two), { pages: 2, textPages: 2 });
    assert.deepEqual(labelsIn(two), ["PAGE-1", "PAGE-4"]);
    assert.ok(two.length < file.length + 200);
  }
  // A scanned page keeps its image.
  const scan = pdfWithPages(pdfFile({ pages: 3, scanned: true }), [3])!;
  assert.deepEqual(pdfFacts(scan), { pages: 1, textPages: 0 });
  assert.deepEqual(labelsIn(scan), ["PAGE-3"]);
  assert.match(scan.toString("latin1"), /\/Subtype \/Image/);
});

test("pdf: a link to a page left out leads nowhere; the newest version of an object counts", () => {
  const linked = pdfWithPages(pdfFile({ pages: 3, link: [2, 3] }), [2])!;
  assert.deepEqual(labelsIn(linked), ["PAGE-2"]);
  assert.match(linked.toString("latin1"), /\/Dest \[null \/Fit\]/);
  // Kept when the page it leads to is in the copy too.
  const both = pdfWithPages(pdfFile({ pages: 3, link: [2, 3] }), [2, 3])!;
  assert.match(both.toString("latin1"), /\/Dest \[4 0 R \/Fit\]/);
  // An incremental update rewrote page 2.
  const updated = pdfFile({ pages: 3, update: { page: 2, text: "PAGE-2-NEW" } });
  assert.deepEqual(labelsIn(pdfWithPages(updated, [2])!), ["PAGE-2-NEW"]);
});

test("pdf: an encrypted file gives its facts but no copy; what is not a PDF, or is cut short, gives nothing", () => {
  const encrypted = pdfFile({ pages: 3, encrypt: true });
  assert.deepEqual(pdfFacts(encrypted), { pages: 3, textPages: 3 });
  assert.equal(pdfWithPages(encrypted, [1]), null);
  assert.equal(pdfFacts(Buffer.from("hello")), null);
  assert.equal(pdfFacts(Buffer.from("%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 9 0 R >> endobj\n")), null);
  const file = pdfFile({ pages: 3 });
  for (const end of [20, 200, 400, file.length - 60]) assert.doesNotThrow(() => { pdfFacts(file.subarray(0, end)); pdfWithPages(file.subarray(0, end), [1]); });
  // Pages it does not have.
  assert.equal(pdfWithPages(file, [4]), null);
  assert.equal(pdfWithPages(file, []), null);
});

test("pdf: the pages asked for", () => {
  assert.deepEqual(pagesWanted("3", 5), [3]);
  assert.deepEqual(pagesWanted("2-4", 5), [2, 3, 4]);
  assert.deepEqual(pagesWanted("4-2", 5), [2, 3, 4]);
  assert.deepEqual(pagesWanted("1, 3,5–6", 6), [1, 3, 5, 6]);
  assert.deepEqual(pagesWanted("第2页", 5), [2]);
  assert.deepEqual(pagesWanted("p2-p3", 5), [2, 3]);
  assert.deepEqual(pagesWanted("2-9", 5), [2, 3, 4, 5]);
  assert.deepEqual(pagesWanted("3，1、3", 5), [1, 3]);
  assert.equal(pagesWanted("9", 5), null);
  assert.equal(pagesWanted("0", 5), null);
  assert.equal(pagesWanted("all", 5), null);
});
