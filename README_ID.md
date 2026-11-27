<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="Context Attachment Manager">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>Jaga agar percakapan panjang dengan banyak gambar tetap lancar di Codex dan Claude Code.</b><br>Gambar dari giliran sebelumnya diganti dengan penanda satu baris yang berisi ID. Saat model memerlukannya lagi, gambar asli diambil berdasarkan ID, bahkan setelah riwayat percakapan diringkas.</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="GitHub Releases"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Windows, macOS, Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <a href="README_TW.md">繁體中文</a> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <a href="README_VI.md">Tiếng Việt</a><br>
  <a href="README_ES.md">Español</a> · <a href="README_PT_BR.md">Português (Brasil)</a> · <a href="README_FR.md">Français</a> · <a href="README_DE.md">Deutsch</a> · <a href="README_IT.md">Italiano</a> · <a href="README_PL.md">Polski</a><br>
  <a href="README_RU.md">Русский</a> · <a href="README_TR.md">Türkçe</a> · <a href="README_AR.md">العربية</a> · <a href="README_HI.md">हिन्दी</a> · <b>Bahasa Indonesia</b> · <a href="README_TH.md">ไทย</a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/hero-dark.gif">
    <img src="docs/images/hero.gif" alt="Tanpa plugin, setiap permintaan mengirim ulang gambar sebelumnya. Dengan plugin, referensi yang disematkan tetap dikirim, sedangkan gambar lainnya menjadi penanda ber-ID. Model mengambil gambar asli saat diperlukan." width="100%">
  </picture>
</p>

<table>
  <tr>
    <td align="center" width="33%"><h3>42,4 MB → 0,12 MB</h3>Ukuran satu permintaan dalam percakapan Codex dengan sembilan keyframe</td>
    <td align="center" width="33%"><h3>20/20 vs 8/20</h3>Jawaban benar tentang gambar setelah riwayat diringkas (Sonnet 5.5)</td>
    <td align="center" width="33%"><h3>Biaya hampir sama</h3>Permintaan terbesar: 41.859 dibanding 110.671 token</td>
  </tr>
</table>

## Mulai dalam tiga langkah

**1. Pasang plugin.** Kirim kalimat berikut ke agen Anda. Agen akan mengenali platformnya dan menjalankan langkah pemasangan yang sesuai.

```text
Pasang Context Attachment Manager untuk saya dengan mengikuti panduan di https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

Setelah itu, jalankan ulang agen. Di Claude Desktop, cukup buka sesi Code baru. Untuk pemasangan manual, lihat [panduan pemasangan, pembaruan, dan penghapusan](INSTALL.md) dalam bahasa Inggris. Di Codex dan Claude Code, versi baru dipasang di latar belakang dan mulai digunakan saat agen dijalankan lagi.

**2. Bekerja seperti biasa.** Plugin aktif secara bawaan. Gambar lama menjadi penanda satu baris. Gambar baru dan referensi yang disematkan tetap dikirim utuh.

```text
[Image IMG-004 omitted | shot-1.png | generated image | turn 2 | 505×505]
Features: place: Street | Qinghe | medium shot, umbrella, lanterns
For the original, call cam_view_image with "IMG-004".
```

**3. Model mengambil gambar asli berdasarkan ID.** Jika perlu melihat gambar dari giliran sebelumnya, model dapat mengambil gambar asli meski riwayat sudah diringkas. Gambar dan riwayat percakapan tetap ada di komputer Anda.

## Panel untuk melihat gambar berdasarkan karakter dan lokasi

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/panel-dark.png">
    <img src="docs/images/panel.png" alt="Di kiri ada kartu lokasi. Di kanan terbuka kartu Qinghe, dengan gambar referensi karakter diikuti cuplikan adegannya di jalan." width="100%">
  </picture>
</p>

- **Telusuri berdasarkan kategori.** Gambar dikelompokkan dalam kartu karakter, lokasi, layar, dan dokumen. Kartu karakter menampilkan gambar referensi terlebih dahulu, lalu cuplikan adegan yang dikelompokkan berdasarkan lokasi.
- **Cari lewat detail atau komentar.** Ketik yang Anda ingat, misalnya “malam hujan” atau “wajah terbaik”.
- **Sematkan referensi.** Buka gambar lalu centang **Send every turn**.
- **Pilih gambar sendiri.** Nonaktifkan **Auto-select**, lalu tandai gambar untuk pesan berikutnya.

Di Codex, buka **Context Assets** dari panel samping tugas. Di tab Code pada Claude Desktop, panel terbuka otomatis saat ada gambar. Ketik `/cam` untuk membukanya kembali. Plugin tetap bekerja saat panel ditutup.

## Hasil pengujian

- **Codex.** Dalam percakapan Codex dengan sembilan keyframe, permintaan membesar sampai 42,4 MB dan gagal dikirim setelah agen dijalankan ulang atau riwayat diringkas. Dengan plugin, permintaan yang sama berukuran 0,12 MB dan berhasil dikirim.
- **Claude Code (Sonnet 5.5).** Pada tugas film pendek yang berlangsung 16 giliran, Sonnet 5.5 menjawab dengan benar 20 dari 20 pertanyaan tentang gambar yang hanya ada di percakapan setelah riwayat diringkas. Tanpa plugin, hanya 8 dari 20. Permintaan terbesar berisi 41.859 token alih-alih 110.671, dengan biaya hampir sama.

Lihat hasil dan cara mengulangnya di [uji Codex](eval/README.md), [uji peringkasan Claude Code](eval/compaction/README.md), dan [uji tugas panjang Claude Code](eval/long-task/README.md).

## Cara menjaga cache tetap berguna

Layanan model dapat membaca bagian awal percakapan yang masih sama dari cache. Perubahan di bagian awal membuat isi setelahnya diproses ulang. Plugin menempatkan perubahan sedekat mungkin dengan akhir percakapan.

<p align="center">
  <img src="docs/images/cache-compare.svg" alt="Empat cara mengirim permintaan berikutnya. Dengan penanda plugin, hanya sisa giliran sebelumnya yang diproses ulang." width="100%">
</p>

Penanda dibuat pada giliran setelah gambar muncul, lalu tetap sama pada permintaan berikutnya. Saat model mengambil gambar asli, gambar ditambahkan di akhir giliran saat ini dan penanda lama tetap di tempatnya.

Setelah giliran yang memuat gambar, sisa giliran itu diproses ulang satu kali dan model menulis catatan singkat untuk setiap gambar baru. Mengubah pilihan gambar lama dari panel memicu pemrosesan ulang satu kali mulai dari titik tersebut. Dalam [uji tugas panjang](eval/long-task/README.md), 87% input dibaca dari cache dengan plugin dan 91% tanpa plugin.

## Agen yang didukung

Codex dan Claude Code telah diuji. Panel tersedia di aplikasi desktop Codex dan Claude. Agen lainnya mendukung pemilihan otomatis melalui adaptor yang belum diuji dalam penggunaan langsung.

[Codex](https://github.com/openai/codex) · [Claude Code](https://github.com/anthropics/claude-code) · [WorkBuddy](https://www.workbuddy.cn) · [OpenCode](https://github.com/anomalyco/opencode) · [Gemini CLI](https://github.com/google-gemini/gemini-cli) · [pi](https://github.com/earendil-works/pi) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · [Qwen Code](https://github.com/QwenLM/qwen-code) · [Cline](https://github.com/cline/cline) · [Kilo Code](https://github.com/Kilo-Org/kilocode) · [goose](https://github.com/aaif-goose/goose) · [Cherry Studio](https://github.com/CherryHQ/cherry-studio)

Lihat [INSTALL.md](INSTALL.md#other-agents) untuk menyiapkannya. Bila Anda mencoba adaptor ini, [ceritakan hasilnya](https://github.com/chipfighter/context-attachment-manager/issues). Untuk menambahkan agen lain, lihat [ADAPTERS.md](ADAPTERS.md).

## Pertanyaan umum

### Mengapa percakapan dengan banyak gambar jadi lambat?

Setiap pesan baru dapat mengirim ulang semua gambar lama. Permintaan makin besar dan akhirnya bisa gagal dikirim.

### Apa bedanya dengan meringkas riwayat atau mengecilkan gambar?

Peringkasan mengubah bagian awal percakapan, sedangkan pengubahan ukuran mengubah gambarnya. Plugin meninggalkan penanda tetap yang dapat dipakai untuk mengambil gambar asli.

### Bisakah model menemukan gambar lama setelah riwayat diringkas?

Ya. Setiap gambar memiliki ID seperti `IMG-001` beserta catatan berisi kategori, nama, dan karakter di dalamnya. Model bisa mengambil gambar asli berdasarkan ID.

### Bagaimana jika ada banyak tangkapan layar dalam satu giliran?

Tangkapan layar lama diganti penanda secara berkelompok, sementara beberapa yang terbaru tetap dikirim utuh. Model dapat meringkas tangkapan layar yang mirip dalam satu catatan dan mengambil yang diperlukan berdasarkan ID.

### Apakah PDF didukung?

Di Claude Code, ketika **Auto-select** aktif, PDF yang dibaca sebelumnya diwakili penanda seperti `PDF-001`. Model mengambil halaman yang dibutuhkan berdasarkan ID dan nomor halaman. Ini berlaku untuk PDF teks maupun hasil pindai. Di Codex, halaman yang diubah menjadi gambar ditangani seperti gambar lain.

### Ke mana gambar dan permintaan saya dikirim?

Gambar asli dan riwayat tetap di komputer. Permintaan diteruskan ke layanan yang sudah digunakan agen Anda. Pemeriksaan pembaruan ke GitHub tidak mengirim data tentang Anda dan dapat dinonaktifkan dari panel.

### Apakah perlu terminal dan apakah plugin gratis?

Minta agen memasangnya atau gunakan halaman Plugins di Codex. Untuk pemasangan manual, lihat [INSTALL.md](INSTALL.md). Plugin ini gratis dan bersumber terbuka dengan lisensi MIT.

<p align="center"><sub><a href="CHANGELOG.md">Catatan rilis</a> · <a href="CONTRIBUTING.md">Cara berkontribusi</a> · <a href="LICENSE">Lisensi MIT</a></sub></p>
