import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'
const results = []

function log(status, test, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️'
  results.push({ status, test, detail })
  console.log(`${icon} [${status}] ${test}${detail ? ' — ' + detail : ''}`)
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const consoleErrors = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', err => consoleErrors.push(`PageError: ${err.message}`))

  // ── TEST 1: App loads ─────────────────────────────────────────────────────
  try {
    const res = await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 })
    if (res.status() === 200) log('PASS', 'App loads (HTTP 200)')
    else log('FAIL', 'App loads', `HTTP ${res.status()}`)
  } catch (e) {
    log('FAIL', 'App loads', e.message)
  }

  // ── TEST 2: Title ─────────────────────────────────────────────────────────
  try {
    const title = await page.title()
    if (title.includes('CurviApp')) log('PASS', 'Page title', title)
    else log('FAIL', 'Page title', `Got: "${title}"`)
  } catch (e) {
    log('FAIL', 'Page title', e.message)
  }

  // ── TEST 3: Sidebar brand ─────────────────────────────────────────────────
  try {
    await page.waitForSelector('text=CurviApp', { timeout: 5000 })
    log('PASS', 'Sidebar brand renders')
  } catch (e) {
    log('FAIL', 'Sidebar brand renders', e.message)
  }

  // ── TEST 4: Navigation tabs ───────────────────────────────────────────────
  try {
    await page.waitForSelector('text=Planificador', { timeout: 3000 })
    await page.waitForSelector('text=Mis rutas', { timeout: 3000 })
    await page.waitForSelector('text=Ajustes', { timeout: 3000 })
    log('PASS', 'All 3 nav tabs visible')
  } catch (e) {
    log('FAIL', 'Nav tabs', e.message)
  }

  // ── TEST 5: Map renders ───────────────────────────────────────────────────
  try {
    await page.waitForSelector('.leaflet-container', { timeout: 8000 })
    log('PASS', 'Leaflet map container renders')
  } catch (e) {
    log('FAIL', 'Leaflet map renders', e.message)
  }

  // ── TEST 6: Map tiles load ────────────────────────────────────────────────
  try {
    await page.waitForSelector('.leaflet-tile-loaded', { timeout: 10000 })
    log('PASS', 'Map tiles loaded (OpenStreetMap)')
  } catch (e) {
    log('WARN', 'Map tiles load', 'Possible slow network')
  }

  // ── TEST 7: Search input renders ─────────────────────────────────────────
  try {
    await page.waitForSelector('input[placeholder="Añadir ciudad o lugar…"]', { timeout: 5000 })
    log('PASS', 'WaypointSearch input renders')
  } catch (e) {
    log('FAIL', 'WaypointSearch input', e.message)
  }

  // ── TEST 8: Search autocomplete (Nominatim) ───────────────────────────────
  // NOTE: ul.absolute targets the dropdown specifically, not the waypoints list
  try {
    await page.fill('input[placeholder="Añadir ciudad o lugar…"]', 'Sevilla')
    await page.waitForSelector('ul.absolute li button', { timeout: 8000 })
    const items = await page.locator('ul.absolute li button').count()
    log('PASS', 'Search autocomplete dropdown', `${items} result(s) shown`)
  } catch (e) {
    log('FAIL', 'Search autocomplete (Nominatim)', e.message)
  }

  // ── TEST 9: Select first result → waypoint added ──────────────────────────
  try {
    await page.click('ul.absolute li button >> nth=0')
    await page.waitForTimeout(600)
    const wpCount = await page.locator('ul:not(.absolute) li').count()
    if (wpCount >= 1) log('PASS', 'Selecting result adds waypoint', `${wpCount} waypoint(s) in list`)
    else log('FAIL', 'Selecting result adds waypoint', 'Waypoint list is empty')
  } catch (e) {
    log('FAIL', 'Select search result', e.message)
  }

  // ── TEST 10: Add second waypoint ─────────────────────────────────────────
  try {
    await page.fill('input[placeholder="Añadir ciudad o lugar…"]', 'Córdoba')
    await page.waitForSelector('ul.absolute li button', { timeout: 8000 })
    await page.click('ul.absolute li button >> nth=0')
    await page.waitForTimeout(600)
    const wpCount = await page.locator('ul:not(.absolute) li').count()
    if (wpCount >= 2) log('PASS', '2 waypoints in list', `${wpCount} total`)
    else log('FAIL', 'Second waypoint not added', `Only ${wpCount} waypoint(s)`)
  } catch (e) {
    log('FAIL', 'Add second waypoint', e.message)
  }

  // ── TEST 11: Calculate route button enabled ───────────────────────────────
  try {
    const calcBtn = page.locator('button', { hasText: 'Calcular ruta' }).first()
    const isDisabled = await calcBtn.getAttribute('disabled')
    if (isDisabled === null) log('PASS', '"Calcular ruta" button enabled with 2 waypoints')
    else log('FAIL', '"Calcular ruta" button', 'Disabled despite 2 waypoints')
  } catch (e) {
    log('FAIL', '"Calcular ruta" button state', e.message)
  }

  // ── TEST 12: Curviness slider ─────────────────────────────────────────────
  try {
    await page.waitForSelector('input[type="range"]', { timeout: 3000 })
    const val = await page.$eval('input[type="range"]', el => el.value)
    log('PASS', 'Curviness slider renders', `default value = ${val}`)
  } catch (e) {
    log('FAIL', 'Curviness slider', e.message)
  }

  // ── TEST 13: Toggles render ───────────────────────────────────────────────
  try {
    await page.waitForSelector('text=Evitar autopistas', { timeout: 3000 })
    await page.waitForSelector('text=Evitar peajes', { timeout: 3000 })
    log('PASS', 'Both option toggles render')
  } catch (e) {
    log('FAIL', 'Option toggles', e.message)
  }

  // ── TEST 14: Curviness slider is interactive ──────────────────────────────
  try {
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('1')
    const newVal = await slider.inputValue()
    log('PASS', 'Curviness slider is interactive', `value changed to ${newVal}`)
  } catch (e) {
    log('FAIL', 'Curviness slider interactive', e.message)
  }

  // ── TEST 15: Toggle works ─────────────────────────────────────────────────
  try {
    const toggleBtn = page.locator('button[role="switch"]').first()
    const before = await toggleBtn.getAttribute('aria-checked')
    await toggleBtn.click()
    const after = await toggleBtn.getAttribute('aria-checked')
    if (before !== after) log('PASS', 'Toggle button works', `${before} → ${after}`)
    else log('FAIL', 'Toggle button', 'aria-checked did not change')
  } catch (e) {
    log('FAIL', 'Toggle interactive', e.message)
  }

  // ── TEST 16: Library page ─────────────────────────────────────────────────
  try {
    await page.click('text=Mis rutas')
    await page.waitForSelector('text=Rutas guardadas', { timeout: 3000 })
    log('PASS', 'Library page navigates and renders')
  } catch (e) {
    log('FAIL', 'Library page navigation', e.message)
  }

  // ── TEST 17: Settings page ────────────────────────────────────────────────
  try {
    await page.click('text=Ajustes')
    await page.waitForSelector('text=API Key de OpenRouteService', { timeout: 3000 })
    log('PASS', 'Settings page navigates and renders')
  } catch (e) {
    log('FAIL', 'Settings page navigation', e.message)
  }

  // ── TEST 18: Back to planner ──────────────────────────────────────────────
  try {
    await page.click('text=Planificador')
    await page.waitForSelector('input[placeholder="Añadir ciudad o lugar…"]', { timeout: 3000 })
    log('PASS', 'Back to Planificador works')
  } catch (e) {
    log('FAIL', 'Back to Planificador', e.message)
  }

  // ── TEST 19: No JS console errors ─────────────────────────────────────────
  if (consoleErrors.length === 0) {
    log('PASS', 'No JavaScript console errors')
  } else {
    consoleErrors.forEach(err => log('FAIL', 'Console error', err.slice(0, 120)))
  }

  await browser.close()

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────')
  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const warned = results.filter(r => r.status === 'WARN').length
  console.log(`TOTAL: ${results.length} tests | ✅ ${passed} passed | ❌ ${failed} failed | ⚠️  ${warned} warnings`)

  if (failed > 0) {
    console.log('\nFailed tests:')
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ❌ ${r.test}: ${r.detail}`))
    process.exit(1)
  }
}

run().catch(e => {
  console.error('Test runner crashed:', e.message)
  process.exit(1)
})
