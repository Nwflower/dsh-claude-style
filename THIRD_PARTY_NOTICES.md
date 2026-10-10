# Third-Party Notices

This package includes material from the projects below. Each keeps its own license; the MIT license of this package does not relicense it.

## dsh-better-display

The counted figures on a process group's header (`packages/client/src/features/chat-fold/process-summary.ts` and the `dsh-claude-process-summary-*` rules in its stylesheet) and the line while the model works (`packages/client/src/features/chat-wait/`, its stylesheet): their roll timing and curve, the shimmer sweep over the figures, the clock's type and colour and the overtime badge follow dsh-better-display's fold summary and live status line. The source files name it in their headers.

Source: <https://github.com/aa2246740/dsh-better-display>

```
MIT License

Copyright (c) 2026 dsh-better-display contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## transitions.dev

The Number pop-in transition (`packages/client/src/features/context-stats/stats-digits.ts` and the `dsh-claude-digit-*` rules in `packages/client/src/features/composer/inline-bar.css`) is ported from transitions.dev's "Number pop-in": its keyframes, its distance, blur, stagger and easing tokens, and one span per character with the last two delayed behind the rest — renamed into this package's own classes and tokens.

The "Text states swap" transition (`packages/client/src/features/chat-wait/chat-wait.ts` and the `dsh-claude-chat-wait-label` rules in its stylesheet) is ported the same way: its three-phase sequence (leave upward with a blur, change the text out of sight, enter from below), its duration, shift, blur and easing tokens as this package's own custom properties, and the reflow that releases the entry pose. The snippet's `prefers-reduced-motion` guard is answered by the animation choice this skin resolves onto `<body>` (D26), which already folds the system setting in.

The "Reasoning stream" transition (`packages/client/src/features/chat-fold/reasoning-stream.ts` and the `data-dsh-claude-reason-window` rules in that feature's `fold-motion.css`) is ported as well: its window (a few lines tall with a mask at each edge rather than painted gradients), its hold, step, lines, fade and easing tokens, and the stepping clock — read as live text, so there is no copy and no wrap and the steps stop at the newest line.

Source: <https://transitions.dev/detail.html?t=number-pop-in> · <https://transitions.dev/detail.html?t=text-states-swap> · <https://transitions.dev/detail.html?t=reasoning-stream> · <https://github.com/Jakubantalik/transitions.dev>

```
Transitions.dev License
Copyright (c) 2026 Jakub Antalik / Transitions.dev

Summary: you (and any coding agent working for you) may use the transitions
and skills in this repository in unlimited personal and commercial projects,
modify them freely, and ship them to your users. The tooling is MIT. The one
restriction is that you may not redistribute the transitions library itself
as a competing product.

Permission is granted, free of charge, to any person or automated agent
obtaining these transitions to:

  - use them in unlimited personal and commercial projects;
  - copy, paste, and modify them freely;
  - ship them to end users as part of your own product or website;
  - install and run the skills in any coding agent (Claude Code, Cursor,
    GitHub Copilot, Codex, Gemini CLI, and others) to apply the transitions
    to your code.

Restriction: you may not redistribute the library itself. You may not
repackage, resell, or publish the collection (or a substantial part of it) as
a competing transitions library, motion pack, or animation kit. Use the
transitions in your products, not as a product of their own.

Full terms: https://transitions.dev/terms.html
```
