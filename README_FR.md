<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="Icône de Context Attachment Manager">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>De longues conversations pleines d’images dans Codex et Claude Code, sans ralentissement.</b><br>Les images précédentes deviennent un texte d’une ligne avec un identifiant. Quand le modèle a de nouveau besoin d’une image, il récupère l’original grâce à son identifiant, même après la compression de la conversation.</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="Version"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Compatible avec Windows, macOS et Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="Licence MIT"></a>
</p>

<p align="center"><a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <a href="README_ES.md">Español</a> · <a href="README_PT_BR.md">Português (Brasil)</a> · <b>Français</b> · <a href="README_DE.md">Deutsch</a></p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/hero-dark.gif">
    <img src="docs/images/hero.gif" alt="Animation en boucle en trois temps. Un : chaque message renvoie toutes les images précédentes ; 24 images clés s’accumulent et la requête grimpe à 15,6 Mo, en rouge. Deux : avec le plugin, les images précédentes deviennent des textes d’une ligne avec identifiant, comme « IMG-004 Street » ; seule la planche du personnage épinglée part encore, et la requête tombe à 1,3 Mo. Trois : le modèle récupère IMG-007 grâce à son identifiant ; l’original est ajouté à la fin du tour en cours, le texte de remplacement reste à sa place et tout ce qui précède est lu depuis le cache." width="100%">
  </picture>
</p>

<table>
  <tr>
    <td align="center" width="33%"><h3>42,4 Mo → 0,12 Mo</h3>Une requête d’une conversation<br>Codex avec neuf images clés</td>
    <td align="center" width="33%"><h3>20/20 contre 8/20</h3>Questions sur les images<br>après compression (Sonnet 5.5)</td>
    <td align="center" width="33%"><h3>Coût presque identique</h3>Plus grosse requête : 41 859<br>contre 110 671 tokens</td>
  </tr>
</table>

## Démarrer en trois étapes

**1. Installez.** Envoyez le message suivant à votre agent. Il détectera sa plateforme et effectuera l’installation correspondante.

```text
Installe Context Attachment Manager en suivant les instructions sur https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

Redémarrez ensuite l’agent. Dans Claude Desktop, ouvrez une nouvelle session Code. Pour une installation manuelle, consultez les [instructions d’installation, de mise à jour et de désinstallation](INSTALL.md) (en anglais). Ensuite, dans Codex et Claude Code, il se met à jour tout seul : les nouvelles versions s’installent en arrière-plan et s’appliquent au prochain démarrage de l’agent.

**2. Travaillez comme d’habitude.** Le plugin est actif par défaut. Les images des tours précédents partent sous forme de textes d’une ligne ; les nouvelles images et les références que vous épinglez partent telles quelles. Un texte de remplacement ressemble à ceci :

```text
[Image IMG-004 omitted | shot-1.png | generated image | turn 2 | 505×505]
Features: place: Street | Qinghe | medium shot, umbrella, lanterns
For the original, call cam_view_image with "IMG-004".
```

**3. Le modèle récupère par identifiant.** Pour revoir une image précédente, il récupère l’original à partir de son identifiant, même après la compression. Rien n’est supprimé, et vos images et l’historique restent sur votre ordinateur.

## Le panneau : parcourir par personnage et par lieu

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/panel-dark.png">
    <img src="docs/images/panel.png" alt="Le panneau. À gauche, la vue par lieu, avec six cartes comme Street, Railing et Courtyard. À droite, le personnage Qinghe ouvert : d’abord sa planche, puis ses plans dans la rue. En bas, la prochaine requête pèse 1,3 Mo au lieu de 15,6 Mo, soit 91 % de moins." width="100%">
  </picture>
</p>

Le plugin fonctionne sans le panneau ; ouvrez-le quand vous voulez garder la main :

- **Parcourez par personnage et par lieu.** Les images sont rangées en personnages, lieux, écrans et documents, avec une carte par nom. Ouvrez un personnage pour voir d’abord ses planches, puis les plans où il apparaît, lieu par lieu.
- **Retrouvez une image** à partir d’un détail ou d’un commentaire dont vous vous souvenez, comme « nuit pluvieuse » ou « meilleur visage ».
- **Gardez une image de référence.** Ouvrez l’image et cochez **Send every turn** pour l’envoyer avec chaque message.
- **Choisissez vous-même les images.** Désactivez **Auto-select**, puis sélectionnez les images à joindre à votre prochain message.

Dans **Codex**, ouvrez **Context Assets** dans le panneau latéral de la tâche. Dans l’**onglet Code de Claude Desktop**, le panneau s’ouvre automatiquement dès que la conversation contient des images. Saisissez `/cam` pour le rouvrir.

## Résultats

- **Codex** : une conversation contenant neuf images clés a atteint 42,4 Mo, et l’envoi échouait après un redémarrage ou une compression de la conversation. Avec le plugin, les mêmes requêtes ne pesaient que 0,12 Mo.
- **Claude Code (Sonnet 5.5)** : dans une tâche de court métrage de 16 tours, dont les images n’existent que dans la conversation, nous avons compressé la conversation puis posé des questions sur ces images. Avec le plugin, il a répondu juste aux 20 questions ; sans le plugin, à 8 sur 20. Sa plus grosse requête faisait 41 859 tokens au lieu de 110 671, pour un coût presque identique.

Les résultats et les étapes pour reproduire les tests sont disponibles en anglais dans le [comparatif Codex](eval/README.md), le [comparatif sur la compression dans Claude Code](eval/compaction/README.md) et le [comparatif sur les tâches longues dans Claude Code](eval/long-task/README.md).

## Fonctionnement : préserver le cache

Les services de modèles mettent en cache le début de la conversation. Quand une requête commence exactement comme la précédente, cette partie est lue depuis le cache, ce qui est plus rapide et bien moins cher. Si quelque chose change au début de la conversation, tout ce qui suit la modification est traité à nouveau. Le plugin place sa modification le plus tard possible dans la conversation :

<p align="center">
  <img src="docs/images/cache-compare.svg" alt="Quatre façons de gérer une longue conversation avec des images, représentées par la requête suivante. Tout envoyer préserve le cache, mais renvoie toutes les images. Réduire les images ou supprimer le début de l’historique oblige à traiter à nouveau presque toute la conversation. Avec les textes de remplacement du plugin, seul le reste du tour précédent est traité à nouveau." width="100%">
</p>

- **Le texte de remplacement est écrit une seule fois.** L’image est remplacée au tour qui suit celui où elle est apparue, puis le texte reste identique d’une requête à l’autre.
- **Récupérer une image ne change rien à ce qui précède.** L’original est ajouté à la fin du tour en cours et le texte de remplacement reste à sa place : les tours précédents sont encore lus depuis le cache.
- **Le modèle récupère l’original.** Ce n’est ni une copie réduite ni un résumé.

<details>
<summary>Comment une image est récupérée, et ce que cela coûte</summary>

<p align="center">
  <img src="docs/images/cache-fetch.svg" alt="Quand le modèle récupère IMG-001, l’original est ajouté à la fin du tour en cours et le texte de remplacement du tour 1 reste tel quel : tous les tours précédents sont lus depuis le cache. Au tour suivant, la copie récupérée devient une note d’une ligne et seul ce qui la suivait est traité à nouveau." width="100%">
</p>

Ce n’est pas gratuit. Après un tour contenant des images, le reste de ce tour est traité à nouveau une fois, et le modèle écrit une courte ligne pour chaque nouvelle image. Si vous modifiez une ancienne image dans le panneau (la décocher, la recocher ou cocher **Send every turn**), la conversation change à cet endroit et ce qui suit est traité à nouveau une fois. Dans notre [comparatif sur les tâches longues dans Claude Code](eval/long-task/README.md) (en anglais), 87 % de l’entrée a été lue depuis le cache avec le plugin, contre 91 % sans.

La compression de l’agent lui-même, et l’effacement d’anciens résultats d’outils côté API (par exemple le context editing d’Anthropic), retirent le contenu du début, si bien que ce qui suit est traité à nouveau : c’est la troisième ligne de la première figure.

</details>

## Agents compatibles

Codex et Claude Code ont été testés. Le panneau est également disponible dans Codex et Claude Desktop. Les autres agents du tableau sont pris en charge par des adaptateurs écrits à partir de leur code et de leur documentation. Leur fonctionnement reste à vérifier en conditions réelles. Si vous utilisez l’un de ces agents, [dites-nous comment cela s’est passé](https://github.com/chipfighter/context-attachment-manager/issues). Tous les retours sont les bienvenus.

| Agent | Description | Prise en charge |
|---|---|---|
| [Codex](https://github.com/openai/codex) | Agent de programmation d’OpenAI pour ordinateur et ligne de commande | Sélection automatique et panneau, testés |
| [Claude Code](https://github.com/anthropics/claude-code) | Agent de programmation d’Anthropic pour ordinateur et ligne de commande | Sélection automatique et panneau (version de bureau), testés |
| [WorkBuddy](https://www.workbuddy.cn) | Assistant IA de bureau de Tencent avec CodeBuddy intégré | Sélection automatique, à tester |
| [OpenCode](https://github.com/anomalyco/opencode) | Agent de programmation open source pour le terminal, compatible avec tout fournisseur de modèles | Sélection automatique, à tester |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | Agent open source de Google pour le terminal | Sélection automatique, à tester |
| [pi](https://github.com/earendil-works/pi) | Agent de programmation minimaliste et extensible pour le terminal | Sélection automatique (extension pi), à tester |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | Environnement d’agents de DeepSeek où tout fonctionne sous forme de plugins | Sélection automatique (plugin dsh), à tester |
| [Qwen Code](https://github.com/QwenLM/qwen-code) | Agent open source de Qwen pour le terminal | Sélection automatique, à tester |
| [Cline](https://github.com/cline/cline) | Agent de programmation open source pour VS Code, JetBrains et le terminal | Sélection automatique, à tester |
| [Kilo Code](https://github.com/Kilo-Org/kilocode) | Agent de programmation open source pour VS Code, JetBrains et le terminal | Sélection automatique, à tester |
| [goose](https://github.com/aaif-goose/goose) | Agent open source pour ordinateur et terminal, extensible via MCP | Sélection automatique, à tester |
| [Cherry Studio](https://github.com/CherryHQ/cherry-studio) | Application de bureau open source pour discuter avec de nombreux modèles | Sélection automatique, à tester |

Les étapes de configuration figurent dans [INSTALL.md](INSTALL.md#other-agents). Pour connecter un autre agent, consultez [ADAPTERS.md](ADAPTERS.md). Les deux guides sont en anglais.

## Questions fréquentes

### Pourquoi Codex et Claude Code ralentissent-ils dans une longue conversation avec beaucoup d’images ?

L’agent renvoie toutes les images précédentes à chaque message. Une longue conversation avec beaucoup d’images finit par ralentir, et les messages peuvent ne plus partir. Dans Codex, une conversation contenant neuf images clés a atteint 42,4 Mo, et l’envoi échouait après un redémarrage ou une compression de la conversation. Avec Context Attachment Manager, les mêmes requêtes ne pesaient que 0,12 Mo.

### Context Attachment Manager casse-t-il le cache de prompts ?

Très peu. Le texte de remplacement est écrit une seule fois et ne change plus ensuite, et l’image récupérée est ajoutée à la fin du tour en cours. Les tours précédents sont donc encore lus depuis le cache. Après un tour contenant des images, le reste de ce tour est traité à nouveau une fois. Dans notre comparatif sur les tâches longues dans Claude Code, 87 % de l’entrée a été lue depuis le cache avec le plugin, contre 91 % sans.

### Quelle différence avec la compression de la conversation ou la réduction des images ?

La compression et la suppression de l’historique ancien retirent le début de la conversation, et réduire les images le modifie. Dans les deux cas, presque toute la conversation est traitée à nouveau, et il ne reste au modèle qu’un résumé ou une copie réduite. Avec Context Attachment Manager, seul le reste du tour précédent est traité à nouveau, et le modèle récupère l’image d’origine à partir de son identifiant.

### Après la compression, le modèle reconnaît-il encore les images précédentes ?

Oui. Chaque image a un identifiant, par exemple `IMG-001`, et le modèle note une ligne pour chacune : sa catégorie, un nom et les personnages présents. Ces notes restent dans les textes de remplacement après la compression, et le modèle récupère l’original à partir de son identifiant quand il doit la revoir.

### Gère-t-il les nombreuses captures d’écran de l’utilisation de l’ordinateur et du navigateur ?

Oui. Quand des outils renvoient beaucoup de captures d’écran dans un même tour, les plus anciennes deviennent des textes de remplacement par lots et les plus récentes partent telles quelles. Le modèle peut noter en une seule ligne une série de captures semblables et récupérer n’importe laquelle grâce à son identifiant.

### Gère-t-il les PDF ?

Dans Claude Code, oui. Un PDF que Claude Code lit est renvoyé en entier avec chaque message. Avec **Auto-select** activé, un PDF d’un tour précédent part sous forme d’un court texte de remplacement avec un identifiant comme `PDF-001`, et le modèle ne récupère que les pages dont il a besoin, par identifiant et numéro de page. Cela fonctionne pour les PDF texte comme pour les numérisations. Codex n’envoie jamais les fichiers PDF eux-mêmes au modèle ; les pages qui y sont converties en images sont gérées comme les autres images.

### Mes images sont-elles supprimées ou envoyées ailleurs ?

Non. Le plugin s’exécute sur votre ordinateur. Vos images d’origine et l’historique de vos conversations restent intacts, et les requêtes sont envoyées au service que votre agent utilise déjà. En dehors de ces requêtes, il demande à GitHub environ une fois par jour s’il existe une nouvelle version ; cette requête ne contient aucune information sur vous, et vous pouvez désactiver les mises à jour automatiques dans le panneau.

### Avec quels agents fonctionne-t-il ? Est-il gratuit ?

Codex et Claude Code sont testés. WorkBuddy, OpenCode, Gemini CLI, pi, DeepSeek Harness, Qwen Code, Cline, Kilo Code, goose et Cherry Studio sont pris en charge par des adaptateurs que nous n’avons pas encore testés. Le plugin est gratuit et open source, sous licence MIT.

### Comment l’installer ? Faut-il utiliser le terminal ?

Non. Envoyez à votre agent le message de [Démarrer en trois étapes](#démarrer-en-trois-étapes) : il détecte sa plateforme et effectue l’installation lui-même, et il ne vous reste qu’à redémarrer l’agent (dans Claude Desktop, ouvrez une nouvelle session Code). Dans Codex, vous pouvez aussi l’installer depuis la page des plugins en quelques clics. Si vous préférez le faire à la main, il suffit d’une commande dans Codex et de deux commandes `claude` dans Claude Desktop ; voir [INSTALL.md](INSTALL.md) (en anglais).

<p align="center"><sub><a href="CHANGELOG.md">Historique des versions</a> · <a href="CONTRIBUTING.md">Contribuer</a> · <a href="LICENSE">Licence MIT</a></sub></p>
