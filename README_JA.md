<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>Codex や Claude で画像のやり取りを重ねても、会話を軽快に。</b><br>モデルが画像を管理し、必要なものだけを取り出します。以前作った画像も、覚えている特徴や感想で検索できます。</p>

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

## 作った理由

Codex で GPT と画像の生成や修正を繰り返していたところ、画像が十数枚になった頃から、再接続を繰り返すばかりでメッセージを送れなくなりました。メッセージを送るたびに会話内のすべての画像が再送され、1 回で約 44 MB になっていたのです。新しい会話を始めれば送れますが、それまで積み重ねた内容を引き継げません。

そこで、会話を続けながら送信量を減らせるパネルを作りました。

## できること

- **モデルが画像を自分で管理。** 過去の画像を毎回送り直さず、必要な画像だけをモデルが取り出します。特別な設定は不要です。キャラクターの参考画像など、常に見てほしい画像は毎回送るように固定できます。
- **覚えていることから画像を検索。** 「いちばん良い顔」「雨の夜」などで検索したり、場所で絞り込んだり、会話のターンごとに画像を探したりできます。クリックすると大きなプレビューが開きます。
- **会話を圧縮した後も画像を探せる。** モデルは、画像の特徴とあなたの感想（「暗すぎる」「この顔がいちばん良い」など）を、会話の本文には表示せずに記録します。長い会話でも、会話を圧縮した後でも、必要な画像を探す手がかりになります。
- **会話の送信量を削減。** 画像が 15 枚あるタスクのテストでは、24.9 MB あったリクエストが 212 KB になりました。

## インストール

次の文を Codex、または Claude Desktop の **Code** タブにいる Claude に送ってください。

```text
次の手順に従って、Context Attachment Manager プラグインをインストールしてください：https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

インストール後は Codex を再起動してください。Claude Desktop では **Code** タブで新しいセッションを始めてください。手動でのインストール、更新、アンインストールの手順は、共通の [INSTALL.md](INSTALL.md)（英語）にあります。

## パネルを開く

- **Codex**：タスクを開き、右上の **Toggle side panel** でサイドパネルを表示します。**+** から新しいタブを開き、**Plugins and MCPs** の **Context Assets** を選んでください。見つからない場合は、Codex を一度再起動してください。
- **Claude Desktop**：**Code** タブの会話に画像があると、会話の隣にある内蔵ブラウザーでパネルが自動的に開きます。もう一度開きたいときは `/cam` を入力して送信してください。新しいセッションの最初のメッセージが `/cam` の場合、入力欄にコマンドが存在しないと表示されることがありますが、そのまま送信できます。

パネルの対応言語は現在、英語と簡体字中国語です。日本語環境では英語で表示されるため、ここでは実際の画面に合わせて英語の操作名を使っています。

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

<p align="center"><sub><a href="CHANGELOG.md">変更履歴（英語）</a> · <a href="CONTRIBUTING.md">開発への参加（英語）</a> · <a href="LICENSE">MIT ライセンス</a></sub></p>
