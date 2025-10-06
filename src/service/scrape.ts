import { readFile } from 'fs/promises'
import * as path from 'path'

export type Device = {
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

export function buildLoginUrl(ip: string): string {
  return `http://${ip}${GLOBAL.loginSuffix}`
}

export function deriveDashboardUrlFromLogin(loginUrl: string): string {
  return loginUrl.replace(/#\/?login\/?$/, '#/')
}

export async function delay(ms: number) {
  return new Promise(res => setTimeout(res, ms))
}

export async function loadDevices(file = 'devices.json'): Promise<Device[]> {
  const raw = await readFile(path.resolve(process.cwd(), file), 'utf-8')
  return JSON.parse(raw) as Device[]
}

export async function login(page, device: Device): Promise<boolean> {
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

export async function scrapeData(page): Promise<string | null> {
  try {
    await page.waitForSelector(SELECTORS.rxValue, { timeout: 10_000 })
    const text = await page.textContent(SELECTORS.rxValue)
    return text?.trim() ?? null
  } catch {
    return null
  }
}

export async function processDevice(browser, device: Device) {
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
