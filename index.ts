import { chromium, type Browser, type Page } from 'playwright'
import 'dotenv/config'
import ora from 'ora'

const CONFIG = {
  loginUrl: process.env.LOGIN_URL!,
  credentials: {
    username: process.env.USERNAME!,
    password: process.env.PASSWORD!
  },
  selectors: {
    usernameInput: 'input[type="text"]',
    passwordInput: 'input[type="password"]',
    submitButton: 'button.login-submit',
    rxValue: '.bottom-text p:nth-of-type(2) span:first-of-type'
  }
}

async function login(page: Page): Promise<boolean> {
  try {
    await page.goto(CONFIG.loginUrl)
    await page.fill(CONFIG.selectors.usernameInput, CONFIG.credentials.username)
    await page.fill(CONFIG.selectors.passwordInput, CONFIG.credentials.password)
    await page.click(CONFIG.selectors.submitButton)
    await page.waitForTimeout(1000)
    const stillOnLogin = await page.isVisible(CONFIG.selectors.submitButton)
    return !stillOnLogin 
  } catch {
    return false
  }
}


async function scrapeData(page: Page): Promise<string | null> {
  await page.waitForSelector(CONFIG.selectors.rxValue, { timeout: 10000 })
  return await page.textContent(CONFIG.selectors.rxValue)
}

async function main() {
  let browser: Browser | null = null
  const spinner = ora()

  try {
    spinner.start('Starting scraping process...')
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    spinner.text = 'Logging in...'
    const loginSuccess = await login(page)

    if (!loginSuccess) {
      spinner.fail('Login failed. Scraping aborted.')
      return
    }

    spinner.succeed('Login successful.')

    spinner.start('Fetching RX Value...')
    const rxValue = await scrapeData(page)
    spinner.succeed('RX Value fetched successfully.')

    console.log('\nRX Value:', rxValue ?? 'No data found')
  } catch (error) {
    spinner.fail('An error occurred during scraping.')
    console.error(error)
    process.exit(1)
  } finally {
    if (browser) await browser.close()
  }
}

main()
