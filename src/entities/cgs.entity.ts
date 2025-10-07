import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index, Unique } from 'typeorm';

@Entity('cgs')
@Unique('uq_service_onu', ['serviceId', 'onuIp'])
@Index('idx_service_id', ['serviceId'])
@Index('idx_onu_ip', ['onuIp'])
export class Cgs {
    @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
    id: number;

    @Column({ name: 'service_id', type: 'bigint', unsigned: true })
    serviceId: number;

    @Column({ name: 'onu_ip', type: 'varbinary', length: 16 })
    onuIp: string;

    @Column({
        name: 'operator_cid',
        type: 'varchar',
        length: 64,
        collation: 'utf8mb4_general_ci',
    })
    operatorCid: string;

    @UpdateDateColumn({
        name: 'updated_at',
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
    updatedAt: Date;
}
