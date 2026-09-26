    /**
     * The crab that sits on the studio home page's composer: Claude Code's own
     * pixel mascot, perched on the card's top edge near its right end. The
     * classic home page keeps its centred hero without it.
     *
     * It stands still facing the reader. When it is clicked, when the pointer
     * leaves it, and now and then on its own while the hero page stays up, it
     * plays Claude Code's fishing routine: a half turn and a wink, a rod raised
     * overhead and cast down onto the card's edge, a spell of fishing side-on,
     * and the rod put away as it turns back. A reader who asks the system for
     * reduced motion gets the routine only by clicking the crab.
     *
     * The crab is one inline SVG holding every pose as its own group; a frame
     * change is a `display` flip on two groups, an attribute the scheduler's
     * observer does not watch, so the routine never wakes a pass. The card
     * comes from the composer's own reading (`ui.composer.heroCard`), and the
     * crab is the skin's own node appended to it, re-appended when the host
     * replaces the card.
     *
     * @param ui - shared handle table.
     * @returns teardown.
     */
    function installMascot(ui) {
      var SVG_NS = 'http://www.w3.org/2000/svg'
      /** One sprite cell, in CSS pixels. */
      var CELL = 4
      /**
       * The canvas, in cells: the crab stands in the right thirteen columns
       * and the bottom eight rows; the room to its left and above is where the
       * rod swings.
       */
      var CANVAS_COLUMNS = 24
      var CANVAS_ROWS = 12
      /** Where a pose's first row and column land on the canvas. */
      var CRAB_LEFT = 11
      var CRAB_TOP = 4
      /** The quiet spell between two unprompted routines, in milliseconds. */
      var IDLE_MIN_MS = 25000
      var IDLE_SPAN_MS = 20000

      /**
       * The poses, drawn thirteen cells wide from the crab's own left edge:
       * `#` shell, `s` the shaded back of the shell side-on, `o` an eye, `O` an
       * eye widened mid-turn, `d` an eye shut in a wink, `l` a leg seen side-on,
       * slanting back over its own row and the one below. A pose may start one
       * row above the head (`above`) for an arm raised over it. `rod` is the
       * fishing rod as canvas points, with an optional lure square.
       */
      var FRONT = [
        '..#########..',
        '..#o#####o#..',
        '..#########..',
        '#############',
        '#############',
        '..#########..',
        '..#..#.#..#..',
        '..#..#.#..#..',
      ]
      var TURN = [
        '...########..',
        '...#o###o####',
        '...##########',
        '.##########..',
        '.##########..',
        '...########..',
        '...#.#..#.#..',
        '...#.#..#.#..',
      ]
      var WINK = [
        '...########..',
        '...#o###d####',
        '...##########',
        '.##########..',
        '.##########..',
        '...########..',
        '...#.#..#.#..',
        '...#.#..#.#..',
      ]
      var CAST_UP = [
        '.##########..',
        '..#o#####o#..',
        '..#########..',
        '..###########',
        '..###########',
        '..#########..',
        '..#..#.#..#..',
        '..#..#.#..#..',
      ]
      var CAST_SWING = [
        '..#########..',
        '..#o#####o#..',
        '..#########..',
        '#############',
        '..###########',
        '..#########..',
        '..#..#.#..#..',
        '..#..#.#..#..',
      ]
      var CAST_DOWN = [
        '..#########..',
        '..#o#####o#..',
        '..#########..',
        '..###########',
        '#############',
        '###########..',
        '..#..#.#..#..',
        '..#..#.#..#..',
      ]
      var HOP = [
        '..##....##...',
        '..########s..',
        '..#o####o#s..',
        '..########s..',
        '..########s..',
        '..########s..',
        '..########s..',
        '..#.#..#.#...',
        '..#.#..#.#...',
      ]
      var FISH_A = [
        '...#######s..',
        '...o##o###s..',
        '...#######s..',
        '.#########s..',
        '.##.######s..',
        '...#######s..',
        '...l.l.l.l...',
        '.............',
      ]
      var FISH_B = [
        '...#######s..',
        '...o##o###s..',
        '...#######s..',
        '...#######s..',
        '.#########s..',
        '.##.######s..',
        '...l.l.l.l...',
        '.............',
      ]
      var FISH_TURN = [
        '...#######s..',
        '...O##O###s..',
        '...#######s..',
        '.#########s..',
        '.##.######s..',
        '...#######s..',
        '...l.l.l.l...',
        '.............',
      ]

      /** The rod laid on the card's edge: tip up and out, handle at the crab's foot. */
      var ROD_RESTING = { points: [[46, 47], [30, 47], [20, 37]] }
      var POSES = {
        front: { rows: FRONT },
        turn: { rows: TURN },
        wink: { rows: WINK },
        castUp: { rows: CAST_UP, rod: { points: [[48, 17], [37, 17], [37, 2]] } },
        castSwing: { rows: CAST_SWING, rod: { points: [[44, 30], [30, 30], [24, 22]], lure: [18, 16, 6] } },
        castDown: { rows: CAST_DOWN, rod: ROD_RESTING },
        hop: { rows: HOP, above: true, rod: ROD_RESTING },
        fishTurn: { rows: FISH_TURN, rod: ROD_RESTING },
        fishA: { rows: FISH_A, rod: ROD_RESTING },
        fishB: { rows: FISH_B, rod: { points: [[46, 47], [30, 47], [21, 39]] } },
        putAway: { rows: TURN, rod: { points: [[46, 30], [36, 34], [28, 36]] } },
      }
      /** Claude Code's routine, pose by pose, each held for its milliseconds. */
      var ROUTINE = [
        ['turn', 70], ['wink', 400], ['castUp', 200], ['castSwing', 70], ['castDown', 200], ['hop', 130],
        ['fishTurn', 70], ['fishA', 280], ['fishB', 210], ['fishA', 280], ['fishB', 210], ['fishA', 280], ['fishB', 210],
        ['fishTurn', 70], ['putAway', 70], ['turn', 270], ['front', 0],
      ]

      var root = null
      var groups = {}
      var shown = 'front'
      var playing = false
      var stepTimer = null
      var idleTimer = null

      /** Whether the reader asks the system for reduced motion, as of now. */
      function reducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      }

      function rect(parent, className, x, y, width, height) {
        var node = document.createElementNS(SVG_NS, 'rect')
        node.setAttribute('class', className)
        node.setAttribute('x', String(x))
        node.setAttribute('y', String(y))
        node.setAttribute('width', String(width))
        node.setAttribute('height', String(height))
        parent.appendChild(node)
      }

      /** One pose as an SVG group: shell runs merged per row, eyes and rod on top. */
      function drawPose(name, pose) {
        var group = document.createElementNS(SVG_NS, 'g')
        group.setAttribute('data-pose', name)
        if (name !== shown) group.setAttribute('display', 'none')
        var top = CRAB_TOP - (pose.above ? 1 : 0)
        var eyes = []
        var legs = []
        for (var r = 0; r < pose.rows.length; r++) {
          var row = pose.rows[r]
          var y = (top + r) * CELL
          var c = 0
          while (c < row.length) {
            var mark = row.charAt(c)
            if (mark === '.') { c++; continue }
            if (mark === 'l') {
              legs.push({ x: (CRAB_LEFT + c) * CELL, y: y })
              c++
              continue
            }
            var fill = mark === 's' ? 's' : '#'
            var start = c
            // An eye sits on shell, so the shell run carries on under it.
            while (c < row.length && '.l'.indexOf(row.charAt(c)) === -1 && (row.charAt(c) === 's') === (fill === 's')) {
              if ('oOd'.indexOf(row.charAt(c)) !== -1) eyes.push({ mark: row.charAt(c), x: (CRAB_LEFT + c) * CELL, y: y })
              c++
            }
            rect(group, fill === 's' ? 'dsh-claude-mascot-shade' : 'dsh-claude-mascot-shell', (CRAB_LEFT + start) * CELL, y, (c - start) * CELL, CELL)
          }
        }
        for (var l = 0; l < legs.length; l++) {
          var leg = legs[l]
          var slant = document.createElementNS(SVG_NS, 'polygon')
          slant.setAttribute('class', 'dsh-claude-mascot-shell')
          slant.setAttribute('points', [
            [leg.x, leg.y], [leg.x + CELL, leg.y], [leg.x + CELL + CELL / 2, leg.y + 2 * CELL], [leg.x + CELL / 2, leg.y + 2 * CELL],
          ].map(function (point) { return point.join(',') }).join(' '))
          group.appendChild(slant)
        }
        for (var e = 0; e < eyes.length; e++) {
          var eye = eyes[e]
          if (eye.mark === 'o') rect(group, 'dsh-claude-mascot-eye', eye.x, eye.y, CELL, CELL)
          else if (eye.mark === 'O') rect(group, 'dsh-claude-mascot-eye', eye.x, eye.y - 1, CELL, CELL + 2)
          else rect(group, 'dsh-claude-mascot-eye', eye.x - 1, eye.y + 1, CELL + 2, 2)
        }
        if (pose.rod) {
          var line = document.createElementNS(SVG_NS, 'polyline')
          line.setAttribute('class', 'dsh-claude-mascot-rod')
          line.setAttribute('points', pose.rod.points.map(function (point) { return point.join(',') }).join(' '))
          group.appendChild(line)
          var lure = pose.rod.lure
          if (lure) rect(group, 'dsh-claude-mascot-lure', lure[0], lure[1], lure[2], lure[2])
        }
        return group
      }

      function build() {
        root = document.createElement('span')
        root.className = 'dsh-claude-mascot'
        root.setAttribute('aria-hidden', 'true')
        root.setAttribute('data-pose', shown)
        var svg = document.createElementNS(SVG_NS, 'svg')
        svg.setAttribute('viewBox', '0 0 ' + CANVAS_COLUMNS * CELL + ' ' + CANVAS_ROWS * CELL)
        svg.setAttribute('width', String(CANVAS_COLUMNS * CELL))
        svg.setAttribute('height', String(CANVAS_ROWS * CELL))
        for (var name in POSES) {
          groups[name] = drawPose(name, POSES[name])
          svg.appendChild(groups[name])
        }
        // The pointer only meets the crab itself, never the rod's empty room.
        var hit = document.createElementNS(SVG_NS, 'rect')
        hit.setAttribute('class', 'dsh-claude-mascot-hit')
        hit.setAttribute('x', String(CRAB_LEFT * CELL))
        hit.setAttribute('y', String(CRAB_TOP * CELL))
        hit.setAttribute('width', String(13 * CELL))
        hit.setAttribute('height', String(8 * CELL))
        hit.addEventListener('click', play)
        hit.addEventListener('pointerleave', play)
        svg.appendChild(hit)
        root.appendChild(svg)
      }

      function show(name) {
        if (name === shown) return
        groups[shown].setAttribute('display', 'none')
        groups[name].removeAttribute('display')
        root.setAttribute('data-pose', name)
        shown = name
      }

      function stopRoutine() {
        if (stepTimer !== null) clearTimeout(stepTimer)
        stepTimer = null
        playing = false
        if (root !== null) show('front')
      }

      /**
       * Play the routine once. Under reduced motion only a click plays it — the
       * reader asked for it by name; the pointer passing by and the idle timer
       * do not.
       */
      function play(event) {
        if (playing || root === null || !root.isConnected) return
        if (reducedMotion() && !(event && event.type === 'click')) return
        playing = true
        var step = 0
        function next() {
          var entry = ROUTINE[step]
          show(entry[0])
          step++
          if (step >= ROUTINE.length) {
            stepTimer = null
            playing = false
            return
          }
          stepTimer = setTimeout(next, entry[1])
        }
        next()
      }

      /** The next unprompted routine, some time from now, while the page is in view. */
      function scheduleIdle() {
        idleTimer = setTimeout(function () {
          if (!document.hidden) play()
          scheduleIdle()
        }, IDLE_MIN_MS + Math.random() * IDLE_SPAN_MS)
      }

      /** Each pass: the crab rides the studio hero's card, and leaves with it. */
      function sync() {
        var card = readPrefs().homeLayout === HOME_LAYOUT_STUDIO ? ui.composer.heroCard() : null
        if (card === null) {
          if (root !== null && root.parentNode !== null) {
            stopRoutine()
            root.parentNode.removeChild(root)
          }
          return
        }
        if (root === null) build()
        if (root.parentNode !== card) card.appendChild(root)
      }

      ui.mascot = { sync: sync }
      scheduleIdle()

      return function () {
        stopRoutine()
        clearTimeout(idleTimer)
        idleTimer = null
        if (root !== null && root.parentNode !== null) root.parentNode.removeChild(root)
        root = null
        groups = {}
        shown = 'front'
        delete ui.mascot
      }
    }
