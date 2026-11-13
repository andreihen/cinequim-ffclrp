import { expect, test, type Page } from '@playwright/test'

async function navigate(page: Page, name: string) {
  const menu = page.getByRole('button', { name: 'Abrir navegação' })
  if (await menu.isVisible()) await menu.click()
  await page.getByRole('navigation').getByRole('link', { name }).click()
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1)
}

test('calcula velocidade, inverte a lei e trata entradas inválidas', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Lei de velocidade' })).toBeVisible()
  await expect(page.locator('.hero-image')).toBeVisible()
  await expect.poll(() => page.locator('.hero-image').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Calcular', exact: true }).click()
  await expect(page.getByText('6,2500e-6', { exact: true })).toBeVisible()
  await expect(page.getByText('Passo a passo')).toBeVisible()
  await page.getByRole('button', { name: 'Determinar k' }).click()
  await page.getByRole('button', { name: 'Calcular', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Resultados' }).getByText('0,025', { exact: true })).toBeVisible()
  await page.getByRole('textbox', { name: 'Concentração do reagente 1' }).fill('0')
  await page.getByRole('button', { name: 'Calcular', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Dados insuficientes')
  await expectNoOverflow(page)
})

test('ajusta ensaios e simula um exemplo reversível com gráficos', async ({ page }) => {
  await page.goto('./')
  await navigate(page, 'Dados experimentais')
  await page.getByRole('button', { name: 'Ajustar lei de velocidade' }).click()
  await expect(page.getByText('Ordem em B', { exact: true })).toBeVisible()
  await expect(page.locator('.recharts-scatter-symbol')).toHaveCount(4)
  await navigate(page, 'Biblioteca de exemplos')
  await page.getByRole('article').filter({ hasText: 'Equilíbrio reversível' }).getByRole('button', { name: 'Carregar exemplo' }).click()
  await page.getByRole('button', { name: 'Simular mecanismo' }).click()
  await expect(page.getByText('[B] final', { exact: true })).toBeVisible()
  await expect(page.locator('.recharts-line-curve')).toHaveCount(2)
  const series = page.getByRole('button', { name: 'B', exact: true })
  await series.click()
  await expect(series).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.recharts-line-curve')).toHaveCount(1)
  await expectNoOverflow(page)
})

test('salva, restaura, importa e exporta um cálculo', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Ativar tema claro' }).click()
  await page.getByRole('button', { name: 'Salvar experimento' }).click()
  await expect(page.getByRole('status')).toContainText('Experimento salvo')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await navigate(page, 'Experimentos salvos')
  const jsonDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar JSON' }).click()
  const file = await jsonDownload
  expect(file.suggestedFilename()).toBe('cinelab-rate.json')
  await page.getByLabel('Arquivo de experimento').setInputFiles((await file.path())!)
  await expect(page.getByRole('status')).toContainText('Experimento importado')
  await page.getByRole('button', { name: 'Calcular', exact: true }).click()
  const csvDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar CSV' }).click()
  expect((await csvDownload).suggestedFilename()).toBe('cinelab-rate.csv')
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('heading', { name: 'Parâmetros e dados de entrada' })).toBeVisible()
  await page.emulateMedia({ media: 'screen' })
  await navigate(page, 'Histórico de cálculos')
  await expect(page.getByRole('article')).toHaveCount(1)
})

test('executa as leis integradas e o ajuste de Arrhenius', async ({ page }) => {
  await page.goto('./#integrated')
  await page.getByRole('button', { name: 'Calcular concentração' }).click()
  await expect(page.getByText('Meia-vida', { exact: true })).toBeVisible()
  await expect(page.locator('.recharts-line-curve')).toHaveCount(1)
  await navigate(page, 'Equação de Arrhenius')
  await page.getByRole('button', { name: 'Ajustar dados' }).click()
  await page.getByRole('button', { name: 'Calcular Arrhenius' }).click()
  await expect(page.getByText('Energia de ativação', { exact: true })).toBeVisible()
  await expect(page.locator('.recharts-scatter-symbol')).toHaveCount(4)
  await expectNoOverflow(page)
})
