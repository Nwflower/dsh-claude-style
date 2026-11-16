/**
 * Whether two CSS colours paint the same sRGB bytes. A scheme seed stands as an
 * oklch colour naming its hue, so its serialisation differs from a hex's while
 * the painted colour agrees; comparing bytes reads the colour, not the spelling.
 */
export function samePaint(t, first, second) {
  return t.page.evaluate(([a, b]) => {
    const probe = document.createElement('span')
    document.body.append(probe)
    const resolved = (expr) => {
      probe.style.color = ''
      probe.style.color = expr
      return getComputedStyle(probe).color
    }
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const context = canvas.getContext('2d')
    const bytes = (css) => {
      context.fillStyle = css
      context.fillRect(0, 0, 1, 1)
      return Array.from(context.getImageData(0, 0, 1, 1).data).join(',')
    }
    const answer = bytes(resolved(a)) === bytes(resolved(b))
    probe.remove()
    return answer
  }, [first, second])
}
