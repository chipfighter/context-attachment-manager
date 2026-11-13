<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>Codex、Claude Code 等 Agent 多图对话的本地插件。</b><br>之前的图不再每条消息都重发一遍。模型要看哪张，按编号取回，对话压缩之后也一样。</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="版本"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="支持 Windows、macOS、Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT 许可证"></a>
</p>

<p align="center"><a href="README.md">English</a> · <b>简体中文</b> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <a href="README_ES.md">Español</a> · <a href="README_PT_BR.md">Português (Brasil)</a> · <a href="README_FR.md">Français</a> · <a href="README_DE.md">Deutsch</a></p>

<p align="center">
  <img src="docs/images/loop-zh.gif" alt="面板上是一个有十五张关键帧的任务。打开自动选图，之前的图变灰，下一条请求从 7.5 MB 降到 1.7 MB。" width="100%">
</p>

## 它做什么

Agent 每发一条消息，通常会把之前所有的图再发一遍，图一多，对话就越来越慢，最后可能发不出去。这个插件给每张图编号（`IMG-001`、`IMG-002`……），之前的图改成发一段简短的占位：

- **模型要哪张取哪张**：需要再看之前的某张图时，按编号取回原图。
- **认得出是哪张**：模型给每张图记一行看得见的特征，也记下你对它的评价；这些写在占位里，对话压缩之后也还在。
- **什么都不删**：原始图片和对话记录保持原样。

默认开着，不用打开面板。常见用法：图片和视频创作、扫描文档、电脑和浏览器操作。

## 安装

把这句话发给你的 Agent，它会认出自己所在的平台，完成对应的安装：

```text
帮我安装 Context Attachment Manager 插件，按这里的说明来：https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

装好后重启 Agent（Claude 桌面版是新建一个 Code 会话）。查看[支持的平台](#支持的平台)，或阅读[安装、更新和卸载说明](INSTALL.md)（英文）。

## 想自己掌控时，打开面板

<p align="center">
  <img src="docs/images/hero-zh.png" alt="面板：自动管理之前的图片，凭印象搜索，点开预览大图。" width="100%">
</p>

- **凭印象找图**：搜“雨夜”或“脸最好”，按记得的特征和评价找回来。
- **固定重要参考**：点开图片，勾上**每轮都发**。
- **自己选择图片**：关掉**自动选图**，决定下一条消息带哪些图。

**Codex**：在任务的侧边面板里打开**上下文素材**。**Claude 桌面版的 Code 标签页**：有了图，面板就会自动打开；输入 `/cam` 可以再打开。

## 隐私

插件在本机运行。原始图片和对话记录保留在你的电脑上，请求仍发给 Agent 原本使用的服务。

## 效果测试

在 Codex 里，一段有九张关键帧的对话涨到 42.4 MB，重启或压缩之后发不出去；装上插件，同样的请求是 0.12 MB。结果和复现步骤见 [Codex 对比评测](eval/README_CN.md)与 [Claude Code 长任务评测](eval/long-task/README_CN.md)。

## 支持的平台

Codex 和 Claude Code 已实测，Codex 和 Claude 桌面版还有面板。下面其他平台也支持，接入是照各平台的代码和文档写的，但我们还没有实际测过。如果你在用其中某个，欢迎[告诉我们用起来怎么样](https://github.com/chipfighter/context-attachment-manager/issues)，能用和不能用都有帮助。

| 平台 | 简介 | 接入情况 |
|---|---|---|
| [Codex](https://github.com/openai/codex) | OpenAI 的编程智能体，桌面版和命令行 | 自动选图＋面板，已实测 |
| [Claude Code](https://github.com/anthropics/claude-code) | Anthropic 的编程智能体，桌面版和命令行 | 自动选图＋面板（桌面版），已实测 |
| [WorkBuddy](https://www.workbuddy.cn) | 腾讯的桌面 AI 工作助手，内置 CodeBuddy | 自动选图，未实测 |
| [OpenCode](https://github.com/anomalyco/opencode) | 开源的终端编程智能体，能接任意模型服务 | 自动选图，未实测 |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | Google 开源的终端智能体 | 自动选图，未实测 |
| [pi](https://github.com/earendil-works/pi) | 极简、可扩展的终端编程智能体 | 自动选图（pi 扩展），未实测 |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | DeepSeek 的智能体框架，一切皆插件 | 自动选图（dsh 插件），未实测 |
| [Qwen Code](https://github.com/QwenLM/qwen-code) | 通义千问开源的终端智能体 | 自动选图，未实测 |
| [Cline](https://github.com/cline/cline) | 开源的编程智能体，VS Code、JetBrains 和终端都能用 | 自动选图，未实测 |
| [Kilo Code](https://github.com/Kilo-Org/kilocode) | 开源的编程智能体，VS Code、JetBrains 和终端都能用 | 自动选图，未实测 |
| [goose](https://github.com/aaif-goose/goose) | 开源的桌面和终端智能体，用 MCP 扩展 | 自动选图，未实测 |
| [Cherry Studio](https://github.com/CherryHQ/cherry-studio) | 开源的桌面 AI 聊天客户端，能接多家模型 | 自动选图，未实测 |

这些平台的安装步骤见 [INSTALL.md](INSTALL.md#other-agents)（英文）。想接入别的 Agent，见[接入说明](ADAPTERS.md)（英文）。

<p align="center"><sub><a href="CHANGELOG.md">更新记录</a> · <a href="CONTRIBUTING.md">参与开发</a> · <a href="LICENSE">MIT 许可证</a></sub></p>
