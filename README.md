# ONU Scrape

A simple automation tool to retrieve RX optical power (dBm) data from FTTX ONU devices.

## 📋 Features

- Automatic optical power data scraping from ONU devices
- Retrieves RX power values in dBm
- Support for multiple devices
- Automated browser-based scraping using Playwright
- Configurable device credentials and endpoints

## 🚀 Installation

### Prerequisites
- Node.js (v22 or higher)
- npm or yarn
- TypeScript

### Steps

```bash
# Clone repository
git clone https://github.com/fajar-dev/onu-scrape.git
cd onu-scrape

# Install dependencies
npm install

# Install browser for Playwright
npx playwright install chromium

# Setup environment variables
cp .env.example .env
```

## ⚙️ Configuration

### 1. Environment Variables

Rename `.env.example` to `.env` and configure your settings:

```env
# === Ddatabase ===
DB_HOST=localhost
DB_PORT=3306
DB_USER=user
DB_PASSWORD=password
DB_DATABASE=database

# === logger ===
LOG_DIR=./logs
```

### 2. Device Configuration

Edit the `device.json` file to add your ONU devices:

```json
{
  "devices": [
    {
      "ip": "192.168.1.1",
      "username": "admin",
      "password": "admin123",
    },
    {
      "ip": "192.168.1.2",
      "username": "admin",
      "password": "admin123",
    }
  ]
}
```

## 📖 Usage

### Run the Application

```bash
# Start scraping
npm start
```

### Expected Output

```
[2025-10-06 10:30:00] Starting ONU scrape...
[2025-10-06 10:30:05] Device: ONU Device 1 (192.168.1.1)
[2025-10-06 10:30:08] RX Power: -18.5 dBm
[2025-10-06 10:30:10] Device: ONU Device 2 (192.168.1.2)
[2025-10-06 10:30:13] RX Power: -20.1 dBm
[2025-10-06 10:30:15] Scraping completed!
```

## 🛠️ Troubleshooting

### Common Issues

**Problem: Browser not found**
```bash
# Solution: Reinstall Playwright browsers
npx playwright install chromium
```

**Problem: Connection timeout**
- Check if ONU device IP is accessible
- Verify network connectivity

**Problem: Login failed**
- Verify username and password in `device.json`
- Check if device web interface is accessible

## 📁 Project Structure

```
onu-scrape/
├── node_modules/      # Dependencies
├── src/
│   ├── config/        # Configuration folder
│   ├── entity/        # Entity/Model definitions
│   ├── service/       # Service layer
│   └── index.ts       # Application entry point
├── devices.json       # Device configuration
├── .env.example       # Environment variables template
```