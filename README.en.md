<div align="center">

# DSH Claude Style

**A theme plugin that brings the look and feel of Claude Code Desktop to the DeepSeek Harness Web GUI.**

> **Claude Code Desktop, right inside DSH.**

[![English](https://img.shields.io/badge/lang-English-blue.svg)](README.en.md) [![简体中文](https://img.shields.io/badge/lang-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-red.svg)](README.md)

[![version](https://img.shields.io/npm/v/dsh-claude-style?style=flat&label=version&color=D97757)](https://www.npmjs.com/package/dsh-claude-style)
[![downloads](https://img.shields.io/npm/dm/dsh-claude-style?style=flat&label=downloads&color=D97757)](https://www.npmjs.com/package/dsh-claude-style)
[![GitHub stars](https://img.shields.io/github/stars/Nwflower/dsh-claude-style?style=flat&label=%E2%98%85&color=08C)](https://github.com/Nwflower/dsh-claude-style)
[![dsh.so install](https://www.dsh.so/badge/install/dsh-claude-style.svg)](https://www.dsh.so/artifact/dsh-claude-style/)
[![license](https://img.shields.io/badge/license-MIT-2EA44F?style=flat)](LICENSE)

</div>

## Preview

The settings page's Brand mark row switches between the Claude and DeepSeek palettes, and light/dark follows your system's color mode. In each group the top row is the Studio home page and the bottom row a Markdown conversation, light on the left and dark on the right.

### Claude

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/claude-home-light.png" alt="Claude brand, Studio home — light" /></td>
    <td align="center" width="50%"><img src="./docs/claude-home-dark.png" alt="Claude brand, Studio home — dark" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/claude-conversation-light.png" alt="Claude brand, Markdown conversation — light" /></td>
    <td align="center" width="50%"><img src="./docs/claude-conversation-dark.png" alt="Claude brand, Markdown conversation — dark" /></td>
  </tr>
</table>

> Light mode pairs an ivory canvas `#FCFCFB` with a pale sidebar `#FBFBF9`; dark mode uses warm black `#141413`. Ember orange `#D97757` is the single action accent across both canvases, and Claude Code's pixel crab stands on the composer on the home page and in conversations alike.

### DeepSeek

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/deepseek-home-light.png" alt="DeepSeek brand, Studio home — light" /></td>
    <td align="center" width="50%"><img src="./docs/deepseek-home-dark.png" alt="DeepSeek brand, Studio home — dark" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/deepseek-conversation-light.png" alt="DeepSeek brand, Markdown conversation — light" /></td>
    <td align="center" width="50%"><img src="./docs/deepseek-conversation-dark.png" alt="DeepSeek brand, Markdown conversation — dark" /></td>
  </tr>
</table>

> Light mode is a white with a touch of sky blue, `#F7FAFF`, with the sidebar at `#F3F7FE`; dark mode is a blue-black `#13161D`. The accent is DeepSeek's brand blue `#4D6BFE`, and Deepy the pixel whale stands on the composer on the home page and in conversations alike.
>
> <table>
>   <tr>
>     <td align="center" width="25%"><img src="./showcase/gifs/idle.gif" width="120" alt="Idle" /><br />Idle</td>
>     <td align="center" width="25%"><img src="./showcase/gifs/thinking.gif" width="120" alt="Thinking" /><br />Thinking</td>
>     <td align="center" width="25%"><img src="./showcase/gifs/typing.gif" width="120" alt="Answering and calling tools" /><br />Answering and calling tools</td>
>     <td align="center" width="25%"><img src="./showcase/gifs/conducting.gif" width="120" alt="Conducting subagents" /><br />Conducting subagents</td>
>   </tr>
>   <tr>
>     <td align="center" width="25%"><img src="./showcase/gifs/notification.gif" width="120" alt="Waiting on you" /><br />Waiting on you</td>
>     <td align="center" width="25%"><img src="./showcase/gifs/error.gif" width="120" alt="Failed" /><br />Failed</td>
>     <td align="center" width="25%"><img src="./showcase/gifs/happy.gif" width="120" alt="Finished" /><br />Finished</td>
>     <td align="center" width="25%"><img src="./showcase/gifs/sleeping.gif" width="120" alt="Asleep" /><br />Asleep</td>
>   </tr>
> </table>

> The workspaces, sessions, usage figures and nickname in the screenshots are sample data.

## Settings

The settings page appears both in the settings dialog (the "Claude Style" tab) and on the plugin page, in five tabs:

| Tab | Settings |
|---|---|
| General | Username, Animation, Open popovers on hover, Account-hold easter egg language |
| Appearance | Brand mark, Colours, Typefaces, Mascot, Where it appears |
| Composer | Composer restyle, Home layout, Redraw the model picker (with Quick providers under it), Redraw the permission control |
| Sidebar | Collapse the sidebar settings area, Sidebar search, In progress / Archived view |
| Conversation | Turn status line, Conversation navigator, Chat-area animations, Composer caret motion, Chat / Trajectory tabs |

**Sidebar layout**: persistent search and collapse icons sit above a full-width Active / Archived switch, navigation and workspace conversations. Conversation rows use hollow status dots, more spacing and a separate grey selection surface, with an account divider at the bottom.

**Right panel**: the panel surface, its header and the guide cards take the same warm hairline as the sidebar in place of the host's cold white line. Tabs read as titles with the current one in the primary ink, and the split, fullscreen and collapse buttons are 28px squares.

An empty panel's guide also carries the session's own time and token cards, read from the host's statistics projections.

**Composer lists**: type `- `, `* `, `+ `, `• `, `1. ` or `1) ` to start a list. Enter or Shift+Enter continues it and increments numbers; Enter on an empty item exits the list. Ctrl/Cmd+Shift+7 toggles a numbered list and Ctrl/Cmd+Shift+8 toggles a bullet list. Ctrl/Cmd+Enter still submits. Lists are saved as Markdown text, support undo and follow the composer restyle scope.

Every feature that takes over part of the host's interface has its own switch; turning it off brings the host's original back at once, without a reload. The conversation area's animations — the follow, the automatic folding with its rolling door, the text fade, the file change rows and the send flight — share one Chat-area animations switch; the caret keeps its own three-way choice.

**Alongside other theme plugins**: with Colours and Typefaces set to Follow the host, the skin no longer rewrites the host's colours and fonts and keeps only its layout and controls; the colours are left to DSH itself, or to another theme plugin enabled at the same time. With [dsh-wallpaper-engine](https://github.com/elysia395/dsh-wallpaper-engine), for example, the wallpaper shows through the sidebar and the conversation, and the skin's own popovers take that plugin's glass, translucent and blurring the picture behind them. **Alongside [dsh-chat-ux](https://github.com/alm-allen/dsh-chat-ux)**: that plugin implements the same chat-area interactions (the rolling door, automatic folding, the token fade, file change rows, the send flight, the drawn caret), and two copies of them intercept each other's clicks and press the same controls. So this skin stands down when it sees that plugin: the Chat-area animations and Composer caret motion rows on the settings page's Conversation tab have their controls disabled while each still shows the value you set, with a line underneath in the accent colour reading "Managed by dsh-chat-ux". Your settings are not rewritten, and they take effect as they are once dsh-chat-ux is removed.

**Chat-area follow**: at the structural moments — a thinking row folding, a tool call row arriving — a reader sitting at the bottom is handed back to the host's own follow, instead of being left tens of pixels short by the burst of content; a process group capped in the Standard and Compact tiers (thinking and tool output kept in one scrolling body) is caught up the same way. Catching up runs on a curve: a trickle of characters settles softly and a burst glides at one steady speed before landing. While content streams, the main scroller's own follow is walked along that curve too rather than written to the end in a single frame — with a fast stream the newest lines trail just below the fold and slide into place once it stops. A message you send does not go through it: the host's scroll to bring it into view lands at once. Once the reader scrolls away from the bottom himself, the plugin stays out of it until he returns.

**Automatic folding**: a thinking row opens while the model reasons and folds back when it stops; a running process group opens and folds back once that piece of work ends. A row or group the reader pressed himself keeps what he chose for that phase.

**Send flight**: on submission the composer card lifts as it is and narrows into the bubble as it travels, its words re-flowing into the shape, landing on the message row: the real bubble shows underneath and the flying copy fades out, so the words sharpen into place.

**File change rows**: a write or edit dispatched from inside a run_code program carries the `+n -m` tail and an expandable diff card, and its path opens the file; a failed or interrupted row keeps its verdict.

**New text fades in**: characters arriving in a streaming answer start faint and settle over about 0.12 s, staggered slightly by arrival order; a block arriving whole, a burst of thousands of characters and text that just reflowed from a fold stay solid.

**A rolling door for folds**: opening or closing a row (a tool card, a thinking row, a command card) or a process group moves the height frame by frame, really pushing the content below away or pulling it back. The door only rolls the stretch the reader can see, so any length moves at the same speed, and a body holding several cards rolls as one door. It rides the Chat-area animations switch, together with the entrance fade of an expanded body.

**Composer caret motion**: the composer's text caret is drawn by the plugin and glides when it moves; a question card's answer box and a queued message's inline editor are covered as well. The Conversation tab offers Every move (the default), Explicit moves and Off.

**Conversation navigator**: the column of short marks at the conversation's right edge holds one per turn and follows where you are reading. Reach it with the pointer and it opens into a list: each row carries the message that started its turn and sits exactly where that turn's mark was — the turn you are reading stays in place, and the turn under the pointer is still under it. The wheel scrolls the list and a click glides the page to the turn, loading earlier history first when it is not loaded yet; the Chat / Trajectory tabs at the top of the conversation stay up while the pointer is on the list. Alt+↑ / Alt+↓ jump to the previous or the next turn, and held or repeated they keep stepping; while the composer holds a draft the keys stay with it. The turn you land on flashes a short line over its start. With [dsh-plugin-msg-nav](https://github.com/SherUnlocked-4869/dsh-plugin-msg-nav) installed too, Alt+↑ / Alt+↓ stay with that plugin.

**Mascot**: a pixel companion stands on the composer's top edge and changes its animation with what the agent is doing (thinking, writing and calling tools, several sessions at work, subagents, waiting on you, compacting the context, finished, failed, asleep). Follow the brand shows the pixel crab under Claude and Deepy the whale under DeepSeek; either can be picked for good, or none. Where it appears keeps it to the new-conversation page, or puts it in conversations as well.

## Fonts

> **Important: the Anthropic fonts are not bundled with the npm package.** They are available for download in this repository under [`fonts/`](fonts/). You can either install them on your system, or skip the install entirely — drop the two `.ttf` files into the plugin package's `fonts/` directory and the host will serve them as webfonts (the files are identical, so the result is the same). Either way, refresh or restart the web UI for the fonts to take effect.

| Font | Used for | File |
|---|---|---|
| Anthropic Sans Web Text | Interface / UI | [`fonts/AnthropicSansWebText.ttf`](https://github.com/Nwflower/dsh-claude-style/raw/main/fonts/AnthropicSansWebText.ttf) |
| Anthropic Serif Web Text | Conversation body / Markdown | [`fonts/AnthropicSerifWebText.ttf`](https://github.com/Nwflower/dsh-claude-style/raw/main/fonts/AnthropicSerifWebText.ttf) |
| JetBrains Mono Variable | Code / code blocks | [`fonts/JetBrainsMonoVariable.ttf`](https://github.com/Nwflower/dsh-claude-style/raw/main/fonts/JetBrainsMonoVariable.ttf), [`fonts/JetBrainsMonoItalicVariable.ttf`](https://github.com/Nwflower/dsh-claude-style/raw/main/fonts/JetBrainsMonoItalicVariable.ttf) |
| Inter | Interface when Anthropic Sans is absent | [`fonts/InterVariable.woff2`](https://github.com/Nwflower/dsh-claude-style/raw/main/fonts/InterVariable.woff2) |
| Noto Serif | Conversation body when Anthropic Serif is absent | [`fonts/NotoSerifVariable.woff2`](https://github.com/Nwflower/dsh-claude-style/raw/main/fonts/NotoSerifVariable.woff2) |

JetBrains Mono, Inter and Noto Serif are licensed under the SIL Open Font License 1.1 and ship with the npm package; nothing to set up. Inter and Noto Serif nearly match the two Anthropic fonts in letter height and width, so without the Anthropic fonts they stand in and the interface and conversation text keep their layout. Both carry only the Latin characters the Anthropic fonts cover; Chinese text keeps using the system's Chinese fonts.

To enable the Anthropic fonts, choose one of the following:

① Install them on your system — on Windows, double-click each `.ttf` and choose "Install"; on macOS, import them with Font Book.

② Skip the install — copy the `.ttf` files into the plugin package's `fonts/` directory, then refresh the page.

> The Anthropic Sans and Serif fonts are the property of Anthropic, licensed for personal use only, and are not covered by this project's MIT license.

## Skin center handoff

This theme is also offered as a **skin** in the DSH Skin Center. Selecting it there hands the whole page to this
plugin; selecting anything else - another skin, the official default, or a running wallpaper - takes the page back
without a reload.

- The answer holds from the first frame: the Skin Center stamps `html[data-dsh-skin]` into the served document, so a
  page that boots with a skin already painting never flashes a frame of this theme first.
- While another owner has the page this theme mounts no stylesheet, installs no feature and claims no document
  attribute at all. It takes the page back on a real flip, and gives it back when an owner returns.
- The settings page and every stored preference survive the handoff. A skin taking the screen does not uninstall
  anything, and closing the Skin Center does not throw away what you configured here.
- `data-dsh-claude-style-handoff` on `body` marks a build that can do this; the Skin Center offers the row only
  while it is there.
## Installation

1. From the official plugin page, add the plugin below and it installs.

```
dsh-claude-style
```

2. From a terminal:

```bash
dsh plugin --profile web add dsh-claude-style                  # npm package (recommended)
dsh plugin --profile web add Nwflower/dsh-claude-style         # GitHub source
```

3. From the [plugin market](https://github.com/dsh-market/dsh-market)

Keep only one theme enabled at a time. dsh ≥ 0.1.7 is required, and a restart of DeepSeek Harness brings the full feature set.

## Documentation

| Document | Contents |
| --- | --- |
| [Design tokens](docs/STYLE.md) | Palette, typography, shapes, source layout, and host-selector discipline (in English) |
| [Architecture decisions](docs/decisions/README.md) | One file per decision: build and source, the host boundary, the runtime and each feature's trade-offs, and the architecture migration in progress (in Chinese) |
| [Changelog](CHANGELOG.md) | Version history |
| [Contributing](CONTRIBUTING.md) | Building from `src/`, commit conventions, and the screenshot and regression tooling (in English) |

## Acknowledgements

The conversation navigator's opening list, keyboard jumps and landing line follow SherUnlocked-4869's [dsh-plugin-msg-nav](https://github.com/SherUnlocked-4869/dsh-plugin-msg-nav) (MIT).

The animation frames of Deepy the pixel whale come from the Deepy whale theme pack drawn by calmly-eating-bugs ([@wp3171216237](https://github.com/wp3171216237)), and ship with the plugin by the author's permission. Many thanks to the author! GIFs of all 20 animations, contributed by the author, are in [showcase/gifs/](showcase/gifs/).

The pixel crab (Clawd) is a character of Anthropic, and all rights in it remain with Anthropic. Its laptop animation is taken from Claude Code; the animations of its other states are drawn by this project after that character. The crab's frames are not covered by the MIT license (see [LICENSE](LICENSE)). This plugin is an unofficial fan work, not affiliated with or endorsed by Anthropic.

## Related projects

> Running several themes at once? Try [dsh-skin-manager](https://github.com/xiaoyangcheng84-svg/dsh-skin-manager) — it switches between all installed themes from a single settings page.

> Want to import your Claude Code / Codex session history into DSH and keep the conversation going? Try the author's other plugin, [dsh-chat-import](https://github.com/Nwflower/dsh-chat-import).

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Nwflower/dsh-claude-style&type=Date)](https://star-history.com/#Nwflower/dsh-claude-style&Date)
