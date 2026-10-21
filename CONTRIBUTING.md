# Contributing

Bug reports, ideas and pull requests are all welcome. For a bug, an [issue](https://github.com/chipfighter/context-attachment-manager/issues) with what you did and what you saw is enough. For security problems, see [SECURITY.md](SECURITY.md).

## How it works

- The plugin runs a small local proxy, the engine, between Codex and OpenAI, and between Claude Code and Anthropic. Before a request goes out, the engine swaps the images that shouldn't go for placeholders and adds a note for the model; everything else is forwarded as is, including the sign-in.
- In Codex, installing points Codex at the engine. In Claude Desktop, the plugin points each Claude Code session at the engine when the session starts, and puts it back when the session ends.
- With Auto-select on, images from earlier turns become placeholders unless they are set to send every turn, and the model gets one tool, `cam_view_image`, to fetch an image back into the current turn. The placeholders before it stay as they were, so the cached part of the request isn't broken.
- The engine labels each image with its ID in the turn it appears and asks the model to note what each image shows and what the user said about it. The model writes these notes as Markdown link definitions at the start of its reply, which the apps don't display; the placeholders carry them. The plugin reads them from the conversation records on the machine; nothing is stored separately.
- Selections and the Auto-select switch are saved per task or session. Only the user can change them; the model can only fetch an image for one turn.
- The panel doesn't go through the model. In Codex it's an MCP app in the side panel; in Claude Desktop the engine serves the same page to the built-in browser, on the local machine only.

## Repository layout

- `plugin/` is the plugin itself: the MCP server, the engine, the panel and the `cam` command line (runtime code in `plugin/src`).
- `.claude-plugin/` plus the mod in `hooks/` make the Claude plugin.
- `spike/` holds the tests and experiments, `scripts/` the one-line install and uninstall scripts.
- `docs/` holds the spec and the technical design, in Chinese: start with [docs/spec.md](docs/spec.md), then [docs/design.md](docs/design.md). Release notes are in [CHANGELOG.md](CHANGELOG.md).

## Develop

- Install from source into your Codex: quit Codex, run `cam install` in the repository (`./cam install` on macOS and Linux), then start Codex. `cam status` shows the installation, `cam uninstall` removes it. Run `cam install` again after changing runtime code, so Codex's copy of the plugin is updated.
- Run the tests with Node 24 or later: `cd spike && node --test`. CI runs them on Windows, macOS and Linux, then installs the plugin with Codex's CLI and runs the install and uninstall scripts.
- Work on the panel without Codex: `node spike/scripts/panel-dev.ts`, then open `http://127.0.0.1:17895/?solo=1`, or `?solo=1&thread=v08` for a task with the model's notes (add `&lang=en` for English). The page uses synthetic images and a temporary Codex folder, so your real data is never read or changed.
- Text in the panel and the command line comes in English and Simplified Chinese: the panel's in the string table of `plugin/src/panel.html`, the rest in `plugin/src/messages.ts`. Change both; a unit test checks that they match.
- When you change the text the model sees (`plugin/src/rewrite.ts`), run the self-tests in `spike/src/v01-placeholder-selftest.ts` and `spike/src/v01-needs-selftest.ts`, and for Auto-select's wording `spike/src/v03-auto-selftest.ts`, in Chinese and with `--lang en`; `spike/src/v07-children-selftest.ts` covers subagents and side chats, and `spike/src/v08-features-selftest.ts` the model's notes, including after a compaction. They start their own engine and app-server, use your Codex account, and archive the test tasks they create.

## Pull requests

- Open pull requests against `main`. They need CI to pass on Windows, macOS and Linux, and a review from the maintainer.
- Keep `scripts/*.ps1` ASCII only: Windows PowerShell 5.1 decodes a downloaded script as Latin-1.
- Real conversation data and user images never go into the repository.
