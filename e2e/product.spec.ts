import { expect, test } from '@playwright/test'

test('shows live market data when reachable and a clear blocked state when it is not', async ({ page }) => {
  test.setTimeout(60_000)
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('/')

  await expect(page).toHaveTitle(/Order Steward/)
  await expect(page.getByRole('heading', { name: /Trade with follow-through/ })).toBeVisible()
  await expect(page.getByRole('banner').getByRole('button', { name: 'Connect wallet' })).toBeVisible()
  await expect(page.getByText('NON-CUSTODIAL ORDER MANAGEMENT')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Balances' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Your orders/ })).toBeVisible()

  const marketButton = page.locator('.market-select')
  await expect.poll(async () => marketButton.isEnabled() || (await marketButton.textContent())?.includes('Market feed unavailable'), { timeout: 30_000 }).toBe(true)
  if (await marketButton.isEnabled()) {
    await expect(marketButton).toContainText('MON / USDC')
    await expect(page.getByText(/Kuru book/).first()).toBeVisible({ timeout: 10_000 })
    await marketButton.click()
    const options = page.getByRole('option')
    await expect(options.first()).toBeVisible()
    expect(await options.count()).toBeGreaterThan(0)
    await options.last().click()
    await expect(page.locator('.market-select')).not.toContainText('Loading markets')
  } else {
    await expect(marketButton).toContainText('Market feed unavailable')
    await expect(page.getByRole('alert')).toContainText(/Kuru market directory/i)
    await expect(page.getByRole('button', { name: /Review buy order/ })).toBeDisabled()
  }

  await page.getByRole('banner').getByRole('button', { name: 'Connect wallet' }).click()
  await expect(page.locator('.toast[role="alert"]')).toContainText('No injected wallet found')
  await expect(page.getByRole('button', { name: /Review buy order/ })).toBeDisabled()
  expect(pageErrors).toEqual([])
})

test('navigation and layout remain usable on a phone-sized screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Trade with follow-through/ })).toBeVisible()

  const openMenu = page.getByRole('button', { name: 'Open menu' })
  await expect(openMenu).toBeVisible()
  await openMenu.click()
  const ledgerLink = page.getByRole('link', { name: 'Order ledger' })
  await expect(ledgerLink).toBeVisible()
  await ledgerLink.click()
  await expect(page).toHaveURL(/#orders$/)
  await expect(page.getByRole('heading', { name: /Your orders/ })).toBeInViewport()

  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  const width = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }))
  expect(width.body).toBeLessThanOrEqual(width.viewport)

  await page.setViewportSize({ width: 320, height: 740 })
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  const narrowWidth = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }))
  if (narrowWidth.body > narrowWidth.viewport) {
    const overflow = await page.locator('body').evaluate((body) => Array.from(body.querySelectorAll('*')).map((element) => { const rect = element.getBoundingClientRect(); const node = element as HTMLElement; return { tag: element.tagName, className: typeof node.className === 'string' ? node.className : '', left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), scrollWidth: node.scrollWidth, clientWidth: node.clientWidth } }).filter((item) => item.left < -1 || item.right > window.innerWidth + 1 || item.scrollWidth > item.clientWidth + 5).sort((a, b) => Math.max(b.right - window.innerWidth, b.scrollWidth - b.clientWidth) - Math.max(a.right - window.innerWidth, a.scrollWidth - a.clientWidth)).slice(0, 15))
    console.log('320px overflow diagnostics', overflow)
  }
  expect(narrowWidth.body).toBeLessThanOrEqual(narrowWidth.viewport)
})
