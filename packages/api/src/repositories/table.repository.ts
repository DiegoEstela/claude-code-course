import type { Table } from '@models/table.model.js'

export interface TableRepository {
    findById(id: string): Promise<Table | null>
    findByRestaurantId(restaurantId: string): Promise<Table[]>
    findAvailable(restaurantId: string, people: number): Promise<Table[]>
    save(table: Table): Promise<void>
    delete(id: string): Promise<void>
    occupyIfFree(id: string, people: number, updatedAt: string): Promise<boolean>
}
