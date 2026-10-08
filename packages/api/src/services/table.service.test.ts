import { describe, it, expect } from 'vitest'
import { normalizeTableStatus } from '@models/table.model.js'

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
