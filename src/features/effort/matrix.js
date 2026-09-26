    /**
     * The dot matrix the reasoning-effort slider (effort/control.js) shows on
     * its top rung.
     *
     * The grid is solved in whole device pixels, every particle's phase, cycle
     * length and tone is scattered by hash, and the entrance sweeps in from the
     * right. The control decides when the top rung is reached; this factory
     * builds the grid inside `matrix` for the width of `track`, and returns
     * `{ ensure }` — `ensure()` (re)builds it for the track's current
     * device-pixel size and answers false while the track has no layout yet.
     */
    function createEffortMatrix(track, matrix) {
      /**
       * The grid the matrix is built for, '`widthDev@dpr`'; '' while unbuilt.
       * The picker's width is fixed, so a built grid is reused for the whole
       * mount; a device-pixel-ratio change (window dragged across monitors)
       * changes the signature and forces one rebuild on the next apex entry.
       */
      var matrixSig = ''

      /**
       * Scatter one cell's phase. A linear rule such as `(7r + 13c) % 29` maps
       * neighbours onto a regular lattice, which the eye reads as diagonal
       * bands; avalanching both coordinates first scatters them instead. The
       * result is continuous rather than quantised into buckets, so no two
       * cells are forced to flip in the very same instant every round.
       */
      function cellUnit(r, c, seed) {
        var h = Math.imul(r + 1, 0x9e3779b1) ^ Math.imul(c + 1, 0x85ebca6b) ^ Math.imul(seed + 1, 0x27d4eb2f)
        h = Math.imul(h ^ (h >>> 15), 0x2545f491)
        h ^= h >>> 13
        return (h >>> 0) / 4294967296
      }

      /**
       * The matrix's left-to-right mask: the right end is solid, the left end
       * dissolves back into the bare track, so the grid reads as a gradient
       * rather than a wall of blocks.
       */
      function cellFade(fx) {
        if (fx <= 0.05) return 0
        if (fx >= 0.75) return 1
        var t = (fx - 0.05) / 0.7
        return t * t * (3 - 2 * t)
      }

      /**
       * Solve the grid in whole device pixels. Rounding here — instead of
       * handing the browser a fractional remainder — is what keeps the matrix
       * uniform: a fractional pitch rasterizes as alternating gaps, and a
       * centred fractional remainder leaves one edge with a different gap. The
       * vertical rest goes back into the top/bottom padding, so the blocks
       * stay square and centred inside the groove whatever the device ratio.
       */
      function solveMatrix(wDev, dpr) {
        /* Five rows of ~4px blocks on the 26px groove: chunky enough for the
           grid to read as PIXELS (Claude's own matrix is similarly coarse);
           six rows solved to 3px blocks and blurred into a texture. */
        var ROWS = 5
        var gap = Math.max(1, Math.round(1 * dpr))
        var margin = Math.max(1, Math.round(0.5 * dpr))
        var hDev = Math.round(26 * dpr)
        var block = Math.max(3, Math.floor((hDev - 2 * margin - (ROWS - 1) * gap) / ROWS))
        var cols = Math.max(1, Math.floor((wDev + gap) / (block + gap)))
        var restX = wDev - (cols * block + (cols - 1) * gap)
        var restY = hDev - (ROWS * block + (ROWS - 1) * gap)
        return {
          cols: cols,
          rows: ROWS,
          sq: block / dpr,
          gap: gap / dpr,
          padTop: Math.floor(restY / 2) / dpr,
          padBottom: (restY - Math.floor(restY / 2)) / dpr,
          padLeft: Math.floor(restX / 2) / dpr,
          padRight: (restX - Math.floor(restX / 2)) / dpr,
        }
      }
      /**
       * Give one particle its twinkle: a hash-scattered phase, a hash-scattered
       * CYCLE LENGTH and a hash-scattered tone. Nothing here is ordered — the
       * phases spread across the cycle so no two neighbours fire together, and
       * the per-block durations drift the phases apart so the pattern never
       * repeats exactly. (An ordered wave was tried and rejected: it read as one
       * sweeping bar rather than as a field of particles.)
       */
      function paintParticle(sq, r, c) {
        sq.setAttribute('data-tone', String(Math.floor(cellUnit(r, c, 1) * 8) % 8))
        sq.style.setProperty('animation-delay', (cellUnit(r, c, 2) * 1.38 + 0.3).toFixed(3) + 's', 'important')
        sq.style.setProperty('animation-duration', (1.45 * (0.92 + cellUnit(r, c, 3) * 0.16)).toFixed(3) + 's', 'important')
      }


      /**
       * (Re)build the matrix for the track's current device-pixel size. Returns
       * false when the track has no layout yet (the picker is still hidden);
       * the caller then keeps the apex treatment off, and the next paintValue
       * retries — the attribute never marks a grid that is not there.
       */
      function ensureMatrix() {
        var w = track.clientWidth
        if (!w) return false
        var dpr = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1
        var sig = Math.round(w * dpr) + '@' + dpr
        if (sig === matrixSig) return true
        var lay = solveMatrix(Math.round(w * dpr), dpr)
        while (matrix.firstChild) matrix.removeChild(matrix.firstChild)
        matrix.style.gap = lay.gap + 'px'
        matrix.style.padding = lay.padTop + 'px ' + lay.padRight + 'px ' + lay.padBottom + 'px ' + lay.padLeft + 'px'
        matrix.style.gridTemplateColumns = 'repeat(' + lay.cols + ', ' + lay.sq + 'px)'
        matrix.style.gridAutoRows = lay.sq + 'px'
        for (var r = 0; r < lay.rows; r++) {
          for (var c = 0; c < lay.cols; c++) {
            var fx = lay.cols > 1 ? c / (lay.cols - 1) : 1
            var cell = modelEl('div', 'dsh-claude-effort-matrix-cell')
            /* The entrance sweeps in from the right — the end the knob reached
               for — with a whisper of scatter so it does not read as a wipe.
               !important inline: the stylesheet's animation shorthand is
               !important (it resets delay/duration), so a plain assignment
               would silently lose. */
            cell.style.setProperty('animation-delay', (((1 - fx) * 0.45) + cellUnit(r, c, 4) * 0.08).toFixed(3) + 's', 'important')
            var sq = modelEl('div', 'dsh-claude-effort-matrix-sq')
            /* The plume shape is a STATIC per-block opacity: the flash animates
               the colour through it, so the two never fight. */
            sq.style.opacity = cellFade(fx).toFixed(3)
            paintParticle(sq, r, c)
            cell.appendChild(sq)
            matrix.appendChild(cell)
          }
        }
        matrixSig = sig
        return true
      }

      return { ensure: ensureMatrix }
    }
