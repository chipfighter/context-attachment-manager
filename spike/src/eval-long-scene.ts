// Purpose: eval — the scene of the long keyframe task in Claude Code (eval-long.ts): synthetic
// images, the user's turns, the questions with their answers, and how a reply is scored. Nothing here runs a model;
// eval-long-scene.test.ts checks that every question has exactly one right answer.
// The task (51 images, 16 turns): keyframes of a short film, ten shots of two or three versions, which the user asks the
// model to look at (Read, standing in for generated images); two clips of extracted video frames, four settings-page
// screenshots, four character turnaround sheets; two sketches the user sends, and once an earlier image sent again. The
// user says where each shot takes place and who is in it, never how the versions differ (dark, position, a hat or an
// umbrella): that is only in what the model saw. Ratings come in later turns, one changed afterwards, one about part of
// an image. Each keyframe and sheet carries a faint two-digit number in a corner that only the original shows.
// Input: none. Output: images (with a draw function), steps, questions, score().

import { png } from "./testkit.ts";

type Rgb = [number, number, number];
export type Who = "her" | "him" | "side";
export type Place = "study" | "rain" | "beach" | "bamboo" | "rooftop" | "cafe";
export type ShotSize = "wide" | "medium" | "close";
export type Pos = "left" | "center" | "right";
export type Variant = { dark?: boolean; tint?: "warm" | "cool"; pos?: Pos; prop?: "umbrella" | "hat" };
export type Pose = "raise" | "sit" | "point" | "jump";

export type Image =
  | { key: string; kind: "keyframe"; file: string; shot: number; version: number; place: Place; who: Who | null; size: ShotSize; variant: Variant; number: number }
  | { key: string; kind: "sheet"; file: string; who: Who; belt: boolean; number: number }
  | { key: string; kind: "frame"; file: string; clip: number; frame: number; frames: number; scene: "car" | "walk"; mark: number }
  | { key: string; kind: "screen"; file: string; batch: string; index: number; values: [number, number, number] }
  | { key: string; kind: "sketch"; pose: Pose; index: number }
  | { key: string; kind: "resend"; of: string };

export type Question = {
  key: string; block: "mid" | "end" | "fork"; say: string;
  expect: "file" | "number" | "word" | "text"; answer: string;
  // The image the question is about (null: none); needsOriginal: only the original answers it.
  target: string | null; needsOriginal: boolean;
  // For the unit test: the images the user's words fit. Exactly one, the target.
  fits?: (image: Image) => boolean;
};
export type Step =
  | { type: "turn"; say: string; upload: string[] }
  | { type: "compact"; label: "mid" | "end" }
  | { type: "ask"; block: "mid" | "end" | "fork" };

export const PLACE_ZH: Record<Place, string> = { study: "书房", rain: "雨夜街道", beach: "黄昏海边", bamboo: "竹林", rooftop: "夜晚屋顶", cafe: "咖啡馆" };
const WHO_ZH: Record<Who, string> = { her: "女主", him: "男主", side: "配角" };
const SIZE_ZH: Record<ShotSize, string> = { wide: "全景", medium: "中景", close: "近景" };

// ---- Drawing ----

const FONT: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};
// Is (x, y) on a digit of text drawn from (left, top) at this scale?
function glyphs(text: string, left: number, top: number, scale: number): (x: number, y: number) => boolean {
  const step = 7 * scale;
  return (x, y) => {
    const row = Math.floor((y - top) / scale);
    if (x < left || y < top || row >= 7) return false;
    const at = Math.floor((x - left) / step);
    const col = Math.floor((x - left - at * step) / scale);
    return at < text.length && col < 5 && FONT[text[at]][row][col] === "1";
  };
}
// The corner number: small faint digits like a watermark, lighter or darker than what is under them. A first try had
// white digits on a dark plate: the model wrote them into its feature lines, and the questions about them no longer
// needed the original.
function cornerMark(number: number, corner: number, width: number, height: number): (x: number, y: number, rgb: Rgb) => Rgb {
  const scale = 3, margin = 14, w = 2 * 7 * scale - 2 * scale, h = 7 * scale;
  const left = corner % 2 === 0 ? margin : width - margin - w;
  const top = corner < 2 ? margin : height - margin - h;
  const digit = glyphs(String(number).padStart(2, "0"), left, top, scale);
  return (x, y, rgb) => {
    if (!digit(x, y)) return rgb;
    const light = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11 > 110;
    return mix(rgb, light ? [0, 0, 0] : [255, 255, 255], 0.55);
  };
}

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const inCircle = (x: number, y: number, cx: number, cy: number, r: number) => (x - cx) ** 2 + (y - cy) ** 2 < r * r;
const hashOf = (text: string) => text.split("").reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) >>> 0, 7);

function backdrop(place: Place, x: number, y: number, W: number, H: number): Rgb {
  const u = x / W, v = y / H;
  switch (place) {
    case "study": {
      if (v < 0.12) return [150, 105, 70];
      if (v > 0.8) return [110, 75, 50];
      const row = (y - 0.12 * H) % 130;
      if (row < 12) return [90, 55, 30];
      const spines: Rgb[] = [[170, 40, 40], [200, 170, 60], [140, 70, 40], [190, 110, 50], [120, 50, 60]];
      return x % 26 < 3 ? [90, 55, 30] : spines[(Math.floor(x / 26) + Math.floor((y - 0.12 * H) / 130) * 2) % spines.length];
    }
    case "rain": {
      const base: Rgb = v > 0.82 ? ((x + y) % 40 < 3 ? [70, 75, 95] : [30, 32, 42]) : mix([15, 20, 45], [40, 45, 75], v);
      const glow = Math.max(0, 1 - Math.hypot(x - 0.78 * W, y - 0.22 * H) / (0.34 * Math.min(W, H) + 60));
      const lit = mix(base, [235, 205, 120], glow * glow);
      return (x + Math.floor(y * 0.3)) % 31 < 2 && y % 70 < 46 ? mix(lit, [170, 180, 210], 0.55) : lit;
    }
    case "beach": {
      if (v >= 0.62) return (y - 0.62 * H) % 40 < 4 ? [90, 130, 170] : [40, 80, 130];
      return mix([240, 120, 80], [252, 196, 150], v / 0.62);
    }
    case "bamboo": {
      if (x % 110 >= 26) return [80, 140, 80];
      return y % 150 < 8 ? [25, 70, 30] : [40, 100, 45];
    }
    case "rooftop": {
      if (v > 0.66 && v < 0.68) return [130, 130, 140];
      if (v >= 0.68 && x % 40 < 5) return [120, 120, 130];
      if (v > 0.74) return x % 24 < 9 && y % 28 < 11 && hashOf(`${Math.floor(x / 24)},${Math.floor(y / 28)}`) % 3 === 0 ? [230, 200, 90] : [22, 22, 30];
      return mix([10, 12, 30], [32, 30, 62], v / 0.74);
    }
    case "cafe": {
      if (v > 0.9) return [150, 110, 80];
      if (u > 0.08 && u < 0.5 && v > 0.1 && v < 0.42) return u < 0.1 || u > 0.48 || v < 0.12 || v > 0.4 || Math.abs(u - 0.29) < 0.01 ? [240, 240, 235] : [170, 200, 230];
      if (inCircle(x / W, (y / H) * 2.4, 0.78, 0.86 * 2.4, 0.13)) return [120, 80, 50];
      return [230, 215, 185];
    }
  }
}

const SKIN: Rgb = [235, 195, 165], EYE: Rgb = [30, 25, 25], WHITE: Rgb = [248, 248, 248], LIPS: Rgb = [170, 70, 70];
const LOOK: Record<Who, { hair: Rgb; outfit: Rgb; long: boolean; glasses: boolean }> = {
  her: { hair: [25, 20, 20], outfit: [190, 30, 40], long: true, glasses: false },
  him: { hair: [75, 48, 25], outfit: [40, 70, 150], long: false, glasses: false },
  side: { hair: [150, 150, 150], outfit: [40, 120, 70], long: false, glasses: true },
};

// A person facing the camera: red dress and long black hair, blue with short brown hair, or green with grey hair and
// glasses; a hat or an umbrella when the variant has one.
function person(who: Who, size: ShotSize, variant: Variant, x: number, y: number): Rgb | null {
  const look = LOOK[who];
  const pos = variant.pos ?? "center";
  const [r, cy] = size === "close" ? [170, 400] : size === "medium" ? [62, 330] : [22, 560];
  const cx = (size === "close" ? { left: 200, center: 256, right: 312 } : size === "medium" ? { left: 150, center: 256, right: 362 } : { left: 130, center: 256, right: 382 })[pos];
  if (variant.prop === "umbrella") {
    // A purple canopy with darker ribs, and its handle beside the face.
    const top = cy - 1.25 * r;
    if (y < top && inCircle(x, y, cx, top, 1.9 * r)) return Math.abs(((Math.atan2(top - y, x - cx) * 180) / Math.PI) % 30) < 1.2 ? [70, 25, 80] : [125, 55, 140];
    if (Math.abs(x - (cx + r)) < Math.max(2, 0.03 * r) && y >= top && y < cy + 0.9 * r) return [60, 60, 60];
  }
  if (variant.prop === "hat") {
    if (Math.abs(x - cx) < 1.25 * r && y > cy - 0.98 * r && y < cy - 0.82 * r) return [25, 25, 30];
    if (Math.abs(x - cx) < 0.7 * r && y > cy - 1.6 * r && y <= cy - 0.98 * r) return [25, 25, 30];
  }
  const close = size === "close";
  if (inCircle(x, y, cx, cy, r)) {
    const eyeY = cy + r * 0.05, eyeX = r * 0.38;
    for (const ex of [cx - eyeX, cx + eyeX]) {
      if (inCircle(x, y, ex, eyeY, r * 0.07)) return EYE;
      if (look.glasses && inCircle(x, y, ex, eyeY, r * 0.17) && !inCircle(x, y, ex, eyeY, r * 0.13)) return [35, 35, 35];
      if (close && inCircle(x, y, ex, eyeY, r * 0.13)) return WHITE;
    }
    if (look.glasses && Math.abs(y - eyeY) < r * 0.02 && Math.abs(x - cx) < r * 0.22) return [35, 35, 35];
    if (Math.abs(x - cx) < r * 0.28 && y > cy + r * 0.45 && y < cy + r * 0.53) return LIPS;
    if (y < cy - r * (look.long ? 0.35 : 0.45)) return look.hair;
    return SKIN;
  }
  const neckTop = cy + r * 0.85, shoulders = cy + r * (close ? 1.25 : 1.35);
  const off = Math.abs(x - cx);
  if (look.long && off < r * 1.3 && y > cy - r * 0.9 && (y < cy + r * 0.5 || (off > r * 0.6 && y < cy + r * (close ? 1.6 : 2.6)))) return look.hair;
  if (!look.long && inCircle(x, y, cx, cy - r * 0.1, r * 1.08) && y < cy - r * 0.2) return look.hair;
  if (off < r * 0.3 && y >= neckTop && y < shoulders) return SKIN;
  const bottom = size === "close" ? Infinity : cy + r * 5.2;
  if (y >= shoulders && y < bottom && off < r * 1.4 + (y - shoulders) * (close ? 0.8 : 0.3)) return look.outfit;
  return null;
}

function grainOf(key: string): () => number {
  let state = (0x9e3779b9 ^ hashOf(key)) >>> 0 || 1;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return ((state >>> 0) % 13) - 6; };
}
const finish = (rgb: Rgb, grain: () => number): Rgb => [rgb[0], rgb[1], rgb[2]].map((value) => Math.max(0, Math.min(255, Math.round(value + grain())))) as Rgb;
const cornerOf = (key: string) => hashOf(`${key}#corner`) % 4;

function drawKeyframe(image: Extract<Image, { kind: "keyframe" }>): Buffer {
  const W = 512, H = 768;
  const grain = grainOf(image.key);
  const mark = cornerMark(image.number, cornerOf(image.key), W, H);
  return png(W, H, (x, y) => {
    let rgb = (image.who ? person(image.who, image.size, image.variant, x, y) : null) ?? backdrop(image.place, x, y, W, H);
    if (image.variant.tint === "warm") rgb = [rgb[0] + 38, rgb[1] + 12, rgb[2] - 28];
    if (image.variant.tint === "cool") rgb = [rgb[0] - 28, rgb[1] + 2, rgb[2] + 38];
    if (image.variant.dark) rgb = [rgb[0] * 0.35, rgb[1] * 0.35, rgb[2] * 0.35];
    return finish(mark(x, y, rgb), grain);
  });
}

// Front, side and back of one character on a grey sheet; the second version of a sheet adds a yellow belt.
function drawSheet(image: Extract<Image, { kind: "sheet" }>): Buffer {
  const W = 768, H = 512;
  const grain = grainOf(image.key);
  const mark = cornerMark(image.number, cornerOf(image.key), W, H);
  const look = LOOK[image.who];
  return png(W, H, (x, y) => finish(mark(x, y, sheetAt(x, y)), grain));
  function sheetAt(x: number, y: number): Rgb {
    for (const [view, cx] of [["front", 128], ["side", 384], ["back", 640]] as const) {
      const cy = 120, r = 38;
      if (inCircle(x, y, cx, cy, r)) {
        if (view === "back") return look.hair;
        if (y < cy - r * (look.long ? 0.35 : 0.45)) return look.hair;
        if (view === "front" && (inCircle(x, y, cx - 14, cy + 2, 3.5) || inCircle(x, y, cx + 14, cy + 2, 3.5))) return EYE;
        if (view === "side" && inCircle(x, y, cx + 16, cy + 2, 3.5)) return EYE;
        if (look.glasses && view !== "back" && Math.abs(y - (cy + 2)) < 1.5 && Math.abs(x - cx) < 26) return [35, 35, 35];
        return SKIN;
      }
      if (view === "side" && inCircle(x, y, cx + r - 2, cy + 8, 7)) return SKIN;
      if (look.long && Math.abs(x - cx) < r + 6 && y > cy && y < (view === "back" ? 240 : 190) && (view === "back" || Math.abs(x - cx) > r * 0.6)) return look.hair;
      const half = 40 + (y - 165) * 0.1;
      if (y >= 165 && y < 360 && Math.abs(x - cx) < half) return image.belt && y >= 255 && y < 268 ? [225, 190, 40] : look.outfit;
      if (y >= 360 && y < 465 && Math.abs(Math.abs(x - cx) - 18) < 8) return [60, 60, 70];
      if (y >= 175 && y < 330 && Math.abs(Math.abs(x - cx) - (half + 8)) < 6) return SKIN;
    }
    if (Math.abs(y - 470) < 2) return [150, 150, 150];
    return [228, 228, 228];
  }
}

// Frame `frame` of a clip: a car driving left to right past a street lamp at night, or the lead walking right to left
// along the beach past the setting sun. `mark` is the frame the car is right under the lamp, or she covers the sun.
export const carX = (frame: number, frames: number) => 100 + ((frame - 1) * (768 - 200)) / (frames - 1);
export const walkerX = (frame: number, frames: number) => 700 - ((frame - 1) * 640) / (frames - 1);
function drawFrame(image: Extract<Image, { kind: "frame" }>): Buffer {
  const W = 768, H = 512;
  const grain = grainOf(image.key);
  if (image.scene === "car") {
    const lamp = carX(image.mark, image.frames), cx = carX(image.frame, image.frames);
    // The car is narrower than one frame's step, so only one frame has it under the lamp.
    return png(W, H, (x, y) => {
      if (inCircle(x, y, cx + 38, 395, 6) && x > cx + 32) return finish([250, 230, 120], grain);
      if (inCircle(x, y, cx - 24, 422, 10) || inCircle(x, y, cx + 24, 422, 10)) return finish([15, 15, 15], grain);
      if (Math.abs(x - cx) < 40 && y > 380 && y < 420) return finish([70, 72, 80], grain);
      if (Math.abs(x - cx) < 24 && y > 356 && y <= 380) return finish(Math.abs(x - cx) < 20 && y > 360 ? [120, 140, 170] : [70, 72, 80], grain);
      if (Math.abs(x - lamp) < 4 && y > 110 && y < 470) return finish([90, 90, 95], grain);
      const glow = Math.max(0, 1 - Math.hypot(x - lamp, y - 110) / 150);
      const base: Rgb = y > 430 ? ((x + y) % 40 < 3 ? [70, 75, 95] : [30, 32, 42]) : mix([15, 20, 45], [40, 45, 75], y / H);
      const lit = mix(base, [235, 205, 120], glow * glow);
      return finish((x + Math.floor(y * 0.3)) % 31 < 2 && y % 70 < 46 ? mix(lit, [170, 180, 210], 0.55) : lit, grain);
    });
  }
  const sun = walkerX(image.mark, image.frames), cx = walkerX(image.frame, image.frames);
  return png(W, H, (x, y) => {
    // Her head at y 250, in front of the sun; the sun is narrower than one frame's step.
    const her = person("her", "wide", { pos: "center" }, x - cx + 256, y + 310);
    if (her) return finish(her, grain);
    if (y < 0.6 * H && inCircle(x, y, sun, 0.6 * H - 40, 50)) return finish([255, 222, 130], grain);
    if (y >= 0.6 * H) return finish((y - 0.6 * H) % 30 < 3 ? [90, 130, 170] : [40, 80, 130], grain);
    return finish(mix([240, 120, 80], [252, 196, 150], y / (0.6 * H)), grain);
  });
}

// A settings page: a top bar, a sidebar, and three rows (green, blue, orange dots) with a number each.
function drawScreen(image: Extract<Image, { kind: "screen" }>): Buffer {
  const W = 768, H = 512;
  const grain = grainOf(image.key);
  const dots: Rgb[] = [[40, 170, 80], [50, 110, 220], [240, 140, 30]];
  const values = image.values.map((value, row) => glyphs(String(value), 470, 120 + row * 100 - 17, 5));
  return png(W, H, (x, y) => {
    if (y < 44) return finish(x > 20 && x < 120 && y > 16 && y < 28 ? [200, 200, 205] : [45, 48, 55], grain);
    if (x < 150) return finish(x > 20 && x < 130 && (y - 70) % 60 < 22 && y < 380 ? [205, 207, 214] : [235, 236, 240], grain);
    if (x < 190 || x > 720 || y < 80 || y > 440) return finish([250, 250, 252], grain);
    if (x === 190 || x === 720 || y === 80 || y === 440) return finish([200, 200, 205], grain);
    for (let row = 0; row < 3; row++) {
      const cy = 120 + row * 100;
      if (inCircle(x, y, 225, cy, 14)) return finish(dots[row], grain);
      if (x > 255 && x < 420 && Math.abs(y - cy) < 7) return finish([190, 192, 198], grain);
      if (x > 455 && x < 600 && Math.abs(y - cy) < 28) {
        if (values[row](x, y)) return finish([30, 30, 35], grain);
        return finish(x < 458 || x > 597 || Math.abs(y - cy) > 25 ? [170, 172, 180] : [255, 255, 255], grain);
      }
    }
    return finish([255, 255, 255], grain);
  });
}

// A stick figure in black pen on white: one arm up (on the left of the picture), sitting on a chair, pointing to the
// right, or jumping with both arms up.
function drawSketch(image: Extract<Image, { kind: "sketch" }>): Buffer {
  const W = 512, H = 512;
  const grain = grainOf(image.key);
  type Seg = [number, number, number, number];
  const body: Seg[] = { raise: [[256, 180, 256, 330], [256, 330, 210, 450], [256, 330, 302, 450], [256, 215, 150, 120], [256, 215, 320, 290]],
    sit: [[256, 180, 256, 330], [256, 330, 340, 330], [340, 330, 340, 440], [256, 215, 200, 290], [256, 215, 312, 290], [180, 340, 360, 340], [190, 340, 190, 450], [350, 340, 350, 450]],
    point: [[256, 180, 256, 330], [256, 330, 210, 450], [256, 330, 302, 450], [256, 215, 420, 215], [256, 215, 200, 290]],
    jump: [[256, 180, 256, 320], [256, 320, 180, 420], [256, 320, 332, 420], [256, 215, 180, 110], [256, 215, 332, 110]] }[image.pose] as Seg[];
  const near = (x: number, y: number, [x1, y1, x2, y2]: Seg) => {
    const dx = x2 - x1, dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)) < 3.5;
  };
  return png(W, H, (x, y) => {
    const ring = Math.hypot(x - 256, y - 135);
    if ((ring > 38 && ring < 45) || body.some((seg) => near(x, y, seg))) return finish([25, 25, 25], grain);
    return finish([250, 250, 246], grain);
  });
}

export function draw(image: Image, images: Image[]): Buffer {
  switch (image.kind) {
    case "keyframe": return drawKeyframe(image);
    case "sheet": return drawSheet(image);
    case "frame": return drawFrame(image);
    case "screen": return drawScreen(image);
    case "sketch": return drawSketch(image);
    case "resend": return draw(images.find((other) => other.key === image.of)!, images);
  }
}

// ---- The task ----

type Shot = { shot: number; place: Place; who: Who | null; size: ShotSize; variants: Variant[] };
const SHOTS_A: Shot[] = [
  { shot: 1, place: "study", who: "her", size: "medium", variants: [{ pos: "left" }, { pos: "center" }] },
  { shot: 2, place: "study", who: "him", size: "medium", variants: [{ dark: true }, {}, { prop: "hat" }] },
  { shot: 3, place: "rain", who: "her", size: "close", variants: [{}, { prop: "umbrella" }, { prop: "umbrella", tint: "warm" }] },
  { shot: 4, place: "rain", who: null, size: "wide", variants: [{}, { dark: true }] },
  { shot: 5, place: "beach", who: "him", size: "medium", variants: [{ pos: "left" }, { pos: "center" }, { pos: "right" }] },
  { shot: 6, place: "beach", who: "her", size: "close", variants: [{ prop: "hat" }, {}, { tint: "warm" }] },
];
const SHOTS_B: Shot[] = [
  { shot: 7, place: "bamboo", who: "side", size: "medium", variants: [{ prop: "hat" }, {}] },
  { shot: 8, place: "bamboo", who: "her", size: "close", variants: [{}, { prop: "hat" }, { tint: "cool" }] },
  { shot: 9, place: "rooftop", who: "him", size: "medium", variants: [{ dark: true }, {}, { pos: "right" }] },
  { shot: 10, place: "cafe", who: "her", size: "medium", variants: [{ pos: "left" }, { pos: "right" }] },
];
const SCREENS: Array<[number, number, number]> = [[5, 41, 30], [8, 73, 30], [12, 28, 30], [10, 65, 50]];

const numberOf = (key: string) => 10 + (hashOf(`${key}#n`) % 90);
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const two = (n: number) => String(n).padStart(2, "0");

export type Scene = { images: Image[]; steps: Step[]; questions: Question[] };

export function scene(): Scene {
  const images: Image[] = [];
  const steps: Step[] = [];
  const turn = (say: string, upload: string[] = []) => steps.push({ type: "turn", say, upload });
  const keyframes = (shot: Shot) => shot.variants.map((variant, i) => {
    const key = `s${two(shot.shot)}_v${i + 1}`;
    const image: Image = { key, kind: "keyframe", file: `${key}.png`, shot: shot.shot, version: i + 1, place: shot.place, who: shot.who, size: shot.size, variant, number: numberOf(key) };
    images.push(image);
    return image.file as string;
  });
  const shotLine = (shot: Shot) => {
    const files = keyframes(shot);
    const who = shot.who ? `${WHO_ZH[shot.who]}${SIZE_ZH[shot.size]}` : "空镜";
    return `第 ${shot.shot} 镜，${PLACE_ZH[shot.place]}，${who}，${files.length} 版：${files.join("、")}`;
  };
  const shots = (list: Shot[], tail = "看一下。") => turn(`${list.map(shotLine).join("；")}。${tail}`);
  const clip = (clipNo: number, frames: number, scene: "car" | "walk", mark: number) => {
    for (const frame of range(1, frames)) images.push({ key: `clip${clipNo}_${two(frame)}`, kind: "frame", file: `clip${clipNo}_${two(frame)}.png`, clip: clipNo, frame, frames, scene, mark });
    return `clip${clipNo}_01.png 到 clip${clipNo}_${two(frames)}.png`;
  };
  const screens = (batch: string, values: Array<[number, number, number]>) => {
    values.forEach((value, i) => images.push({ key: `set_${batch}_${i + 1}`, kind: "screen", file: `set_${batch}_${i + 1}.png`, batch, index: i + 1, values: value }));
    return `set_${batch}_1.png 到 set_${batch}_${values.length}.png`;
  };
  const sheet = (n: number, who: Who, belt: boolean) => {
    const key = `sheet_${two(n)}`;
    images.push({ key, kind: "sheet", file: `${key}.png`, who, belt, number: numberOf(key) });
    return `${key}.png`;
  };
  const sketch = (index: number, pose: Pose) => { images.push({ key: `sketch${index}`, kind: "sketch", pose, index }); return `sketch${index}`; };

  // Part A: shots 1–6, two sketches, the first sheets, a clip, screenshots, an image sent again; then a compaction.
  turn("我们在做一部短片的关键帧和分镜，图都在当前文件夹里。接下来每轮我会说看哪些图，你用 Read 看完简单说一两句就行，别展开分析；我直接发给你的图也一样。不用改文件，也不用跑命令。人物：女主穿红裙、黑色长发；男主穿蓝外套、棕色短发；配角穿绿大衣、灰头发、戴眼镜。\n\n" +
    `${shotLine(SHOTS_A[0])}。看一下。`);
  shots([SHOTS_A[1]]);
  shots([SHOTS_A[2]]);
  turn("这是我画的两张简笔画，后面按这个姿势出图。", [sketch(1, "raise"), sketch(2, "sit")]);
  shots([SHOTS_A[3]], "第 3 镜 v2 女主的脸最好，先定它。看一下。");
  shots([SHOTS_A[4]]);
  turn(`两张三视图：${sheet(1, "her", false)} 是女主，${sheet(2, "him", false)} 是男主。看一下。`);
  shots([SHOTS_A[5]]);
  turn(`第 1 段视频（雨夜街道）抽了 8 帧：${clip(1, 8, "car", 6)}，都看一下，看车的动作连不连贯。`);
  turn(`我截了 4 张生成工具的设置页：${screens("1105", SCREENS)}。绿色那一行是时长，蓝色是种子，橙色是步数，帮我看看有没有填错的。第 6 镜 v3 衣服和光都对了，但表情不对，表情还是参考 v1。`);
  images.push({ key: "resend1", kind: "resend", of: "s05_v2" });
  turn("这张你看一下，我想在它基础上把表情改得自然一点。", ["resend1"]);
  steps.push({ type: "compact", label: "mid" }, { type: "ask", block: "mid" });

  // Part B: shots 7–10, a change of mind, a second clip, a better sheet; then a compaction and a fork.
  shots([SHOTS_B[0]]);
  shots([SHOTS_B[1]], "第 3 镜我改主意了：v2 光太硬，最后用 v3。看一下。");
  turn(`海边那段视频也抽了 6 帧：${clip(2, 6, "walk", 4)}，看看女主走路的节奏。`);
  shots([SHOTS_B[2], SHOTS_B[3]]);
  turn(`男主三视图第二版：${sheet(3, "him", true)}，这版比例更好。还有配角的 ${sheet(4, "side", false)}。第 9 镜 v1 太暗，不要了。看一下。`);
  steps.push({ type: "compact", label: "end" }, { type: "ask", block: "end" }, { type: "ask", block: "fork" });

  const kf = (image: Image) => (image.kind === "keyframe" ? image : null);
  const of = (key: string) => images.find((image) => image.key === key)!;
  const numberAt = (key: string) => { const image = of(key); return String(image.kind === "keyframe" || image.kind === "sheet" ? image.number : -1); };
  const screen = (batch: string, index: number, row: number) => { const image = of(`set_${batch}_${index}`); return String(image.kind === "screen" ? image.values[row] : -1); };
  const file = (key: string, block: Question["block"], say: string, fits: Question["fits"], needsOriginal = false): Question => ({ key: "", block, say: `${say}只回答文件名。`, expect: "file", answer: `${key}.png`, target: key, needsOriginal, fits });
  const number = (key: string, block: Question["block"], say: string, answer: string, needsOriginal = true): Question => ({ key: "", block, say: `${say}只回答数字。`, expect: "number", answer, target: key, needsOriginal });
  const questions: Question[] = [
    file("s02_v1", "mid", "第 2 镜里偏暗的那一版是哪个文件？", (i) => kf(i)?.shot === 2 && !!kf(i)?.variant.dark),
    file("s06_v1", "mid", "第 6 镜女主戴着帽子的那一版是哪个文件？", (i) => kf(i)?.shot === 6 && kf(i)?.variant.prop === "hat"),
    number("s02_v3", "mid", "第 2 镜男主戴帽子的那一版，角落里的数字是多少？", numberAt("s02_v3")),
    number("set_1105_3", "mid", "设置页截图里，第 3 张的种子（蓝色那一行）是多少？", screen("1105", 3, 1)),
    file("s04_v2", "end", "雨夜街道的空镜（不是抽帧）里，整体更暗的那一版是哪个文件？", (i) => kf(i)?.place === "rain" && kf(i)?.who === null && !!kf(i)?.variant.dark),
    file("s03_v1", "end", "第 3 镜里女主没打伞的那一版是哪个文件？", (i) => kf(i)?.shot === 3 && kf(i)?.variant.prop !== "umbrella"),
    file("s03_v3", "end", "第 3 镜最后定的是哪一版？", (i) => i.key === "s03_v3"),
    file("s06_v3", "end", "我说衣服和光都对了、但表情不对的那张是哪个文件？", (i) => i.key === "s06_v3"),
    file("s09_v1", "end", "我说太暗、不要了的那张是哪个文件？", (i) => i.key === "s09_v1"),
    file("s05_v3", "end", "第 5 镜里男主站在画面右边的那一版是哪个文件？", (i) => kf(i)?.shot === 5 && kf(i)?.variant.pos === "right"),
    number("s01_v1", "end", "第 1 镜女主站在画面左边的那一版，角落里的数字是多少？", numberAt("s01_v1")),
    file("clip1_06", "end", "第 1 段抽帧里，车正好开到路灯底下的那一帧是哪个文件？", (i) => i.kind === "frame" && i.clip === 1 && i.frame === i.mark),
    file("clip2_04", "end", "海边那段抽帧里，女主走到正好挡住太阳的那一帧是哪个文件？", (i) => i.kind === "frame" && i.scene === "walk" && i.frame === i.mark),
    file("set_1105_4", "end", "设置页截图里，步数（橙色那一行）填成 50 的是哪个文件？", (i) => i.kind === "screen" && i.values[2] === 50),
    { key: "", block: "end", say: "我直接发给你的第二张简笔画，画的是什么姿势？一两个字回答。", expect: "word", answer: "坐", target: "sketch2", needsOriginal: false },
    file("s05_v2", "end", "我后来直接发给你、说想在它基础上改表情的那张图，其实是之前哪个文件？", (i) => i.key === "s05_v2"),
    file("sheet_03", "end", "男主的三视图里，我说比例更好的那一版是哪个文件？", (i) => i.key === "sheet_03"),
    { key: "", block: "end", say: "第 2 镜一共出了几版？只回答数字。", expect: "number", answer: "3", target: null, needsOriginal: false },
    file("s08_v2", "fork", "第 8 镜女主戴帽子的那一版是哪个文件？", (i) => kf(i)?.shot === 8 && kf(i)?.variant.prop === "hat"),
    number("s05_v2", "fork", "第 5 镜男主站在画面中间的那一版，角落里的数字是多少？", numberAt("s05_v2")),
  ];
  const counts = { mid: 0, end: 0, fork: 0 };
  for (const question of questions) question.key = `${{ mid: "M", end: "Q", fork: "K" }[question.block]}${++counts[question.block]}`;
  return { images, steps, questions };
}

// ---- Scoring ----

// The model's record lines ([//]: # (cam …)) are not part of what the user sees.
export const visible = (reply: string) => reply.replace(/\[\/\/\]:[ \t]*#[ \t]*\(cam[^)\n]*\)/g, "").trim();
const CN: Record<string, string> = { 零: "0", 一: "1", 二: "2", 两: "2", 三: "3", 四: "4", 五: "5", 六: "6", 七: "7", 八: "8", 九: "9", 十: "10" };

// right, wrong (another file, number or word), or none (no answer of the asked kind: "I can't tell" and the like).
export function score(question: Question, reply: string): { verdict: "right" | "wrong" | "none"; said: string | null } {
  const shown = visible(reply);
  const judge = (said: string | null) => ({ verdict: said === null ? "none" as const : said === question.answer ? "right" as const : "wrong" as const, said });
  switch (question.expect) {
    case "file": return judge(/[\w-]+\.png\b/i.exec(shown)?.[0].toLowerCase() ?? null);
    case "number": {
      const clean = shown.replace(/[\w-]+\.png\b/gi, "").replace(/IMG-\d+/g, "").replace(/set_\d+/g, "").replace(/第\s*\d+\s*[镜版张段批轮行帧]/g, "").replace(/\bv\d+\b/gi, "");
      // Digits first: a Chinese numeral is often just a word ("一共", "一张").
      const match = /(?<![0-9])[0-9]{1,3}(?![0-9])/.exec(clean)?.[0] ?? /[零一二两三四五六七八九十]/.exec(clean)?.[0] ?? null;
      return judge(match === null ? null : CN[match] ?? match);
    }
    case "word": {
      const options = question.answer === "坐" ? ["坐", "站", "举", "指", "跳"] : ["左", "右"];
      const hit = options.map((word) => ({ word, at: shown.indexOf(word) })).filter((item) => item.at >= 0).sort((a, b) => a.at - b.at)[0];
      return judge(hit?.word ?? null);
    }
    case "text": return { verdict: /weather/i.test(shown) ? "right" : "wrong", said: shown.slice(0, 80) };
  }
}
