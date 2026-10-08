import { describe, it, expect, beforeEach } from 'vitest'
import { normalizeTableStatus } from '@models/table.model.js'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import { TableNotFoundError, TableNotAvailableError, DuplicatedTableNumberError, InvalidTableNumberError, InvalidTableCapacityError, RestaurantNotFoundError } from '@errors/DomainErrors.js'

describe('normalizeTableStatus', () => {
    it('should accept all valid statuses', () => {
        for (const s of ['libre', 'ocupada', 'reservada']) {
            expect(normalizeTableStatus(s)).toBe(s)
        }
    })

    it('should normalize case and spaces', () => {
        expect(normalizeTableStatus('  OCUPADA ')).toBe('ocupada')
    })

    it('should throw InvalidTableStatusError for invalid status', () => {
        expect(() => normalizeTableStatus('rota')).toThrow('Estado de mesa inválido')
    })

    it('should throw InvalidTableStatusError for empty or non-string status', () => {
        expect(() => normalizeTableStatus('')).toThrow('Estado de mesa inválido')
        expect(() => normalizeTableStatus(undefined as unknown as string)).toThrow('Estado de mesa inválido')
    })
})

async function setup() {
    const tableRepo = new MockTableRepository()
    const restaurantRepo = new MockRestaurantRepository()
    const now = new Date().toISOString()
    for (const id of ['r1', 'r2']) {
        await restaurantRepo.save({
            id, name: id, address: 'a', email: 'e@e.com', phone: '+34 612345678',
            ownerFirstName: 'o', ownerLastName: 'o', logoUrl: null, createdAt: now, updatedAt: now
        })
    }
    return { tableRepo, service: new TableService(tableRepo, restaurantRepo) }
}

const validInput = { number: 1, description: 'Terraza', capacity: 4, restaurantId: 'r1' }

describe('TableService.create', () => {
    let service: TableService

    beforeEach(async () => {
        ({ service } = await setup())
    })

    it('should create a free table', async () => {
        const table = await service.create(validInput)

        expect(table.id).toBeDefined()
        expect(table.number).toBe(1)
        expect(table.description).toBe('Terraza')
        expect(table.capacity).toBe(4)
        expect(table.status).toBe('libre')
        expect(table.restaurantId).toBe('r1')
        expect(table.createdAt).toBe(table.updatedAt)
    })

    it('should store a null description when omitted', async () => {
        const table = await service.create({ number: 2, capacity: 2, restaurantId: 'r1' })
        expect(table.description).toBeNull()
    })

    it('should reject an invalid number', async () => {
        for (const number of [0, -1, 1.5, NaN, '3' as unknown as number]) {
            await expect(service.create({ ...validInput, number })).rejects.toThrow(InvalidTableNumberError)
        }
    })

    it('should reject an invalid capacity', async () => {
        for (const capacity of [0, -2, 2.5, undefined as unknown as number]) {
            await expect(service.create({ ...validInput, capacity })).rejects.toThrow(InvalidTableCapacityError)
        }
    })

    it('should reject an unknown restaurant', async () => {
        await expect(service.create({ ...validInput, restaurantId: 'nope' })).rejects.toThrow(RestaurantNotFoundError)
    })

    it('should reject a duplicated number in the same restaurant', async () => {
        await service.create(validInput)
        await expect(service.create(validInput)).rejects.toThrow(DuplicatedTableNumberError)
    })

    it('should allow the same number in another restaurant', async () => {
        await service.create(validInput)
        await expect(service.create({ ...validInput, restaurantId: 'r2' })).resolves.toBeDefined()
    })
})

describe('TableService update, delete and queries', () => {
    let service: TableService
    let tableRepo: MockTableRepository

    beforeEach(async () => {
        ({ service, tableRepo } = await setup())
    })

    it('should update a table keeping id, restaurant and createdAt', async () => {
        const created = await service.create(validInput)
        const updated = await service.update('r1', created.id, { number: 5, description: null, capacity: 6, status: 'reservada' })

        expect(updated.id).toBe(created.id)
        expect(updated.restaurantId).toBe('r1')
        expect(updated.createdAt).toBe(created.createdAt)
        expect(updated.number).toBe(5)
        expect(updated.description).toBeNull()
        expect(updated.capacity).toBe(6)
        expect(updated.status).toBe('reservada')
    })

    it('should keep the current status when update omits it', async () => {
        const created = await service.create(validInput)
        await tableRepo.save({ ...created, status: 'ocupada' })
        const updated = await service.update('r1', created.id, { number: 1, capacity: 4 })
        expect(updated.status).toBe('ocupada')
    })

    it('should allow updating a table keeping its own number', async () => {
        const created = await service.create(validInput)
        await expect(service.update('r1', created.id, { number: 1, capacity: 8 })).resolves.toBeDefined()
    })

    it('should reject updating to a number used by another table', async () => {
        await service.create(validInput)
        const other = await service.create({ ...validInput, number: 2 })
        await expect(service.update('r1', other.id, { number: 1, capacity: 4 })).rejects.toThrow(DuplicatedTableNumberError)
    })

    it('should reject invalid status, number and capacity on update', async () => {
        const created = await service.create(validInput)
        await expect(service.update('r1', created.id, { number: 1, capacity: 4, status: 'rota' })).rejects.toThrow('Estado de mesa inválido')
        await expect(service.update('r1', created.id, { number: 0, capacity: 4 })).rejects.toThrow(InvalidTableNumberError)
        await expect(service.update('r1', created.id, { number: 1, capacity: 0 })).rejects.toThrow(InvalidTableCapacityError)
    })

    it('should throw TableNotFoundError when updating a missing table or one from another restaurant', async () => {
        const created = await service.create(validInput)
        await expect(service.update('r1', 'nope', { number: 1, capacity: 4 })).rejects.toThrow(TableNotFoundError)
        await expect(service.update('r2', created.id, { number: 1, capacity: 4 })).rejects.toThrow(TableNotFoundError)
    })

    it('should delete a free table', async () => {
        const created = await service.create(validInput)
        await service.delete('r1', created.id)
        expect(await tableRepo.findById(created.id)).toBeNull()
    })

    it('should delete a reserved table', async () => {
        const created = await service.create(validInput)
        await tableRepo.save({ ...created, status: 'reservada' })
        await expect(service.delete('r1', created.id)).resolves.toBeUndefined()
    })

    it('should not delete an occupied table', async () => {
        const created = await service.create(validInput)
        await tableRepo.save({ ...created, status: 'ocupada' })
        await expect(service.delete('r1', created.id)).rejects.toThrow(TableNotAvailableError)
        expect(await tableRepo.findById(created.id)).not.toBeNull()
    })

    it('should throw TableNotFoundError when deleting a missing table', async () => {
        await expect(service.delete('r1', 'nope')).rejects.toThrow(TableNotFoundError)
    })

    it('should find a table by id within its restaurant', async () => {
        const created = await service.create(validInput)
        expect((await service.findById('r1', created.id)).id).toBe(created.id)
        await expect(service.findById('r2', created.id)).rejects.toThrow(TableNotFoundError)
        await expect(service.findById('r1', 'nope')).rejects.toThrow(TableNotFoundError)
    })

    it('should list tables of a restaurant ordered by number', async () => {
        await service.create({ ...validInput, number: 3 })
        await service.create({ ...validInput, number: 1 })
        await service.create({ ...validInput, number: 2, restaurantId: 'r2' })

        const tables = await service.findByRestaurantId('r1')
        expect(tables.map(t => t.number)).toEqual([1, 3])
    })
})

describe('TableService.updateStatus', () => {
    let service: TableService

    beforeEach(async () => {
        ({ service } = await setup())
    })

    it('should change the status and refresh updatedAt', async () => {
        const created = await service.create(validInput)
        const updated = await service.updateStatus('r1', created.id, 'Reservada')

        expect(updated.status).toBe('reservada')
        expect((await service.findById('r1', created.id)).status).toBe('reservada')
        expect(updated.updatedAt >= created.updatedAt).toBe(true)
    })

    it('should reject an invalid status', async () => {
        const created = await service.create(validInput)
        await expect(service.updateStatus('r1', created.id, 'rota')).rejects.toThrow('Estado de mesa inválido')
    })

    it('should throw TableNotFoundError for a missing table or another restaurant', async () => {
        const created = await service.create(validInput)
        await expect(service.updateStatus('r1', 'nope', 'libre')).rejects.toThrow(TableNotFoundError)
        await expect(service.updateStatus('r2', created.id, 'libre')).rejects.toThrow(TableNotFoundError)
    })
})
