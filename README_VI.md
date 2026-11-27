<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="Context Attachment Manager">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>Giữ cho những cuộc trò chuyện dài có nhiều ảnh trong Codex và Claude Code luôn nhanh.</b><br>Ảnh từ các lượt trước được thay bằng một dòng ghi ID. Khi cần xem lại, mô hình lấy ảnh gốc theo ID đó, kể cả sau khi lịch sử trò chuyện đã được thu gọn.</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="GitHub Releases"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Windows, macOS, Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <a href="README_TW.md">繁體中文</a> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <b>Tiếng Việt</b><br>
  <a href="README_ES.md">Español</a> · <a href="README_PT_BR.md">Português (Brasil)</a> · <a href="README_FR.md">Français</a> · <a href="README_DE.md">Deutsch</a> · <a href="README_IT.md">Italiano</a> · <a href="README_PL.md">Polski</a><br>
  <a href="README_RU.md">Русский</a> · <a href="README_TR.md">Türkçe</a> · <a href="README_AR.md">العربية</a> · <a href="README_HI.md">हिन्दी</a> · <a href="README_ID.md">Bahasa Indonesia</a> · <a href="README_TH.md">ไทย</a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/hero-dark.gif">
    <img src="docs/images/hero.gif" alt="Khi chưa cài plugin, mỗi yêu cầu gửi lại toàn bộ ảnh cũ. Sau khi cài, ảnh tham chiếu đã ghim vẫn được gửi, còn các ảnh khác được thay bằng dòng ghi ID. Mô hình lấy ảnh gốc khi cần." width="100%">
  </picture>
</p>

<table>
  <tr>
    <td align="center" width="33%"><h3>42,4 MB → 0,12 MB</h3>Dung lượng của một yêu cầu trong cuộc trò chuyện Codex có chín khung hình chính</td>
    <td align="center" width="33%"><h3>20/20 so với 8/20</h3>Số câu hỏi về ảnh được trả lời đúng sau khi thu gọn lịch sử (Sonnet 5.5)</td>
    <td align="center" width="33%"><h3>Chi phí gần như tương đương</h3>Yêu cầu lớn nhất: 41.859 so với 110.671 token</td>
  </tr>
</table>

## Bắt đầu trong ba bước

**1. Cài plugin.** Gửi câu dưới đây cho agent. Agent tự nhận diện nền tảng đang dùng và thực hiện các bước cài đặt phù hợp.

```text
Cài Context Attachment Manager cho tôi theo hướng dẫn tại https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

Sau đó khởi động lại agent. Trong Claude Desktop, hãy mở một phiên Code mới. Nếu cài thủ công, xem [hướng dẫn cài đặt, cập nhật và gỡ cài đặt](INSTALL.md) bằng tiếng Anh. Với Codex và Claude Code, phiên bản mới được cài đặt ở chế độ nền và có hiệu lực khi khởi động lại.

**2. Làm việc như bình thường.** Plugin được bật sẵn. Ảnh cũ được thay bằng một dòng ghi ID. Ảnh mới và ảnh tham chiếu đã ghim vẫn được gửi nguyên vẹn.

```text
[Image IMG-004 omitted | shot-1.png | generated image | turn 2 | 505×505]
Features: place: Street | Qinghe | medium shot, umbrella, lanterns
For the original, call cam_view_image with "IMG-004".
```

**3. Mô hình lấy ảnh gốc theo ID.** Khi cần xem lại một ảnh từ lượt trước, mô hình có thể lấy ảnh gốc ngay cả sau khi thu gọn lịch sử. Ảnh và lịch sử trò chuyện vẫn nằm trên máy của bạn.

## Bảng duyệt ảnh theo nhân vật và địa điểm

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/panel-dark.png">
    <img src="docs/images/panel.png" alt="Bên trái là các thẻ địa điểm. Bên phải là thẻ của nhân vật Qinghe, với ảnh tham chiếu ở đầu và các khung hình trên đường phố ở dưới." width="100%">
  </picture>
</p>

- **Duyệt theo nhóm.** Ảnh được gom thành các thẻ nhân vật, địa điểm, màn hình và tài liệu. Thẻ nhân vật hiển thị ảnh tạo hình trước, rồi đến các khung hình có nhân vật đó theo từng địa điểm.
- **Tìm qua chi tiết hoặc nhận xét.** Nhập điều bạn còn nhớ, chẳng hạn “đêm mưa” hoặc “khuôn mặt đẹp nhất”.
- **Ghim ảnh tham chiếu.** Mở ảnh rồi bật **Send every turn**.
- **Tự chọn ảnh cần gửi.** Tắt **Auto-select** rồi chọn ảnh cho tin nhắn tiếp theo.

Trong Codex, mở **Context Assets** trên thanh bên của tác vụ. Trong thẻ Code của Claude Desktop, bảng tự mở khi có ảnh. Gõ `/cam` để mở lại. Plugin vẫn hoạt động khi bảng đóng.

## Kết quả thử nghiệm

- **Codex.** Trong một cuộc trò chuyện Codex có chín khung hình chính, yêu cầu tăng lên 42,4 MB và không gửi được sau khi khởi động lại hoặc thu gọn lịch sử. Với plugin, cùng yêu cầu đó gửi được với dung lượng 0,12 MB.
- **Claude Code (Sonnet 5.5).** Trong tác vụ làm phim ngắn kéo dài 16 lượt, sau khi thu gọn lịch sử, Sonnet 5.5 trả lời đúng 20/20 câu hỏi về những ảnh chỉ có trong cuộc trò chuyện. Khi không dùng plugin, kết quả là 8/20. Yêu cầu lớn nhất chứa 41.859 thay vì 110.671 token, với chi phí gần như tương đương.

Xem kết quả và cách tái lập ở [bài thử Codex](eval/README.md), [bài thử thu gọn lịch sử Claude Code](eval/compaction/README.md) và [bài thử tác vụ dài Claude Code](eval/long-task/README.md).

## Cách plugin giữ bộ nhớ đệm

Dịch vụ mô hình có thể đọc phần đầu cuộc trò chuyện từ bộ nhớ đệm khi phần đó giữ nguyên. Nếu nội dung ở đầu thay đổi, những gì theo sau phải được xử lý lại. Plugin thực hiện thay đổi càng gần cuối cuộc trò chuyện càng tốt.

<p align="center">
  <img src="docs/images/cache-compare.svg" alt="Bốn cách gửi yêu cầu tiếp theo. Khi dùng dòng ghi ID của plugin, chỉ phần còn lại của lượt trước được xử lý lại." width="100%">
</p>

Dòng ghi ID được tạo ở lượt sau khi ảnh xuất hiện và giữ nguyên trong các yêu cầu tiếp theo. Khi mô hình lấy ảnh gốc, ảnh được thêm vào cuối lượt hiện tại và dòng ghi ID cũ vẫn ở chỗ cũ.

Sau một lượt có ảnh, phần còn lại của lượt đó được xử lý lại một lần. Mô hình cũng ghi mô tả ngắn cho mỗi ảnh mới. Đổi lựa chọn của một ảnh cũ trong bảng sẽ khiến nội dung sau điểm đó được xử lý lại một lần. Trong [bài thử tác vụ dài](eval/long-task/README.md), 87% đầu vào được đọc từ bộ nhớ đệm khi dùng plugin, so với 91% khi không dùng.

## Các agent được hỗ trợ

Codex và Claude Code đã được thử nghiệm. Bảng duyệt ảnh có trong ứng dụng Codex và Claude Desktop. Với các agent còn lại, tính năng tự chọn ảnh hoạt động qua bộ tích hợp chưa được thử trong thực tế.

[Codex](https://github.com/openai/codex) · [Claude Code](https://github.com/anthropics/claude-code) · [WorkBuddy](https://www.workbuddy.cn) · [OpenCode](https://github.com/anomalyco/opencode) · [Gemini CLI](https://github.com/google-gemini/gemini-cli) · [pi](https://github.com/earendil-works/pi) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · [Qwen Code](https://github.com/QwenLM/qwen-code) · [Cline](https://github.com/cline/cline) · [Kilo Code](https://github.com/Kilo-Org/kilocode) · [goose](https://github.com/aaif-goose/goose) · [Cherry Studio](https://github.com/CherryHQ/cherry-studio)

Xem [INSTALL.md](INSTALL.md#other-agents) để thiết lập. Nếu dùng thử, hãy [chia sẻ kết quả](https://github.com/chipfighter/context-attachment-manager/issues). Muốn kết nối thêm agent, xem [ADAPTERS.md](ADAPTERS.md).

## Câu hỏi thường gặp

### Vì sao cuộc trò chuyện dài có nhiều ảnh bị chậm?

Mỗi tin nhắn mới có thể gửi lại toàn bộ ảnh cũ. Ảnh càng nhiều, yêu cầu càng nặng và có thể không gửi được.

### Khác gì với thu gọn lịch sử hoặc thu nhỏ ảnh?

Thu gọn thay đổi phần đầu cuộc trò chuyện, còn thu nhỏ thay đổi ảnh. Plugin giữ một dòng ghi ID cố định để mô hình lấy lại ảnh gốc.

### Sau khi thu gọn lịch sử, mô hình có tìm lại được ảnh không?

Có. Mỗi ảnh có một ID như `IMG-001` và mô tả ngắn gồm nhóm, tên và các nhân vật xuất hiện. Mô hình có thể dùng ID để lấy ảnh gốc.

### Một lượt trả về nhiều ảnh chụp màn hình thì sao?

Các ảnh cũ được thay bằng dòng ghi ID theo lô, còn vài ảnh mới nhất được gửi nguyên vẹn. Mô hình có thể mô tả một loạt ảnh tương tự trong một dòng và lấy lại từng ảnh theo ID.

### Plugin có hỗ trợ PDF không?

Trong Claude Code, khi bật **Auto-select**, PDF đã đọc ở lượt trước được thay bằng dòng có ID như `PDF-001`. Mô hình lấy đúng trang cần xem theo ID và số trang. Cả PDF văn bản lẫn bản quét đều được hỗ trợ. Trong Codex, trang đã chuyển thành ảnh được xử lý như các ảnh khác.

### Ảnh và yêu cầu được gửi đi đâu?

Ảnh gốc và lịch sử ở lại trên máy của bạn. Yêu cầu vẫn đến dịch vụ agent đang dùng. Khi kiểm tra bản cập nhật trên GitHub, plugin không gửi dữ liệu về bạn. Bạn có thể tắt tính năng đó trong bảng.

### Có cần dùng dòng lệnh không? Plugin có miễn phí không?

Bạn có thể nhờ agent cài hoặc mở trang Plugins trong Codex. Cài thủ công theo [INSTALL.md](INSTALL.md). Plugin miễn phí, mã nguồn mở theo giấy phép MIT.

<p align="center"><sub><a href="CHANGELOG.md">Nhật ký thay đổi</a> · <a href="CONTRIBUTING.md">Đóng góp</a> · <a href="LICENSE">Giấy phép MIT</a></sub></p>
