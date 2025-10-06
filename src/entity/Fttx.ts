import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('fttx')
export class Fttx {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50 })
    ip: string;

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    rx: number;

    @CreateDateColumn({ name: 'date', type: 'datetime' })
    date: Date;
}
