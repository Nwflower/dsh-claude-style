/**
 * The host's context panel: the meter's own trigger opens and closes it, and the
 * host portals it to <body>. Its rows are a <dl> like the stats dialogs', so the
 * skin tells the three apart by their markers (the stats dialogs carry
 * data-session-stats-*, this one carries neither) — see
 * features/context-stats/stats-panel.ts contextPanel(). The statistics cases
 * also carry another plugin's popover, portaled to the same <body> before the
 * host's panel is: dsh-better-sidebar's agent node detail. Its wrapper only
 * positions, the card inside paints the surface, and the rows are a `dl` — what
 * a generation before this one took for the host's panel, leaving the block and
 * the panel marks behind when the client hot reloaded it.
 */
(function () {
  var statsFixtureCase = window.__dshSmokeHost.statsFixtureCase

  var meterTrigger = document.getElementById('context-meter')
  var contextPanel = null
  if (meterTrigger !== null) {
    meterTrigger.addEventListener('click', function () {
      if (contextPanel !== null) {
        if (contextPanel.parentElement) contextPanel.parentElement.removeChild(contextPanel)
        contextPanel = null
        meterTrigger.setAttribute('aria-expanded', 'false')
        return
      }
      meterTrigger.setAttribute('aria-expanded', 'true')
      contextPanel = document.createElement('div')
      contextPanel.id = 'context-panel'
      contextPanel.setAttribute('role', 'dialog')
      contextPanel.setAttribute('aria-label', '上下文已用')
      contextPanel.innerHTML = '<div class="_m_header_1"><span>上下文已用</span><span>42%</span></div>' +
        '<dl class="_m_rows_1">' +
          '<div class="_m_row_1"><dt>系统提示词</dt><dd>~1.5K</dd></div>' +
          '<div class="_m_row_1"><dt>工具定义</dt><dd>~7.8K</dd></div>' +
          '<div class="_m_row_1"><dt>对话消息</dt><dd>~242K</dd></div>' +
        '</dl>'
      document.body.appendChild(contextPanel)
    })
  }
  if (statsFixtureCase) {
    var foreignPopover = document.createElement('div')
    foreignPopover.id = 'foreign-popover'
    foreignPopover.setAttribute('role', 'dialog')
    foreignPopover.setAttribute('aria-label', '节点详情')
    foreignPopover.setAttribute('data-dsh-claude-context-panel', '')
    foreignPopover.setAttribute('data-dsh-claude-context-aligned', '')
    foreignPopover.style.position = 'fixed'
    foreignPopover.style.left = '8px'
    foreignPopover.style.top = '8px'
    var foreignCard = document.createElement('div')
    foreignCard.setAttribute('class', '_popCard_1')
    foreignCard.innerHTML = '<dl><dt>状态</dt><dd>运行中</dd></dl>'
    var strayBlock = document.createElement('div')
    strayBlock.id = 'stray-context-block'
    strayBlock.className = 'dsh-claude-context-stats'
    strayBlock.setAttribute('data-dsh-claude-context-stats', '')
    foreignCard.appendChild(strayBlock)
    foreignPopover.appendChild(foreignCard)
    document.body.appendChild(foreignPopover)
  }
})()
