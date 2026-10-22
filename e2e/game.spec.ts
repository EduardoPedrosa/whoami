import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function create(page: Page, name = 'Alice') {
  await page.goto('/')
  await page.getByLabel('Seu nome').fill(name)
  await expect(page.getByRole('button', { name: 'Criar sala' })).toBeEnabled()
  await page.getByRole('button', { name: 'Criar sala' }).click()
  await expect(page.getByRole('heading', { name: /Sala de espera/ })).toBeVisible()
  return (await page.locator('.room-topline .mono').textContent())!
}
async function join(page: Page, code: string, name = 'Bob') {
  await page.goto(`/?sala=${code}`)
  await page.getByLabel('Seu nome').fill(name)
  await page.getByRole('button', { name: /Escolher avatar/ }).tap()
  await page.getByRole('button', { name: 'Avatar Fantasma', exact: true }).tap()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Escolher avatar, atual: Fantasma', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar na sala', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Entrar na sala', exact: true }).tap()
  await expect(page.getByRole('heading', { name: /Sala de espera/ })).toBeVisible()
}
async function assertNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
}

async function assertLaptopLayouts(page: Page) {
  const original = page.viewportSize()!
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await assertNoOverflow(page)
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
      viewport.height + 1,
    )
    await expect(page.getByText('Áudio externo', { exact: true })).toHaveCount(0)
  }
  await page.setViewportSize(original)
}

async function assertDialogFits(page: Page) {
  const dialog = page.getByRole('dialog').or(page.getByRole('alertdialog'))
  await expect(dialog).toHaveCSS('opacity', '1')
  const box = (await dialog.boundingBox())!
  const viewport = page.viewportSize()!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
}

async function assertMobileLayouts(page: Page) {
  const original = page.viewportSize()!
  for (const viewport of [
    { width: 320, height: 700 },
    { width: 375, height: 812 },
    { width: 812, height: 375 },
  ]) {
    await page.setViewportSize(viewport)
    await assertNoOverflow(page)
    for (const button of await page.locator('.room-stage button:visible').all()) {
      const box = await button.boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
    }
  }
  await page.setViewportSize(original)
}

async function assertAccessible(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  if (await page.locator('.room-stage > div').count())
    await expect(page.locator('.room-stage > div')).toHaveCSS('opacity', '1')
  for (const card of await page.locator('.identity-card').all())
    await expect(card).toHaveCSS('opacity', '1')
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(
    result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.failureSummary) })),
  ).toEqual([])
}

test('full two-player round with refresh, offline recovery, secrets and author confirmations', async ({
  browser,
}) => {
  const host = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const guest = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  })
  const a = await host.newPage()
  const b = await guest.newPage()
  const errors: string[] = []
  a.on('pageerror', (error) => errors.push(error.message))
  b.on('pageerror', (error) => errors.push(error.message))
  try {
    const code = await create(a)
    await join(b, code)
    await expect(a.locator('.player-roster li')).toHaveCount(2)
    await assertLaptopLayouts(a)
    await assertMobileLayouts(b)
    await b.setViewportSize({ width: 812, height: 375 })
    await b.getByRole('button', { name: /Convidar amigos/ }).click()
    await assertDialogFits(b)
    await b.getByRole('button', { name: 'Fechar', exact: true }).click()
    await b.setViewportSize({ width: 390, height: 844 })
    await a.screenshot({ path: 'test-results/lobby-desktop.png', fullPage: true })
    await b.screenshot({ path: 'test-results/lobby-mobile.png', fullPage: true })
    await a.getByRole('button', { name: 'Estou pronto', exact: true }).click()
    await b.getByRole('button', { name: 'Estou pronto', exact: true }).click()
    await expect(a.getByRole('button', { name: 'Começar rodada' })).toBeEnabled()
    await a.getByRole('button', { name: 'Começar rodada' }).click()
    await expect(a.getByLabel('Quem essa pessoa vai ser?')).toBeVisible()
    await expect(b.getByLabel('Quem essa pessoa vai ser?')).toBeVisible()
    await assertLaptopLayouts(a)
    await assertMobileLayouts(b)
    await assertAccessible(a)
    const suggestions = new Set<string>()
    for (let i = 0; i < 10; i++) {
      await a.getByRole('button', { name: 'Sugerir uma identidade' }).click()
      suggestions.add(await a.getByLabel('Quem essa pessoa vai ser?').inputValue())
    }
    expect(suggestions.size).toBe(10)
    await a.screenshot({ path: 'test-results/assigning-desktop.png', fullPage: true })
    await b.screenshot({ path: 'test-results/assigning-mobile.png', fullPage: true })
    await a.getByLabel('Quem essa pessoa vai ser?').fill('Sherlock Holmes')
    await a.getByRole('button', { name: 'Enviar identidade' }).click()
    await expect(a.getByText('Identidade enviada.')).toBeVisible()
    await b.getByLabel('Quem essa pessoa vai ser?').fill('Uma capivara')
    await b.getByRole('button', { name: 'Enviar identidade' }).click()
    await expect(a.getByRole('heading', { name: 'Sua vez' })).toBeVisible()
    await assertLaptopLayouts(a)
    await expect(a.locator('.circle-own')).not.toContainText('Uma capivara')
    await expect(b.locator('.circle-own')).not.toContainText('Sherlock Holmes')
    await expect(a.locator('.circle-seat').filter({ hasText: 'Bob' })).toContainText(
      'Sherlock Holmes',
    )
    await expect(b.locator('.circle-seat').filter({ hasText: 'Alice' })).toContainText(
      'Uma capivara',
    )
    await assertNoOverflow(a)
    await assertNoOverflow(b)
    await assertMobileLayouts(b)
    await assertAccessible(a)
    await assertAccessible(b)
    await a.screenshot({ path: 'test-results/playing-desktop.png', fullPage: true })
    await b.screenshot({ path: 'test-results/playing-mobile.png', fullPage: true })
    await a.getByRole('button', { name: 'Passar a vez', exact: true }).click()
    await expect(a.getByRole('heading', { name: 'Vez de Bob', exact: true })).toBeVisible()
    await expect(b.getByRole('heading', { name: 'Sua vez', exact: true })).toBeVisible()
    await b.getByRole('button', { name: 'Passar a vez', exact: true }).click()
    await expect(a.getByRole('heading', { name: 'Sua vez', exact: true })).toBeVisible()
    await b.reload()
    await expect(b.getByRole('heading', { name: 'Vez de Alice' })).toBeVisible()
    await expect(b.locator('.circle-own')).not.toContainText('Sherlock Holmes')
    await guest.setOffline(true)
    await expect(b.getByText('Você está sem internet.')).toBeVisible()
    await guest.setOffline(false)
    await expect(b.getByText('Você está sem internet.')).toHaveCount(0)
    await expect(b.locator('.connection-status')).toContainText('Conectado')
    await b.setViewportSize({ width: 812, height: 375 })
    await b.getByRole('button', { name: 'Confirmar acerto de Alice', exact: true }).click()
    await assertDialogFits(b)
    await b.getByRole('button', { name: 'Ainda não', exact: true }).click()
    await expect(b.getByRole('alertdialog')).toHaveCount(0)
    await expect(a.locator('.circle-own')).not.toContainText('Uma capivara')
    await b.getByRole('button', { name: 'Confirmar acerto de Alice', exact: true }).click()
    await b.getByRole('button', { name: 'Confirmar acerto', exact: true }).click()
    await b.setViewportSize({ width: 390, height: 844 })
    await expect(b.getByRole('heading', { name: 'Sua vez' })).toBeVisible()
    await expect(b.getByRole('button', { name: 'Passar a vez', exact: true })).toHaveCount(0)
    await expect(b.locator('.next-turns')).toContainText(
      'Só uma pessoa ainda precisa descobrir a identidade.',
    )
    await expect(a.locator('.circle-own')).toContainText('Uma capivara')
    await a.getByRole('button', { name: 'Confirmar acerto de Bob', exact: true }).click()
    await a.getByRole('button', { name: 'Confirmar acerto', exact: true }).click()
    await expect(a.getByRole('heading', { name: 'Fim da rodada', exact: true })).toBeVisible()
    await expect(b.getByRole('heading', { name: 'Fim da rodada', exact: true })).toBeVisible()
    await assertLaptopLayouts(a)
    await assertMobileLayouts(b)
    await assertAccessible(a)
    await a.screenshot({ path: 'test-results/results-desktop.png', fullPage: true })
    await a.getByRole('button', { name: 'Nova rodada' }).click()
    await expect(a.getByRole('heading', { name: /Sala de espera/ })).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await host.close()
    await guest.close()
  }
})

test('home, validation, accessible help dialog and responsive layouts', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Como jogar' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Como jogar' })).toBeFocused()
  await expect(page.getByRole('button', { name: 'Criar sala' })).toBeEnabled()
  for (const size of [
    { width: 1440, height: 1000 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 375, height: 812 },
    { width: 320, height: 700 },
    { width: 320, height: 568 },
    { width: 812, height: 375 },
    { width: 667, height: 375 },
  ]) {
    await page.setViewportSize(size)
    await assertNoOverflow(page)
    await expect(page.locator('.site-header')).toHaveCSS('position', 'static')
    for (const mode of ['Entrar com código', 'Criar uma sala']) {
      await page.getByRole('button', { name: mode, exact: true }).click()
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
      ).toBe(true)
      for (const element of [
        page.locator('#home-title'),
        page.locator('.launcher-submit'),
        page.locator('.hero-art'),
      ]) {
        const box = (await element.boundingBox())!
        expect(box.y).toBeGreaterThanOrEqual(0)
        expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1)
      }
    }
    const header = page.locator('.site-header')
    expect(
      await header.evaluate((element) => parseFloat(getComputedStyle(element).paddingLeft)),
    ).toBeGreaterThan(0)
    const headerBox = (await header.boundingBox())!
    for (const content of [page.locator('.brand'), header.locator('nav')]) {
      const box = (await content.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(headerBox.x + 12)
      expect(box.x + box.width).toBeLessThanOrEqual(headerBox.x + headerBox.width - 12)
    }
    await expect(page.getByRole('button', { name: 'Criar sala' })).toBeVisible()
    await page.getByRole('button', { name: 'Como jogar' }).click()
    await assertDialogFits(page)
    await page.getByRole('button', { name: 'Entendi' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.screenshot({
      path: `test-results/home-${size.width}x${size.height}.png`,
      fullPage: true,
    })
  }
  await page.getByRole('button', { name: 'Criar sala' }).click()
  await expect(page.getByText('Use pelo menos 2 letras.')).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.getByRole('button', { name: 'Entrar com código' }).click()
  await page.getByLabel('Seu nome').fill('Carla')
  await page.getByLabel('Código da sala').fill('ABC234')
  await page.getByRole('button', { name: 'Entrar na sala', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Essa sala não existe')
})

test('no serious accessibility violations on home, help and lobby', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  await page.goto('/')
  await expect(page.locator('.connection-status')).toContainText('Conectado')
  const scan = async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.evaluate(() => document.fonts.ready)
    if (await page.locator('.launcher').count())
      await expect(page.locator('.launcher')).toHaveCSS('opacity', '1')
    if (await page.locator('.room-stage > div').count())
      await expect(page.locator('.room-stage > div')).toHaveCSS('opacity', '1')
    if (await page.getByRole('dialog').count())
      await expect(page.getByRole('dialog')).toHaveCSS('opacity', '1')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({ target: n.target, reason: n.failureSummary })),
      })),
    ).toEqual([])
  }
  await scan()
  await page.getByRole('button', { name: /Escolher avatar/ }).click()
  await scan()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: /Escolher avatar/ })).toBeFocused()
  await page.getByRole('button', { name: 'Como jogar' }).click()
  await scan()
  await page.keyboard.press('Escape')
  await create(page, 'Diana')
  await scan()
  await page.setViewportSize({ width: 375, height: 812 })
  await scan()
})

test('custom category select supports keyboard, touch and synchronized settings', async ({
  browser,
}) => {
  const host = await browser.newContext({ hasTouch: true })
  const guest = await browser.newContext()
  const a = await host.newPage()
  const b = await guest.newPage()
  try {
    const code = await create(a)
    await b.goto(`/?sala=${code}`)
    await b.getByLabel('Seu nome').fill('Beatriz')
    await b.getByRole('button', { name: 'Entrar na sala', exact: true }).click()
    const category = a.locator('#category')
    const guestCategory = b.getByRole('combobox', { name: 'Categoria' })
    await expect(guestCategory).toBeDisabled()
    await category.focus()
    await a.keyboard.press('Enter')
    await expect(a.getByRole('listbox')).toBeVisible()
    await expect(a.getByRole('option', { name: 'Tudo vale', exact: true })).toBeFocused()
    await a.keyboard.press('End')
    await expect(a.getByRole('option', { name: 'História e cultura', exact: true })).toBeFocused()
    await a.keyboard.press('Enter')
    await expect(category).toHaveText('História e cultura')
    await expect(guestCategory).toHaveText('História e cultura')
    await expect(category).toBeFocused()
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 375, height: 812 },
      { width: 320, height: 700 },
      { width: 812, height: 375 },
    ]) {
      await a.setViewportSize(viewport)
      await category.tap()
      const list = a.getByRole('listbox')
      await expect(list).toBeVisible()
      await assertNoOverflow(a)
      const box = (await list.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
      const trigger = (await category.boundingBox())!
      const icon = (await category.locator('svg').boundingBox())!
      expect(Math.abs(icon.y + icon.height / 2 - trigger.y - trigger.height / 2)).toBeLessThan(1)
      expect(icon.x + icon.width).toBeLessThanOrEqual(trigger.x + trigger.width - 11)
      if (viewport.width === 1440) {
        // Audit the popup separately: Radix hides and traps focus outside the open listbox.
        const result = await new AxeBuilder({ page: a })
          .include('[data-slot="select-content"]')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze()
        expect(result.violations).toEqual([])
      }
      await a.screenshot({ path: `test-results/category-${viewport.width}.png`, fullPage: false })
      await expect(list).toBeVisible()
      await a.keyboard.press('Escape')
      await expect(list).toHaveCount(0)
      await expect(category).toBeFocused()
    }
    await category.tap()
    await a.getByRole('option', { name: 'Animais e natureza', exact: true }).tap()
    await expect(guestCategory).toHaveText('Animais e natureza')
    await a.reload()
    await expect(category).toHaveText('Animais e natureza')
  } finally {
    await host.close()
    await guest.close()
  }
})

test('falls back to polling when WebSocket is blocked', async ({ page }) => {
  await page.routeWebSocket('**/socket.io/**', (socket) =>
    socket.close({ code: 1008, reason: 'WebSocket blocked in this test' }),
  )
  await create(page, 'Elisa')
  await expect(page.locator('.connection-status')).toContainText('Conectado')
  await page.getByRole('button', { name: 'Estou pronto', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Cancelar prontidão', exact: true })).toBeVisible()
})

test('supports session commands when randomUUID is unavailable on a local network', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(crypto, 'randomUUID', { value: undefined })
  })
  await create(page, 'Fernanda')
  await page.getByRole('button', { name: 'Estou pronto', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Cancelar prontidão', exact: true })).toBeVisible()
})
