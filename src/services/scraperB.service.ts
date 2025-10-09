import { type Browser, type Page } from 'playwright'
import { Cgs } from '../entities/cgs.entity'

const SELECTORS = {
  rxPower: '#id_vl_rxPower',
}

const GLOBAL = {
  eponSuffix: '/adm/pon_status.asp',
}

export class ScraperBService {
  private buildStatusUrl(ip: string): string {
    return `http://${ip}${GLOBAL.eponSuffix}`
  }

  private async scrapeRxPower(page: Page): Promise<string | null> {
    try {
      await page.waitForSelector(SELECTORS.rxPower, { timeout: 10_000 })
      const text = await page.textContent(SELECTORS.rxPower)
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
      const targetUrl = this.buildStatusUrl(ip)
      const response = await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 10_000,
      })

      if (!response || response.status() !== 200) {
        return { id: record.id, ip, success: false, rx: null }
      }

      if (!page.url().includes('/adm/pon_status.asp')) {
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
