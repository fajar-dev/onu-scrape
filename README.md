# ONU Scrape

A simple automation tool to retrieve RX optical power (dBm) data from FTTX ONU devices with Prometheus metrics endpoint.

## 📋 Features

- Automatic optical power data scraping from ONU devices
- Retrieves RX power values in dBm
- Support for multiple devices
- Automated browser-based scraping using Playwright
- Configurable device credentials and endpoints
- **Prometheus-compatible metrics endpoint for monitoring**

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
```

## 📖 Usage

### Run the Application

```bash
# Start scraping
npm run start
```

### Expected Output

```
[2025-10-06 10:30:05] Processing 192.168.1.1
[2025-10-06 10:30:08] 192.168.1.1 -> -15.17 dBm
[2025-10-06 10:30:10] Processing 192.168.1.2
[2025-10-06 10:30:13] 192.168.1.2 -> -15.20 dBm
```

## 📊 Metrics Endpoint

The application exposes Prometheus-compatible metrics for monitoring optical power levels.

### Access Metrics

```
http://localhost:3000/cgs-onu/metrics
```

### Metrics Format

```
# HELP fttx_rx_power Received optical power (dBm)
# TYPE fttx_rx_power gauge
fttx_rx_power{cid="WMDNMAN202507226H", sid="63817"} -15.20
fttx_rx_power{cid="WMDNMAN202507227H", sid="63818"} -15.23
```

**Labels:**
- `cid`: Operator CID or device identifier
- `sid`: Service ID or port identifier

**Value:** RX optical power in dBm (lower/more negative values indicate weaker signal)

## 🔗 Integration with Monitoring

### Prometheus Configuration

Add this scrape config to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'fttx-onu'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/cgs-onu/metrics'
    scrape_interval: 30s
    scrape_timeout: 10s
```

### Grafana Dashboard

**Sample PromQL Queries:**

```promql
# Current RX power for all devices
fttx_rx_power

# Devices with weak signal (< -25 dBm)
fttx_rx_power < -25

# Average RX power by operator cid
avg(fttx_rx_power) by (cid)
```

**Alerting Rules:**

```yaml
groups:
  - name: fttx_alerts
    interval: 30s
    rules:
      - alert: WeakOpticalSignal
        expr: fttx_rx_power < -28
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Weak optical signal detected"
          description: "Device {{ $labels.cid }} has RX power of {{ $value }} dBm"
      
      - alert: CriticalOpticalSignal
        expr: fttx_rx_power < -30
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Critical optical signal detected"
          description: "Device {{ $labels.cid }} has critical RX power of {{ $value }} dBm"
```