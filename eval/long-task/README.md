# Eval: a long task in Claude Code, compacted twice, then forked

**English** · [简体中文](README_CN.md)

Tested on 2026-11-01. Plugin 0.10.0 (the branch before release, commit `b16d202`), against 0.9.1, 0.10 before its cache fix (commit `b5e986c`) and no plugin. Claude Code CLI 2.1.314, model `claude-haiku-5-5`, effort low, Windows 11. Each arm ran once for the record; before that, three short trial runs (3 turns) found the problems in the scene described under [What the trial runs taught](#what-the-trial-runs-taught).

## Findings

- **After two compactions and a fork, each plugin arm answered 19 of 20, no plugin 20 of 20.** Each missed a different question:
  - **0.9.1** missed one in the forked session, where it could not see the images from before the compaction; the three it tried to fetch were "not found". That is what 0.10 fixes: after the fork it put the list of all 51 images back, and both runs answered both questions there.
  - **0.10 before the cache fix** missed Q7: it gave two numbers (90 and 61) and took the answer back in Q9. More than one answer counts as ambiguous, not right.
  - **0.10** missed M1: asked for the darker version of shot 2, it gave the darker version of the rainy street, `s04_v2.png`. The list put back after the compaction had "dark tones" on the line for `s02_v1.png`; the information was there, the model took the wrong line.
- **Without the plugin the model also answered 20 of 20.** Claude Code drops images when it compacts, but the summary keeps the file names, and the model read the files on disk again when it needed them (13 times while answering). All images here but the two sketches were files on disk, so this scene shows no difference in accuracy.
- **Cost: with the cache fixed, 0.10 cost about 1.3 times as much as no plugin; before the fix, about 1.9 times.** At API prices as Claude Code reports them, no plugin cost $0.036 and 0.10 $0.047; 0.10 before the fix cost $0.069, 0.9.1 $0.065.
  - **Where the cost was:** each turn the plugin replaces the previous turn's images with placeholders, which changes the history. Claude Code puts its cache marks on the last two messages only; after the change neither could read what was cached before, so in each arm 7 to 9 requests hit only the system prompt in the cache and wrote the rest of the conversation to the cache again.
  - **The fix:** the engine places the marks itself: one where an earlier request had cached and before the change, to read from; one just before the next original image to be replaced, for the next request to read. The ratings in placeholders and the list after a compaction no longer change with later replies. Requests hitting only the system prompt went from 7–9 to 1, as without the plugin; the share of input read from the cache went from 77% to 87% (no plugin: 91%).
  - **What is left:** about 4,700 more output tokens, the feature line the model writes for each image; about 25K more tokens written to the cache; about 24K more input tokens not from the cache, not yet looked into.
  - The plugin brought the largest request down from 33K to 26K tokens. At this size, with images Claude Code's Read has already turned into small JPEGs, that saving is smaller than the extra above.
- **The eval found two problems, both fixed in 0.10.**
  - **New images without IDs:** Claude Code sometimes sends a request a moment before it has written the turn's newest images to its transcript. The plugin did not know those images, so they went out without IDs and the model could not write their feature lines. That is how three of 0.9.1's images were numbered one off in turn 2. On the development machine, 119 of 8,904 logged requests had this. The engine now reads the transcript again, for up to 1.5 seconds.
  - **No new images after a compaction:** the note said "do not read image files with other tools", meaning the omitted images, which the model should fetch with `cam_view_image`. In the first 0.10 run, after the compaction the model took it for every image and did not look at any of the images the user named for five turns; it answered 18 of 20 (Q9 and K1 missed). The note now speaks of the omitted images only and says new ones are looked at as usual; both 0.10 runs since read the images every turn.
- **The list put back after a compaction is short:** about 1.6K tokens for 33 images and 2.4K for 51, under 50 tokens an image. The conversation was short, so it was 10% to 13% of the first request after each compaction.

## The scene

Keyframes and storyboard of a short film, a conversation in Chinese in the way the user usually works. 51 synthetic images drawn by the script:

- **Keyframes:** 10 shots of 2 or 3 versions, 26 in all. The user says where each shot is set, who is in it, how many versions and their file names, never how the versions differ (darker, where the person stands, a hat, an umbrella): that is only in what the model saw.
- **Extracted frames:** two clips of 8 and 6 frames; next to each other they look almost the same, a car or a person a little further along.
- **Others:** 4 screenshots of a settings page with three numbers each; 4 turnaround sheets (the heroine once, the hero twice, a side character once); two sketches the user sends in the chat; one earlier image the user sends again.
- **Ratings:** praise ("v2 has her best face, keep it"), rejection ("too dark, drop it"), part of an image ("the clothes and light are right, the expression is not"), a change of mind ("v2's light is too hard, use v3 in the end").
- **A detail only the original shows:** a faint two-digit number in a corner of every keyframe and sheet.

16 turns. In each, the user names the images to look at and the model reads them with Read (standing in for generated images, without the cost of generating them). After turn 11 (33 images) and turn 16 (51 images) the session is compacted with `/compact`, as a user types it; automatic compaction is off so all arms compact at the same place. Questions follow each compaction. At the end the session is forked with `--resume … --fork-session` and asked two more: Claude Desktop forks this way when the user edits an earlier message.

## Questions and results

Scored automatically by file name, number or keyword, strictly: a reply must give one answer, the right one; more than one counts as ambiguous, not right. ✓ is right; after ✗, what was answered instead; ～ is ambiguous. The questions are in Chinese; translated here.

| | Question | Answer | No plugin | 0.9.1 | 0.10 (before the cache fix) | 0.10 |
|---|---|---|---|---|---|---|
| | **After the first compaction** | | | | | |
| M1 | Which file is the darker version of shot 2? | s02_v1.png | ✓ | ✓ | ✓ | ✗ s04_v2.png |
| M2 | Which file is the version of shot 6 where she wears a hat? | s06_v1.png | ✓ | ✓ | ✓ | ✓ |
| M3 | Shot 2, the version where he wears a hat: what number is in the corner? | 93 | ✓ | ✓ | ✓ | ✓ |
| M4 | In the screenshots, what is the seed (the blue row) in the third? | 28 | ✓ | ✓ | ✓ | ✓ |
| | **After the second compaction** | | | | | |
| Q1 | Of the empty rainy-street shots (not the frames), which file is the darker one? | s04_v2.png | ✓ | ✓ | ✓ | ✓ |
| Q2 | Which file is the version of shot 3 where she has no umbrella? | s03_v1.png | ✓ | ✓ | ✓ | ✓ |
| Q3 | Which version of shot 3 did we settle on? | s03_v3.png | ✓ | ✓ | ✓ | ✓ |
| Q4 | Which file did I say had the clothes and light right but not the expression? | s06_v3.png | ✓ | ✓ | ✓ | ✓ |
| Q5 | Which file did I call too dark and drop? | s09_v1.png | ✓ | ✓ | ✓ | ✓ |
| Q6 | Which file is the version of shot 5 with him on the right? | s05_v3.png | ✓ | ✓ | ✓ | ✓ |
| Q7 | Shot 1, the version with her on the left: what number is in the corner? | 90 | ✓ | ✓ | ～ 90 and 61 | ✓ |
| Q8 | In the first clip, which frame has the car right under the street lamp? | clip1_06.png | ✓ | ✓ | ✓ | ✓ |
| Q9 | In the beach clip, which frame has her just covering the sun? | clip2_04.png | ✓ | ✓ | ✓ | ✓ |
| Q10 | In the screenshots, which file has the steps (the orange row) set to 50? | set_1105_4.png | ✓ | ✓ | ✓ | ✓ |
| Q11 | The second sketch I sent you: what pose is it? | sitting | ✓ | ✓ | ✓ | ✓ |
| Q12 | The image I sent you later to change the expression: which earlier file was it? | s05_v2.png | ✓ | ✓ | ✓ | ✓ |
| Q13 | Of the hero's turnaround sheets, which did I say had better proportions? | sheet_03.png | ✓ | ✓ | ✓ | ✓ |
| Q14 | How many versions of shot 2 were there? | 3 | ✓ | ✓ | ✓ | ✓ |
| | **In the forked session** | | | | | |
| K1 | Which file is the version of shot 8 where she wears a hat? | s08_v2.png | ✓ | ✓ | ✓ | ✓ |
| K2 | Shot 5, the version with him in the middle: what number is in the corner? | 49 | ✓ | ✗ images "not found" | ✓ | ✓ |
| | **Total** | | **20/20** | **19/20** | **19/20** | **19/20** |

How the four detail questions (M3, M4, Q7, K2) were answered:

| | M3 | M4 | Q7 | K2 |
|---|---|---|---|---|
| No plugin | file read again | file read again | file read again | file read again |
| 0.9.1 | original fetched | from its feature line | original fetched | ✗ |
| 0.10 (before the cache fix) | original fetched | from its feature line | ～ fetched two | from its feature line |
| 0.10 | original fetched | from its feature line | original fetched | original fetched |

"From its feature line" means the model had noted the number in the image's feature line when it looked, and answered from the list after the compaction: the noted information was kept, but fetching the original was not tested by that question. Only these few questions show that fetching originals works.

## The arms and how they ran

| | What it is |
|---|---|
| **No plugin** | Claude Code as it is. |
| **0.9.1** | The previous release, taken with `git archive v0.9.1`. Claude Code 2.1.309 and later refuse 0.9.1's mod, so it runs with 0.10's `hooks/register.js`; the two mods differ only in that, so the arm measures the compaction and resume fixes themselves. |
| **0.10 (before the cache fix)** | This branch at `b5e986c`, before the cache was fixed. |
| **0.10** | This branch: Auto-select (on by default), feature lines, the list after a compaction, `cam_view_image`, and the cache fix. |

The script runs Claude Code's command line one process per session and sends messages one by one, as Claude Desktop does (`--input-format stream-json`). The eval uses a Claude Code configuration folder of its own (`CLAUDE_CONFIG_DIR`), with nobody's skills, settings or history; the plugin is loaded with `--plugin-dir`, each arm with its own engine port and data folder. The model may use only Read and `cam_view_image`; it works in a folder outside the repository, so no CLAUDE.md of ours reaches it.

## Cost and tokens

The whole session of an arm, from the first turn to the last question, the two compactions and the fork included. Tokens and cost are Claude Code's own totals for the session (`modelUsage`, `total_cost_usd`).

| | Requests | Input not from the cache | Cache read | Cache write | Output | From cache | Requests hitting only the system prompt | Largest request | Cost |
|---|---|---|---|---|---|---|---|---|---|
| No plugin | 56 | 5,946 | 975,343 | 85,827 | 19,801 | 91.4% | 1 | 33,156 | $0.036 |
| 0.9.1 | 56 | 6,103 | 1,026,427 | 198,760 | 29,442 | 83.4% | 7 | 29,309 | $0.065 |
| 0.10 (before the cache fix) | 52 | 6,089 | 817,710 | 236,367 | 29,016 | 77.1% | 9 | 26,524 | $0.069 |
| 0.10 | 56 | 30,130 | 958,904 | 111,336 | 24,508 | 87.1% | 1 | 25,940 | $0.047 |

"From cache" is the cache reads over all input (not from the cache, read from it, written to it). The first 0.10 run (with the old note) skipped the images in five turns and so made fewer requests; it is left out of the comparison ($0.0365). While the cache was being fixed, the first two versions ran once each, at $0.047 and $0.065: a single run varies a good deal.

The list put back after a compaction (0.10):

| | Images | List, about | First request after it | Share |
|---|---|---|---|---|
| First compaction | 33 | 1,563 tokens | 15,182 | 10.3% |
| Second compaction | 51 | 2,357 tokens | 17,909 | 13.2% |

The list's tokens are estimated with factors calibrated on Claude's own output (about 1.3 tokens a Chinese character, 0.45 any other); the requests' tokens are as the API reported them.

## What the trial runs taught

- **The corner number stood out too much:** at first it was white digits on a dark plate, and the model wrote it into its feature lines, so the detail questions needed no original. It is now small and faint; some feature lines still note it, and those questions may then be answered without fetching ("from its feature line" in the table above).
- **Tint alone was not enough:** one question asked for "the warm-toned version", but the study's background is warm anyway, and the model picked another version. The versions now differ in ways one sees at once: darker, where the person stands, a hat, an umbrella.
- **New images without IDs:** in one trial turn three images went out without IDs; that was the transcript timing above, fixed in 0.10.

## Limits

- Each arm ran once, which says nothing statistically: a single run's cost varies as much as shown above, and three plugin arms each missing a different question does not show which is more accurate. One small model (Haiku 5.5, effort low), Claude Code only; the matching checks for Codex are the repository's self-tests, not this eval.
- Small: 51 images, two compactions. A real session of the user's can have over two hundred images; without the plugin its requests would be much larger and Claude Code would compact sooner. How large the full list can get before it stops being enough was not tested.
- The images are synthetic and small (512×768), and Claude Code turns them into JPEGs when it reads them, so the images themselves take few tokens. Large generated images or many screenshots may give other results.
- No plugin did as well because the images are on disk and their names stay in the summary. For images pasted into the chat with no file on disk, only the plugin can bring the original back after a compaction; here the sketch question could be answered from what the model had said before, so this case was not tested.

## Another test: replaying a real session

Before the release a real long session was also replayed (2026-10-31, Claude Desktop, Sonnet 5.5, effort medium). The material is the user's own project and is not published, so it cannot be reproduced; only the numbers are given here. The user's words and images were replayed turn by turn: 152 images read, a compaction at each of the two places where the real session was compacted (at 94 and at 127 images), and 12 questions afterwards, all with the right IDs and no wrong image fetched. It found three problems, all fixed: an image could get no ID when parallel reads came back out of order (since 0.4), ratings were cut in half, and an image sent again was listed twice.

## Run it yourself

You need Claude Code's command line (`claude` on PATH), a Claude account that can use Haiku 5.5, Node 24 and this repository's git history (the 0.9.1 arm is taken from the tag `v0.9.1`). The images are drawn by the script; nothing to download. Sign in once for the eval's own configuration folder:

```bash
CLAUDE_CONFIG_DIR=local/eval-long/claude claude auth login
node spike/src/eval-long.ts --label run1
node spike/src/eval-long-summary.ts --label run1 --out eval/long-task/results/<date>
```

Windows PowerShell does not take the first line's form; sign in like this instead (the last command clears the variable so later `claude` commands in that terminal do not use the eval's configuration; the eval script sets it itself):

```powershell
$env:CLAUDE_CONFIG_DIR = "local/eval-long/claude"; claude auth login; Remove-Item Env:CLAUDE_CONFIG_DIR
```

- `--runs off/haiku,v0.9.1/haiku,v0.10/haiku` picks the arms (the model can also be `sonnet`); `--effort` the effort (default low); `--quick` runs 3 turns, one compaction and 5 questions, to check the setup.
- The script watches the account's usage and stops once the weekly share reaches 90% (`--stop-at`); near the end of the five-hour window it waits for the window to start again.
- The three arms run side by side by default, each in about 3 to 5 minutes.

[results/2026-11-01](results/2026-11-01/) has the summary of the runs: each answer, the images fetched, each arm's tokens and cost; 0.10 with the cache fix is in [results/2026-11-01-final](results/2026-11-01-final/). Replies are kept as they were, without local paths.
