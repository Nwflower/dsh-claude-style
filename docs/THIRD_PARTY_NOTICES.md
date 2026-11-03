# Third-Party Notices

This package includes material from the projects below. Each keeps its own license; the MIT license of this package does not relicense it.

## dsh-chat-ux

The chat area's folding (`packages/client/src/features/chat-fold/`), the token reveal (`packages/client/src/features/chat-reveal/`), the send flight (`packages/client/src/features/chat-send/`), the enhanced follow and the capped process group's follow (`packages/client/src/features/chat-follow/`) and the composer caret (`packages/client/src/features/caret/`) are ported from dsh-chat-ux. The ported source files name it in their headers, and each of those features stands down while that plugin is on the page.

The context meter's pie (`packages/client/src/features/context-stats/context-meter-pie.ts`) is derived the same way: the occupied share drawn as a pie in the reading's own colour, painted as the trigger's own background image, and the seam cut by stroking a sector's own path are taken from that plugin; the two sectors standing on one centre, the step that follows the split and the seam shared between their two strokes are this plugin's. The browser half draws it while that plugin is off the page and leaves the host's ring standing while it is on.

Source: <https://github.com/alm-allen/dsh-chat-ux>

```
MIT License

Copyright (c) 2026 Alm

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

## Lobe Icons

The vendor lockups the model picker draws (`packages/assets/src/icons/combine/`, inlined into `lib/client.js`) are composed by `scripts/fetch-lobe-combines.py`: most from Lobe Icons (`@lobehub/icons-static-svg` ships each vendor's mono mark, colour mark and wordmark, and `@lobehub/icons` carries each vendor's brand colour and which artwork variants exist), the rest — OpenAI's and Reflection's — from artwork the repository carries under `packages/assets/src/icons/`. Brand names and logos remain trademarks of their respective owners.

Source: <https://github.com/lobehub/lobe-icons>

```
MIT License

Copyright (c) 2023 LobeHub

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

The "Text states swap" transition (`packages/client/src/features/chat-wait/chat-wait.ts` and the `dsh-claude-chat-wait-label` rules in its stylesheet, and the operation label of a shared file row in `packages/client/src/features/chat-files/` with the `dsh-claude-file-op-*` rules in its stylesheet) is ported the same way: its three-phase sequence (leave upward with a blur, change the text out of sight, enter from below), its duration, shift, blur and easing tokens as this package's own custom properties, and the reflow that releases the entry pose. The snippet's `prefers-reduced-motion` guard is answered by the animation choice this skin resolves onto `<body>` (D40), which already folds the system setting in.

The "Reasoning stream" transition (`packages/client/src/features/chat-fold/reasoning-stream.ts` and the `data-dsh-claude-reason-window` rules in that feature's `fold-motion.css`) is ported as well: its window (a few lines tall with a mask at each edge rather than painted gradients), its hold, step, lines, fade and easing tokens, and the stepping clock — read as live text, so there is no copy and no wrap and the steps stop at the newest line.

Seven more are ported the same way, each into this package's own classes, attributes and motion tokens, with the snippet's `prefers-reduced-motion` guard answered by the skin's animation choice: "Menu dropdown" (the popover cards in `packages/client/src/shared/popover.css` and the `dsh-claude-dropdown-in` preset in `packages/client/src/shared/motion.css` — its pre-open and closing scales and its curve, the closing state carried by the separate `scale` property instead of a class), "Modal open / close" (the account-hold page, `packages/client/src/features/ban-screen/`), "Page side-by-side" (the settings tabs, `packages/client/src/features/settings/` — the page leaving is a still copy of its rows), "Notification badge" (the waiting line's overtime badge, `packages/client/src/features/chat-wait/` — the slide and the pop as `translate` and `scale` on the one pill), "Skeleton loader and reveal" (the home usage panel, `packages/client/src/features/home/` — the placeholder and the figure being one element, its fill fades while the figure comes out of the blur), "Texts reveal" (the home greeting, `packages/client/src/theme/hero.css` — the brand mark and the greeting as its two lines) and "Toggle" (the settings switches — its double-bounce keyframes, armed by the first press).

The colour wash the waiting line can wear instead of the band (`packages/client/src/shared/motion.css`, the `dsh-claude-sweep` and `dsh-claude-wash` presets in that sheet and the `--dsh-claude-wash-*` custom properties) is the paint transitions.dev serves on its own pages as "Pro gradient text" (`.title-pro` on <https://transitions.dev/agent.html>): its seven radial washes over a grey base ramp as inline SVG, its 180% layer sizes, and its orbit and hue-rotation periods, renamed into this package's own custom properties and motion tokens, with the `prefers-reduced-motion` guard answered by the skin's animation choice (D40) as everywhere else.

The "Input clear with dissolve" transition (the search field at the top of the model picker's second level, `packages/client/src/features/model/sub-menu.ts` with the `dsh-claude-model-search-*` rules in its stylesheet) is ported the way the rest are: the typed words fly down through a blur while a streak ignites under each of them and the placeholder falls in from above, with the per-frame envelope the snippet writes by hand (its streak cannot be a keyframe), its two halves, its fly, blur and glow-delay times and its curve as this package's motion tokens, and its multiply/screen blend read off the reader's palette. Its `prefers-reduced-motion` guard is answered by the skin's animation choice, which the module asks before it starts a clear.

The "Card resize" transition (the model picker's second level taking the height of the list a query leaves, `packages/client/src/features/model/sub-menu.ts` with the `dsh-claude-model-popover-sub` rule in its stylesheet) is ported as the width and height tween it is, with its duration as this package's `--dsh-claude-duration-resize` and its curve the settling one the other surface transitions already read. A height cannot be interpolated into `auto`, so the two ends are written as lengths around the rebuild and the height returns to the content once the travel lands. Its `prefers-reduced-motion` guard is answered by the skin's animation choice (D40).

The "Tooltip open/close" and "Avatar group hover" transitions (the colour cards' discs on the settings page, `packages/client/src/features/settings/settings-brand.ts` with the `dsh-claude-palette-hint` and `dsh-claude-palette-swatch` rules in `settings.css`) are ported together: one hint per row of discs that appears after a short rest, travels and resizes between discs while it shows and leaves at once, with its geometry written with transitions off while it is hidden; and the disc under the pointer lifting and growing while its neighbours lift by a falloff per step, rising on the settling curve and springing back on the snippet's overshooting one. Their delay, exit, scale, lift, falloff and curve are this package's motion tokens, and the `prefers-reduced-motion` guard is answered by the skin's animation choice (D40).

Source: <https://transitions.dev/detail.html?t=text-states-swap> · <https://transitions.dev/detail.html?t=reasoning-stream> · <https://transitions.dev/detail.html?t=menu-dropdown> · <https://transitions.dev/detail.html?t=modal-open-close> · <https://transitions.dev/detail.html?t=page-side-by-side> · <https://transitions.dev/detail.html?t=notification-badge> · <https://transitions.dev/detail.html?t=skeleton-loader-and-reveal> · <https://transitions.dev/detail.html?t=texts-reveal> · <https://transitions.dev/detail.html?t=toggle> · <https://transitions.dev/detail.html?t=pro-gradient-text> · <https://transitions.dev/detail.html?t=input-clear-dissolve> · <https://transitions.dev/detail.html?t=card-resize> · <https://transitions.dev/detail.html?t=tooltip-open-close> · <https://transitions.dev/detail.html?t=avatar-group-hover> · <https://github.com/Jakubantalik/transitions.dev>

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

## zai-org/ZCode

The figures on a file-change row (`packages/client/src/features/chat-files/` and the `dsh-claude-file-roll-*` rules in its stylesheet) turn the way ZCode's metric flip does (its UI package's `flip-metric-value.tsx`): one short turn per update, only the characters whose own digit changed, a fixed-width slot per character with the perspective on the slot, 160 ms, and an animation choice that writes the value in place instead of turning it.

Source: <https://github.com/zai-org/ZCode> · <https://github.com/zai-org/ZCode/blob/main/packages/ui/src/components/ui/flip-metric-value.tsx>

License: Apache-2.0.

```
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright [yyyy] [name of copyright owner]

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
```

## Uiverse — "Loader" by mobinkakei

The loader the waiting line leads with under the Claude brand (`packages/client/src/features/chat-wait/chat-wait.ts` and the `dsh-claude-chat-wait-loader` rules in its stylesheet) is ported from a Uiverse loader: its three dots, its squash-and-stretch keyframes (the flat-bottomed radius the dot lands with, the round pose two fifths into the bounce, the travel to the top), its half-second period and the phase each dot starts behind the one before it — renamed into this package's own classes, read from its own motion tokens and painted with the accent in force. The snippet's three shadow ellipses are left out, so the loader carries no shadow at all.

Source: <https://uiverse.io/mobinkakei/grumpy-turtle-41>

```
MIT License

Copyright - 2026 mobinkakei (Mobeen)

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
