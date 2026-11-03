<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="">
</p>

<h1 align="center">FrameKeeper 帧管家</h1>

<p align="center"><b>别再交多模态税。</b><br>给你的 Agent 用的多模态上下文自动管理工具。<br>装上照常用，图片交给模型自己管理。</p>

<p align="center">
  <a href="https://github.com/chipfighter/framekeeper/releases"><img src="https://img.shields.io/github/v/release/chipfighter/framekeeper?include_prereleases" alt="版本"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="支持 Windows、macOS、Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT 许可证"></a>
</p>

<p align="center"><a href="README.md">English</a> · <b>简体中文</b> · <a href="README_JA.md">日本語</a></p>

https://github.com/user-attachments/assets/5a674aa3-9723-4b33-afa8-75693feb1cda

[English video](README.md) · [日语视频](README_JA.md)

## 为各种多模态场景而生

旧图跟着对话一遍遍重发，越积越多，这份负担就是多模态税。FrameKeeper 自动管理这些图片，凡是 AI 需要看图的工作，都用得上：

- **图片和视频创作**：角色参考、分镜、关键帧、海报、商品图。
- **阅读文档**：扫描版 PDF、页面截图、图像资料。
- **操作电脑和浏览器**：Agent 每一步操作留下的截图。
- **日常多模态对话**：照片、截图、图表、示意图。

**装好以后，照常使用就行。** 自动选图默认开启，之前的图自动让位，模型要哪张就取回哪张。不打开面板、不手动挑图，它也在工作。

## 安装

把这句话发给你的 Agent，它会认出自己所在的平台，完成对应的安装：

```text
帮我安装 FrameKeeper 插件，按这里的说明来：https://github.com/chipfighter/framekeeper/blob/main/INSTALL.md
```

装好后重启 Agent（Claude 桌面版是新建一个 Code 会话）。查看[支持的平台](#支持的平台)，或阅读[安装、更新和卸载说明](INSTALL.md)（英文）。

## 想自己掌控时，打开面板

<p align="center">
  <img src="docs/images/hero-zh.png" alt="FrameKeeper 面板：自动管理之前的图片，凭印象搜索，点开预览大图。" width="100%">
</p>

- **凭印象找图**：搜“雨夜”或“脸最好”，按记得的特征和评价找回来。
- **固定重要参考**：点开图片，勾上**每轮都发**。
- **自己选择图片**：关掉**自动选图**，决定下一条消息带哪些图。

**Codex**：在任务的侧边面板里打开**上下文素材**。**Claude 桌面版的 Code 标签页**：有了图，面板就会自动打开；输入 `/cam` 可以再打开。

## 隐私

FrameKeeper 在本机运行。原始图片和对话记录保留在你的电脑上，请求仍发给 Agent 原本使用的服务。

## 效果测试

我们在 Codex 和 Claude Code 里测试了多图对话，包括聊很久、压缩对话之后再找回之前的图。结果和复现步骤见 [Codex 对比评测](eval/README_CN.md)与 [Claude Code 长任务评测](eval/long-task/README_CN.md)。

## 支持的平台

下面的平台都能自动选图，Codex 和 Claude 桌面版还提供面板。

| 平台 | 简介 | 接入情况 |
|---|---|---|
| [Codex](https://github.com/openai/codex) | OpenAI 的编程智能体，桌面版和命令行 | 自动选图＋面板，已实测 |
| [Claude Code](https://github.com/anthropics/claude-code) | Anthropic 的编程智能体，桌面版和命令行 | 自动选图＋面板（桌面版），已实测 |
| [WorkBuddy](https://www.workbuddy.cn) | 腾讯的桌面 AI 工作助手，内置 CodeBuddy | 自动选图，新接入，欢迎反馈 |
| [OpenCode](https://github.com/anomalyco/opencode) | 开源的终端编程智能体，能接任意模型服务 | 自动选图，新接入，欢迎反馈 |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | Google 开源的终端智能体 | 自动选图，新接入，欢迎反馈 |
| [pi](https://github.com/earendil-works/pi) | 极简、可扩展的终端编程智能体 | 自动选图（pi 扩展），新接入，欢迎反馈 |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | DeepSeek 的智能体框架，一切皆插件 | 自动选图（dsh 插件），新接入，欢迎反馈 |
| [Qwen Code](https://github.com/QwenLM/qwen-code) | 通义千问开源的终端智能体 | 自动选图，新接入，欢迎反馈 |
| [Cline](https://github.com/cline/cline) | 开源的编程智能体，VS Code、JetBrains 和终端都能用 | 自动选图，新接入，欢迎反馈 |
| [Kilo Code](https://github.com/Kilo-Org/kilocode) | 开源的编程智能体，VS Code、JetBrains 和终端都能用 | 自动选图，新接入，欢迎反馈 |
| [goose](https://github.com/aaif-goose/goose) | 开源的桌面和终端智能体，用 MCP 扩展 | 自动选图，新接入，欢迎反馈 |
| [Cherry Studio](https://github.com/CherryHQ/cherry-studio) | 开源的桌面 AI 聊天客户端，能接多家模型 | 自动选图，新接入，欢迎反馈 |
| **你的 Agent** | 写一层薄薄的接入，核心一行不用改 | 提个 PR，把你的平台加到这里：[接入说明](ADAPTERS.md)（英文） |

想接入自己的 Agent？按[接入说明](ADAPTERS.md)（英文）提个 PR，把你的平台加到这里，一起让更多人看到。安装步骤见 [INSTALL.md](INSTALL.md#other-agents)（英文）。

<p align="center"><sub><a href="CHANGELOG.md">更新记录</a> · <a href="CONTRIBUTING.md">参与开发</a> · <a href="LICENSE">MIT 许可证</a></sub></p>
