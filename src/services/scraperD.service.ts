import { type Browser, type Page } from 'playwright'
import { Cgs } from '../entities/cgs.entity'
import logger from '../config/logger'

const CREDENTIALS = { username: 'admin', password: 'super&123' }

const GLOBAL = {
  loginSuffix: '/admin/login.asp',
  formLoginPath: '/boaform/admin/formLogin',
  eponSuffix: '/status_pon.asp',
}

export class ScraperDService {
  private buildLoginUrl(ip: string): string {
    return `http://${ip}${GLOBAL.loginSuffix}`
  }

  private buildEponUrl(ip: string): string {
    return `http://${ip}${GLOBAL.eponSuffix}`
  }

  private async login(page: Page, ip: string): Promise<boolean> {
    try {
      const loginUrl = this.buildLoginUrl(ip)
      await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })

      // Jika sudah di dashboard (tanpa form login)
      if (!(await page.$('form[name="cmlogin"]'))) {
        const html = await page.content()
        if (html.includes('PON Status') || html.includes('Logout')) return true
        return false
      }

      // Isi form login
      await page.fill('input[name="username"]', CREDENTIALS.username)
      await page.fill('input[name="password"]', CREDENTIALS.password)

      const loginButton = await page.$('input[name="save"]')
      if (!loginButton) return false

      // Klik login dan tunggu redirect
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
        loginButton.click(),
      ])

      await page.waitForTimeout(2000)

      const html = await page.content()
      const url = page.url()

      // ✅ Deteksi login sukses
      if (html.includes('PON Status') || url.includes('status_pon.asp') || html.includes('Logout')) {
        return true
      }

      if (url.includes(GLOBAL.formLoginPath)) {
        if (
          html.includes('ERROR:bad password!') ||
          html.includes('ERROR:invalid username!')
        ) {
          logger.error(`⚠️ ${ip} → Auth Failed`)
          console.log(`❌ [${ip}] Auth failed`)
          return false
        }

        const okButton = await page.$('input[type="button"][name="OK"]')
        if (okButton) {
          await Promise.allSettled([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }),
            okButton.click(),
          ])
          return true
        }
      }

      return false
    } catch {
      return false
    }
  }

  private async scrapeRxPower(page: Page): Promise<string | null> {
    try {
      const rows = await page.$$('#configtbl tr')
      for (const row of rows) {
        const th = await row.$('th')
        if (!th) continue
        const text = (await th.textContent())?.trim().toLowerCase() ?? ''
        if (text.includes('rx power')) {
          const td = await row.$('td')
          const val = (await td?.textContent())?.trim() ?? ''
          return val.replace(/dBm/i, '').trim()
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
        timeout: 15000,
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
