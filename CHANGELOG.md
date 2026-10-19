# Changelog

When a version is released, its section here becomes the GitHub release notes.

## [0.8.0] - 2026-10-20

The model keeps notes on your images, and the panel finds them by what you remember.

### Features

- The model notes what each new image shows: the scene first, then what can be seen, such as "rainy blue night | close-up, facing the camera, neon reflections". When you rate an image ("the first one is too dark", even turns later), it notes your words under that image. It writes these notes at the start of its reply as Markdown link definitions, which Codex and Claude Desktop don't display, and doesn't mention them in its answer.
- Placeholders carry the notes, with the latest three ratings and the turns they came from, so after a compaction, or many turns later, the model can still tell the images apart. In the case that started this release, a face close-up the user had called the best and a half-length shot from the start of the task, the model picked the close-up after the task was compacted, without fetching.
- New images carry their ID from the turn they appear in, so the model can match your words to the right image at once. The placeholder's second line is shorter, to make room for the notes.
- The panel is redone as one screen:
  - A card at the top with the next request's estimated size, the savings and what the next message sends. *Show details* adds the last request, the images the model fetched in the latest turn, and what subagents and side chats saved.
  - A search box that finds images by what they show, by scene, or by what you or the model said in that turn, and filters for uploads, generated images and each scene.
  - Thumbnails grouped by turn, newest first, with small marks. Images that won't be sent are gray, and the box at the end of a turn's line covers the whole turn.
  - Click a thumbnail to preview it across the panel, with a *Send every turn* checkbox (Auto-select) or a *Send* checkbox (manual). Click outside the image or press Esc to go back.
  - An ID in the *Model needs* bar or among the fetched images scrolls to that image and flashes it, clearing a search or filter that hides it.

### Changes

- Subagents and side chats in Codex always follow Auto-select. The *Auto-select too* switch is gone; where it was off in 0.7, it is on again.
- The search and filters replace the source filter of 0.2. Pinned images are now called *Send every turn*.
- In Claude Code, requests are rewritten as soon as a session has images, to add the note for the model and the IDs, not only once you uncheck one. On Claude accounts created on or after August 31, 2026, this leaves out the earlier thinking of the turn in which the first image came in, once.
- In Codex, a task with Auto-select off is left alone until you uncheck an image, as before: its requests go out as they are, over WebSocket, and the model keeps no notes there until then.

### Fixes

- The engine no longer exits when Codex resets a WebSocket connection the engine has declined, which Codex does when the engine moves a task to HTTP. In 0.7.1 the engine process exited then, and requests failed until it was started again.

### Notes

- Tested on Windows with the app-server of Codex 0.163 (the one Codex desktop 26.1013 ships) and GPT-6 Sol, Luna and Astra at low effort, in Chinese and English. New images got a note, ratings were noted on the right image, and the replies didn't mention them. After `thread/compact/start`, all four images of the user's case were placeholders with notes; asked which one to use as a face reference, all six runs chose the close-up rated the best, without fetching.
- The release self-tests (placeholders, `need IMG-xxx`, Auto-select, subagents and side chats, and the new notes test) passed with GPT-6 Sol and Astra in both languages. GPT-6 Luna failed five of its ten runs: it misread a fetched corner digit (5 as 3), as in 0.3 and 0.6; once asked for images to be attached instead of fetching them; once said it couldn't see an unchecked image without asking for it by ID; once missed a rating; and once its subagent didn't fetch the image of its first turn. Since the model often notes small details in the upload turn, the Auto-select test now also accepts an answer taken from the model's own notes.
- In Claude Desktop with Claude Code 2.1.299 and Claude Haiku 5.5, in Chinese and English, the notes were written at the start of replies and stayed hidden, and ratings were noted on the right image. Those ratings were relayed from another session, worded as the user's own. Ratings typed in the session itself, whether a note shows for a moment while a reply streams in, and the notes after `/compact` are not tested yet.
- GPT-6 Luna at low effort sometimes missed a rating, more often in English, and twice gave no visible reply in a turn where the user only rated images. Claude Haiku 5.5 in English opened its reply to a rating with "Noted:".
- Claude Desktop shows a link definition that ends the latest reply, which is why the notes go at the start. A place that shows the raw reply may show them; Claude Code in a terminal is not checked yet.

## [0.7.1] - 2026-10-16

Bug fixes for child tracking and interrupted HTTP requests.

### Fixes

- Codex composer prediction requests no longer appear as side chats in the task's panel. [#7](https://github.com/chipfighter/context-attachment-manager/pull/7), fixes [#3](https://github.com/chipfighter/context-attachment-manager/issues/3).
- Tracking a subagent or side chat now retries after a temporary write failure, so a failed first write does not keep it out of the task's panel. [#9](https://github.com/chipfighter/context-attachment-manager/pull/9), fixes [#6](https://github.com/chipfighter/context-attachment-manager/issues/6).
- Cancelling an HTTP request now closes its pending or active upstream connection. If an upstream response breaks partway through, the client is notified instead of being left waiting, so it can report or retry the failure. [#8](https://github.com/chipfighter/context-attachment-manager/pull/8), fixes [#4](https://github.com/chipfighter/context-attachment-manager/issues/4) and [#5](https://github.com/chipfighter/context-attachment-manager/issues/5).

### Notes

- Tested on Windows with GPT-6 Sol at low effort: automatic image selection, fetching images when needed, cancelling a response, and recovery after an interrupted upstream response. Codex retried the interrupted response successfully and continued the conversation.
- CI checks unit tests, plugin installation and startup, and install/uninstall scripts on Windows, macOS and Linux. Claude Code was not live-tested for this patch.

## [0.7.0] - 2026-10-14

Subagents and side chats in Codex follow Auto-select too.

### Features

- Side chats no longer resend the task's images. A side chat you open in a Codex task carries the task's whole history, images included; it now goes out with those images as placeholders, except the ones you pinned, and when an answer needs one, the model fetches it from the task by ID. Reported in [#2](https://github.com/chipfighter/context-attachment-manager/issues/2), where a text-only question in a side chat carried 39 images (48.75 MB) and failed with `Broken pipe`.
- Subagents the model starts without the task's history leave out the images of their own earlier turns and fetch the ones they need by ID. The same goes for subagents they start.
- The task's panel lists its subagents and side chats once they have sent a request: folded to one line with how many there are, what their last requests saved, and an *Auto-select too* switch, on by default, also in tasks from before 0.7. Unfold it to see each one's name, rule and last request. Switched off, their requests go out as they are.
- Subagents started with the task's history follow the task's checks, as before. Claude Code works as in 0.6.0.

### Fixes

- A task forked in Codex could lose the checks it takes over from the original task when its first request came while Codex was still writing the task's record.

### Notes

- Tested on Windows with the app-server of Codex 0.162 (the one Codex Desktop ships) and GPT-6 Sol, Luna and Astra at low effort. A side chat left out the task's two images, answered a text-only question without them, and fetched one back from the task to read a digit in its corner. A subagent's second turn left out the image of its first turn and fetched it back. With the switch off, both went out as they were. The panel listed each side chat and subagent with the right numbers. GPT-6 Luna's subagent once couldn't find the image file it was told about, and once Luna didn't start a subagent at all; that is the model, and the next try worked.
- Codex doesn't document side chats and subagents for plugins: the plugin recognizes them from what Codex sends with each request. If that changes, they go out as they did before 0.7, and the task itself is not affected.
- Images a subagent reads during one long turn all stay in that turn, as Auto-select keeps the current turn's images; they are left out from its next turn on.

## [0.6.0] - 2026-10-13

Auto-select on by default, and the panel opens by itself in Claude Desktop.

### Features

- New tasks in Codex and new sessions in Claude Code start with Auto-select on: images from earlier turns are left out, and the model fetches the ones it needs by ID, so long conversations stay small even if you never open the panel. Tasks and sessions you had before keep their setting, and switching Auto-select off in the panel sticks.
- In Claude Desktop the panel opens by itself in the built-in browser once a session has images: when the model read an image, as that turn ends; when you paste one, as your message goes out. You no longer need to type `/cam`.
- When you have been away from a session for about 30 minutes, Claude Desktop closes its built-in browser; the panel then opens again with your next message. If you close it yourself, it stays closed in that session until you type `/cam`, which also leaves just one panel tab.
- In Codex, tasks you had before work as in 0.5.0.

### Notes

- Tested on Windows in Claude Desktop with Claude Code 2.1.295 and Claude Haiku 5.5: new sessions started with Auto-select on; the panel opened by itself once the model had read images; closed in the session, it stayed closed; closed by Claude Desktop after the session had been left for 30 minutes, it opened again with the next message. In Codex, new tasks started with Auto-select on with GPT-6 Sol, Luna and Astra.
- With Auto-select on, the model can fetch several images at once. Asked about two images it had not described, GPT-6 Sol, Luna and Astra in Codex and Claude Haiku 5.5 in Claude Desktop each fetched both in one call. GPT-6 Luna then misread a small digit in one of them, as in 0.3; pin images whose details matter, or use a larger model.
- The plugin tells your close from Claude Desktop's by time: a panel gone within 30 minutes of the session's last turn was closed by you. If you close it more than 25 minutes into a pause, it may open again with your next message.

## [0.5.0] - 2026-10-13

Your choice survives compaction in Claude Code.

### Features

- When Claude Code compacts a conversation (`/compact`, or on its own when the context fills up), it replaces the history with a summary and stops sending the images from before it. The plugin now keeps your selection: the images you checked still go to the model, right after the summary and marked with their IDs, and the ones you unchecked stay out, with a placeholder there. With Auto-select on, pinned images go out and the model fetches the others by ID when it needs them. Change the selection any time; it applies from the next message.
- The model is told which images came before the compaction and how to get one back (`need IMG-xxx`, or `cam_view_image` with Auto-select on), and that what it said about them while it could see them still stands.
- The panel marks these images *Before compaction*, counts the checked ones in the request estimate, and the last-request line says how many it sent again.
- The images come from Claude Code's own session record on your machine; nothing is copied.
- In Codex, the panel and the requests it sends work as in 0.4.0.

### Notes

- Tested on Windows in Claude Desktop with Claude Code 2.1.295 and Claude Haiku 5.5, in Chinese and English, in sessions compacted with `/compact`: after the compaction the model answered from the images sent again; with one unchecked, it said it could not see it now, kept its earlier answers and asked with `need IMG-xxx`; checked again, it answered from the image. With Auto-select on, images from before the compaction can be fetched; in our test session, which had asked with `need IMG-xxx` many times before, the model kept asking that way until told it could fetch. A newer account was simulated as in 0.4, and the conversation went on.
- Images sent again take up context like any other, and Claude Code's own context meter doesn't count them. If requests get large, uncheck some or switch on Auto-select: the plugin doesn't decide this for you. Anthropic limits each request to 100 images for models with a 200k-token context window (600 for others), each up to 8000 px (stricter with more than 20 images; under 2000 px is safe), and 32 MB in all.
- After an image is checked again, the model sometimes says that its earlier "I can't see it" was a mistake. Its answer is right; the remark isn't, since the image really was left out then.

## [0.4.0] - 2026-10-11

Now in Claude Desktop too, under a new name: Context Attachment Manager.

### Features

- Works with Claude Code in the Code tab of Claude Desktop. Install the plugin from this repository's marketplace and type `/cam` in a session: the same panel as in Codex opens in Claude Desktop's built-in browser, next to the conversation. The image list, previews, unchecking single images or whole turns, filters, the request estimate, `need IMG-xxx`, Auto-select and both languages work as in Codex.
- Nothing to configure: the plugin points each Claude Code session at the local engine when the session starts and puts it back when the session ends. Your Claude subscription sign-in is passed through unchanged, and no settings files are edited.
- Claude accounts created on or after August 31, 2026 check the model's earlier thinking against the conversation before it. On such accounts the engine leaves out the earlier thinking that no longer matches the conversation as sent, so unchecking still takes effect. Thinking from after the change is kept, and checking an image again brings back the thinking from before. The panel says how many thinking records the last request left out.
- With Auto-select on in Claude Code, the model's `cam_view_image` calls don't ask for permission; your own settings and hooks still apply.
- The project is renamed from Codex Attachment Manager to Context Attachment Manager, and the repository to `chipfighter/context-attachment-manager`; old links redirect. The install ID (`codex-attachment-manager`) and the data folder stay the same, so upgrading works as before.
- In Codex, the panel and the requests it sends work as in 0.3.0.

### Notes

- Tested on Windows in Claude Desktop with Claude Code 2.1.295 and Claude Haiku 5.5, in Chinese and English: after images were left out, the model kept its earlier descriptions, asked for images by ID when it needed them, and fetched them itself with Auto-select on. Newer accounts were simulated with Anthropic's own switch for this check.
- Leaving out earlier thinking has a cost: without its earlier reasoning, the model may think again and use more tokens. In one test, the same follow-up question took 2,422 thinking tokens instead of 29. This happens only on newer accounts, and only to thinking that came after an image you left out.
- Not tried yet in Claude Desktop: forking, `/compact` and `/rewind`, subagents, uninstalling and reinstalling, restarting the app, a sign-in refresh, and macOS and Linux. Feedback in the issues is welcome.
- Claude Desktop can't add a plugin marketplace from GitHub by itself yet, so adding this one takes the `claude` command once; see the README. Without Codex installed, the plugin needs Node 24 or later.
- If `/cam` is the first message of a new session, the prompt box may say the command doesn't exist. Send it anyway: Claude Desktop starts the session with your first message, and the plugin adds `/cam` then.

## [0.3.0] - 2026-10-06

Let the model pick the images it needs.

### Features

- An *Auto-select* switch at the bottom of the panel, for each task. With it on, images from earlier turns are left out by default, even one generated a turn ago, and the model fetches the ones it needs by ID with the plugin's `cam_view_image` tool, for that turn only. The placeholders before a fetched image stay as they were, so the cached part of the request isn't broken.
- Check an image to pin it: pinned images go every turn. Pins are kept apart from your own checks, which come back as they were when you switch Auto-select off.
- The panel lists what the model fetched in the latest turn and marks those rows; click an ID to jump to one. The request estimate becomes a minimum, since what the model will fetch isn't known beforehand.
- With Auto-select off, everything works as in 0.2.0, and the requests sent are byte-identical. Codex doesn't list plugin tools to the model, so the model only learns about the tool from the note it gets with Auto-select on.

### Notes

- Tested with three GPT-6 models at low effort, in Chinese and English. GPT-6 Sol and Astra fetched the images they needed, left the rest alone, and read what they fetched correctly. GPT-6 Luna mostly decided right but sometimes misread small details in a fetched image, as it does with images opened with Codex's own image viewer. Pin an image whose details matter, or use a larger model.
- Each image the model fetches adds a request to that turn.
- Platforms are the same as in 0.2.0. On Windows, the self-tests ran on the Codex runtime of the desktop app 26.930, and the plugin runs in that app; automatic selection hasn't been tried by hand in the desktop app yet, so feedback in the issues is welcome. CI checks that the plugin installs and starts on macOS and Linux.

## [0.2.0] - 2026-09-29

Filter the panel's list by where each image came from.

### Features

- A filter button next to refresh unfolds the task's sources, each with its count: uploads, PDF pages, web page screenshots, and images the model viewed, got from a tool or generated. Pick one or several to show only their images; *All* shows everything again. The button shows only when a task has images from two sources or more, and it keeps a dot while a filter is on and the bar is folded away.
- The screenshots Codex attaches when you comment on a PDF page or a web page are told apart from your uploads. A PDF page shows its page number and the PDF's name.
- Filtering changes what you see, never what is sent: the request estimate still counts every image, a turn's checkbox covers only the images shown, and jumping to an image the model asked for shows it even when the filter hides it.
- The text sent to the model is the same as in 0.1.0.

### Notes

- Only images are managed, because Codex sends the model text and images only. PDFs and videos reach the model as text or images the model makes of them, and those images are listed like any other. The models in Codex don't accept audio yet, so Codex replaces audio with a short note before sending; audio support waits for a model that accepts it.
- Platforms are the same as in 0.1.0: tested on Windows with the Codex desktop app 26.924; CI checks that the plugin installs and starts on macOS and Linux.

## [0.1.0] - 2026-09-28

The first public release (MVP): in the same Codex task, decide turn by turn which past images go to the model with your next message.

### Features

- A *Context Assets* tab in the side panel of the Codex desktop app lists every image in the task's history by turn: the ones you uploaded and the ones the model viewed or generated, with thumbnails, IDs, source, dimensions and size. Click one to preview it.
- Checked images are sent as usual; unchecked ones become placeholders from the next message on, and one click applies the change. When an identical image is still being sent, the placeholder points to it. The task and the conversation stay the same.
- When images are left out, the model gets a context management note: you left the originals out to save context, and the answers it gave while looking at them still stand. The model doesn't take back earlier answers or make up details it can't see, and replies "need IMG-xxx" when it needs an original. A checked image goes back to its place in the conversation, marked with its ID, so the model recognizes it and answers from the image.
- The panel estimates the size of the next request and how much you save compared with sending every image, and warns you when a request could not be rewritten or a WebSocket turn still carries the originals.
- For tasks with many images: the images the model asked for but you haven't checked are listed at the top of the panel, and clicking an ID jumps to the image. Each turn can be checked or unchecked as a whole.
- The panel, its tab name and the note for the model follow Codex's language (English or Simplified Chinese).
- Install without a terminal: add the plugin marketplace on Codex's Plugins page, install the plugin, and click "Enable plugin" in the panel. One-line install and uninstall commands are available too.
- Before uninstalling, click "Disable plugin" in the panel so Codex connects directly again. The uninstall command needs no plugin files and restores the connection even when Codex can't connect.
- After an upgrade, the new engine takes over from the old one, and requests already in flight finish normally.

### Platforms

- Windows: tested with the Codex desktop app 26.924.
- macOS and Linux: CI verifies that Codex installs the plugin and starts the plugin server and the engine, and that the install and uninstall scripts work. Nobody has tried the desktop app on these platforms yet; feedback in the issues is welcome.
