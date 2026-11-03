<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="">
</p>

<h1 align="center">FrameKeeper</h1>

<p align="center"><b>長いタスクでも、以前見た画像を使い続ける。</b><br>画像が今のコンテキストから外れても、タスクとのつながりは残ります。<br>管理は自動。必要なときに元画像を取り出せます。</p>

<p align="center">
  <a href="https://github.com/chipfighter/framekeeper/releases"><img src="https://img.shields.io/github/v/release/chipfighter/framekeeper?include_prereleases" alt="リリース"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="対応 OS：Windows、macOS、Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT ライセンス"></a>
</p>

<p align="center"><a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <b>日本語</b></p>

https://github.com/user-attachments/assets/d6de1b05-d789-45f4-a764-a82079ace896

[英語版の動画](README.md) · [中国語版の動画](README_CN.md)

## 画像は、タスクの一部であり続ける

画像を今のリクエストから外しても、タスクの中で参照し続けられます。Codex と Claude Code では、FrameKeeper が画像、見た目の特徴、あなたの評価のつながりを保ちます。

- **必要な画像を見つける**：変わらない画像 ID、見た目の特徴、あなたの評価を手がかりに、以前話した画像を特定できます。
- **元画像を見直す**：細部を確認したいときは、モデルが必要な元画像を取り出して、もう一度見られます。
- **会話を圧縮しても続けられる**：画像の索引が残るので、過去の元画像を引き続き特定して取り出せます。

**最初から自動。いつもどおり作業を続けるだけ。** 画像・動画の制作、スキャン文書、パソコンやブラウザーの操作、日常の画像を使った会話に。パネルを開いたり、画像を手で選んだりしなくても働きます。

## インストール

次の文をお使いのエージェントに送ってください。実行中のプラットフォームを確認し、それに合わせてインストールします。

```text
次の手順に従って、FrameKeeper をインストールしてください：https://github.com/chipfighter/framekeeper/blob/main/INSTALL.md
```

インストール後はエージェントを再起動してください（Claude Desktop では新しい Code セッションを始めてください）。[対応エージェント](#対応エージェント)、[インストール・更新・アンインストールの手順](INSTALL.md)（英語）もご覧ください。

## 自分で選びたいときは、パネルで

<p align="center">
  <img src="docs/images/hero.png" alt="FrameKeeper のパネル：過去の画像を自動管理し、覚えている特徴から検索して、大きくプレビューできます。" width="100%">
</p>

- **覚えていることから検索**：「雨の夜」「いちばん良い顔」など、画像の特徴や感想で探せます。
- **大切な参考画像を固定**：画像を開き、**Send every turn**（毎ターン送信）にチェックを入れます。
- **送る画像を自分で選択**：**Auto-select**（自動選択）をオフにして、次のメッセージに含める画像を選びます。

**Codex** ではタスクのサイドパネルから **Context Assets** を開きます。**Claude Desktop の Code タブ**では画像があると自動で開き、`/cam` で再び開けます。

## プライバシー

FrameKeeper はローカルで動作します。元の画像と会話履歴は自分のコンピューターに残り、リクエストはエージェントが元から使っているサービスに送られます。

## 効果の検証

Codex と Claude Code で画像の多い会話をテストし、長い会話や会話の圧縮後に以前の画像を取り出す動作も確認しました。結果と再現手順は [Codex の比較検証](eval/README.md)と [Claude Code の長期タスク検証](eval/long-task/README.md)（英語）をご覧ください。

## 対応エージェント

以下のエージェントで自動選択が使えます。Codex と Claude Desktop にはパネルもあります。

| エージェント | 概要 | 対応状況 |
|---|---|---|
| [Codex](https://github.com/openai/codex) | OpenAI のコーディングエージェント（デスクトップ版・CLI） | 自動選択＋パネル、動作確認済み |
| [Claude Code](https://github.com/anthropics/claude-code) | Anthropic のコーディングエージェント（デスクトップ版・CLI） | 自動選択＋パネル（デスクトップ版）、動作確認済み |
| [WorkBuddy](https://www.workbuddy.cn) | Tencent のデスクトップ AI アシスタント（CodeBuddy 内蔵） | 自動選択、新規対応、フィードバック歓迎 |
| [OpenCode](https://github.com/anomalyco/opencode) | どのモデルサービスにもつながるオープンソースのターミナル型エージェント | 自動選択、新規対応、フィードバック歓迎 |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | Google のオープンソースのターミナル型エージェント | 自動選択、新規対応、フィードバック歓迎 |
| [pi](https://github.com/earendil-works/pi) | ミニマルで拡張できるターミナル型コーディングエージェント | 自動選択（pi 拡張）、新規対応、フィードバック歓迎 |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | すべてがプラグインの DeepSeek のエージェント基盤 | 自動選択（dsh プラグイン）、新規対応、フィードバック歓迎 |
| [Qwen Code](https://github.com/QwenLM/qwen-code) | Qwen のオープンソースのターミナル型エージェント | 自動選択、新規対応、フィードバック歓迎 |
| [Cline](https://github.com/cline/cline) | VS Code・JetBrains・ターミナルで使えるオープンソースのコーディングエージェント | 自動選択、新規対応、フィードバック歓迎 |
| [Kilo Code](https://github.com/Kilo-Org/kilocode) | VS Code・JetBrains・ターミナルで使えるオープンソースのコーディングエージェント | 自動選択、新規対応、フィードバック歓迎 |
| [goose](https://github.com/aaif-goose/goose) | MCP で拡張できる、デスクトップとターミナルのオープンソースエージェント | 自動選択、新規対応、フィードバック歓迎 |
| [Cherry Studio](https://github.com/CherryHQ/cherry-studio) | 多くのモデルにつながるオープンソースのデスクトップ AI チャット | 自動選択、新規対応、フィードバック歓迎 |
| **あなたのエージェント** | 薄い接続層を書くだけで、コアは変更不要 | PR を送って、ここに追加してください：[ADAPTERS.md](ADAPTERS.md)（英語） |

お使いのエージェントも接続しませんか？[接続層の作り方](ADAPTERS.md)（英語）を参考に PR を送り、この一覧に追加してください。設定手順は [INSTALL.md](INSTALL.md#other-agents)（英語）をご覧ください。

<p align="center"><sub><a href="CHANGELOG.md">変更履歴（英語）</a> · <a href="CONTRIBUTING.md">開発への参加（英語）</a> · <a href="LICENSE">MIT ライセンス</a></sub></p>
