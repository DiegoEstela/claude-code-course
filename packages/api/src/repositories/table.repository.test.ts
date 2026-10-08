import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SqliteTableRepository } from './table.repository.js'
import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'

describe('SqliteTableRepository (Integration)', () => {
    let db: Database
    let repo: SqliteTableRepository

    const makeTable = (overrides: Partial<Table>): Table => ({
        id: 't1',
        number: 1,
        description: null,
        capacity: 4,
        status: 'libre',
        restaurantId: 'r1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides
    })

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)
        for (const id of ['r1', 'r2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, id, 'a', 'e@e.com', '+34 612345678', 'o', 'o', '2026-01-01', '2026-01-01']
            )
        }
    })

    afterAll(async () => {
        await db.close()
    })

    it('should save and find a table by id', async () => {
        await repo.save(makeTable({ id: 't1', number: 1, description: 'Terraza' }))

        const found = await repo.findById('t1')
        expect(found).toEqual(makeTable({ id: 't1', number: 1, description: 'Terraza' }))
    })

    it('should return null for an unknown id', async () => {
        expect(await repo.findById('nope')).toBeNull()
    })

    it('should update an existing table without changing its restaurant', async () => {
        await repo.save(makeTable({ id: 't1', number: 7, capacity: 8, status: 'reservada', restaurantId: 'r2', updatedAt: '2026-02-01T00:00:00.000Z' }))

        const found = await repo.findById('t1')
        expect(found?.number).toBe(7)
        expect(found?.capacity).toBe(8)
        expect(found?.status).toBe('reservada')
        expect(found?.updatedAt).toBe('2026-02-01T00:00:00.000Z')
        expect(found?.restaurantId).toBe('r1')
    })

    it('should list tables of a restaurant ordered by number', async () => {
        await repo.save(makeTable({ id: 't3', number: 3, restaurantId: 'r1' }))
        await repo.save(makeTable({ id: 't2', number: 2, restaurantId: 'r1' }))
        await repo.save(makeTable({ id: 'x1', number: 1, capacity: 2, restaurantId: 'r2' }))

        const tables = await repo.findByRestaurantId('r1')
        expect(tables.map(t => t.number)).toEqual([2, 3, 7])
    })

    it('should reject a duplicated number within a restaurant', async () => {
        await expect(repo.save(makeTable({ id: 'dup', number: 3, restaurantId: 'r1' }))).rejects.toThrow()
    })

    it('should list only free tables with enough capacity ordered by capacity then number', async () => {
        await repo.save(makeTable({ id: 'a1', number: 21, capacity: 6, restaurantId: 'r2' }))
        await repo.save(makeTable({ id: 'a2', number: 22, capacity: 4, restaurantId: 'r2' }))
        await repo.save(makeTable({ id: 'a3', number: 23, capacity: 4, restaurantId: 'r2' }))
        await repo.save(makeTable({ id: 'a4', number: 24, capacity: 4, restaurantId: 'r2', status: 'ocupada' }))
        await repo.save(makeTable({ id: 'a5', number: 25, capacity: 2, restaurantId: 'r2' }))

        const tables = await repo.findAvailable('r2', 3)
        expect(tables.map(t => t.number)).toEqual([22, 23, 21])
    })

    it('should occupy a free table only once', async () => {
        await repo.save(makeTable({ id: 'o1', number: 31, capacity: 4, restaurantId: 'r1' }))

        const results = await Promise.all([
            repo.occupyIfFree('o1', 2, '2026-03-01T00:00:00.000Z'),
            repo.occupyIfFree('o1', 2, '2026-03-01T00:00:00.000Z')
        ])

        expect(results.filter(Boolean)).toHaveLength(1)
        const found = await repo.findById('o1')
        expect(found?.status).toBe('ocupada')
        expect(found?.updatedAt).toBe('2026-03-01T00:00:00.000Z')
    })

    it('should not occupy a table that does not fit the people', async () => {
        await repo.save(makeTable({ id: 'o2', number: 32, capacity: 2, restaurantId: 'r1' }))
        expect(await repo.occupyIfFree('o2', 3, '2026-03-01T00:00:00.000Z')).toBe(false)
        expect((await repo.findById('o2'))?.status).toBe('libre')
    })

    it('should delete a table', async () => {
        await repo.delete('o2')
        expect(await repo.findById('o2')).toBeNull()
    })
})
