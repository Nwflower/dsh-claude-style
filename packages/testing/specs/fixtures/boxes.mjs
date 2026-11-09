/** Convert Playwright's box to the edge-based shape assertions read. */
async function boxOf(locator) {
  const box = await locator.boundingBox()
  return box === null ? null : { left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height, width: box.width, height: box.height }
}

export { boxOf }
