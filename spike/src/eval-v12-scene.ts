// Purpose: eval — the scene of v0.12's eval (docs/v0.12/plan.md §6): the same short film as eval-long-scene.ts (ten
// shots of two or three versions, four character sheets, two clips of video frames, four settings screenshots, two
// sketches, an image sent again), drawn twice as large (1024×1536 keyframes), and this time mostly only in the
// conversation: the keyframes come from a stand-in generation tool (eval-v12-gen-server.ts) that returns them once and
// keeps no file, and the sheets, sketches and screenshots are pasted into messages. Only the clips' frames are files the
// model reads with Read, as the control: after a compaction a model can read those again with or without the plugin.
// Questions come after the last compaction, the same in each fork: what the pictures show, what the user said about
// them, and one action (generate a new version from the final one: which asset goes in as the reference).
// Input: none. Output: the images (eval-long-scene.ts's, with where each comes from), the turns, the questions.

import { scene as longScene, type Image, type Question } from "./eval-long-scene.ts";

export type Source = "generated" | "pasted" | "file";
export type Turn = { say: string; paste: string[] };
// A question as in eval-long-scene.ts, with what it tests: an image only in the conversation, a file on disk, or the
// action (no reply to score: the reference the model passes to the tool).
export type V12Question = Question & { kind: "conversation" | "file" | "action"; reference?: string };
export type V12Scene = { images: Array<Image & { source: Source }>; turns: Turn[]; questions: V12Question[] };

const WHO: Record<string, string> = { her: "女主", him: "男主", side: "配角" };
const SIZE: Record<string, string> = { wide: "全景", medium: "中景", close: "近景" };
const PLACE: Record<string, string> = { study: "书房", rain: "雨夜街道", beach: "黄昏海边", bamboo: "竹林", rooftop: "夜晚屋顶", cafe: "咖啡馆" };

export function v12Scene(quick = false): V12Scene {
  const { images: base, questions: old } = longScene();
  const sourceOf = (image: Image): Source => (image.kind === "keyframe" ? "generated" : image.kind === "frame" ? "file" : "pasted");
  const images = base.map((image) => ({ ...image, source: sourceOf(image) }));
  const keyframes = (shot: number) => images.filter((image) => image.kind === "keyframe" && image.shot === shot) as Array<Extract<Image, { kind: "keyframe" }>>;
  // The user names the shot, where it is, who is in it and how many versions, never how they differ.
  const shot = (n: number) => {
    const list = keyframes(n);
    const first = list[0];
    const who = first.who ? `${WHO[first.who]}${SIZE[first.size]}` : "空镜";
    return `第 ${n} 镜，${PLACE[first.place]}，${who}，出 ${list.length} 版`;
  };
  const generate = (...shots: number[]) => `用 generate_shot 生成${shots.map(shot).join("；")}。看一下，简单说一两句。`;
  const turns: Turn[] = [
    { say: "我们在做一部短片的关键帧和分镜。关键帧用 generate_shot 工具生成：传镜号，它按这一镜的设定一次出几版，每版是一张图，名字像 s01_v1.png；同一镜不会再出一样的图。视频抽的帧在当前文件夹里，用 Read 看。我直接发给你的图也一样看。每轮看完简单说一两句就行，别展开分析；不用改文件，也不用跑命令。人物：女主穿红裙、黑色长发；男主穿蓝外套、棕色短发；配角穿绿大衣、灰头发、戴眼镜。\n\n" + generate(1), paste: [] },
    { say: generate(2), paste: [] },
    { say: generate(3), paste: [] },
    { say: "这是我画的两张简笔画，后面按这个姿势出图。", paste: ["sketch1", "sketch2"] },
    { say: `第 3 镜 v2 女主的脸最好，先定它。${generate(4)}`, paste: [] },
    { say: generate(5), paste: [] },
    { say: "两张三视图：第一张是女主，第二张是男主。看一下。", paste: ["sheet_01", "sheet_02"] },
    { say: generate(6), paste: [] },
    { say: "第 1 段视频（雨夜街道）抽了 8 帧：clip1_01.png 到 clip1_08.png，都看一下，看车的动作连不连贯。", paste: [] },
    { say: "我截了 4 张生成工具的设置页，按顺序是第 1 到第 4 张。绿色那一行是时长，蓝色是种子，橙色是步数，帮我看看有没有填错的。第 6 镜 v3 衣服和光都对了，但表情不对，表情还是参考 v1。", paste: ["set_1105_1", "set_1105_2", "set_1105_3", "set_1105_4"] },
    { say: "这张你看一下，我想在它基础上把表情改得自然一点。", paste: ["resend1"] },
    { say: generate(7), paste: [] },
    { say: `第 3 镜我改主意了：v2 光太硬，最后用 v3。${generate(8)}`, paste: [] },
    { say: "海边那段视频也抽了 6 帧：clip2_01.png 到 clip2_06.png，看看女主走路的节奏。", paste: [] },
    { say: generate(9, 10), paste: [] },
    { say: "男主三视图第二版（第一张），这版比例更好；第二张是配角的。第 9 镜 v1 太暗，不要了。看一下。", paste: ["sheet_03", "sheet_04"] },
  ];
  const pick = (key: string) => {
    const found = old.find((question) => question.key === key);
    if (!found) throw new Error(`no question ${key}`);
    return found;
  };
  const conversation = (key: string, say?: string): V12Question => ({ ...pick(key), ...(say ? { say } : {}), kind: "conversation" });
  const questions: V12Question[] = quick ? [
    conversation("M1"),
    conversation("M3"),
    { key: "A1", block: "end", say: "用第 1 镜女主站在画面中间的那一版做参考，再生成一版第 1 镜。", expect: "text", answer: "", target: "s01_v2", needsOriginal: false, kind: "action", reference: "s01_v2" },
  ] : [
    conversation("M1"), conversation("M2"), conversation("M3"),
    conversation("M4", "我发给你的设置页截图里，第 3 张的种子（蓝色那一行）是多少？只回答数字。"),
    conversation("Q3"), conversation("Q4"), conversation("Q5"), conversation("Q6"),
    { ...pick("Q8"), kind: "file" },
    { key: "D1", block: "end", say: "第 1 段抽帧的第 3 帧（clip1_03.png）里，车在路灯的左边还是右边？只回答左或右。", expect: "word", answer: "左", target: "clip1_03", needsOriginal: true, kind: "file" },
    conversation("Q12", "我后来直接发给你、说想在它基础上改表情的那张图，其实是之前生成的哪一版？只回答文件名。"),
    conversation("Q2"),
    { key: "A1", block: "end", say: "用第 3 镜最后定的那一版做参考，再生成一版第 3 镜。", expect: "text", answer: "", target: "s03_v3", needsOriginal: false, kind: "action", reference: "s03_v3" },
  ];
  return { images, turns: quick ? turns.slice(0, 3) : turns, questions };
}
