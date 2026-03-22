import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, Then } = createBdd()

Given('I am on the public homepage', async ({ page }) => {
  await page.goto('/')
})

Then('I should see the hero title {string}', async ({ page }, title: string) => {
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
})

Then('I should see a call to action labeled {string}', async ({ page }, label: string) => {
  await expect(page.getByRole('link', { name: label })).toBeVisible()
})

Then('I should see a dashboard navigation link', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible()
})
