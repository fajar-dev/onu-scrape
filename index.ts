import { chromium, type Browser, type Page } from 'playwright'
import ora from 'ora'
import { readFile } from 'fs/promises'
import path from 'path'

type Device = {
  ip: string
  username?: string
  password?: string
}

const SELECTORS = {
  usernameInput: 'input[type="text"]',
  passwordInput: 'input[type="password"]',
  submitButton: 'button.login-submit',
  rxValue: '.bottom-text p:nth-of-type(2) span:first-of-type'
}

const GLOBAL = {
  loginSuffix: '/index.html#/login',
  dashboardSuffix: '/index.html#/'
}

function buildLoginUrl(ip: string): string {
  return `http://${ip}${GLOBAL.loginSuffix}`
}

function deriveDashboardUrlFromLogin(loginUrl: string): string {
  return loginUrl.replace(/#\/?login\/?$/, '#/')
}

async function loadDevices(file = 'devices.json'): Promise<Device[]> {
  const raw = await readFile(path.resolve(process.cwd(), file), 'utf-8')
  return JSON.parse(raw) as Device[]
}

async function login(page: Page, device: Device): Promise<boolean> {
  const { ip, username, password } = device
  if (!username || !password) return false

  const loginUrl = buildLoginUrl(ip)
  const dashboardUrl = deriveDashboardUrlFromLogin(loginUrl)

  try {
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 10_000 })
    await page.fill(SELECTORS.usernameInput, username)
    await page.fill(SELECTORS.passwordInput, password)
    await page.click(SELECTORS.submitButton)
    await page.waitForURL(url => url.href.startsWith(dashboardUrl), { timeout: 10_000 })
    return true
  } catch {
    return false
  }
}

async function scrapeData(page: Page): Promise<string | null> {
  try {
    await page.waitForSelector(SELECTORS.rxValue, { timeout: 10_000 })
    const text = await page.textContent(SELECTORS.rxValue)
    return text?.trim() ?? null
  } catch {
    return null
  }
}

async function processDevice(browser: Browser, device: Device) {
  const context = await browser.newContext()
  const page = await context.newPage()
  const ip = device.ip

  try {
    const ok = await login(page, device)
    if (!ok) return { ip, success: false, rx: null }

    const rxValue = await scrapeData(page)
    return { ip, success: !!rxValue, rx: rxValue ?? null }
  } catch {
    return { ip, success: false, rx: null }
  } finally {
    await page.close()
    await context.close()
  }
}

async function delay(ms: number) {
  return new Promise(res => setTimeout(res, ms))
}

async function main() {
  const spinner = ora('Loading devices...').start()
  try {
    const devices = await loadDevices()
    spinner.succeed(`Loaded ${devices.length} devices`)

    const browser = await chromium.launch({ headless: true })
    const results: Array<{ ip: string; success: boolean; rx: string | null }> = []

    for (const device of devices) {
      spinner.start(`Processing ${device.ip}`)
      const result = await processDevice(browser, device)
      spinner.succeed(`${device.ip} → ${result.success ? 'OK' : 'FAIL'}${result.rx ? ` | RX: ${result.rx}` : ''}`)
      results.push(result)
      await delay(500) // jeda singkat antar device
    }

    await browser.close()

    console.log('\nSummary:')
    for (const r of results) {
      console.log(`${r.ip} -> ${r.success ? '✅' : '❌'} ${r.rx ?? '-'}`)
    }
  } catch (err) {
    spinner.fail('Fatal error')
    console.error((err as Error).message)
  } finally {
    spinner.stop()
  }
}

main()
