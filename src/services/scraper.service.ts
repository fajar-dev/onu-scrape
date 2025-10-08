import { type Browser, type Page } from 'playwright'
import { AppDataSource } from '../config/data-source'
import { Cgs } from '../entities/cgs.entity'
import { IsNull, Not } from 'typeorm'

export type Device = {
  ip: string
  username: string
  password: string
}

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

export class ScraperService {
  constructor(
    private readonly cgsRepository = AppDataSource.getRepository(Cgs)
  ) {}

  /**
   * Get ONU IPs from database.
   * @returns {Promise<Device[]>} List of devices.
   */
  async getDevicesFromDb(): Promise<Device[]> {
    const records = await this.cgsRepository.find({
      select: ['onuIp'],
      where: { 
        onuIp: Not(IsNull()) 
      },
    });

    return records
      .map(r => r.onuIp?.toString())
      .filter(ip => ip && ip.trim() !== '')
      .map(ip => ({
        ip,
        username: CREDENTIALS.username,
        password: CREDENTIALS.password,
      }));
  }

  /**
   * Build login URL.
   * @param {string} ip - Device IP.
   * @returns {string} Login URL.
   */
  private buildLoginUrl(ip: string): string {
    return `http://${ip}${GLOBAL.loginSuffix}`
  }

  /**
   * Build dashboard URL.
   * @param {string} ip - Device IP.
   * @returns {string} Dashboard URL.
   */
  private deriveDashboardUrl(ip: string): string {
    return `http://${ip}${GLOBAL.dashboardSuffix}`
  }

  /**
   * Login to ONU web interface.
   * @param {Page} page - Playwright page.
   * @param {Device} device - Device credentials.
   * @returns {Promise<boolean>} True if login succeeds.
   */
  private async login(page: Page, device: Device): Promise<boolean> {
    const { ip, username, password } = device
    try {
      await page.goto(this.buildLoginUrl(ip), { waitUntil: 'domcontentloaded', timeout: 10_000 })
      await page.fill(SELECTORS.usernameInput, username)
      await page.fill(SELECTORS.passwordInput, password)
      await page.click(SELECTORS.submitButton)
      await page.waitForURL(url => url.href.startsWith(this.deriveDashboardUrl(ip)), { timeout: 10_000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Scrape RX Power value.
   * @param {Page} page - Dashboard page.
   * @returns {Promise<string|null>} RX value or null.
   */
  private async scrapeData(page: Page): Promise<string | null> {
    try {
      await page.waitForSelector(SELECTORS.rxValue, { timeout: 10_000 })
      const text = await page.textContent(SELECTORS.rxValue)
      return text?.trim() ?? null
    } catch {
      return null
    }
  }

  /**
   * Process one device (login + scrape).
   * @param {Browser} browser - Playwright browser.
   * @param {Device} device - Device info.
   * @returns {Promise<{ip:string success:boolean rx:string|null}>} Result data.
   */
  async processDevice(browser: Browser, device: Device) {
    const context = await browser.newContext()
    const page = await context.newPage()
    const ip = device.ip

    try {
      const ok = await this.login(page, device)
      if (!ok) return { ip, success: false, rx: null }

      const rxValue = await this.scrapeData(page)
      return { ip, success: !!rxValue, rx: rxValue ?? null }
    } catch {
      return { ip, success: false, rx: null }
    } finally {
      await page.close()
      await context.close()
    }
  }

  /**
   * Delay execution.
   * @param {number} ms - Milliseconds.
   * @returns {Promise<void>} After delay.
   */
  async delay(ms: number) {
    return new Promise(res => setTimeout(res, ms))
  }
}
