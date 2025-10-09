import { IsNull, MoreThan, Not } from 'typeorm'
import { AppDataSource } from '../config/data-source'
import { Cgs } from '../entities/cgs.entity'
import { Metrics } from '../entities/metrics.entity'

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
    })
    await this.metricsRepository.save(record)
  }

  /**
   * Ambil daftar ONU dari database (IP valid, bukan null/kosong)
   * @returns {Promise<Cgs[]>} CGS list.
   */
  async getDevicesFromDb(): Promise<Cgs[]> {
    const records = await this.cgsRepository.find({
      select: ['id', 'onuIp'],
      where: { onuIp: Not(IsNull()) },
    })
    return records
  }

  /**
   * Get CGS with metrics in last 1 hour.
   * @returns {Promise<Metrics[]>} CGS list with recent metrics.
   */
  async getRecentMetricsRaw(): Promise<Metrics[]> {
    const metrics = await this.metricsRepository
      .createQueryBuilder('metric')
      .leftJoinAndSelect('metric.cgs', 'cgs')
      .where('metric.createdAt >= NOW() - INTERVAL 1 HOUR')
      .andWhere('cgs.onuIp IS NOT NULL')
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('MAX(m2.id)')
          .from('metrics', 'm2')
          .leftJoin('m2.cgs', 'cgs2')
          .where('cgs2.onuIp IS NOT NULL')
          .groupBy('cgs2.onuIp')
          .getQuery()
        return 'metric.id IN ' + subQuery
      })
      .orderBy('cgs.serviceId', 'ASC')
      .getMany()
    return metrics
  }
}
