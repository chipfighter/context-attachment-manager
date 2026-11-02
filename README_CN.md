<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>别再交多模态税。</b><br>多模态上下文的自动管理工具：装上就不用管，之前的图自动让位，模型要哪张取哪张。<br>Codex、Claude Code、WorkBuddy、OpenCode、Gemini CLI 等 Agent 平台都能接。</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/actions/workflows/ci.yml"><img src="https://github.com/chipfighter/context-attachment-manager/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="版本"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="平台：Windows、macOS、Linux">
  <img src="https://img.shields.io/badge/Codex%20desktop-26.1013-339CFF" alt="在 Codex 桌面版 26.1013 上实测">
  <img src="https://img.shields.io/badge/Claude%20Desktop-Claude%20Code%202.1.299-D97757" alt="在 Claude 桌面版（Claude Code 2.1.299）上实测">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="许可证：MIT"></a>
</p>

<p align="center"><a href="README.md">English</a> · <b>简体中文</b> · <a href="README_JA.md">日本語</a></p>

<p align="center">
  <img src="docs/images/loop-zh.gif" alt="面板上是一个古装短剧关键帧的任务。打开自动选图，之前的图一张张变灰，下一条请求从 7.5 MB 降到 1.7 MB，省 77%。" width="100%">
</p>

<p align="center">
  <img src="docs/images/hero-zh.png" alt="面板的三个画面，任务是古装短剧的关键帧。自动选图：模型自己管理图片，卡片显示下一条请求约 1.7 MB，全部发送要 7.5 MB。凭印象找图：搜索“最好”，找到三轮前用户说脸最好的那张特写。预览：这张特写的大图。" width="100%">
</p>

## 什么是多模态税

在任何 Agent 平台上用多模态模型，图都会越攒越多。模型不记事，每一轮请求都要把整段对话连同之前所有的图重新发一遍。图攒到十几张，发一条消息就要上传几十 MB：越聊越慢，越聊越贵，最后一直重连、发不出去，只能新开对话，前面攒下的东西全丢。

这笔为旧图反复付出的代价，就是多模态税。

## 哪些时候在交

- **在对话里生图、改图**：关键帧、海报、商品图，一轮就是好几张。
- **读扫描版 PDF**：每一页都是一张图。
- **让 AI 控制电脑或浏览器**：每走一步就是一张截图。
- **跟模型聊照片、截图、图表**：聊几轮就是一堆。

## 能做什么

- **模型自己管理图片。** 之前的图不再跟着每条消息重发，要用哪张，模型自己把那一张取回来，什么都不用设置。要紧的图，比如角色参考图，可以固定成每条消息都带上。
- **凭印象找图。** 搜“脸最好”或者“雨夜”，按地点筛选，或者按轮翻看，点开就是大图（Codex 和 Claude 桌面版的面板）。
- **每张图它都记得。** 模型会悄悄记下每张图画的是什么，以及你对它说过什么（“太暗”“这张脸最好”）。聊得再久，对话压缩过，它照样拿对图。
- **对话一直轻快。** 不再越聊越慢、反复重连。一个 15 张图的任务里，原本 24.9 MB 的请求，发出去只有 212 KB。

## 30 秒了解这个插件

https://github.com/user-attachments/assets/b9767a20-8ca4-4a33-86bc-5e0a16a2ed13

[English video](README.md#watch-the-30-second-tour)

## 怎么用

- **Codex**：在任务的侧边面板里打开**上下文素材**。
- **Claude 桌面版**：在 Code 标签页里，对话里有了图，面板就自己在对话旁边打开。输入 `/cam` 可以随时再打开。

然后照常聊天就行。一开始，模型就会自己挑之前的图；想固定某张，点开它，勾上**每轮都发**。想自己选，就关掉面板底部的**自动选图**。

使用中转站时，兼容 Codex 或 Claude Code 的服务地址也能管理图片。请求仍发给你配置的服务，沿用客户端的模型和认证方式。中转站需要支持对应接口、图片输入和工具调用，详见 [服务地址支持范围](INSTALL.md#custom-endpoints)（英文）。

## 安装

把这句话发给你的 Agent（Codex、Claude 桌面版的 Code 标签页，或者[支持的平台](#支持的平台)里的任何一个）。它会先认出自己在哪个平台，再装对应的那一份：

```text
帮我安装 Context Attachment Manager 插件，按这里的说明来：https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

装好后重启这个 Agent（Claude 桌面版是新建一个会话）。想自己动手安装或卸载，看 [INSTALL.md](INSTALL.md)（英文）。

## 隐私

所有东西都留在你自己的电脑上。除了 Codex 和 Claude 本来就要发的请求，插件不往任何地方发数据。

## 效果测试

我们在 Codex 里拿一段短剧关键帧的对话，比较了装插件和不装插件：9 张关键帧，图片一共约 32 MB。不装插件时，只要 Codex 需要把整段对话重新发一遍（重启之后、压缩对话之后），请求就有 42 MB，一次也没发出去。装了插件，同样的请求只有 0.12 MB，这次测试里压缩前后模型都找对了图。测试方法、数据和自己复现的步骤见 [eval](eval/README_CN.md)。

我们还在 Claude Code 里跑了一段更长的任务：51 张图，压缩两次再分叉。装不装插件，模型都几乎找对了每张图（20 题答对 19 或 20 题），因为图都是磁盘上的文件，模型能再读一遍；在这么短的对话里，装插件多花约三成费用。详见[长任务评测](eval/long-task/README_CN.md)。

## 支持的平台

插件的核心不认平台，每个平台只有一层薄薄的接入。面板只在 Codex 和 Claude 桌面版上有；其他平台装上后自动选图，模型照样按编号取回原图。

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

在哪个平台上装，就把[安装](#安装)里那句话发给那个平台的 Agent；各平台具体改了什么，见 [INSTALL.md](INSTALL.md#other-agents)（英文）。用下来有问题，欢迎[提 issue](https://github.com/chipfighter/context-attachment-manager/issues)。

<p align="center"><sub><a href="CHANGELOG.md">更新记录</a> · <a href="CONTRIBUTING.md">参与开发</a> · <a href="LICENSE">MIT 许可证</a></sub></p>
