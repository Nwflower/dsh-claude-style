/**
 * Exit the scratch host when its launcher's stdin closes (D92). Only the
 * marked host watches the pipe; children must not inherit the marker.
 */
if (process.env.DSH_WEB_LIFELINE === '1') {
  delete process.env.DSH_WEB_LIFELINE
  process.stdin.on('end', () => process.exit(0))
  process.stdin.resume()
}
