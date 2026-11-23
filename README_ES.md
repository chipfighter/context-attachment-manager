<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="Icono de Context Attachment Manager">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>Conversaciones largas y llenas de imágenes en Codex y Claude Code, sin que se vuelvan lentas.</b><br>Las imágenes anteriores pasan a ser una referencia de una línea con un identificador. Cuando el modelo vuelve a necesitar una, recupera la original por su identificador, incluso después de compactar la conversación.</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="Versión"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Plataformas: Windows, macOS y Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="Licencia MIT"></a>
</p>

<p align="center"><a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <b>Español</b> · <a href="README_PT_BR.md">Português (Brasil)</a> · <a href="README_FR.md">Français</a> · <a href="README_DE.md">Deutsch</a></p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/hero-dark.gif">
    <img src="docs/images/hero.gif" alt="Animación en bucle en tres partes. Una: cada mensaje vuelve a enviar todas las imágenes anteriores; se acumulan 24 fotogramas clave y la solicitud crece hasta 15,6 MB y se pone en rojo. Dos: con el complemento, las imágenes anteriores se convierten en referencias de una línea con identificador, como «IMG-004 Street»; solo se sigue enviando el diseño del personaje fijado y la solicitud baja a 1,3 MB. Tres: el modelo recupera IMG-007 por su identificador; la original se añade al final del turno actual, su referencia se queda donde estaba y todo lo anterior se lee de la caché." width="100%">
  </picture>
</p>

<table>
  <tr>
    <td align="center" width="33%"><h3>42,4 MB → 0,12 MB</h3>Una solicitud en una conversación<br>de Codex con nueve fotogramas clave</td>
    <td align="center" width="33%"><h3>20/20 frente a 8/20</h3>Preguntas sobre las imágenes<br>tras compactar (Sonnet 5.5)</td>
    <td align="center" width="33%"><h3>Casi el mismo coste</h3>Solicitud más grande: 41 859<br>frente a 110 671 tokens</td>
  </tr>
</table>

## Empieza en tres pasos

**1. Instálalo.** Envía este mensaje a tu agente. Identificará la plataforma en la que se ejecuta y hará la instalación correspondiente.

```text
Instala Context Attachment Manager siguiendo estas instrucciones: https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

Después, reinicia el agente. En Claude Desktop, inicia una nueva sesión de Code. Si prefieres hacerlo a mano, consulta las [instrucciones de instalación, actualización y desinstalación](INSTALL.md) (en inglés). A partir de ahí, en Codex y Claude Code se actualiza solo: las versiones nuevas se instalan en segundo plano y se aplican la próxima vez que se inicia el agente.

**2. Trabaja como siempre.** El complemento está activado por defecto. Las imágenes de turnos anteriores se envían como referencias de una línea; las imágenes nuevas y las de referencia que fijes se envían tal cual. Una referencia tiene este aspecto:

```text
[Image IMG-004 omitted | shot-1.png | generated image | turn 2 | 505×505]
Features: place: Street | Qinghe | medium shot, umbrella, lanterns
For the original, call cam_view_image with "IMG-004".
```

**3. El modelo recupera por identificador.** Cuando tiene que volver a ver una imagen anterior, recupera la original por su identificador, incluso después de compactar la conversación. No se borra nada, y tus imágenes y el historial se quedan en tu equipo.

## El panel: explora por personaje y lugar

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/panel-dark.png">
    <img src="docs/images/panel.png" alt="El panel. A la izquierda, la vista por lugares, con seis tarjetas como Street, Railing y Courtyard. A la derecha, el personaje Qinghe abierto: primero su diseño y después sus tomas en la calle. Abajo, la siguiente solicitud ocupa 1,3 MB en lugar de 15,6 MB, un 91 % menos." width="100%">
  </picture>
</p>

El complemento funciona con el panel cerrado; ábrelo cuando quieras decidir tú:

- **Explora por personaje y lugar.** Las imágenes se ordenan en personajes, lugares, pantallas y documentos, con una tarjeta por nombre. Al abrir un personaje verás primero sus diseños y después las tomas en las que aparece, lugar por lugar.
- **Busca una imagen** por un detalle o un comentario que recuerdes, como «noche lluviosa» o «la mejor cara».
- **Ten siempre a mano una imagen de referencia.** Ábrela y marca **Send every turn** (Enviar en cada turno).
- **Elige las imágenes manualmente.** Desactiva **Auto-select** (Selección automática) y elige cuáles se enviarán con tu próximo mensaje.

En **Codex**, abre **Context Assets** en el panel lateral de la tarea. En la **pestaña Code de Claude Desktop**, el panel se abre automáticamente cuando hay imágenes. Escribe `/cam` para volver a abrirlo.

## Resultados

- **Codex**: una conversación con nueve fotogramas clave llegó a 42,4 MB y ya no se podía enviar después de reiniciar el agente o compactar la conversación. Con el complemento, las mismas solicitudes ocupaban 0,12 MB.
- **Claude Code (Sonnet 5.5)**: en una tarea de un cortometraje de 16 turnos, con imágenes que solo existen en la conversación, compactamos la conversación y después preguntamos por esas imágenes. Con el complemento acertó las 20 preguntas; sin él, 8 de 20. Su solicitud más grande fue de 41 859 tokens en lugar de 110 671, con un coste casi igual.

Los resultados y los pasos para reproducirlos están en la [comparativa en Codex](eval/README.md), la [comparativa de compactación en Claude Code](eval/compaction/README.md) y la [comparativa de una tarea larga en Claude Code](eval/long-task/README.md), todas en inglés.

## Cómo funciona: conservar la caché

Los servicios de modelos guardan en caché el principio de la conversación. Cuando una solicitud empieza exactamente igual que la anterior, esa parte se lee de la caché, lo que es más rápido y mucho más barato. Si cambia algo al principio de la conversación, todo lo que viene después del cambio se vuelve a procesar. El complemento hace su cambio lo más tarde posible en la conversación:

<p align="center">
  <img src="docs/images/cache-compare.svg" alt="Cuatro formas de manejar una conversación larga con imágenes, dibujadas como la siguiente solicitud. Enviarlo todo conserva la caché, pero vuelve a enviar todas las imágenes. Reducir las imágenes o descartar el historial inicial obliga a procesar de nuevo casi toda la conversación. Con las referencias del complemento, solo se vuelve a procesar el resto del turno anterior." width="100%">
</p>

- **La referencia se escribe una sola vez.** La imagen se sustituye por su referencia en el turno siguiente al que apareció, y a partir de ahí es el mismo texto en todas las solicitudes.
- **Recuperar una imagen no cambia nada de lo anterior.** La original se añade al final del turno actual y su referencia se queda donde estaba, así que los turnos anteriores se siguen leyendo de la caché.
- **El modelo recupera la original.** No es una copia reducida ni un resumen.

<details>
<summary>Cómo se recupera una imagen y lo que cuesta</summary>

<p align="center">
  <img src="docs/images/cache-fetch.svg" alt="Cuando el modelo recupera IMG-001, la original se añade al final del turno actual y la referencia del turno 1 se queda como estaba, así que todos los turnos anteriores se leen de la caché. En el turno siguiente, la copia recuperada pasa a ser una nota de una línea y solo se vuelve a procesar lo que venía después." width="100%">
</p>

No es gratis. Después de un turno con imágenes, el resto de ese turno se vuelve a procesar una vez, y el modelo escribe una línea breve por cada imagen nueva. Si cambias una imagen antigua en el panel (la desmarcas, la vuelves a marcar o marcas **Send every turn**), la conversación cambia en ese punto y lo que viene después se vuelve a procesar una vez. En nuestra [comparativa de una tarea larga en Claude Code](eval/long-task/README.md) (en inglés), el 87 % de la entrada se leyó de la caché con el complemento y el 91 % sin él.

La compactación del propio agente, y el borrado de resultados antiguos de herramientas desde la API (por ejemplo, context editing de Anthropic), eliminan contenido del principio, así que lo que sigue se vuelve a procesar: es la tercera fila de la primera figura.

</details>

## Agentes compatibles

Hemos probado Codex y Claude Code. El panel está disponible en Codex y Claude Desktop. Los demás agentes de la tabla son compatibles mediante adaptadores desarrollados a partir de su código y documentación. Todavía no hemos probado esos adaptadores en los propios agentes. Si usas alguno, [cuéntanos qué tal te fue](https://github.com/chipfighter/context-attachment-manager/issues), tanto si funcionó como si tuviste algún problema.

| Agente | Qué es | Compatibilidad |
|---|---|---|
| [Codex](https://github.com/openai/codex) | Agente de programación de OpenAI para escritorio y terminal | Selección automática y panel, probado |
| [Claude Code](https://github.com/anthropics/claude-code) | Agente de programación de Anthropic para escritorio y terminal | Selección automática y panel (escritorio), probado |
| [WorkBuddy](https://www.workbuddy.cn) | Asistente de trabajo con IA de Tencent para escritorio, con CodeBuddy integrado | Selección automática, pendiente de pruebas |
| [OpenCode](https://github.com/anomalyco/opencode) | Agente de programación de código abierto para terminal, compatible con cualquier proveedor de modelos | Selección automática, pendiente de pruebas |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | Agente de código abierto de Google para terminal | Selección automática, pendiente de pruebas |
| [pi](https://github.com/earendil-works/pi) | Agente de programación minimalista y ampliable para terminal | Selección automática (extensión de pi), pendiente de pruebas |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | Entorno de agentes de DeepSeek en el que todo funciona mediante complementos | Selección automática (complemento de dsh), pendiente de pruebas |
| [Qwen Code](https://github.com/QwenLM/qwen-code) | Agente de código abierto de Qwen para terminal | Selección automática, pendiente de pruebas |
| [Cline](https://github.com/cline/cline) | Agente de programación de código abierto para VS Code, JetBrains y terminal | Selección automática, pendiente de pruebas |
| [Kilo Code](https://github.com/Kilo-Org/kilocode) | Agente de programación de código abierto para VS Code, JetBrains y terminal | Selección automática, pendiente de pruebas |
| [goose](https://github.com/aaif-goose/goose) | Agente de código abierto para escritorio y terminal, ampliable con MCP | Selección automática, pendiente de pruebas |
| [Cherry Studio](https://github.com/CherryHQ/cherry-studio) | Cliente de chat de escritorio de código abierto, compatible con distintos modelos | Selección automática, pendiente de pruebas |

Para configurar estos agentes, consulta [INSTALL.md](INSTALL.md#other-agents). Para conectar otro agente, consulta [ADAPTERS.md](ADAPTERS.md). Ambas guías están en inglés.

## Preguntas frecuentes

### ¿Por qué Codex y Claude Code se vuelven lentos en una conversación larga con muchas imágenes?

El agente vuelve a enviar todas las imágenes anteriores con cada mensaje. Por eso, una conversación larga con muchas imágenes se vuelve más lenta y puede llegar a fallar al enviar un mensaje. En Codex, una conversación con nueve fotogramas clave llegó a 42,4 MB y ya no se podía enviar después de reiniciar el agente o compactar la conversación. Con Context Attachment Manager, las mismas solicitudes ocupaban 0,12 MB.

### ¿Context Attachment Manager rompe la caché de prompts?

Muy poco. La referencia se escribe una sola vez y después no cambia, y la imagen recuperada se añade al final del turno actual, así que los turnos anteriores se siguen leyendo de la caché. Después de un turno con imágenes, el resto de ese turno se vuelve a procesar una vez. En nuestra comparativa de una tarea larga en Claude Code, el 87 % de la entrada se leyó de la caché con el complemento y el 91 % sin él.

### ¿En qué se diferencia de la compactación o de reducir las imágenes?

La compactación y el descarte del historial antiguo eliminan el principio de la conversación, y reducir las imágenes lo modifica. En ambos casos se vuelve a procesar casi toda la conversación, y al modelo solo le queda un resumen o una copia reducida. Con Context Attachment Manager solo se vuelve a procesar el resto del turno anterior, y el modelo recupera la imagen original por su identificador.

### ¿El modelo sigue distinguiendo las imágenes anteriores después de compactar?

Sí. Cada imagen tiene un identificador, como `IMG-001`, y el modelo anota una línea sobre cada una: su categoría, un nombre y los personajes que aparecen. Esas notas siguen en las referencias después de compactar, y el modelo recupera la original por su identificador cuando necesita volver a verla.

### ¿Sirve para las muchas capturas de pantalla del uso del ordenador y del navegador?

Sí. Cuando las herramientas devuelven muchas capturas en un mismo turno, las más antiguas pasan a ser referencias por tandas y las más recientes se envían tal cual. El modelo puede anotar en una sola línea una serie de capturas parecidas y recuperar cualquiera de ellas por su identificador.

### ¿Mis imágenes se borran o se envían a otro sitio?

No. El complemento se ejecuta en tu equipo. Tus imágenes originales y el historial de la conversación se mantienen intactos, y las solicitudes van al servicio que ya usa tu agente. Aparte de esas solicitudes, consulta a GitHub más o menos una vez al día si hay una versión nueva; esa consulta no lleva ningún dato tuyo, y puedes desactivar las actualizaciones automáticas en el panel.

### ¿Con qué agentes funciona? ¿Es gratis?

Codex y Claude Code están probados. WorkBuddy, OpenCode, Gemini CLI, pi, DeepSeek Harness, Qwen Code, Cline, Kilo Code, goose y Cherry Studio son compatibles mediante adaptadores que aún no hemos probado. Es gratuito y de código abierto, con licencia MIT.

### ¿Cómo se instala? ¿Hace falta usar la terminal?

No. Envía a tu agente el mensaje de [Empieza en tres pasos](#empieza-en-tres-pasos): identificará su plataforma y hará la instalación por sí mismo, y tú solo tendrás que reiniciar el agente (en Claude Desktop, inicia una nueva sesión de Code). En Codex también puedes instalarlo desde la página de complementos con unos pocos clics. Si prefieres hacerlo a mano, basta un comando en Codex y dos comandos `claude` en Claude Desktop; consulta [INSTALL.md](INSTALL.md) (en inglés).

<p align="center"><sub><a href="CHANGELOG.md">Historial de cambios</a> · <a href="CONTRIBUTING.md">Cómo contribuir</a> · <a href="LICENSE">Licencia MIT</a></sub></p>
