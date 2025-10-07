import { AppDataSource } from '../config/data-source';
import { Cgs } from '../entities/cgs.entity';
import { Metrics } from '../entities/metrics.entity';

export class MetricsService {
  constructor(
    private readonly metricsRepository = AppDataSource.getRepository(Metrics),
    private readonly cgsRepository = AppDataSource.getRepository(Cgs)
  ) {}

  /**
   * Save RX metric to database.
   * @param {string} onuIp - ONU IP address.
   * @param {number} rx - RX power value.
   * @returns {Promise<void>} When saved.
   */
  async store(onuIp: string, rx: number): Promise<void> {
    const record = this.metricsRepository.create({ 
      onuIp,
      rx
    });
    await this.metricsRepository.save(record);
  }

  /**
   * Get CGS with metrics in last 1 hour.
   * @returns {Promise<Cgs[]>} CGS list with recent metrics.
   */
  async getRecentMetrics(): Promise<Cgs[]> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const cgsWithMetrics = await this.cgsRepository
      .createQueryBuilder('cgs')
      .leftJoinAndSelect('cgs.metrics', 'metrics')
      .where('metrics.createdAt BETWEEN :from AND :to', {
        from: oneHourAgo,
        to: now,
      })
      .getMany();

    return cgsWithMetrics;
  }
}
