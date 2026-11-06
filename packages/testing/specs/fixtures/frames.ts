/** Wait for the browser to run `count` frames. */
export async function frames(count: number) {
  for (let at = 0; at < count; at += 1) await new Promise(resolve => requestAnimationFrame(resolve))
}
