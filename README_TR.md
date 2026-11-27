<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="Context Attachment Manager">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>Codex ve Claude Code’da bol görselli uzun sohbetler hızlı kalsın.</b><br>Önceki turlardaki görsellerin yerine kimlik numarası içeren tek satırlık yer tutucular kullanılır. Model bir görsele yeniden ihtiyaç duyduğunda, sohbet sıkıştırılmış olsa bile orijinalini bu numarayla getirir.</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="GitHub Releases"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Windows, macOS, Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <a href="README_TW.md">繁體中文</a> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <a href="README_VI.md">Tiếng Việt</a><br>
  <a href="README_ES.md">Español</a> · <a href="README_PT_BR.md">Português (Brasil)</a> · <a href="README_FR.md">Français</a> · <a href="README_DE.md">Deutsch</a> · <a href="README_IT.md">Italiano</a> · <a href="README_PL.md">Polski</a><br>
  <a href="README_RU.md">Русский</a> · <b>Türkçe</b> · <a href="README_AR.md">العربية</a> · <a href="README_HI.md">हिन्दी</a> · <a href="README_ID.md">Bahasa Indonesia</a> · <a href="README_TH.md">ไทย</a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/hero-dark.gif">
    <img src="docs/images/hero.gif" alt="Eklenti olmadan eski görseller her istekte yeniden gönderilir. Eklenti açıkken yalnızca sabitlenen referans gönderilir, diğerlerinin yerini kimlik numaraları alır. Model gerektiğinde orijinal görseli numarasıyla getirir." width="100%">
  </picture>
</p>

<table>
  <tr>
    <td align="center" width="33%"><h3>42,4 MB → 0,12 MB</h3>Dokuz ana kareli bir Codex sohbetindeki tek isteğin boyutu</td>
    <td align="center" width="33%"><h3>20/20’a karşı 8/20</h3>Sohbet sıkıştırıldıktan sonra görsellerle ilgili doğru yanıt sayısı (Sonnet 5.5)</td>
    <td align="center" width="33%"><h3>Yaklaşık aynı maliyet</h3>En büyük istek: 110.671 yerine 41.859 token</td>
  </tr>
</table>

## Üç adımda başlayın

**1. Eklentiyi kurun.** Aşağıdaki cümleyi ajanınıza gönderin. Ajan hangi platformda çalıştığını belirleyip uygun kurulumu yapar.

```text
Şu talimatları izleyerek benim için Context Attachment Manager’ı kur: https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

Ardından ajanı yeniden başlatın. Claude Desktop’ta yeni bir Code oturumu açmanız yeterli. Elle kurmak için İngilizce [kurulum, güncelleme ve kaldırma kılavuzuna](INSTALL.md) bakın. Codex ve Claude Code’da yeni sürümler arka planda yüklenir ve ajan bir sonraki kez başlatıldığında devreye girer.

**2. Her zamanki gibi çalışın.** Eklenti varsayılan olarak açıktır. Önceki görseller tek satırlık yer tutucularla değiştirilir. Yeni görseller ve sabitlediğiniz referanslar olduğu gibi gönderilir.

```text
[Image IMG-004 omitted | shot-1.png | generated image | turn 2 | 505×505]
Features: place: Street | Qinghe | medium shot, umbrella, lanterns
For the original, call cam_view_image with "IMG-004".
```

**3. Model orijinali kimlik numarasıyla getirir.** Model eski bir görsele yeniden bakmak isterse sohbet sıkıştırıldıktan sonra da orijinaline erişebilir. Görseller ve sohbet geçmişi bilgisayarınızda kalır.

## Karakter ve konuma göre göz atma paneli

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/panel-dark.png">
    <img src="docs/images/panel.png" alt="Solda konum kartları, sağda Qinghe’nin referans görseli ve sokak sahnelerindeki kareleri açık." width="100%">
  </picture>
</p>

- **Kategoriye göre gezinin.** Görseller karakter, konum, ekran ve belge kartlarında gruplanır. Bir karakterin kartında önce referans çizimleri, ardından konuma göre gruplanmış sahne kareleri görünür.
- **Ayrıntı veya yorumla arayın.** “Yağmurlu gece” ya da “yüzün en iyi göründüğü kare” gibi hatırladığınız bir ifade yazın.
- **Bir referansı sabitleyin.** Görseli açıp **Send every turn** seçeneğini işaretleyin.
- **Görselleri kendiniz seçin.** **Auto-select** seçeneğini kapatıp bir sonraki mesajla gidecek görselleri işaretleyin.

Codex’te görev kenar çubuğundan **Context Assets** panelini açın. Claude Desktop’ın Code sekmesinde görsel varsa panel kendiliğinden açılır. Tekrar açmak için `/cam` yazın. Eklenti panel kapalıyken de çalışır.

## Test sonuçları

- **Codex.** Dokuz ana kareli bir Codex sohbetinde istek 42,4 MB’a çıktı ve yeniden başlatma veya sıkıştırma sonrasında gönderilemedi. Eklentiyle aynı istek 0,12 MB oldu ve gönderildi.
- **Claude Code (Sonnet 5.5).** 16 turluk bir kısa film çalışmasında, sohbet sıkıştırıldıktan sonra Sonnet 5.5 yalnızca sohbette bulunan görsellerle ilgili 20 sorunun 20’sini doğru yanıtladı. Eklenti olmadan 8’ini doğru yanıtladı. En büyük istek 110.671 yerine 41.859 token içerdi ve maliyet yaklaşık aynı kaldı.

Sonuçlar ve yeniden deneme adımları için [Codex karşılaştırmasına](eval/README.md), [Claude Code sıkıştırma testine](eval/compaction/README.md) ve [Claude Code uzun görev testine](eval/long-task/README.md) bakın.

## Önbellek nasıl korunur?

Model hizmeti sohbetin değişmeyen başlangıcını önbellekten okuyabilir. Önceki bir bölüm değişirse onun ardından gelen içerik yeniden işlenir. Eklenti değişiklikleri sohbetin sonuna mümkün olduğunca yakın yapar.

<p align="center">
  <img src="docs/images/cache-compare.svg" alt="Bir sonraki isteği hazırlamanın dört yolu. Eklentinin yer tutucularıyla yalnızca bir önceki turun kalan bölümü yeniden işlenir." width="100%">
</p>

Yer tutucu, görselin göründüğü turdan sonra bir kez yazılır ve aynı kalır. Model orijinali istediğinde görsel mevcut turun sonuna eklenir. Eski yer tutucu yerinde kalır.

Görselli bir turun kalan kısmı bir kez yeniden işlenir. Model her yeni görsel için kısa bir açıklama da yazar. Panelden eski bir seçimi değiştirmek, o noktadan sonrasını bir kez daha işlettirir. [Uzun görev testinde](eval/long-task/README.md) girdinin eklentiyle %87’si, eklentisiz %91’i önbellekten okundu.

## Desteklenen ajanlar

Codex ve Claude Code test edildi. Panel, Codex ve Claude’un masaüstü uygulamalarında kullanılabilir. Aşağıdaki diğer ajanlar henüz gerçek kullanımda denenmemiş adaptörler üzerinden otomatik seçimi destekler.

[Codex](https://github.com/openai/codex) · [Claude Code](https://github.com/anthropics/claude-code) · [WorkBuddy](https://www.workbuddy.cn) · [OpenCode](https://github.com/anomalyco/opencode) · [Gemini CLI](https://github.com/google-gemini/gemini-cli) · [pi](https://github.com/earendil-works/pi) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · [Qwen Code](https://github.com/QwenLM/qwen-code) · [Cline](https://github.com/cline/cline) · [Kilo Code](https://github.com/Kilo-Org/kilocode) · [goose](https://github.com/aaif-goose/goose) · [Cherry Studio](https://github.com/CherryHQ/cherry-studio)

Kurulum için [INSTALL.md](INSTALL.md#other-agents) dosyasına bakın. Adaptörlerden birini denerseniz [sonucu bizimle paylaşın](https://github.com/chipfighter/context-attachment-manager/issues). Yeni bir ajan eklemek için [ADAPTERS.md](ADAPTERS.md) dosyasına bakın.

## Sık sorulan sorular

### Bol görselli bir sohbet neden yavaşlar?

Her yeni mesaj daha önceki tüm görselleri yeniden gönderebilir. Görseller biriktikçe istek büyür ve sonunda gönderilemeyebilir.

### Sohbeti sıkıştırmaktan ya da görselleri küçültmekten farkı nedir?

Sıkıştırma sohbetin önceki kısmını değiştirir. Yeniden boyutlandırma görselin kendisini değiştirir. Eklenti sabit bir yer tutucu bırakır ve gerektiğinde orijinali getirir.

### Model sıkıştırmadan sonra eski görselleri bulabilir mi?

Evet. Her görselin `IMG-001` gibi bir numarası ve kategori, ad ve karakterleri içeren kısa bir notu vardır. Model orijinali bu numarayla çağırabilir.

### Bir turda çok sayıda ekran görüntüsü gelirse ne olur?

Eski görüntüler gruplar hâlinde yer tutucuya dönüşür, en yeni birkaç tanesi olduğu gibi gönderilir. Model benzer görüntüleri tek notla tarif edebilir ve istediğini numarasıyla getirebilir.

### PDF desteği var mı?

Claude Code’da **Auto-select** açıkken önceki turda okunan PDF, `PDF-001` gibi kısa bir yer tutucuyla gösterilir. Model yalnızca ihtiyaç duyduğu sayfaları kimlik ve sayfa numarasıyla getirir. Metinli ve taranmış PDF’ler çalışır. Codex’te görüntüye dönüştürülen sayfalar normal görseller gibi işlenir.

### Görsellerim ve isteklerim nereye gider?

Orijinaller ve sohbet geçmişi cihazınızda kalır. İstekler ajanınızın zaten kullandığı hizmete gider. GitHub güncelleme kontrolü sizinle ilgili veri göndermez ve panelden kapatılabilir.

### Terminal gerekli mi ve eklenti ücretsiz mi?

Ajanınızdan kurmasını isteyebilir veya Codex’in Plugins sayfasını kullanabilirsiniz. Elle kurmak için [INSTALL.md](INSTALL.md) dosyasına bakın. Eklenti ücretsizdir ve MIT lisansıyla açık kaynak olarak yayımlanır.

<p align="center"><sub><a href="CHANGELOG.md">Sürüm notları</a> · <a href="CONTRIBUTING.md">Katkıda bulunun</a> · <a href="LICENSE">MIT Lisansı</a></sub></p>
