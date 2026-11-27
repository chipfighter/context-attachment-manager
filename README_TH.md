<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="Context Attachment Manager">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>ให้แชตยาวที่มีรูปจำนวนมากใน Codex และ Claude Code ยังทำงานได้รวดเร็ว</b><br>รูปจากรอบก่อนหน้าจะถูกแทนด้วยข้อความสั้นหนึ่งบรรทัดที่มีรหัส เมื่อโมเดลต้องการดูรูปเดิมอีกครั้ง จะเรียกรูปต้นฉบับด้วยรหัสนั้นได้ แม้หลังย่อประวัติแชต</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="GitHub Releases"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Windows, macOS, Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <a href="README_TW.md">繁體中文</a> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <a href="README_VI.md">Tiếng Việt</a><br>
  <a href="README_ES.md">Español</a> · <a href="README_PT_BR.md">Português (Brasil)</a> · <a href="README_FR.md">Français</a> · <a href="README_DE.md">Deutsch</a> · <a href="README_IT.md">Italiano</a> · <a href="README_PL.md">Polski</a><br>
  <a href="README_RU.md">Русский</a> · <a href="README_TR.md">Türkçe</a> · <a href="README_AR.md">العربية</a> · <a href="README_HI.md">हिन्दी</a> · <a href="README_ID.md">Bahasa Indonesia</a> · <b>ไทย</b>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/hero-dark.gif">
    <img src="docs/images/hero.gif" alt="ก่อนติดตั้ง ระบบส่งรูปเก่าซ้ำทุกครั้ง หลังติดตั้ง ระบบยังส่งรูปอ้างอิงที่ปักหมุดไว้ ส่วนรูปอื่นใช้ข้อความที่มีรหัสแทน โมเดลเรียกรูปต้นฉบับเมื่อจำเป็น" width="100%">
  </picture>
</p>

<table>
  <tr>
    <td align="center" width="33%"><h3>42.4 MB → 0.12 MB</h3>ขนาดคำขอหนึ่งครั้งในแชต Codex ที่มีคีย์เฟรมเก้าภาพ</td>
    <td align="center" width="33%"><h3>20/20 เทียบกับ 8/20</h3>จำนวนคำตอบที่ถูกต้องเกี่ยวกับรูปหลังย่อประวัติแชต (Sonnet 5.5)</td>
    <td align="center" width="33%"><h3>ค่าใช้จ่ายใกล้เคียงเดิม</h3>คำขอที่ใหญ่ที่สุดใช้ 41,859 แทน 110,671 โทเค็น</td>
  </tr>
</table>

## เริ่มใช้งานในสามขั้นตอน

**1. ติดตั้งปลั๊กอิน** ส่งข้อความด้านล่างให้เอเจนต์ของคุณ เอเจนต์จะตรวจสอบแพลตฟอร์มและติดตั้งตามขั้นตอนที่เหมาะสม

```text
ติดตั้ง Context Attachment Manager ให้ฉันตามคู่มือนี้ https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

จากนั้นเปิดเอเจนต์ใหม่ หากใช้ Claude Desktop ให้เริ่มเซสชัน Code ใหม่ ติดตั้งเองได้ตาม [คู่มือติดตั้ง อัปเดต และถอนการติดตั้ง](INSTALL.md) ภาษาอังกฤษ สำหรับ Codex และ Claude Code เวอร์ชันใหม่จะติดตั้งเบื้องหลังและเริ่มใช้เมื่อเปิดเอเจนต์อีกครั้ง

**2. ทำงานตามปกติ** ปลั๊กอินเปิดใช้งานตามค่าเริ่มต้น รูปเก่าจะถูกแทนด้วยข้อความหนึ่งบรรทัด ส่วนรูปใหม่และรูปอ้างอิงที่ปักหมุดไว้จะส่งแบบเต็ม

```text
[Image IMG-004 omitted | shot-1.png | generated image | turn 2 | 505×505]
Features: place: Street | Qinghe | medium shot, umbrella, lanterns
For the original, call cam_view_image with "IMG-004".
```

**3. โมเดลเรียกรูปต้นฉบับด้วยรหัส** เมื่อจำเป็นต้องดูรูปจากรอบก่อนหน้า โมเดลจะเรียกต้นฉบับกลับมาได้แม้ประวัติแชตจะถูกย่อแล้ว รูปและประวัติยังอยู่ในเครื่องของคุณ

## แผงดูรูปตามตัวละครและสถานที่

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/panel-dark.png">
    <img src="docs/images/panel.png" alt="ด้านซ้ายเป็นการ์ดสถานที่ ด้านขวาเปิดการ์ดของ Qinghe โดยแสดงรูปอ้างอิงตัวละครก่อน แล้วตามด้วยช็อตบนถนน" width="100%">
  </picture>
</p>

- **ดูรูปตามหมวดหมู่** รูปจัดเป็นการ์ดตัวละคร สถานที่ หน้าจอ และเอกสาร การ์ดตัวละครแสดงรูปอ้างอิงก่อน ตามด้วยช็อตที่ตัวละครปรากฏ แยกตามสถานที่
- **ค้นหาจากรายละเอียดหรือคำพูดที่จำได้** เช่น “คืนฝนตก” หรือ “รูปที่หน้าดูดีที่สุด”
- **ปักหมุดรูปอ้างอิง** เปิดรูปแล้วเลือก **Send every turn**
- **เลือกรูปเอง** ปิด **Auto-select** แล้วเลือกรูปที่จะส่งพร้อมข้อความถัดไป

ใน Codex ให้เปิด **Context Assets** จากแถบข้างของงาน ส่วนแท็บ Code ใน Claude Desktop จะเปิดแผงอัตโนมัติเมื่อมีรูป พิมพ์ `/cam` เพื่อเปิดอีกครั้ง ปลั๊กอินยังทำงานเมื่อปิดแผง

## ผลการทดสอบ

- **Codex.** ในแชต Codex ที่มีคีย์เฟรมเก้าภาพ คำขอมีขนาดเพิ่มขึ้นถึง 42.4 MB และส่งไม่ได้หลังเปิดใหม่หรือย่อประวัติ เมื่อใช้ปลั๊กอิน คำขอเดิมมีขนาด 0.12 MB และส่งได้สำเร็จ
- **Claude Code (Sonnet 5.5).** ในการทำหนังสั้น 16 รอบ หลังย่อประวัติแชต Sonnet 5.5 ตอบคำถามเกี่ยวกับรูปที่มีเฉพาะในแชตได้ถูก 20 จาก 20 ข้อ เมื่อไม่ใช้ปลั๊กอินตอบถูก 8 จาก 20 ข้อ คำขอที่ใหญ่ที่สุดลดจาก 110,671 เหลือ 41,859 โทเค็น โดยค่าใช้จ่ายใกล้เคียงกัน

ดูผลและวิธีทดสอบซ้ำใน [การเปรียบเทียบ Codex](eval/README.md) [การทดสอบย่อประวัติใน Claude Code](eval/compaction/README.md) และ [การทดสอบงานยาวใน Claude Code](eval/long-task/README.md)

## แคชยังใช้งานได้อย่างไร

บริการโมเดลอ่านส่วนต้นของแชตจากแคชได้เมื่อเนื้อหายังเหมือนเดิม ถ้าเปลี่ยนเนื้อหาช่วงต้น ส่วนหลังจะต้องประมวลผลอีกครั้ง ปลั๊กอินจึงเปลี่ยนเนื้อหาให้ใกล้ท้ายแชตที่สุด

<p align="center">
  <img src="docs/images/cache-compare.svg" alt="สี่วิธีในการส่งคำขอครั้งถัดไป เมื่อใช้ข้อความแทนรูป จะประมวลผลซ้ำเฉพาะส่วนที่เหลือของรอบก่อนหน้า" width="100%">
</p>

ข้อความที่มีรหัสจะถูกสร้างในรอบถัดจากรอบที่รูปปรากฏและคงเดิมในคำขอต่อ ๆ ไป เมื่อเรียกรูปต้นฉบับ ระบบจะเพิ่มรูปท้ายรอบปัจจุบัน โดยข้อความเดิมยังอยู่ที่เดิม

เมื่อรอบหนึ่งมีรูป ระบบจะประมวลผลส่วนที่เหลือของรอบนั้นซ้ำหนึ่งครั้ง และโมเดลเขียนคำอธิบายสั้นให้รูปใหม่แต่ละรูป หากเปลี่ยนการเลือกรูปเก่าในแผง เนื้อหาหลังจุดนั้นจะประมวลผลซ้ำหนึ่งครั้ง ใน [การทดสอบงานยาว](eval/long-task/README.md) ระบบอ่านอินพุตจากแคชได้ 87% เมื่อใช้ปลั๊กอิน และ 91% เมื่อไม่ใช้

## เอเจนต์ที่รองรับ

ทดสอบแล้วกับ Codex และ Claude Code แผงรูปภาพใช้ได้ในแอปเดสก์ท็อป Codex และ Claude ส่วนเอเจนต์อื่นรองรับการเลือกรูปอัตโนมัติผ่านตัวเชื่อมต่อที่ยังไม่ได้ทดสอบใช้งานจริง

[Codex](https://github.com/openai/codex) · [Claude Code](https://github.com/anthropics/claude-code) · [WorkBuddy](https://www.workbuddy.cn) · [OpenCode](https://github.com/anomalyco/opencode) · [Gemini CLI](https://github.com/google-gemini/gemini-cli) · [pi](https://github.com/earendil-works/pi) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · [Qwen Code](https://github.com/QwenLM/qwen-code) · [Cline](https://github.com/cline/cline) · [Kilo Code](https://github.com/Kilo-Org/kilocode) · [goose](https://github.com/aaif-goose/goose) · [Cherry Studio](https://github.com/CherryHQ/cherry-studio)

ดูวิธีตั้งค่าใน [INSTALL.md](INSTALL.md#other-agents) ถ้าลองใช้ตัวเชื่อมต่อเหล่านี้ [บอกผลให้เราทราบ](https://github.com/chipfighter/context-attachment-manager/issues) หากต้องการเชื่อมต่อเอเจนต์อื่น ดู [ADAPTERS.md](ADAPTERS.md)

## คำถามที่พบบ่อย

### ทำไมแชตยาวที่มีรูปเยอะถึงช้าลง

ข้อความใหม่อาจส่งรูปทั้งหมดก่อนหน้านี้ซ้ำ เมื่อรูปสะสม คำขอจะใหญ่ขึ้นและอาจส่งไม่สำเร็จ

### ต่างจากการย่อประวัติแชตหรือย่อขนาดรูปอย่างไร

การย่อประวัติเปลี่ยนเนื้อหาส่วนต้นของแชต ส่วนการย่อรูปเปลี่ยนตัวรูป ปลั๊กอินเก็บข้อความที่มีรหัสไว้คงเดิม จึงใช้รหัสเรียกรูปต้นฉบับได้

### หลังย่อประวัติแชตยังหารูปเก่าเจอไหม

ได้ แต่ละรูปมีรหัส เช่น `IMG-001` พร้อมคำอธิบายสั้น ๆ ระบุหมวดหมู่ ชื่อ และตัวละคร โมเดลใช้รหัสเพื่อเรียกต้นฉบับกลับมาได้

### ถ้าเครื่องมือส่งภาพหน้าจอหลายภาพในรอบเดียวจะเกิดอะไรขึ้น

ภาพเก่าจะถูกแทนด้วยข้อความพร้อมรหัสเป็นชุด ส่วนภาพใหม่ล่าสุดบางภาพยังส่งแบบเต็ม โมเดลอธิบายภาพที่คล้ายกันได้ในบรรทัดเดียวและเรียกแต่ละภาพด้วยรหัสของภาพนั้น

### รองรับ PDF ไหม

ใน Claude Code เมื่อเปิด **Auto-select** ระบบจะแทน PDF ที่อ่านไปแล้วด้วยข้อความสั้นที่มีรหัส เช่น `PDF-001` แล้วโมเดลเรียกเฉพาะหน้าที่ต้องการด้วยรหัสและเลขหน้า รองรับทั้ง PDF ข้อความและไฟล์สแกน ใน Codex หน้าที่ถูกแปลงเป็นรูปจะจัดการเหมือนรูปทั่วไป

### รูปและคำขอของฉันไปที่ไหน

ต้นฉบับและประวัติแชตอยู่ในเครื่อง คำขอยังส่งไปยังบริการเดิมที่เอเจนต์ใช้ การตรวจสอบอัปเดตกับ GitHub ไม่ส่งข้อมูลเกี่ยวกับคุณ และปิดได้ในแผง

### ต้องใช้เทอร์มินัลไหม และปลั๊กอินฟรีหรือเปล่า

ขอให้เอเจนต์ติดตั้ง หรือใช้หน้า Plugins ใน Codex ได้ หากจะติดตั้งเองให้ดู [INSTALL.md](INSTALL.md) ปลั๊กอินเป็นโอเพนซอร์ส ใช้ได้ฟรีภายใต้สัญญาอนุญาต MIT

<p align="center"><sub><a href="CHANGELOG.md">รายการเปลี่ยนแปลง</a> · <a href="CONTRIBUTING.md">ร่วมพัฒนา</a> · <a href="LICENSE">สัญญาอนุญาต MIT</a></sub></p>
