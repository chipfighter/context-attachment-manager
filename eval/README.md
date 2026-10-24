# Evaluation: a keyframe chat in Codex, with and without the plugin

**English** · [简体中文](README_CN.md)

Run on 2026-10-24. Plugin 0.9.0, plus 0.7.1 for comparison. Codex app-server from Codex desktop (`codex-cli 0.163.0-alpha.11`), model `gpt-6-sol` at low reasoning effort, Windows 11. This is a small test: one scenario, one final run per setup, plus two pilot runs that shaped it.

## In short

- **Without the plugin, the chat could not be sent whenever Codex had to send it whole.** Nine keyframes make the conversation 42.4 MB (31.8 MB compressed on the wire). That happened after a restart and right after a compaction: 6 of 6 times across three runs, the request never went out. Codex showed `Reconnecting... 1/5` to `5/5`, then kept retrying over HTTP until we stopped it.
- **With the plugin, the same requests were 0.12 MB and went through.** Turns that bring new images still send those images. The plugin leaves out the earlier ones.
- **Finding images:** with 0.9.0 the model picked the right file 6 of 6 times before the compaction and 6 of 6 after it. For the two questions that need a detail only the original shows, it fetched exactly that one image each time.
- **Tokens are not the main gain.** Input tokens were 16% lower in total and the last request's context 37% smaller. But 36% more of them missed the prompt cache, so the cost depends on the cache discount. If cached tokens cost a tenth, it comes out about even.
- **Feature lines (added in 0.8) made no difference in a task this short.** 0.7.1, which has none, also found 6 of 6 after the compaction. Most likely Codex's own compaction summary still described nine images. The long tasks that led to feature lines were not tested here; see [Limits](#limits).

## The task

A short-drama keyframe chat, in Chinese, as a user would have it. Nine synthetic keyframes, 1024×1536 PNG, 3.2–3.9 MB each, drawn by the script with grain so they weigh what generated images weigh. Each has a digit hidden in one corner. The user names the place of each scene but never says which image is which, and rates images by position:

| Turn | The user says | Images |
|---|---|---|
| 1 | The heroine wears red, long black hair; the hero wears blue, short brown hair. Scene 1 is in the study: two keyframes. | S1 heroine, medium · S2 hero, medium |
| 2 | Scene 2, a street on a rainy night: two. | R1 heroine, close-up, dark · R2 the empty street |
| 3 | The first one last turn is too dark; here is a redone version. | R3 heroine, close-up |
| 4 | Scene 3, the beach at dusk: two. | B1 hero, medium · B2 heroine, close-up |
| 5 | The second one last turn: the face is the best so far. | – |
| 6 | Scene 4, the bamboo grove: two. | Z1 heroine, medium · Z2 hero, close-up |

Then come questions with known answers. Each question is about a different image, so no answer gives away the next one:

| | Question | Answer |
|---|---|---|
| F1 | Which file is the empty shot of the rainy street, with no one in it? | R2 |
| F2 | Which one did I say had the best face? | B2 |
| F3 | The heroine's rainy-night close-up has two versions; which file is the redone one? | R3 |
| F4 | Which file is the hero's medium shot in the study? | S2 |
| F5 | Which file is the hero's medium shot on the beach? | B1 |
| F6 | Which file is the heroine's medium shot in the bamboo grove? | Z1 |
| D1 | The hero's close-up in the bamboo grove has a digit in a corner. Which digit? | 7 |
| D2 | The heroine's medium shot in the study has a digit in a corner. Which digit? | 4 |
| N1 | Translate "今天天气很好" into English. | (no image needed) |

Each setup runs two tasks in its own Codex app-server:

- **Task 1:** the six turns, then F1–F5, D1, D2 and N1. Then app-server restarts and the task is resumed, so Codex must send the whole conversation again, and F6 is asked.
- **Task 2:** the six turns, then a compaction (`thread/compact/start`), then all nine questions.

Answers are scored by matching the file name or digit. A step that fails, or gets no answer within 3 minutes (10 for an upload turn), ends its task.

## Setups

| | What runs |
|---|---|
| **No plugin** | Codex as it is. A relay of the plugin's engine sits in between only to count bytes; it rewrites nothing, and Codex keeps its WebSocket. |
| **0.9.0** | This repository's plugin: automatic selection (on by default), feature lines, `cam_view_image`. |
| **0.7.1** | The last release before feature lines, from `git archive v0.7.1`: automatic selection, but placeholders carry only the id, name, source, turn and size. |

In all three, the tools that act on the machine are off, the sandbox is read-only, and the test tasks are archived at the end.

## Results

### Could the request be sent?

| | After a restart (task 1) | After a compaction (task 2) |
|---|---|---|
| No plugin | Not sent: 42.4 MB | Compaction itself fine; the next question not sent: 42.4 MB |
| 0.9.0 | Sent: 0.13 MB | Sent: 0.12 MB |

Without the plugin, Codex sends only what is new over an open WebSocket, so the six turns themselves go through. When it has to send everything again, two things fail:

- **WebSocket:** the 31.9 MB message was refused within 6–11 seconds, every time. That is far too short to upload it, so it looks like a size limit.
- **HTTP** (Codex's fallback): each attempt was cut after about 61 seconds.

A compaction does not help. Codex keeps the user's messages and their images, and replaces only its own replies with an encrypted summary: the request after it still carries all nine images. The compaction itself went through because the WebSocket was still open, so Codex had little more than the compaction marker to send.

![Largest request of each step in task 2: the whole conversation grows to 42.4 MB, while the plugin sends the new images of a turn and about 0.1 MB otherwise](results/2026-10-24/request-size-en.svg)

### Finding the right image, before and after a compaction

| | Before the compaction (task 1) | After the compaction (task 2) | Corner digits | Images fetched |
|---|---|---|---|---|
| No plugin | 5/5; F6, after the restart, never went out | the first question never went out | 2/2 | – (sees every image) |
| **0.9.0** | **6/6** | **6/6** | **4/4** | 4: one for each digit question, none for finding a file |
| 0.7.1 | stopped at turn 5 by the network\* | 6/6 | 2/2 | 2: one for each digit question |

\* The engine's connection to the upstream through the local proxy never opened, so the request was not sent at all. It is not counted.

Without the plugin the model sees every original, so its pre-compaction score is the ceiling. With the plugin, earlier images are placeholders. The model answered the find questions from what it had noted, and fetched only the originals that the digit questions needed.

### Tokens

Task 1, the same 14 steps from the first upload to N1:

| | Input tokens | Cached | Not cached | Output | Context of the last request |
|---|---|---|---|---|---|
| No plugin | 501,803 | 471,680 | 30,123 | 326 | 38,786 |
| 0.9.0 | 421,870 | 380,928 | 40,942 | 766 | 24,421 |

Leaving the earlier images out takes about 14k tokens off the context. But every time a turn's images turn into placeholders, the cached prefix breaks at that point, so more tokens miss the cache. Output grows by the feature lines.

## What the pilot runs taught us

- **Pilot 1:** the user described every image ("the first one is the heroine, medium shot"). Codex keeps the user's messages through a compaction, so every find question after it could be answered from the user's own words. That tested nothing about memory, and the scenario was rewritten so the user never says which image is which.
- **Pilot 2:** the user never named the places. The model did not take the synthetic beach (an orange sky over blue lines) or bamboo grove (green stripes) for what they were, and its feature lines said "street" and "green wall". Asked for "the hero's medium shot on the beach", 0.9.0 twice answered "there is no such image" instead of fetching to check. 0.7.1 got those right in that run. A feature line is only as good as what the model saw in the image, and when it doesn't match, the model may say no rather than look again. The final scenario names the places, as a user would.

## Limits

- One final run per setup: no statistics.
- Synthetic images. Real keyframes are easier to recognize, and look more alike.
- One model (`gpt-6-sol`, low effort) and Codex only; Claude Code was not tested.
- A short task: nine images and one compaction. The case that led to feature lines was a long task in which, after a compaction, the model picked an early medium shot instead of the close-up the user had called the best. A test like that needs dozens of images and several compactions.
- One machine, uploading through a local proxy, where HTTP requests of 7.8 MB took 25–65 seconds. The WebSocket refusal came within seconds regardless. Whether HTTP could carry 42 MB on a faster link was not tested.

## Run it yourself

It needs Windows with Codex desktop (the script uses its bundled app-server), a ChatGPT login with access to `gpt-6-sol`, and Node 24. It creates test tasks named `[CAM测试] 评测 …` in your Codex and archives them at the end. The images are drawn by the script, so nothing needs downloading.

```bash
mkdir -p local/eval/v0.7.1 && git archive v0.7.1 plugin | tar -x -C local/eval/v0.7.1
node spike/src/eval-keyframes.ts --label run1
node spike/src/eval-summary.ts --runs run1 --out eval/results/<date>
```

`--arms off,on,v07` and `--threads X,Y` pick setups and tasks, and `--draw` only writes the images. A run stopped halfway leaves its tasks unarchived; `node spike/scripts/archive-test-threads.ts` archives them.

[results/2026-10-24](results/2026-10-24/) has every step of the final run: answers, what was fetched, request sizes and token counts. Replies keep their text; thread ids and local paths are left out.

## Earlier checks

Before this evaluation, each release was checked with self-tests on synthetic images. They run every model in Chinese and English, but only once each, so they are pass/fail checks, not measurements:

| Self-test | What it checks | Results |
|---|---|---|
| `spike/src/v01-placeholder-selftest.ts`, `v01-needs-selftest.ts` | The model keeps what it said about images that became placeholders, and asks for one by id when it needs it | [v0.1 reports](../docs/history/v0.1/) |
| `spike/src/v03-auto-selftest.ts` | With automatic selection, the model fetches when an answer needs the original and leaves the tool alone when it doesn't | [design.md §10](../docs/design.md) |
| `spike/src/v07-children-selftest.ts` | Subagents and side chats leave out and fetch images too | [v0.7 plan §5](../docs/v0.7/plan.md) |
| `spike/src/v08-features-selftest.ts` | Feature lines are written, ratings are noted on the right image, and after a compaction the model picks the close-up the user rated the best | [v0.8 plan §3, §5](../docs/v0.8/plan.md) |

Unit tests (`cd spike && node --test`) and install and upgrade smoke tests run in CI on Windows, macOS and Linux.
