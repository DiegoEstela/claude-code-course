import { describe, it, expect, vi } from 'vitest'
import type { Request, Response } from 'express'
import { errorHandler } from './errorHandler.js'
import {
    TableNotFoundError,
    TableNotAvailableError,
    DuplicatedTableNumberError,
    InvalidTableNumberError,
    InvalidTableCapacityError
} from '@errors/DomainErrors.js'

function run(error: Error) {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response
    errorHandler(error, {} as Request, res, vi.fn())
    return res
}

describe('errorHandler (mesas)', () => {
    it('maps TableNotFoundError to 404', () => {
        expect(run(new TableNotFoundError()).status).toHaveBeenCalledWith(404)
    })

    it('maps TableNotAvailableError to 409', () => {
        expect(run(new TableNotAvailableError()).status).toHaveBeenCalledWith(409)
    })

    it('maps DuplicatedTableNumberError to 409', () => {
        expect(run(new DuplicatedTableNumberError()).status).toHaveBeenCalledWith(409)
    })

    it('maps invalid number and capacity to 400', () => {
        expect(run(new InvalidTableNumberError()).status).toHaveBeenCalledWith(400)
        expect(run(new InvalidTableCapacityError()).status).toHaveBeenCalledWith(400)
    })
})
