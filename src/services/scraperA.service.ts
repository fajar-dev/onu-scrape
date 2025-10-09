import { type Browser, type Page } from 'playwright'
import { Cgs } from '../entities/cgs.entity'

const CREDENTIALS = { username: 'admin', password: 'admin' }

const SELECTORS = {
  usernameInput: 'input[type="text"]',
  passwordInput: 'input[type="password"]',
  submitButton: 'button.login-submit',
  rxValue: '.bottom-text p:nth-of-type(2) span:first-of-type',
}

const GLOBAL = {
  loginSuffix: '/index.html#/login',
  dashboardSuffix: '/index.html#/',
}

export class ScraperAService {
  private buildLoginUrl(ip: string): string {
    return `http://${ip}${GLOBAL.loginSuffix}`
  }

  private deriveDashboardUrl(ip: string): string {
    return `http://${ip}${GLOBAL.dashboardSuffix}`
  }

  private async login(page: Page, ip: string): Promise<boolean> {
    try {
      await page.goto(this.buildLoginUrl(ip), {
        waitUntil: 'domcontentloaded',
        timeout: 10_000,
      })

      if (!page.url().includes(GLOBAL.loginSuffix)) return false

      await page.waitForSelector(SELECTORS.usernameInput, { timeout: 5_000 })
      await page.waitForSelector(SELECTORS.passwordInput, { timeout: 5_000 })
      await page.waitForSelector(SELECTORS.submitButton, { timeout: 5_000 })

      await page.fill(SELECTORS.usernameInput, CREDENTIALS.username)
      await page.fill(SELECTORS.passwordInput, CREDENTIALS.password)
      await page.click(SELECTORS.submitButton)

      await page.waitForURL(
        url => url.href.startsWith(this.deriveDashboardUrl(ip)),
        { timeout: 10_000 }
      )

      return true
    } catch {
      return false
    }
  }

  private async scrapeData(page: Page): Promise<string | null> {
    try {
      await page.waitForSelector(SELECTORS.rxValue, { timeout: 10_000 })
      const text = await page.textContent(SELECTORS.rxValue)
      return text?.trim() ?? null
    } catch {
      return null
    }
  }

  async processDevice(browser: Browser, record: Cgs) {
    const context = await browser.newContext()
    const page = await context.newPage()
    const ip = record.onuIp

    if (!ip) return { id: record.id, ip: null, success: false, rx: null }

    try {
      const loggedIn = await this.login(page, ip)
      if (!loggedIn) return { id: record.id, ip, success: false, rx: null }

      const rxValue = await this.scrapeData(page)
      return { id: record.id, ip, success: !!rxValue, rx: rxValue ?? null }
    } catch {
      return { id: record.id, ip, success: false, rx: null }
    } finally {
      await page.close()
      await context.close()
    }
  }

  async delay(ms: number) {
    return new Promise(res => setTimeout(res, ms))
  }
}
