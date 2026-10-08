import { randomUUID } from 'crypto'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import {
    DuplicatedTableNumberError,
    InvalidPeopleCountError,
    InvalidTableCapacityError,
    InvalidTableNumberError,
    RestaurantNotFoundError,
    TableNotAvailableError,
    TableNotFoundError
} from '@errors/DomainErrors.js'

export interface CreateTableDTO {
    number: number
    description?: string | null
    capacity: number
    restaurantId: string
}

export interface UpdateTableDTO {
    number: number
    description?: string | null
    capacity: number
    status?: string
}

export class TableService {
    constructor(
        private readonly tableRepository: TableRepository,
        private readonly restaurantRepository: RestaurantRepository
    ) {}

    async create(dto: CreateTableDTO): Promise<Table> {
        this.validateNumberAndCapacity(dto.number, dto.capacity)

        const restaurant = await this.restaurantRepository.findById(dto.restaurantId)
        if (!restaurant) {
            throw new RestaurantNotFoundError()
        }
        await this.assertNumberIsFree(dto.restaurantId, dto.number)

        const now = new Date().toISOString()
        const table: Table = {
            id: randomUUID(),
            number: dto.number,
            description: this.normalizeDescription(dto.description),
            capacity: dto.capacity,
            status: 'libre',
            restaurantId: dto.restaurantId,
            createdAt: now,
            updatedAt: now
        }

        await this.tableRepository.save(table)
        return table
    }

    async update(restaurantId: string, id: string, dto: UpdateTableDTO): Promise<Table> {
        const existing = await this.findById(restaurantId, id)

        this.validateNumberAndCapacity(dto.number, dto.capacity)
        const status = dto.status === undefined ? existing.status : normalizeTableStatus(dto.status)
        await this.assertNumberIsFree(restaurantId, dto.number, id)

        const updated: Table = {
            ...existing,
            number: dto.number,
            description: this.normalizeDescription(dto.description),
            capacity: dto.capacity,
            status,
            updatedAt: new Date().toISOString()
        }

        await this.tableRepository.save(updated)
        return updated
    }

    async updateStatus(restaurantId: string, id: string, status: string): Promise<Table> {
        const existing = await this.findById(restaurantId, id)
        const updated: Table = {
            ...existing,
            status: normalizeTableStatus(status),
            updatedAt: new Date().toISOString()
        }

        await this.tableRepository.save(updated)
        return updated
    }

    async delete(restaurantId: string, id: string): Promise<void> {
        const existing = await this.findById(restaurantId, id)
        if (existing.status === 'ocupada') {
            throw new TableNotAvailableError('No se puede eliminar una mesa ocupada')
        }
        await this.tableRepository.delete(id)
    }

    async findById(restaurantId: string, id: string): Promise<Table> {
        const table = await this.tableRepository.findById(id)
        if (!table || table.restaurantId !== restaurantId) {
            throw new TableNotFoundError()
        }
        return table
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        return this.tableRepository.findByRestaurantId(restaurantId)
    }

    async findAvailable(restaurantId: string, people: number): Promise<Table[]> {
        this.validatePeople(people)
        return this.tableRepository.findAvailable(restaurantId, people)
    }

    private validatePeople(people: number): void {
        if (!Number.isInteger(people) || people < 1) {
            throw new InvalidPeopleCountError()
        }
    }

    private validateNumberAndCapacity(number: number, capacity: number): void {
        if (!Number.isInteger(number) || number < 1) {
            throw new InvalidTableNumberError()
        }
        if (!Number.isInteger(capacity) || capacity < 1) {
            throw new InvalidTableCapacityError()
        }
    }

    private async assertNumberIsFree(restaurantId: string, number: number, exceptId?: string): Promise<void> {
        const tables = await this.tableRepository.findByRestaurantId(restaurantId)
        if (tables.some(t => t.number === number && t.id !== exceptId)) {
            throw new DuplicatedTableNumberError()
        }
    }

    private normalizeDescription(description?: string | null): string | null {
        const trimmed = description?.trim()
        return trimmed ? trimmed : null
    }
}
