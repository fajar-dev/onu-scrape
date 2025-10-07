import * as express from 'express';
import { AppDataSource } from './config/data-source';
import { FttxScraper } from './core/fttx-scraper';
import { MetricsController } from './controllers/metrics.controller';

async function main() {
    // Initialize database
    await AppDataSource.initialize();

    // Start Express server
    const app = express();
    const port = process.env.PORT || 3000;
    const metricsController = new MetricsController();

    app.get('/cgs-onu/metrics', (req, res) =>
        metricsController.getMetrics(req, res)
    );

    app.listen(port, () => {
        console.log(`✅ Server running on port ${port}`);
    });

    // Start scraper loop (headless)
    const scraper = new FttxScraper();
    await scraper.start();
}

// Run main
main().catch(() => process.exit(1));
