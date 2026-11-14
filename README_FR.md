<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>Un plugin local pour les conversations riches en images dans Codex, Claude Code et d’autres agents.</b><br>Les images précédentes ne sont plus renvoyées à chaque message. Le modèle récupère l’image dont il a besoin grâce à son identifiant, même après la compression de la conversation.</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="Version"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Compatible avec Windows, macOS et Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="Licence MIT"></a>
</p>

<p align="center"><a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <a href="README_ES.md">Español</a> · <a href="README_PT_BR.md">Português (Brasil)</a> · <b>Français</b> · <a href="README_DE.md">Deutsch</a></p>

<p align="center">
  <img src="docs/images/loop.gif" alt="Le panneau affiche une tâche avec quinze images clés. Quand la sélection automatique est activée, les images précédentes sont grisées et la taille de la requête suivante passe de 7,5 Mo à 1,7 Mo." width="100%">
</p>

## Fonctionnement

En temps normal, l’agent renvoie toutes les images précédentes à chaque message. Une longue conversation avec beaucoup d’images finit par ralentir, et les messages peuvent ne plus partir. Le plugin attribue un identifiant à chaque image (`IMG-001`, `IMG-002`…) et remplace les images précédentes par de courts textes dans la requête.

- **Le modèle récupère les images dont il a besoin.** Pour revoir une image, il récupère l’original à partir de son identifiant.
- **Il sait distinguer les images.** Pour chacune, le modèle note en une ligne ce qu’elle montre et conserve vos commentaires. Ces informations figurent dans le texte de remplacement et restent disponibles après la compression de la conversation.
- **Vos originaux sont conservés.** Les images d’origine et l’historique de conversation restent intacts.

Le plugin est actif par défaut, même si vous n’ouvrez pas le panneau. Il sert notamment à la création d’images et de vidéos, au travail sur des documents numérisés et aux tâches réalisées sur ordinateur ou dans un navigateur.

## Installation

Envoyez le message suivant à votre agent. Il détectera sa plateforme et effectuera l’installation correspondante.

```text
Installe Context Attachment Manager en suivant les instructions sur https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

Redémarrez ensuite l’agent. Dans Claude Desktop, ouvrez une nouvelle session Code. Consultez la liste des [agents compatibles](#agents-compatibles) et les [instructions d’installation, de mise à jour et de désinstallation](INSTALL.md) (en anglais).

## Choisir les images dans le panneau

<p align="center">
  <img src="docs/images/hero.png" alt="Le panneau permet de gérer automatiquement les images précédentes, de les retrouver à partir d’un détail et de les prévisualiser." width="100%">
</p>

- **Retrouvez une image** à partir d’un détail ou d’un commentaire dont vous vous souvenez, comme « nuit pluvieuse » ou « meilleur visage ».
- **Gardez une image de référence.** Ouvrez l’image et cochez **Send every turn** pour l’envoyer avec chaque message.
- **Choisissez vous-même les images.** Désactivez **Auto-select**, puis sélectionnez les images à joindre à votre prochain message.

Dans **Codex**, ouvrez **Context Assets** dans le panneau latéral de la tâche. Dans l’**onglet Code de Claude Desktop**, le panneau s’ouvre automatiquement dès que la conversation contient des images. Saisissez `/cam` pour le rouvrir.

## Confidentialité

Le plugin s’exécute localement. Vos images d’origine et l’historique de vos conversations restent sur votre ordinateur. Les requêtes sont envoyées au service que votre agent utilise déjà.

## Résultats des tests

Dans Codex, une conversation contenant neuf images clés a atteint 42,4 Mo. L’envoi échouait après un redémarrage ou une compression de la conversation. Avec le plugin, les mêmes requêtes ne pesaient que 0,12 Mo. Les résultats et les étapes pour reproduire les tests sont disponibles en anglais dans le [comparatif Codex](eval/README.md) et le [comparatif sur les tâches longues dans Claude Code](eval/long-task/README.md).

## Conception : préserver le cache

Les services de modèles mettent en cache le début de la conversation. Quand une requête commence exactement comme la précédente, cette partie est lue depuis le cache, ce qui est plus rapide et bien moins cher. Si quelque chose change au début de la conversation, tout ce qui suit la modification est traité à nouveau.

Pour alléger une longue conversation, il faut forcément modifier quelque chose. Le plugin place cette modification le plus tard possible dans la conversation :

<p align="center">
  <img src="docs/images/cache-compare.svg" alt="Quatre façons de gérer une longue conversation avec des images, représentées par la requête suivante. Tout envoyer préserve le cache, mais renvoie toutes les images. Réduire les images ou supprimer le début de l’historique oblige à traiter à nouveau presque toute la conversation. Avec les textes de remplacement du plugin, seul le reste du tour précédent est traité à nouveau." width="100%">
</p>

- **Le texte de remplacement est écrit une seule fois.** L’image est remplacée au tour qui suit celui où elle est apparue. Seul le reste de ce tour est traité à nouveau, une fois. Ensuite, le texte de remplacement reste identique d’une requête à l’autre.
- **Récupérer une image ne change rien à ce qui précède.** L’original est ajouté à la fin du tour en cours et le texte de remplacement reste à sa place. Quelle que soit l’image choisie par le modèle, et quel que soit le nombre d’images dans la conversation, tout ce qui précède le tour en cours est encore lu depuis le cache.
- **Le modèle récupère l’original.** Ce n’est ni une copie réduite ni un résumé.

<p align="center">
  <img src="docs/images/cache-fetch.svg" alt="Quand le modèle récupère IMG-001, l’original est ajouté à la fin du tour en cours et le texte de remplacement du tour 1 reste tel quel : tous les tours précédents sont lus depuis le cache. Au tour suivant, la copie récupérée devient une note d’une ligne et seul ce qui la suivait est traité à nouveau." width="100%">
</p>

Ce n’est pas gratuit. Après un tour contenant des images, le reste de ce tour est traité à nouveau une fois, et le modèle écrit une courte ligne pour chaque nouvelle image. Si vous modifiez une ancienne image dans le panneau (la décocher, la recocher ou cocher **Send every turn**), la conversation change à cet endroit et ce qui suit est traité à nouveau une fois. Dans notre [comparatif sur les tâches longues dans Claude Code](eval/long-task/README.md) (en anglais), 87 % de l’entrée a été lue depuis le cache avec le plugin, contre 91 % sans.

La troisième ligne de la première figure correspond aussi à ce que fait la compression de l’agent lui-même, et à l’effacement d’anciens résultats d’outils côté API (par exemple le context editing d’Anthropic) : le contenu du début est retiré et ce qui suit est traité à nouveau.

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

<p align="center"><sub><a href="CHANGELOG.md">Historique des versions</a> · <a href="CONTRIBUTING.md">Contribuer</a> · <a href="LICENSE">Licence MIT</a></sub></p>
