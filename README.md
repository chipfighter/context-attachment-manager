<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>Long image chats in Codex and Claude, without the lag.</b><br>The model manages its own images, pulling back only what it needs. And any image you made before is one search away: just describe what you remember.</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/actions/workflows/ci.yml"><img src="https://github.com/chipfighter/context-attachment-manager/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="Release"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform: Windows, macOS, Linux">
  <img src="https://img.shields.io/badge/Codex%20desktop-26.1013-339CFF" alt="Tested on Codex desktop 26.1013">
  <img src="https://img.shields.io/badge/Claude%20Desktop-Claude%20Code%202.1.299-D97757" alt="Tested in Claude Desktop with Claude Code 2.1.299">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License: MIT"></a>
</p>

<p align="center"><b>English</b> · <a href="README_CN.md">简体中文</a></p>

<p align="center">
  <img src="docs/images/loop.gif" alt="The panel on a task of period-drama keyframes. Turning on Auto-select grays out the earlier images one by one, and the next request drops from 7.5 MB to 1.7 MB, 77% less." width="100%">
</p>

<p align="center">
  <img src="docs/images/hero.png" alt="Three views of the panel on a task of period-drama keyframes. Auto-select: the model manages its own images, and the card shows the next request at 1.7 MB instead of 7.5 MB. Search: typing best face finds the close-up the user called the best face three turns ago. Preview: that close-up shown full size." width="100%">
</p>

## Why I made this

I was iterating on images with GPT in Codex. After a dozen or so, the chat started failing: it kept reconnecting and never got through. Every message was sending every image in the conversation again, about 44 MB each time. The only way out was a new chat, and with it, losing everything we had built up.

So I made a panel that keeps the conversation and drops the weight.

## What it does

- **The model manages its own images.** Earlier images stay out of your messages, and when the model needs one, it pulls that one back by itself. Nothing to set up. Pin the ones that matter, like a character reference, and they go with every message.
- **Find any image by what you remember.** Search "best face" or "rainy night", filter by place, or browse by turn. Click one to see it full size.
- **It remembers every image.** The model quietly notes what each image shows and what you said about it ("too dark", "best face"). Even far into a long chat, or after the chat is compacted, it picks the right one.
- **Your chat stays light.** No more slowdowns or endless reconnecting. In a 15-image task, a request that carried 24.9 MB went out at 212 KB.

## How to use

- **Codex**: open **Context Assets** in a task's side panel.
- **Claude Desktop**: in the Code tab, the panel opens by itself next to your conversation once there are images. Type `/cam` to bring it back.

Then just keep chatting. From the start, the model picks earlier images on its own; to pin one, click it and check **Send every turn**. To choose yourself, turn off **Auto-select** at the bottom of the panel.

## Install

Paste this to Codex, or to Claude in Claude Desktop's Code tab:

```text
Install the Context Attachment Manager plugin for me, following https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

Then restart Codex, or start a new session in Claude. To install or uninstall it yourself, see [INSTALL.md](INSTALL.md).

## Privacy

Everything stays on your computer. The plugin sends nothing anywhere beyond the requests Codex and Claude already make.

<p align="center"><sub><a href="CHANGELOG.md">Changelog</a> · <a href="CONTRIBUTING.md">Contributing</a> · <a href="LICENSE">MIT License</a></sub></p>
