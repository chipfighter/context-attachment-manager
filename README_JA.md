<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>マルチモーダル税は、もう払わない。</b><br>画像コンテキストの自動管理ツール。入れたら後は任せるだけで、以前の画像は自動で外れ、必要な画像はモデルが取り出します。<br>Codex、Claude Code、WorkBuddy、OpenCode、Gemini CLI などのエージェントに対応。</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/actions/workflows/ci.yml"><img src="https://github.com/chipfighter/context-attachment-manager/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="リリース"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="対応 OS：Windows、macOS、Linux">
  <img src="https://img.shields.io/badge/Codex%20desktop-26.1013-339CFF" alt="Codex デスクトップ版 26.1013 で動作確認">
  <img src="https://img.shields.io/badge/Claude%20Desktop-Claude%20Code%202.1.299-D97757" alt="Claude Desktop の Claude Code 2.1.299 で動作確認">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="ライセンス：MIT"></a>
</p>

<p align="center"><a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <b>日本語</b></p>

<p align="center">
  <img src="docs/images/loop.gif" alt="時代劇のキーフレームを扱うパネル。Auto-select をオンにすると以前の画像が順にグレーになり、次のリクエストが 7.5 MB から 1.7 MB へ、77% 小さくなります。" width="100%">
</p>

<p align="center">
  <img src="docs/images/hero.png" alt="パネルの 3 つの表示例。自動選択では、すべての画像を送ると 7.5 MB のリクエストが約 1.7 MB に。検索では best face と入力して、以前いちばん良い顔だと評価した画像を探せます。プレビューでは、その画像を大きく表示できます。" width="100%">
</p>

## マルチモーダル税とは

どのエージェントでもマルチモーダルモデルを使えば、画像はたまっていきます。モデルはターンをまたいで記憶しないため、毎回のリクエストで会話全体を、以前の画像もすべて含めて送り直します。画像が十数枚になると、1 通ごとに数十 MB をアップロードすることになり、会話は遅く、高くなり、やがて再接続を繰り返して送れなくなります。新しい会話を始めれば送れますが、それまで積み重ねた内容は失われます。

古い画像のために何度も払うこのコストが、マルチモーダル税です。

## 払っている場面

- **会話の中で画像を生成・修正する**：キーフレーム、ポスター、商品画像など、1 ターンで何枚も。
- **スキャンした PDF を読ませる**：1 ページが 1 枚の画像です。
- **AI にパソコンやブラウザーを操作させる**：1 ステップごとにスクリーンショット。
- **写真・スクリーンショット・グラフについて話す**：数ターンで画像の山に。

## できること

- **モデルが画像を自分で管理。** 過去の画像を毎回送り直さず、必要な画像だけをモデルが取り出します。特別な設定は不要です。キャラクターの参考画像など、常に見てほしい画像は毎回送るように固定できます。
- **覚えていることから画像を検索。** 「いちばん良い顔」「雨の夜」などで検索したり、場所で絞り込んだり、会話のターンごとに画像を探したりできます。クリックすると大きなプレビューが開きます（Codex と Claude Desktop のパネル）。
- **会話を圧縮した後も画像を探せる。** モデルは、画像の特徴とあなたの感想（「暗すぎる」「この顔がいちばん良い」など）を、会話の本文には表示せずに記録します。長い会話でも、会話を圧縮した後でも、必要な画像を探す手がかりになります。
- **会話の送信量を削減。** 画像が 15 枚あるタスクのテストでは、24.9 MB あったリクエストが 212 KB になりました。

## インストール

次の文を Codex、または Claude Desktop の **Code** タブにいる Claude に送ってください。

```text
次の手順に従って、Context Attachment Manager プラグインをインストールしてください：https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

インストール後は Codex を再起動してください。Claude Desktop では **Code** タブで新しいセッションを始めてください。手動でのインストール、更新、アンインストールの手順は、共通の [INSTALL.md](INSTALL.md)（英語）にあります。ほかのエージェントをお使いの場合は、ページ下部の[対応エージェント](#対応エージェント)をご覧ください。

## パネルを開く

- **Codex**：タスクを開き、右上の **Toggle side panel** でサイドパネルを表示します。**+** から新しいタブを開き、**Plugins and MCPs** の **Context Assets** を選んでください。見つからない場合は、Codex を一度再起動してください。
- **Claude Desktop**：**Code** タブの会話に画像があると、会話の隣にある内蔵ブラウザーでパネルが自動的に開きます。もう一度開きたいときは `/cam` を入力して送信してください。新しいセッションの最初のメッセージが `/cam` の場合、入力欄にコマンドが存在しないと表示されることがありますが、そのまま送信できます。

パネルは英語・簡体字中国語・日本語に対応し、Codex または Claude Desktop の言語設定に合わせて表示されます。左上の会話名は言語を切り替えても変わりません。以下では共通の操作名が分かるよう、英語名に日本語の説明を添えています。

## Auto-select と Send every turn

新しいタスクやセッションでは、**Auto-select**（画像の自動選択）が最初からオンになっています。そのまま会話を続ければ、以前のターンの画像は必要なときだけモデルが取り出します。

キャラクターの参考画像などを毎回見てほしい場合は、画像をクリックしてプレビューを開き、**Send every turn**（毎ターン送信）にチェックを入れてください。チェックした画像は毎回送られ、それ以外の過去の画像はモデルが必要に応じて取り出します。チェックしていない画像がグレーで表示されていても、削除されたわけではありません。

送る画像を自分で選びたい場合は、パネル下部の **Auto-select** をオフにしてください。手動モードでは、プレビューの **Send**（送信）のチェックで、その画像を次のメッセージから送るかどうかを切り替えられます。変更はすぐに保存され、元の画像や会話履歴はそのまま残ります。

画像を探すには、検索欄に覚えている特徴や当時の感想を入力してください。場所での絞り込みや、ターンごとの一覧も使えます。プレビューは画像の外側をクリックするか、**Esc** キーで閉じられます。

独自のゲートウェイを使う場合も、Codex または Claude Code と互換性のある接続先で画像を管理できます。リクエストは設定済みの接続先に送られ、クライアントのモデルと認証情報を引き継ぎます。接続先には、クライアントの API 形式、画像入力、ツール呼び出しへの対応が必要です。詳しくは [接続先の対応範囲](INSTALL.md#custom-endpoints)（英語）をご覧ください。

## プライバシー

元の画像や会話履歴は自分のコンピューターに残ります。Codex や Claude が通常行うリクエスト以外に、プラグインがデータを外部へ送ることはありません。

## 効果の検証

Codex で短編ドラマのキーフレーム 9 枚、合計約 32 MB の画像を使い、プラグインの有無を比較しました。プラグインなしでは、再起動後や会話の圧縮直後に会話全体を再送するとリクエストが 42 MB になり、送信できませんでした。プラグインありでは同じリクエストが 0.12 MB になり、このテストでは会話の圧縮前後とも必要な画像を正しく選べました。検証方法、結果、再現手順は [eval](eval/README.md)（英語）をご覧ください。

## 対応エージェント

プラグインのコアはどのエージェントにも依存せず、エージェントごとに薄い接続層があるだけです。パネルは Codex と Claude Desktop のみで、ほかのエージェントでは自動選択がそのまま働き、モデルは番号で元の画像を取り出せます。

| エージェント | 概要 | 対応状況 |
|---|---|---|
| [Codex](https://github.com/openai/codex) | OpenAI のコーディングエージェント（デスクトップ版・CLI） | 自動選択＋パネル、動作確認済み |
| [Claude Code](https://github.com/anthropics/claude-code) | Anthropic のコーディングエージェント（デスクトップ版・CLI） | 自動選択＋パネル（デスクトップ版）、動作確認済み |
| [WorkBuddy](https://www.workbuddy.cn) | Tencent のデスクトップ AI アシスタント（CodeBuddy 内蔵） | 自動選択、新規対応、フィードバック歓迎 |
| [OpenCode](https://github.com/anomalyco/opencode) | どのモデルサービスにもつながるオープンソースのターミナル型エージェント | 自動選択、新規対応、フィードバック歓迎 |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | Google のオープンソースのターミナル型エージェント | 自動選択、新規対応、フィードバック歓迎 |
| [pi](https://github.com/earendil-works/pi) | ミニマルで拡張できるターミナル型コーディングエージェント | 自動選択（pi 拡張）、新規対応、フィードバック歓迎 |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | すべてがプラグインの DeepSeek のエージェント基盤 | 自動選択（dsh プラグイン）、新規対応、フィードバック歓迎 |
| **あなたのエージェント** | 薄い接続層を書くだけで、コアは変更不要 | PR を送って、ここに追加してください：[ADAPTERS.md](ADAPTERS.md)（英語） |

新しく対応したエージェントの接続方法は [ADAPTERS.md](ADAPTERS.md)（英語）にあります。`cam connect <エージェント>` で変更する設定が表示されます。問題があれば [issue](https://github.com/chipfighter/context-attachment-manager/issues) でお知らせください。

<p align="center"><sub><a href="CHANGELOG.md">変更履歴（英語）</a> · <a href="CONTRIBUTING.md">開発への参加（英語）</a> · <a href="LICENSE">MIT ライセンス</a></sub></p>
