import { chromium } from 'playwright'
import { AppDataSource } from './config/data-source'
import { loadDevices, processDevice, delay } from './service/scrape'
import { store } from './service/fttx'

export async function startFttxScraper() {
    await AppDataSource.initialize()
    while (true) {
        const devices = await loadDevices()
        const browser = await chromium.launch({ headless: true })
        const results: Array<{ ip: string; success: boolean; rx: string | null }> = []

        for (const device of devices) {
            console.log(`Processing ${device.ip}...`)
            const result = await processDevice(browser, device)
            console.log(`${device.ip} -> ${result.success ? '✅ OK' : '❌ FAIL'} ${result.rx ? `| RX: ${result.rx}` : ''}`)

            if (result.success && result.rx) {
                await store(result.ip, parseFloat(result.rx))
            }
            results.push(result)
            await delay(500)
        }
        await browser.close()
        await delay(10_000)
    }
}

startFttxScraper().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})
