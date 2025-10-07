import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, JoinColumn, ManyToOne } from 'typeorm';
import { Cgs } from './cgs.entity';

@Entity('metrics')
export class Metrics {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'onu_ip', type: 'varbinary', length: 16 })
    onuIp: string;

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    rx: number;

    @CreateDateColumn({
        name: 'created_at',
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
    createdAt: Date;

    @ManyToOne(() => Cgs, cgs => cgs.metrics)
    @JoinColumn({ name: 'onu_ip', referencedColumnName: 'onuIp' })
    cgs: Cgs;
}
