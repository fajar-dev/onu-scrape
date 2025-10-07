import { chromium } from 'playwright';
import { MetricsService } from '../services/metrics.service';
import { ScraperService } from '../services/scraper.service';

export class FttxScraper {
  private metricsService: MetricsService;
  private scraperService: ScraperService;

  constructor() {
    this.metricsService = new MetricsService();
    this.scraperService = new ScraperService();
  }

  /**
   * Run continuous scraping loop with minimal logs.
   * @returns {Promise<void>}
   */
  async start(): Promise<void> {
    console.log('🚀 FTTX Scraper started');

    while (true) {
      const devices = await this.scraperService.getDevicesFromDb();
      const browser = await chromium.launch({ headless: true });

      for (const device of devices) {
        const result = await this.scraperService.processDevice(browser, device);

        if (result.success && result.rx) {
          console.log(`✅ ${device.ip} → ${result.rx} dBm`);
          await this.metricsService.store(result.ip, parseFloat(result.rx));
        } else {
          console.log(`⚠️  ${device.ip} → failed`);
        }

        await this.scraperService.delay(500);
      }
      await browser.close();
      await this.scraperService.delay(10_000);
    }
  }
}
