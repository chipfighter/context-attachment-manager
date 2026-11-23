// Purpose: v0.13 — small synthetic PDFs for the tests of core/pdf.ts and the PDF rewrite (docs/design.md §14). Each page
// says which page it is ("PAGE-2"), in a content stream left uncompressed so a test can look for it. The file is
// written plainly (a cross-reference table) or packed (an object stream and a cross-reference stream), with pages of
// text (a font, taken from the page tree) or scanned (an image only), optionally with a link from one page to another,
// an incremental update rewriting one page, or an /Encrypt entry. No real document data.
// Output: PDF bytes.

import { deflateSync } from "node:zlib";

export type PdfFixture = { pages?: number; scanned?: boolean | number[]; packed?: boolean; link?: [number, number]; encrypt?: boolean; update?: { page: number; text: string } };

type Obj = { dict: string; stream?: Buffer };

export function pdfFile(options: PdfFixture = {}): Buffer {
  const count = options.pages ?? 3;
  const scanned = (page: number) => options.scanned === true || (Array.isArray(options.scanned) && options.scanned.includes(page));
  const pageNum = (page: number) => 5 + (page - 1) * 2;
  const contentNum = (page: number) => 6 + (page - 1) * 2;
  const linkNum = 5 + count * 2;
  const content = (page: number, label = `PAGE-${page}`) => Buffer.from(scanned(page) ? `q 200 0 0 200 0 0 cm /Im1 Do Q\n% ${label}` : `BT /F1 12 Tf 20 100 Td (${label}) Tj ET`, "latin1");
  const objects = new Map<number, Obj>();
  objects.set(1, { dict: "<</Type /Catalog /Pages 2 0 R>>" });
  const kids = Array.from({ length: count }, (_, at) => `${pageNum(at + 1)} 0 R`).join(" ");
  objects.set(2, { dict: `<</Type /Pages /Kids [${kids}] /Count ${count} /Resources <</Font <</F1 3 0 R>>>> /MediaBox [0 0 200 200]>>` });
  objects.set(3, { dict: "<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>" });
  objects.set(4, { dict: "<</Type /XObject /Subtype /Image /Width 2 /Height 2 /ColorSpace /DeviceGray /BitsPerComponent 8>>", stream: Buffer.from([0, 255, 255, 0]) });
  for (let page = 1; page <= count; page++) {
    const resources = scanned(page) ? " /Resources <</XObject <</Im1 4 0 R>>>>" : "";
    const annots = options.link?.[0] === page ? ` /Annots [${linkNum} 0 R]` : "";
    objects.set(pageNum(page), { dict: `<</Type /Page /Parent 2 0 R /Contents ${contentNum(page)} 0 R${resources}${annots}>>` });
    objects.set(contentNum(page), { dict: "<<>>", stream: content(page) });
  }
  if (options.link) objects.set(linkNum, { dict: `<</Type /Annot /Subtype /Link /Rect [0 0 10 10] /Dest [${pageNum(options.link[1])} 0 R /Fit]>>` });
  if (options.encrypt) objects.set(99, { dict: "<</Filter /Standard /V 1 /R 2 /O <00> /U <00> /P -4>>" });
  const parts: Buffer[] = [];
  let size = 0;
  const put = (chunk: string | Buffer) => { const buffer = typeof chunk === "string" ? Buffer.from(chunk, "latin1") : chunk; parts.push(buffer); size += buffer.length; };
  const offsets = new Map<number, number>();
  const write = (num: number, obj: Obj) => {
    offsets.set(num, size);
    if (!obj.stream) { put(`${num} 0 obj\n${obj.dict}\nendobj\n`); return; }
    put(`${num} 0 obj\n${obj.dict.replace(/>>$/, ` /Length ${obj.stream.length}>>`)}\nstream\n`);
    put(obj.stream);
    put("\nendstream\nendobj\n");
  };
  const top = Math.max(...objects.keys());
  const encrypt = options.encrypt ? " /Encrypt 99 0 R" : "";
  if (!options.packed) {
    put("%PDF-1.7\n%\xE2\xE3\xCF\xD3\n");
    for (const num of [...objects.keys()].sort((a, b) => a - b)) write(num, objects.get(num)!);
    let xref = size;
    put(`xref\n0 ${top + 1}\n0000000000 65535 f \n`);
    for (let num = 1; num <= top; num++) put(`${String(offsets.get(num) ?? 0).padStart(10, "0")} ${offsets.has(num) ? "00000 n" : "65535 f"} \n`);
    put(`trailer\n<</Size ${top + 1} /Root 1 0 R${encrypt}>>\nstartxref\n${xref}\n%%EOF\n`);
    if (options.update) {
      const num = contentNum(options.update.page);
      write(num, { dict: "<<>>", stream: content(options.update.page, options.update.text) });
      const previous = xref;
      xref = size;
      put(`xref\n0 1\n0000000000 65535 f \n${num} 1\n${String(offsets.get(num)).padStart(10, "0")} 00000 n \n`);
      put(`trailer\n<</Size ${top + 1} /Root 1 0 R /Prev ${previous}${encrypt}>>\nstartxref\n${xref}\n%%EOF\n`);
    }
    return Buffer.concat(parts);
  }
  // Packed: every object without a stream in one object stream, then a cross-reference stream.
  put("%PDF-1.7\n%\xE2\xE3\xCF\xD3\n");
  const packedNums = [...objects.keys()].filter((num) => !objects.get(num)!.stream).sort((a, b) => a - b);
  const streamNums = [...objects.keys()].filter((num) => objects.get(num)!.stream).sort((a, b) => a - b);
  for (const num of streamNums) write(num, objects.get(num)!);
  const bodies: string[] = [];
  const header: string[] = [];
  let at = 0;
  for (const num of packedNums) {
    header.push(`${num} ${at}`);
    const body = `${objects.get(num)!.dict}\n`;
    bodies.push(body);
    at += Buffer.byteLength(body, "latin1");
  }
  const head = `${header.join(" ")}\n`;
  const pack = top + 1;
  const xrefNum = top + 2;
  write(pack, { dict: `<</Type /ObjStm /N ${packedNums.length} /First ${Buffer.byteLength(head, "latin1")} /Filter /FlateDecode>>`, stream: deflateSync(Buffer.from(head + bodies.join(""), "latin1")) });
  const xref = size;
  const rows: Buffer[] = [];
  const row = (type: number, a: number, b: number) => { const buffer = Buffer.alloc(7); buffer.writeUInt8(type, 0); buffer.writeUInt32BE(a, 1); buffer.writeUInt16BE(b, 5); rows.push(buffer); };
  for (let num = 0; num <= xrefNum; num++) {
    const index = packedNums.indexOf(num);
    if (num === xrefNum) row(1, xref, 0);
    else if (index >= 0) row(2, pack, index);
    else if (offsets.has(num)) row(1, offsets.get(num)!, 0);
    else row(0, 0, num === 0 ? 65535 : 0);
  }
  write(xrefNum, { dict: `<</Type /XRef /Size ${xrefNum + 1} /W [1 4 2] /Root 1 0 R${encrypt}>>`, stream: Buffer.concat(rows) });
  put(`startxref\n${xref}\n%%EOF\n`);
  return Buffer.concat(parts);
}

// What a PDF shows of its pages' labels, for the tests: the content streams are uncompressed.
export const labelsIn = (bytes: Buffer): string[] => [...bytes.toString("latin1").matchAll(/PAGE-\d+(?:-NEW)?/g)].map((match) => match[0]);
