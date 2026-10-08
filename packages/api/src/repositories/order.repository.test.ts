import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SqliteOrderRepository } from './order.repository.js'
import { Database } from '@config/database.js'
import type { Order } from '@models/order.model.js'

describe('SqliteOrderRepository (Integration)', () => {
    let db: Database
    let repo: SqliteOrderRepository

    const makeOrder = (id: string, tableId: string | null): Order => ({
        id,
        restaurantId: 'r1',
        tableId,
        clientId: null,
        createdAt: new Date(),
        items: [{ id: `${id}-item`, dishId: 'd1', quantity: 1, notes: null, status: 'pendiente' }]
    })

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteOrderRepository(db)

        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['r1', 'r1', 'a', 'e@e.com', '+34 612345678', 'o', 'o', '2026-01-01', '2026-01-01']
        )
        await db.run(
            'INSERT INTO dishes (id, name, price, category, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['d1', 'Paella', 10, 'principal', 'r1', '2026-01-01', '2026-01-01']
        )
        await db.run(
            'INSERT INTO tables (id, number, capacity, status, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['t1', 7, 4, 'ocupada', 'r1', '2026-01-01', '2026-01-01']
        )
    })

    afterAll(async () => {
        await db.close()
    })

    it('should include the table number in active orders', async () => {
        await repo.create(makeOrder('o1', 't1'))

        const orders = await repo.findActiveByRestaurant('r1')
        expect(orders[0]?.tableId).toBe('t1')
        expect(orders[0]?.tableNumber).toBe(7)
    })

    it('should return a null table number for orders without table', async () => {
        await repo.create(makeOrder('o2', null))

        const orders = await repo.findActiveByRestaurant('r1')
        const order = orders.find(o => o.id === 'o2')
        expect(order?.tableId).toBeNull()
        expect(order?.tableNumber).toBeNull()
    })

    it('should return a null table number when the table no longer exists', async () => {
        await repo.create(makeOrder('o3', 'deleted-table'))

        const orders = await repo.findActiveByRestaurant('r1')
        const order = orders.find(o => o.id === 'o3')
        expect(order?.tableId).toBe('deleted-table')
        expect(order?.tableNumber).toBeNull()
    })
})
