import * as express from 'express'
import * as cron from 'node-cron'
import { AppDataSource } from './config/data-source'
import { FttxScraper } from './core/fttx-scraper'
import { MetricsController } from './controllers/metrics.controller'

async function main() {
    await AppDataSource.initialize()

    const app = express()
    const port = process.env.PORT || 3000
    const metricsController = new MetricsController()

    app.get('/cgs-onu/metrics', (req, res) =>
        metricsController.getMetrics(req, res)
    )

    app.listen(port, () => console.log(`Server running on port ${port}`))

    const scraper = new FttxScraper()
    let isScraping = false

    const runScraper = async () => {
        if (isScraping) return
        isScraping = true

        await scraper.start()
        isScraping = false
        console.log(" Scrape end ")
    }

  cron.schedule('*/30 * * * *', runScraper)
}

main()
