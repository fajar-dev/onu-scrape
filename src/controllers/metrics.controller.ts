import { Request, Response } from 'express';
import { MetricsService } from '../services/metrics.service';

export class MetricsController {
  private metricsService = new MetricsService();

  /**
   * GET /cgs-onu/metrics
   * Format Prometheus from raw service data.
   */
async getMetrics(req: Request, res: Response): Promise<void> {
  try {
    const rawData = await this.metricsService.getRecentMetricsRaw();

    const latestPerOnu = Object.values(
      rawData.reduce((acc, curr) => {
        const onuIpStr = curr.onuIp.toString();
        const rxValue = parseFloat(curr.rx as unknown as string);

        if (
          !acc[onuIpStr] ||
          new Date(curr.createdAt) > new Date(acc[onuIpStr].createdAt)
        ) {
          acc[onuIpStr] = {
            cid: curr.cgs.operatorCid,
            sid: curr.cgs.serviceId.toString(),
            rx: rxValue,
            createdAt: curr.createdAt,
          };
        }

        return acc;
      }, {} as Record<
        string,
        { cid: string; sid: string; rx: number; createdAt: Date }
      >)
    );

    const lines = [
      '# HELP fttx_rx_power Received optical power (dBm)',
      '# TYPE fttx_rx_power gauge',
      ...latestPerOnu.map(
        (d) => `fttx_rx_power{cid="${d.cid}", sid="${d.sid}"} ${d.rx.toFixed(2)}`
      ),
    ];

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(lines.join('\n'));
  } catch (err) {
    console.error('Failed to fetch metrics', err);
    res.status(500).send('# ERROR Failed to fetch metrics');
  }
}

}
