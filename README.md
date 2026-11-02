<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>Stop paying the multimodal tax.</b><br>Automatic context management for images: install it and forget it. Earlier images step aside, and the model pulls back the one it needs.<br>Works with Codex, Claude Code, WorkBuddy, OpenCode, Gemini CLI and more agents.</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/actions/workflows/ci.yml"><img src="https://github.com/chipfighter/context-attachment-manager/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="Release"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform: Windows, macOS, Linux">
  <img src="https://img.shields.io/badge/Codex%20desktop-26.1013-339CFF" alt="Tested on Codex desktop 26.1013">
  <img src="https://img.shields.io/badge/Claude%20Desktop-Claude%20Code%202.1.299-D97757" alt="Tested in Claude Desktop with Claude Code 2.1.299">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License: MIT"></a>
</p>

<p align="center"><b>English</b> · <a href="README_CN.md">简体中文</a> · <a href="README_JA.md">日本語</a></p>

<p align="center">
  <img src="docs/images/loop.gif" alt="The panel on a task of period-drama keyframes. Turning on Auto-select grays out the earlier images one by one, and the next request drops from 7.5 MB to 1.7 MB, 77% less." width="100%">
</p>

<p align="center">
  <img src="docs/images/hero.png" alt="Three views of the panel on a task of period-drama keyframes. Auto-select: the model manages its own images, and the card shows the next request at 1.7 MB instead of 7.5 MB. Search: typing best face finds the close-up the user called the best face three turns ago. Preview: that close-up shown full size." width="100%">
</p>

## The multimodal tax

Use a multimodal model in any agent and the images pile up. The model remembers nothing between turns, so every request sends the whole chat again, every earlier image included. A dozen images in, each message uploads tens of megabytes: the chat gets slower and pricier, then keeps reconnecting and never gets through. The way out is a new chat, and everything you built up is gone.

That price, paid again and again for old images, is the multimodal tax.

## Where you pay it

- **Generating images in a chat**: keyframes, posters, product shots, several a turn.
- **Reading scanned PDFs**: every page is an image.
- **Letting AI drive a computer or a browser**: a screenshot every step.
- **Talking about photos, screenshots and charts**: a few turns, a pile of images.

## What it does

- **The model manages its own images.** Earlier images stay out of your messages, and when the model needs one, it pulls that one back by itself. Nothing to set up. Pin the ones that matter, like a character reference, and they go with every message.
- **Find any image by what you remember.** Search "best face" or "rainy night", filter by place, or browse by turn. Click one to see it full size (the panel in Codex and Claude Desktop).
- **It remembers every image.** The model quietly notes what each image shows and what you said about it ("too dark", "best face"). Even far into a long chat, or after the chat is compacted, it picks the right one.
- **Your chat stays light.** No more slowdowns or endless reconnecting. In a 15-image task, a request that carried 24.9 MB went out at 212 KB.

## Watch the 30-second tour

https://github.com/user-attachments/assets/aeec27c0-c56a-4775-bcc8-981d5e9a0d45

[简体中文视频](README_CN.md#30-秒了解这个插件)

## How to use

- **Codex**: open **Context Assets** in a task's side panel.
- **Claude Desktop**: in the Code tab, the panel opens by itself next to your conversation once there are images. Type `/cam` to bring it back.

Then just keep chatting. From the start, the model picks earlier images on its own; to pin one, click it and check **Send every turn**. To choose yourself, turn off **Auto-select** at the bottom of the panel.

Using a gateway? Compatible Codex and Claude Code endpoints can use image management too. Requests continue to the endpoint you configured, with the client's model and credentials. The gateway must support the client's API format, image inputs and tool calls; see [endpoint support](INSTALL.md#custom-endpoints).

## Install

Paste this to your agent (Codex, Claude Desktop's Code tab, or any agent in [Works with](#works-with)). It finds out which agent it runs in and installs for that one:

```text
Install the Context Attachment Manager plugin for me, following https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

Then restart the agent (in Claude Desktop, start a new session). To install or uninstall it yourself, see [INSTALL.md](INSTALL.md).

## Privacy

Everything stays on your computer. The plugin sends nothing anywhere beyond the requests Codex and Claude already make.

## How we tested

We ran a short-drama keyframe chat in Codex with and without the plugin: nine keyframes, about 32 MB of images. Without the plugin, every time Codex had to send the whole chat again (after a restart, and right after compacting it), the request was 42 MB and never got through. With the plugin, the same request was 0.12 MB, and in this test the model picked the right image both before and after compacting. The method, the numbers and how to run it yourself are in [eval](eval/README.md).

We also ran a longer task in Claude Code: 51 images, compacted twice, then forked. With and without the plugin the model found nearly every image (19 or 20 of 20 questions), because the images were files on disk it could read again; in a chat this short the plugin cost about 30% more. Details are in the [long-task eval](eval/long-task/README.md).

## Works with

The plugin's core knows no platform; each one gets a thin adapter. The panel is in Codex and Claude Desktop; on the other agents, auto-select works on its own and the model still pulls back any image by its id.

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

To install on any of them, paste the sentence in [Install](#install) to that agent; how each one is connected is in [INSTALL.md](INSTALL.md#other-agents). Something off? [Open an issue](https://github.com/chipfighter/context-attachment-manager/issues).

<p align="center"><sub><a href="CHANGELOG.md">Changelog</a> · <a href="CONTRIBUTING.md">Contributing</a> · <a href="LICENSE">MIT License</a></sub></p>
