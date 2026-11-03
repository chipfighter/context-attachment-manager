<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="">
</p>

<h1 align="center">FrameKeeper</h1>

<p align="center"><b>マルチモーダル税は、もう払わない。</b><br>AI エージェントのためのマルチモーダルコンテキスト自動管理ツール。<br>インストールしたら、画像の管理はモデルに任せて、いつもどおり使うだけ。</p>

<p align="center">
  <a href="https://github.com/chipfighter/framekeeper/releases"><img src="https://img.shields.io/github/v/release/chipfighter/framekeeper?include_prereleases" alt="リリース"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="対応 OS：Windows、macOS、Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT ライセンス"></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs welcome"></a>
</p>

<p align="center"><a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <b>日本語</b></p>

https://github.com/user-attachments/assets/aeb90ea2-6cb9-4f7a-9db7-8b4cd382430e

[英語版の動画](README.md) · [中国語版の動画](README_CN.md)

## さまざまなマルチモーダル作業に

古い画像が会話の中で何度も送り直され、負担が積み重なる。それがマルチモーダル税です。FrameKeeper は画像を自動で管理し、AI が画像を見るさまざまな作業に役立ちます。

- **画像・動画の制作**：キャラクターの参考画像、絵コンテ、キーフレーム、ポスター、商品画像。
- **文書を読む**：スキャンした PDF、ページ画像、図版資料。
- **パソコンやブラウザーの操作**：エージェントが操作のたびに見るスクリーンショット。
- **日常のマルチモーダル会話**：写真、スクリーンショット、グラフ、図解。

**インストールしたら、いつもどおり使うだけ。** 自動選択は最初からオン。以前の画像は自動で外れ、必要な画像だけをモデルが取り出します。パネルを開いたり、画像を手で選んだりしなくても働きます。

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
