<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="Context Attachment Manager">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>Codex और Claude Code में ढेरों तस्वीरों वाली लंबी चैट भी तेज़ रहती है।</b><br>पिछले चरणों की तस्वीरों की जगह ID वाली एक छोटी पंक्ति रहती है। मॉडल को किसी तस्वीर की फिर से ज़रूरत हो, तो वह उसी ID से मूल तस्वीर पा सकता है, चैट का इतिहास संक्षिप्त होने के बाद भी।</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="GitHub Releases"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Windows, macOS, Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <a href="README_TW.md">繁體中文</a> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <a href="README_VI.md">Tiếng Việt</a><br>
  <a href="README_ES.md">Español</a> · <a href="README_PT_BR.md">Português (Brasil)</a> · <a href="README_FR.md">Français</a> · <a href="README_DE.md">Deutsch</a> · <a href="README_IT.md">Italiano</a> · <a href="README_PL.md">Polski</a><br>
  <a href="README_RU.md">Русский</a> · <a href="README_TR.md">Türkçe</a> · <a href="README_AR.md">العربية</a> · <b>हिन्दी</b> · <a href="README_ID.md">Bahasa Indonesia</a> · <a href="README_TH.md">ไทย</a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/hero-dark.gif">
    <img src="docs/images/hero.gif" alt="प्लगइन के बिना हर अनुरोध में पुरानी तस्वीरें दोबारा भेजी जाती हैं। प्लगइन के साथ पिन किया हुआ संदर्भ भेजा जाता है और बाकी तस्वीरों की जगह उनकी ID रहती है। ज़रूरत पड़ने पर मॉडल मूल तस्वीर मँगाता है।" width="100%">
  </picture>
</p>

<table>
  <tr>
    <td align="center" width="33%"><h3>42.4 MB → 0.12 MB</h3>नौ कीफ़्रेम वाली Codex चैट के एक अनुरोध का आकार</td>
    <td align="center" width="33%"><h3>20/20 बनाम 8/20</h3>इतिहास संक्षिप्त करने के बाद तस्वीरों से जुड़े सही जवाब (Sonnet 5.5)</td>
    <td align="center" width="33%"><h3>खर्च लगभग उतना ही</h3>सबसे बड़ा अनुरोध: 110,671 की जगह 41,859 टोकन</td>
  </tr>
</table>

## तीन चरणों में शुरू करें

**1. प्लगइन इंस्टॉल करें।** अपने एजेंट को नीचे दिया गया वाक्य भेजें। वह अपना प्लैटफ़ॉर्म पहचानकर उसके हिसाब से इंस्टॉल करेगा।

```text
इस गाइड के अनुसार मेरे लिए Context Attachment Manager इंस्टॉल करो: https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

इसके बाद एजेंट को फिर से शुरू करें। Claude Desktop में नया Code सत्र खोलें। खुद इंस्टॉल करने के लिए अंग्रेज़ी में [इंस्टॉलेशन, अपडेट और हटाने की गाइड](INSTALL.md) देखें। Codex और Claude Code में नया संस्करण बैकग्राउंड में इंस्टॉल होता है और अगले स्टार्ट पर लागू होता है।

**2. पहले की तरह काम करें।** प्लगइन शुरू से चालू रहता है। पुरानी तस्वीरों की जगह ID वाली पंक्ति जाती है। नई तस्वीरें और पिन किए गए संदर्भ पूरे भेजे जाते हैं।

```text
[Image IMG-004 omitted | shot-1.png | generated image | turn 2 | 505×505]
Features: place: Street | Qinghe | medium shot, umbrella, lanterns
For the original, call cam_view_image with "IMG-004".
```

**3. मॉडल ID से मूल तस्वीर लेता है।** पुरानी तस्वीर फिर से देखने के लिए मॉडल उसे ID से मँगा सकता है, इतिहास संक्षिप्त होने के बाद भी। मूल तस्वीरें और चैट का इतिहास आपके कंप्यूटर पर रहते हैं।

## किरदार और जगह के हिसाब से तस्वीरें देखने का पैनल

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/panel-dark.png">
    <img src="docs/images/panel.png" alt="बाईं ओर जगहों के कार्ड हैं। दाईं ओर Qinghe के कार्ड में पहले किरदार का संदर्भ और फिर सड़क के दृश्य हैं।" width="100%">
  </picture>
</p>

- **श्रेणी के अनुसार देखें।** तस्वीरें किरदार, जगह, स्क्रीन और दस्तावेज़ के कार्ड में होती हैं। किसी किरदार के कार्ड पर पहले उसकी संदर्भ तस्वीरें दिखती हैं, फिर जगह के हिसाब से उसके शॉट।
- **किसी पहचान या टिप्पणी से खोजें।** जैसे “बारिश वाली रात” या “सबसे अच्छा चेहरा”।
- **संदर्भ पिन करें।** तस्वीर खोलकर **Send every turn** चुनें।
- **तस्वीरें खुद चुनें।** **Auto-select** बंद करें और अगले संदेश में भेजी जाने वाली तस्वीरें चुनें।

Codex में टास्क के साइड पैनल से **Context Assets** खोलें। Claude Desktop के Code टैब में तस्वीरें होने पर पैनल खुद खुलता है। फिर खोलने के लिए `/cam` लिखें। पैनल बंद रहने पर भी प्लगइन काम करता है।

## परीक्षण के नतीजे

- **Codex.** नौ कीफ़्रेम वाली एक Codex चैट में अनुरोध 42.4 MB तक पहुँचा। ऐप फिर से शुरू करने या इतिहास संक्षिप्त करने के बाद वह भेजा नहीं जा सका। प्लगइन के साथ वही अनुरोध 0.12 MB का था और भेजा गया।
- **Claude Code (Sonnet 5.5).** लघु फ़िल्म के 16 चरणों वाले एक काम में, चैट का इतिहास संक्षिप्त करने के बाद Sonnet 5.5 ने सिर्फ़ चैट में मौजूद तस्वीरों के बारे में 20 में से 20 जवाब सही दिए। प्लगइन के बिना 20 में से 8 सही थे। लगभग उतने ही खर्च में सबसे बड़ा अनुरोध 110,671 से घटकर 41,859 टोकन का हो गया।

नतीजे और परीक्षण दोहराने के चरण [Codex की तुलना](eval/README.md), [Claude Code में इतिहास संक्षिप्त करने के परीक्षण](eval/compaction/README.md) और [Claude Code के लंबे काम के परीक्षण](eval/long-task/README.md) में हैं।

## प्रॉम्प्ट कैश कैसे बना रहता है

चैट का शुरुआती हिस्सा ज्यों का त्यों रहे, तो मॉडल सेवा उसे कैश से पढ़ सकती है। अगर शुरुआती सामग्री बदलती है, तो उसके बाद की सामग्री दोबारा प्रोसेस होती है। प्लगइन बदलाव बातचीत के अंत के जितना पास हो सके, उतना पास करता है।

<p align="center">
  <img src="docs/images/cache-compare.svg" alt="अगला अनुरोध भेजने के चार तरीके। प्लगइन की ID वाली पंक्तियों से केवल पिछले चरण का बचा हुआ हिस्सा दोबारा प्रोसेस होता है।" width="100%">
</p>

तस्वीर आने के अगले चरण में ID वाली पंक्ति बनती है और उसके बाद नहीं बदलती। मॉडल मूल तस्वीर मँगाता है, तो वह मौजूदा चरण के अंत में जुड़ती है और पुरानी पंक्ति अपनी जगह रहती है।

तस्वीर वाले चरण का बचा हुआ हिस्सा एक बार दोबारा प्रोसेस होता है। मॉडल हर नई तस्वीर के लिए छोटा नोट भी लिखता है। पैनल में पुरानी तस्वीर का चयन बदलने पर उसके बाद की सामग्री एक बार और प्रोसेस होती है। [लंबे काम के परीक्षण](eval/long-task/README.md) में प्लगइन के साथ 87% और उसके बिना 91% इनपुट कैश से पढ़ा गया।

## समर्थित एजेंट

Codex और Claude Code का परीक्षण हुआ है। पैनल Codex और Claude के डेस्कटॉप ऐप में मिलता है। बाकी एजेंट अडैप्टर के ज़रिए तस्वीरों के ऑटो-सेलेक्शन का समर्थन करते हैं। उनका सीधे इस्तेमाल करके परीक्षण अभी नहीं हुआ है।

[Codex](https://github.com/openai/codex) · [Claude Code](https://github.com/anthropics/claude-code) · [WorkBuddy](https://www.workbuddy.cn) · [OpenCode](https://github.com/anomalyco/opencode) · [Gemini CLI](https://github.com/google-gemini/gemini-cli) · [pi](https://github.com/earendil-works/pi) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · [Qwen Code](https://github.com/QwenLM/qwen-code) · [Cline](https://github.com/cline/cline) · [Kilo Code](https://github.com/Kilo-Org/kilocode) · [goose](https://github.com/aaif-goose/goose) · [Cherry Studio](https://github.com/CherryHQ/cherry-studio)

सेटअप के लिए [INSTALL.md](INSTALL.md#other-agents) देखें। इनमें से कोई अडैप्टर आज़माएँ, तो [अपना अनुभव बताएँ](https://github.com/chipfighter/context-attachment-manager/issues)। दूसरा एजेंट जोड़ने के लिए [ADAPTERS.md](ADAPTERS.md) देखें।

## आम सवाल

### ढेरों तस्वीरों वाली चैट धीमी क्यों हो जाती है?

हर नए संदेश में पुरानी तस्वीरें फिर से जा सकती हैं। उनके बढ़ने पर अनुरोध भारी होता जाता है और भेजा जाना रुक भी सकता है।

### यह इतिहास संक्षिप्त करने या तस्वीर छोटी करने से कैसे अलग है?

इतिहास संक्षिप्त करने से चैट की पिछली सामग्री बदलती है। तस्वीर छोटी करने से खुद तस्वीर बदलती है। प्लगइन एक स्थिर ID रखता है, जिससे मूल तस्वीर वापस मिल सकती है।

### इतिहास संक्षिप्त होने के बाद पुरानी तस्वीर मिल सकती है?

हाँ। हर तस्वीर के साथ एक ID, जैसे `IMG-001`, और उसकी श्रेणी, नाम व किरदारों का छोटा नोट रहता है। मॉडल ID से मूल तस्वीर मँगा सकता है।

### एक चरण में बहुत से स्क्रीनशॉट आएँ तो क्या होता है?

पुराने स्क्रीनशॉट समूहों में ID वाली पंक्तियों से बदल जाते हैं। कुछ नए स्क्रीनशॉट पूरे भेजे जाते हैं। मॉडल एक जैसी तस्वीरों पर एक नोट रख सकता है और हर मूल तस्वीर को उसकी ID से पा सकता है।

### PDF का समर्थन है?

Claude Code में **Auto-select** चालू हो तो पहले पढ़ी हुई PDF की जगह `PDF-001` जैसी ID वाली पंक्ति रहती है। मॉडल ID और पेज नंबर से सिर्फ़ ज़रूरी पेज मँगाता है। टेक्स्ट और स्कैन वाली PDF दोनों चलती हैं। Codex में तस्वीरों में बदले गए पेज सामान्य तस्वीरों की तरह संभाले जाते हैं।

### मेरी तस्वीरें और अनुरोध कहाँ जाते हैं?

मूल तस्वीरें और इतिहास आपके कंप्यूटर पर रहते हैं। अनुरोध एजेंट की मौजूदा सेवा पर जाते हैं। GitHub पर अपडेट की जाँच में आपकी जानकारी नहीं भेजी जाती। इसे पैनल से बंद किया जा सकता है।

### टर्मिनल चाहिए? क्या प्लगइन मुफ़्त है?

एजेंट से इसे इंस्टॉल करवा सकते हैं या Codex का Plugins पेज इस्तेमाल कर सकते हैं। खुद इंस्टॉल करने के लिए [INSTALL.md](INSTALL.md) देखें। यह मुफ़्त और MIT लाइसेंस वाला ओपन सोर्स प्लगइन है।

<p align="center"><sub><a href="CHANGELOG.md">बदलावों का रिकॉर्ड</a> · <a href="CONTRIBUTING.md">योगदान दें</a> · <a href="LICENSE">MIT लाइसेंस</a></sub></p>
