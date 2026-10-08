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
