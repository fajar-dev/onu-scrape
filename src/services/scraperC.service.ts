import { type Browser, type Page } from 'playwright'
import { Cgs } from '../entities/cgs.entity'
import logger from '../config/logger'

const CREDENTIALS = { username: 'admin', password: 'super&123' }

const SELECTORS = {
  usernameInput: '#username',
  passwordInput: '#psd',
  loginButton: 'input[type="button"][value="Login"]',
}

const GLOBAL = {
  loginSuffix: '/admin/login.asp',
  dashboardSuffix: '/',
  eponSuffix: '/status_epon.asp',
  formLoginPath: '/boaform/admin/formLogin',
}

export class ScraperCService {
  private buildLoginUrl(ip: string): string {
    return `http://${ip}${GLOBAL.loginSuffix}`
  }

  private buildEponUrl(ip: string): string {
    return `http://${ip}${GLOBAL.eponSuffix}`
  }

  private async login(page: Page, ip: string): Promise<boolean> {
    try {
      await page.goto(this.buildLoginUrl(ip), {
        waitUntil: 'domcontentloaded',
        timeout: 15_000,
      })

      // Jika sudah di dashboard
      if (page.url().endsWith(GLOBAL.dashboardSuffix)) {
        return true
      }

      const html = await page.content()
      if (html.includes('you have logined')) {
        return true
      }

      // Pastikan di halaman login
      if (!page.url().includes(GLOBAL.loginSuffix)) return false

      await page.waitForSelector(SELECTORS.usernameInput, { timeout: 5_000 })
      await page.waitForSelector(SELECTORS.passwordInput, { timeout: 5_000 })
      await page.waitForSelector(SELECTORS.loginButton, { timeout: 5_000 })

      await page.fill(SELECTORS.usernameInput, CREDENTIALS.username)
      await page.fill(SELECTORS.passwordInput, CREDENTIALS.password)

      await Promise.allSettled([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10_000 }),
        page.click(SELECTORS.loginButton),
      ])

      const newUrl = page.url()
      const newHtml = await page.content()

      if (newUrl.includes(GLOBAL.formLoginPath)) {
        if (
          newHtml.includes('ERROR:bad password!') ||
          newHtml.includes('ERROR:invalid username!')
        ) {
          logger.error(`⚠️ ${ip} → Auth Failed`)
          console.log(`❌ [${ip}] Auth failed`)
          return false
        }

        if (newHtml.includes('you have logined')) {
          const okButton = await page.$('input[type="button"][name="OK"]')
          if (okButton) {
            await Promise.allSettled([
              page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10_000 }),
              okButton.click(),
            ])
          }
          return true
        }
      }

      if (newUrl.endsWith(GLOBAL.dashboardSuffix)) {
        return true
      }

      return false
    } catch {
      return false
    }
  }

  private async scrapeRxPower(page: Page): Promise<string | null> {
    try {
      const rows = await page.$$('table.flat tr')
      for (const row of rows) {
        const label = (await row.textContent())?.trim()
        if (label?.includes('Receiving Optical Power')) {
          const tds = await row.$$('td')
          if (tds.length >= 2) {
            const valueText = await tds[1].textContent()
            return valueText?.replace(/dBm/i, '').trim() ?? null
          }
        }
      }
      return null
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
      if (!loggedIn) {
        return { id: record.id, ip, success: false, rx: null }
      }

      const eponUrl = this.buildEponUrl(ip)
      const response = await page.goto(eponUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 10_000,
      })

      if (!response || response.status() !== 200) {
        return { id: record.id, ip, success: false, rx: null }
      }

      const rxValue = await this.scrapeRxPower(page)
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
