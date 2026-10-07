/**
 * A sibling plugin's stylesheet, mounted before this bundle's factory runs and
 * left untagged the way a plugin that injects from apply() leaves it (D33): the
 * host's claim sweep would attribute it to whichever package materializes next,
 * and that package's next reload would then remove it. The probe reads its tag
 * and plays that removal step.
 */
(function () {
  var siblingSheet = document.createElement('style')
  siblingSheet.id = 'smoke-sibling-sheet'
  siblingSheet.textContent = '.smoke-sibling-sheet{color:rgb(1, 2, 3)}'
  document.head.appendChild(siblingSheet)
})()
