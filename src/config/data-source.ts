import "reflect-metadata"
import { DataSource } from "typeorm"
import * as dotenv from 'dotenv'
import { Metrics } from "../entities/metrics.entity"
import { Cgs } from "../entities/cgs.entity"
dotenv.config()

export const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: true,
    logging: false,
    entities: [Metrics, Cgs],
    migrations: [],
    subscribers: [],
})
