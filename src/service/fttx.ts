import { AppDataSource } from '../config/data-source'
import { Fttx } from '../entity/Fttx'

export async function store(ip: string, rx: number) {
  const repo = AppDataSource.getRepository(Fttx)
  const record = repo.create({ ip, rx })
  await repo.save(record)
}
