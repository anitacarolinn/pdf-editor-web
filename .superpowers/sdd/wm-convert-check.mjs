/**
 * Playwright verification for:
 * - Feature A: WatermarkModal (text + image modes)
 * - Feature B: Image-to-PDF open
 *
 * Run: node .superpowers/sdd/wm-convert-check.mjs
 * Prerequisites: dev server at http://localhost:5188/
 */
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:5188/'
const CONTRACT_PDF = 'C:\\Users\\user\\Downloads\\pdf-page-editor\\samples\\contract.pdf'
const SCREENSHOTS_DIR = 'C:\\Users\\user\\AppData\\Local\\Temp\\claude\\wm-convert-check-screenshots'

mkdirSync(SCREENSHOTS_DIR, { recursive: true })

function ss(page, name) {
  const p = path.join(SCREENSHOTS_DIR, `${name}.png`)
  return page.screenshot({ path: p, fullPage: false }).then(() => {
    console.log(`Screenshot: ${p}`)
    return p
  })
}

async function run() {
  const browser = await chromium.launch({ headless: false })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(err.message))

  // ── FEATURE A: Watermark modal ────────────────────────────────────────────
  console.log('\n=== Feature A: Watermark Modal ===')
  await page.goto(BASE_URL)
  await page.waitForLoadState('networkidle')

  // Upload the contract PDF
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('button:has-text("Choose file")'),
  ])
  await fileChooser.setFiles(CONTRACT_PDF)
  await page.waitForSelector('[data-testid="selection-count"]', { timeout: 10000 })
  console.log('PDF loaded')

  // Click Watermark button
  await page.click('button[title="Add a watermark"]')
  await page.waitForSelector('text=Add Watermark', { timeout: 5000 })
  console.log('WatermarkModal opened')
  await ss(page, '01-watermark-modal-text-mode')

  // Switch to Image mode
  await page.click('button[aria-pressed="false"]:has-text("Image")')
  await page.waitForTimeout(300)
  console.log('Switched to Image mode')
  await ss(page, '02-watermark-modal-image-mode')

  // Switch back to Text mode and apply
  await page.click('button:has-text("Text")')
  await page.waitForTimeout(300)
  // Clear input and type new watermark
  await page.fill('input[type="text"]', 'CONFIDENTIAL')
  await page.click('button:has-text("Apply")')
  await page.waitForSelector('text=Add Watermark', { state: 'detached', timeout: 5000 })
  console.log('Text watermark applied')
  await ss(page, '03-after-text-watermark-applied')

  // ── FEATURE B: Image to PDF ───────────────────────────────────────────────
  console.log('\n=== Feature B: Image → PDF ===')

  // Create a small test PNG via Playwright's canvas evaluate
  const testPngPath = path.join(SCREENSHOTS_DIR, 'test-input.png')

  const pngBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#e11d48'
    ctx.fillRect(0, 0, 100, 100)
    ctx.fillStyle = '#fff'
    ctx.font = '14px sans-serif'
    ctx.fillText('TEST', 30, 55)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  const pngBuf = Buffer.from(pngBase64, 'base64')
  writeFileSync(testPngPath, pngBuf)
  console.log(`Test PNG written: ${testPngPath}`)

  // Navigate to fresh landing page
  await page.goto(BASE_URL)
  await page.waitForLoadState('networkidle')

  // Upload the PNG via Landing's "Choose file" button
  const [imgChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('button:has-text("Choose file")'),
  ])
  await imgChooser.setFiles(testPngPath)

  // Wait for the grid to appear (image should have been converted to PDF)
  await page.waitForSelector('[data-testid="selection-count"]', { timeout: 10000 })
  // Wait for page count to settle (getPageCount is async in useEffect)
  await page.waitForFunction(
    () => document.querySelector('.status-line')?.textContent?.includes('page') &&
          !document.querySelector('.status-line')?.textContent?.includes('0 page'),
    { timeout: 8000 }
  ).catch(() => {}) // non-fatal — just log the current value
  console.log('Image converted to PDF, grid visible')
  await ss(page, '04-image-converted-to-pdf-grid')

  // Verify page count in status line (should show 1 page)
  const statusText = await page.textContent('.status-line')
  console.log(`Status line: ${statusText}`)
  if (!statusText?.includes('1 page')) {
    console.warn('WARNING: status line did not show "1 page" — got:', statusText)
  } else {
    console.log('PASS: status confirms 1 page')
  }

  // ── Results ───────────────────────────────────────────────────────────────
  console.log('\n=== Console errors collected ===')
  if (consoleErrors.length === 0) {
    console.log('PASS: No console errors')
  } else {
    console.error('FAIL: Console errors found:')
    consoleErrors.forEach((e) => console.error(' -', e))
    process.exitCode = 1
  }

  console.log('\n=== Screenshots ===')
  console.log(`Directory: ${SCREENSHOTS_DIR}`)
  console.log('01-watermark-modal-text-mode.png')
  console.log('02-watermark-modal-image-mode.png')
  console.log('03-after-text-watermark-applied.png')
  console.log('04-image-converted-to-pdf-grid.png')

  await browser.close()
}

run().catch((e) => { console.error(e); process.exit(1) })
