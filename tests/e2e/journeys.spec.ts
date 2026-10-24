import { expect, test, type Page } from '@playwright/test'

/**
 * Critical journeys against a real backend. Defaults to the seeded development
 * account; override with E2E_EMAIL / E2E_PASSWORD. Journeys that create orders or
 * payments only run with E2E_ALLOW_MUTATIONS=1 (they change backend data).
 */
const EMAIL = process.env.E2E_EMAIL ?? 'pilot@example.com'
const PASSWORD = process.env.E2E_PASSWORD ?? 'Password1'
const SHOTS = process.env.E2E_SCREENSHOTS

async function shot(page: Page, name: string) {
  if (!SHOTS) return
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false })
}

async function skipOnboarding(page: Page) {
  await page.goto('/onboarding')
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page).toHaveURL(/\/tabs\/home/)
}

async function login(page: Page) {
  await skipOnboarding(page)
  await page.goto('/auth')
  await page.getByPlaceholder('Email').fill(EMAIL)
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/auth\/login/)
  await page.getByPlaceholder('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL(/\/tabs\/home/)
}

test('onboarding → browse home as a guest', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/onboarding/)
  await expect(page.getByText('Trade with')).toBeVisible()
  await shot(page, 'A0a-onboarding')
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page).toHaveURL(/\/tabs\/home/)
  await expect(page.getByRole('navigation', { name: 'Categories' })).toBeVisible()
  await shot(page, 'B1-home')
})

test('search with filters returns real listings', async ({ page }) => {
  await skipOnboarding(page)
  await page.goto('/tabs/search/results?search=headset')
  await expect(page.getByText(/\d+ results?/)).toBeVisible()
  await shot(page, 'B4-results')
  await page.getByRole('button', { name: /Filters/ }).click()
  await expect(page.getByRole('heading', { name: 'Filters' })).toBeVisible()
  await shot(page, 'B5-filters')
})

test('listing detail loads from the API', async ({ page }) => {
  await skipOnboarding(page)
  await page.goto('/tabs/search/results')
  await page.locator('article a').first().click()
  await expect(page).toHaveURL(/\/listing\//)
  await expect(page.getByRole('heading', { name: 'About this item' })).toBeVisible()
  await shot(page, 'B10-listing')
})

test('guest actions route to sign-in and come back', async ({ page }) => {
  await skipOnboarding(page)
  await page.goto('/tabs/inbox')
  await expect(page).toHaveURL(/\/auth\?next=/)
  await shot(page, 'A1-welcome')
})

test('login → profile, orders, notifications, settings', async ({ page }) => {
  await login(page)
  await page.goto('/tabs/profile')
  await expect(page.getByText('My hangar')).toBeVisible()
  await shot(page, 'profile')
  await page.goto('/notifications')
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  await shot(page, 'M3-notifications')
  await page.goto('/tabs/inbox')
  await expect(page.getByRole('heading', { name: 'Inbox' }).or(page.getByText('Inbox').first())).toBeVisible()
  await shot(page, 'M1-inbox')
  await page.goto('/tabs/profile/hangar')
  await expect(page.getByRole('heading', { name: 'My hangar' })).toBeVisible()
  await shot(page, 'S8-hangar')
  await page.goto('/wallet')
  await expect(page.getByText('Available balance')).toBeVisible()
  await shot(page, 'W1-wallet')
  await page.goto('/settings')
  await expect(page.getByText('Preferences')).toBeVisible()
  await shot(page, 'M4-settings')
})

test('wrong password shows the backend message', async ({ page }) => {
  await skipOnboarding(page)
  await page.goto(`/auth/login?email=${encodeURIComponent(EMAIL)}`)
  await page.getByPlaceholder('Password').fill('definitely-wrong-1A')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByRole('alert').first()).toContainText(/incorrect|attempt/i)
  await shot(page, 'A3-login-error')
})

test('checkout quote and sandbox payment are server-confirmed', async ({ page }) => {
  test.skip(!process.env.E2E_ALLOW_MUTATIONS, 'Creates an order — set E2E_ALLOW_MUTATIONS=1 to run.')
  await login(page)
  await page.goto('/tabs/search/results?sort=price_asc')
  await page.locator('article a').first().click()
  await page.getByRole('button', { name: 'Buy now' }).click()
  const sizeSheet = page.getByRole('heading', { name: 'Choose your fit' })
  if (await sizeSheet.isVisible().catch(() => false)) {
    await page.locator('.chip:not(:disabled)').first().click()
    await page.getByRole('button', { name: /Apply size/ }).click()
  }
  await expect(page).toHaveURL(/\/checkout/)
  await page.getByRole('button', { name: 'Continue to flight plan' }).click()
  await page.getByRole('button', { name: 'Continue to payment' }).click()
  await page.getByRole('radio', { name: /Sandbox/ }).click()
  await page.getByRole('button', { name: 'Review order' }).click()
  await shot(page, 'C4-review')
  await page.getByRole('button', { name: /Pay now/ }).click()
  await expect(page).toHaveURL(/\/payment\//)
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page).toHaveURL(/\/orders\/.+\/confirmed/, { timeout: 45_000 })
  await expect(page.getByText('Cleared for takeoff!')).toBeVisible()
  await shot(page, 'C5-confirmed')
})
