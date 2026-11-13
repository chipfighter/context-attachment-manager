<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>A local plugin for image-heavy chats in Codex, Claude Code and other agents.</b><br>Earlier images stop going out with every message. The model fetches the one it needs by its ID, also after the chat is compacted.</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="Release"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform: Windows, macOS, Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License: MIT"></a>
</p>

<p align="center"><b>English</b> · <a href="README_CN.md">简体中文</a> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <a href="README_ES.md">Español</a> · <a href="README_PT_BR.md">Português (Brasil)</a> · <a href="README_FR.md">Français</a> · <a href="README_DE.md">Deutsch</a></p>

<p align="center">
  <img src="docs/images/loop.gif" alt="The panel on a task with fifteen keyframes. With auto-select on, earlier images turn grey and the next request drops from 7.5 MB to 1.7 MB." width="100%">
</p>

## What it does

An agent normally sends every earlier image again with each message, so a long chat with many images gets slow and can stop going through. This plugin numbers each image (`IMG-001`, `IMG-002`, …) and sends earlier ones as short placeholders instead:

- **The model fetches what it needs**: when it has to look at an earlier image again, it gets the original back by its ID.
- **It can tell images apart**: the model notes one line on what each image shows, plus your comments on it. These stay in the placeholders, also after the chat is compacted.
- **Nothing is deleted**: your original images and chat history stay as they are.

It is on by default; you do not need to open the panel. Typical uses: image and video creation, scanned documents, computer and browser use.

## Install

Send this to your agent. It identifies its platform and installs the right setup:

```text
Install Context Attachment Manager for me, following https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

Then restart the agent (in Claude Desktop, start a new Code session). See [supported agents](#works-with) and [installation, updates and uninstall](INSTALL.md).

## The panel, when you want control

<p align="center">
  <img src="docs/images/hero.png" alt="The panel: automatically manage earlier images, search by what you remember, and preview an image." width="100%">
</p>

- **Find an image** by a detail or a comment you remember, like "rainy night" or "best face".
- **Keep a reference in view**: open an image and check **Send every turn**.
- **Choose images yourself**: turn off **Auto-select** and pick what goes with your next message.

In **Codex**, open **Context Assets** in the task's side panel. In **Claude Desktop's Code tab**, the panel opens automatically when there are images; type `/cam` to bring it back.

## Privacy

The plugin runs locally. Your original images and chat history stay on your computer; requests go to the service your agent already uses.

## How we tested

In Codex, a chat with nine keyframes grew to 42.4 MB and could not be sent after a restart or a compaction; with the plugin the same requests were 0.12 MB. See the [Codex comparison](eval/README.md) and [Claude Code long-task comparison](eval/long-task/README.md) for the results and reproduction steps.

## Works with

Codex and Claude Code are tested, and Codex and Claude Desktop also have the panel. The other agents below are supported through adapters written from their code and docs, but we have not tested them live yet. If you use one of them, please [tell us how it went](https://github.com/chipfighter/context-attachment-manager/issues), whether it worked or not.

| Agent | What it is | Support |
|---|---|---|
| [Codex](https://github.com/openai/codex) | OpenAI's coding agent, desktop and CLI | Auto-select + panel, tested |
| [Claude Code](https://github.com/anthropics/claude-code) | Anthropic's coding agent, desktop and CLI | Auto-select + panel (desktop), tested |
| [WorkBuddy](https://www.workbuddy.cn) | Tencent's desktop AI work assistant, with CodeBuddy inside | Auto-select, not tested yet |
| [OpenCode](https://github.com/anomalyco/opencode) | Open-source terminal coding agent for any model provider | Auto-select, not tested yet |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | Google's open-source terminal agent | Auto-select, not tested yet |
| [pi](https://github.com/earendil-works/pi) | Minimal, extensible terminal coding agent | Auto-select (pi extension), not tested yet |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | DeepSeek's agent harness where everything is a plugin | Auto-select (dsh plugin), not tested yet |
| [Qwen Code](https://github.com/QwenLM/qwen-code) | Qwen's open-source terminal agent | Auto-select, not tested yet |
| [Cline](https://github.com/cline/cline) | Open-source coding agent for VS Code, JetBrains and the terminal | Auto-select, not tested yet |
| [Kilo Code](https://github.com/Kilo-Org/kilocode) | Open-source coding agent for VS Code, JetBrains and the terminal | Auto-select, not tested yet |
| [goose](https://github.com/aaif-goose/goose) | Open-source agent for desktop and terminal, extended with MCP | Auto-select, not tested yet |
| [Cherry Studio](https://github.com/CherryHQ/cherry-studio) | Open-source desktop chat client for many models | Auto-select, not tested yet |

Setup for these agents: [INSTALL.md](INSTALL.md#other-agents). To connect another agent, see [ADAPTERS.md](ADAPTERS.md).

<p align="center"><sub><a href="CHANGELOG.md">Changelog</a> · <a href="CONTRIBUTING.md">Contributing</a> · <a href="LICENSE">MIT License</a></sub></p>
