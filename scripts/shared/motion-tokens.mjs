/** motion-tokens.mjs — read motion tokens without build dependencies for generated code and test configs (D9). */


export function motionValues(doc) {
  return Object.fromEntries(doc.motion.map((item) => [item.token, item.value]))
}
