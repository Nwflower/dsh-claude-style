/** Mount an untagged sibling sheet so the probe can verify reload ownership (D9). */
(function () {
  var siblingSheet = document.createElement('style')
  siblingSheet.id = 'smoke-sibling-sheet'
  siblingSheet.textContent = '.smoke-sibling-sheet{color:rgb(1, 2, 3)}'
  document.head.appendChild(siblingSheet)
})()
