<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="">
</p>

<h1 align="center">FrameKeeper</h1>

<p align="center"><b>Keep earlier images usable throughout long-running agent work.</b><br>Images can leave the current context and remain part of the task.<br>Automatic management. Original images on demand.</p>

<p align="center">
  <a href="https://github.com/chipfighter/framekeeper/releases"><img src="https://img.shields.io/github/v/release/chipfighter/framekeeper?include_prereleases" alt="Release"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform: Windows, macOS, Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License: MIT"></a>
</p>

<p align="center"><b>English</b> · <a href="README_CN.md">简体中文</a> · <a href="README_JA.md">日本語</a></p>

https://github.com/user-attachments/assets/aeb90ea2-6cb9-4f7a-9db7-8b4cd382430e

[简体中文视频](README_CN.md) · [日本語動画](README_JA.md)

## Images stay part of the task

An image can leave the current request without losing its place in the task. In Codex and Claude Code, FrameKeeper preserves the link between images, visual details and your feedback:

- **Find the right reference**: stable image IDs, visual descriptions and your feedback help the model identify an image discussed earlier.
- **Inspect the original**: when details matter, the model retrieves the original image on demand and looks again.
- **Continue after compaction**: the image index survives conversation compaction, so earlier originals remain identifiable and retrievable.

**Automatic by default. Keep working.** Use it for image and video creation, scanned documents, computer and browser use, or everyday visual chats. It works even if you never open the panel or pick images yourself.

## Install

Send this to your agent. It identifies its platform and installs the right setup:

```text
Install FrameKeeper for me, following https://github.com/chipfighter/framekeeper/blob/main/INSTALL.md
```

Then restart the agent (in Claude Desktop, start a new Code session). See [supported agents](#works-with) and [installation, updates and uninstall](INSTALL.md).

## The panel, when you want control

<p align="center">
  <img src="docs/images/hero.png" alt="The FrameKeeper panel: automatically manage earlier images, search by what you remember, and preview an image." width="100%">
</p>

- **Find an image** by a detail or a comment you remember, like "rainy night" or "best face".
- **Keep a reference in view**: open an image and check **Send every turn**.
- **Choose images yourself**: turn off **Auto-select** and pick what goes with your next message.

In **Codex**, open **Context Assets** in the task's side panel. In **Claude Desktop's Code tab**, the panel opens automatically when there are images; type `/cam` to bring it back.

## Privacy

FrameKeeper runs locally. Your original images and chat history stay on your computer; requests go to the service your agent already uses.

## How we tested

We tested image-heavy conversations in Codex and Claude Code, including finding earlier images after long chats and compaction. See the [Codex comparison](eval/README.md) and [Claude Code long-task comparison](eval/long-task/README.md) for the results and reproduction steps.

## Works with

Auto-select works across the agents below. Codex and Claude Desktop also include the panel.

| Agent | What it is | Support |
|---|---|---|
| [Codex](https://github.com/openai/codex) | OpenAI's coding agent, desktop and CLI | Auto-select + panel, tested |
| [Claude Code](https://github.com/anthropics/claude-code) | Anthropic's coding agent, desktop and CLI | Auto-select + panel (desktop), tested |
| [WorkBuddy](https://www.workbuddy.cn) | Tencent's desktop AI work assistant, with CodeBuddy inside | Auto-select, new, feedback welcome |
| [OpenCode](https://github.com/anomalyco/opencode) | Open-source terminal coding agent for any model provider | Auto-select, new, feedback welcome |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | Google's open-source terminal agent | Auto-select, new, feedback welcome |
| [pi](https://github.com/earendil-works/pi) | Minimal, extensible terminal coding agent | Auto-select (pi extension), new, feedback welcome |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | DeepSeek's agent harness where everything is a plugin | Auto-select (dsh plugin), new, feedback welcome |
| [Qwen Code](https://github.com/QwenLM/qwen-code) | Qwen's open-source terminal agent | Auto-select, new, feedback welcome |
| [Cline](https://github.com/cline/cline) | Open-source coding agent for VS Code, JetBrains and the terminal | Auto-select, new, feedback welcome |
| [Kilo Code](https://github.com/Kilo-Org/kilocode) | Open-source coding agent for VS Code, JetBrains and the terminal | Auto-select, new, feedback welcome |
| [goose](https://github.com/aaif-goose/goose) | Open-source agent for desktop and terminal, extended with MCP | Auto-select, new, feedback welcome |
| [Cherry Studio](https://github.com/CherryHQ/cherry-studio) | Open-source desktop chat client for many models | Auto-select, new, feedback welcome |
| **Your agent** | A thin adapter; the core stays as it is | Send a PR and add your agent here: [ADAPTERS.md](ADAPTERS.md) |

Want to connect your own agent? [Build an adapter](ADAPTERS.md), send a PR and add your platform to this list. For setup instructions, see [INSTALL.md](INSTALL.md#other-agents).

<p align="center"><sub><a href="CHANGELOG.md">Changelog</a> · <a href="CONTRIBUTING.md">Contributing</a> · <a href="LICENSE">MIT License</a></sub></p>
