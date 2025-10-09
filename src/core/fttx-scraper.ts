import { chromium } from 'playwright'
import pLimit from 'p-limit'
import { MetricsService } from '../services/metrics.service'
import { ScraperAService } from '../services/scraperA.service'
import { ScraperBService } from '../services/scraperB.service'
import { ScraperCService } from '../services/scraperC.service'

export class FttxScraper {
  private metricsService: MetricsService
  private scraperA: ScraperAService
  private scraperB: ScraperBService
  private scraperC: ScraperCService

  constructor() {
    this.metricsService = new MetricsService()
    this.scraperA = new ScraperAService()
    this.scraperB = new ScraperBService()
    this.scraperC = new ScraperCService()
  }

  async start(): Promise<void> {
    console.log('🚀 FTTX Scraper started')

    while (true) {
      try {
        const devices = await this.metricsService.getDevicesFromDb()
        const validDevices = devices.filter(d => d.onuIp && d.onuIp !== '')
        console.log(`📡 ${validDevices.length} devices with valid IPs`)

        const browser = await chromium.launch({ headless: true })
        const limit = pLimit(10)

        await Promise.all(
          validDevices.map(device =>
            limit(async () => {
              let result = await this.scraperA.processDevice(browser, device)

              if (!result.success) {
                result = await this.scraperB.processDevice(browser, device)
              }

              if (!result.success) {
                result = await this.scraperC.processDevice(browser, device)
              }

              if (result.success && result.rx) {
                await this.metricsService.store(result.ip, parseFloat(result.rx))
                console.log(`✅ ${result.ip} → ${result.rx} dBm`)
              } else {
                console.log(`⚠️ ${result.ip} → failed`)
              }

              await this.scraperA.delay(500)
            })
          )
        )

        await browser.close()
        await this.scraperA.delay(10_000)
      } catch {
        await this.scraperA.delay(30_000)
      }
    }
  }
}
