import { AppDataSource } from './config/data-source';
import { FttxScraper } from './core/fttx-scraper';

async function main() {
    await AppDataSource.initialize();

    const scraper = new FttxScraper();
    await scraper.start();
}

main().catch(() => process.exit(1));
