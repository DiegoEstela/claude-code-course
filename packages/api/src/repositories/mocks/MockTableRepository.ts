import type { TableRepository } from '@repositories/table.repository.js'
import type { Table } from '@models/table.model.js'

export class MockTableRepository implements TableRepository {
    private tables: Map<string, Table> = new Map()

    async findById(id: string): Promise<Table | null> {
        return this.tables.get(id) || null
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        return Array.from(this.tables.values())
            .filter(t => t.restaurantId === restaurantId)
            .sort((a, b) => a.number - b.number)
    }

    async findAvailable(restaurantId: string, people: number): Promise<Table[]> {
        return (await this.findByRestaurantId(restaurantId))
            .filter(t => t.status === 'libre' && t.capacity >= people)
            .sort((a, b) => a.capacity - b.capacity || a.number - b.number)
    }

    async save(table: Table): Promise<void> {
        this.tables.set(table.id, { ...table })
    }

    async delete(id: string): Promise<void> {
        this.tables.delete(id)
    }

    async occupyIfFree(id: string, people: number, updatedAt: string): Promise<boolean> {
        const table = this.tables.get(id)
        if (!table || table.status !== 'libre' || table.capacity < people) return false
        this.tables.set(id, { ...table, status: 'ocupada', updatedAt })
        return true
    }
}
