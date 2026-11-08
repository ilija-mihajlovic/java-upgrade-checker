(function () {
  'use strict'

  const example = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>2.7.12</version></parent>
  <properties><java.version>8</java.version></properties>
  <dependencies>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
    <dependency><groupId>org.projectlombok</groupId><artifactId>lombok</artifactId><version>1.18.20</version></dependency>
    <dependency><groupId>org.hibernate</groupId><artifactId>hibernate-core</artifactId><version>5.6.15</version></dependency>
    <dependency><groupId>javax.persistence</groupId><artifactId>javax.persistence-api</artifactId><version>2.2</version></dependency>
    <dependency><groupId>org.mockito</groupId><artifactId>mockito-core</artifactId><version>3.12.4</version></dependency>
  </dependencies>
</project>

// Java imports found in the service
import javax.persistence.Entity;
import javax.servlet.Filter;
import javax.validation.Valid;
import sun.misc.Unsafe;`

  const input = document.querySelector('#config-input')
  const analyzeButton = document.querySelector('#analyze')
  const exampleButton = document.querySelector('#load-example')
  const copyButton = document.querySelector('#copy-markdown')
  const results = document.querySelector('#results')
  const summary = document.querySelector('#summary')
  let latestFindings = []

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
  }

  function render() {
    latestFindings = window.JavaUpgradeRules.analyze(input.value)
    const groups = ['blocker', 'warning', 'info']
    const counts = groups.map(group => `${latestFindings.filter(item => item.severity === group).length} ${group}`).join(' · ')
    summary.textContent = `${latestFindings.length} finding${latestFindings.length === 1 ? '' : 's'} · ${counts}`
    results.innerHTML = groups.map(group => {
      const items = latestFindings.filter(item => item.severity === group)
      if (!items.length) return ''
      return `<section class="finding-group" aria-labelledby="${group}-heading"><h2 id="${group}-heading"><span class="severity-dot ${group}"></span>${group} <span class="group-count">${items.length}</span></h2>${items.map(item => `<article class="finding ${group}"><h3>${escapeHtml(item.title)}</h3><p><strong>Why it matters.</strong> ${escapeHtml(item.why)}</p><p><strong>Fix.</strong> ${escapeHtml(item.fix)}</p><p class="source">Source: <a href="${escapeHtml(item.source)}" target="_blank" rel="noreferrer">official documentation</a></p></article>`).join('')}</section>`
    }).join('')
    copyButton.disabled = latestFindings.length === 0
  }

  function markdown() {
    return latestFindings.map(item => `### ${item.severity.toUpperCase()}: ${item.title}\n\nWhy it matters. ${item.why}\n\nFix. ${item.fix}\n\nSource. ${item.source}`).join('\n\n')
  }

  async function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value)
      return
    }
    const helper = document.createElement('textarea')
    helper.value = value
    helper.setAttribute('readonly', '')
    helper.style.position = 'fixed'
    helper.style.opacity = '0'
    document.body.appendChild(helper)
    helper.select()
    document.execCommand('copy')
    helper.remove()
  }

  analyzeButton.addEventListener('click', render)
  exampleButton.addEventListener('click', () => { input.value = example; render(); input.focus() })
  copyButton.addEventListener('click', async () => {
    await copyText(markdown())
    copyButton.textContent = 'Copied'
    setTimeout(() => { copyButton.textContent = 'Copy as Markdown' }, 1400)
  })
  render()
})()
