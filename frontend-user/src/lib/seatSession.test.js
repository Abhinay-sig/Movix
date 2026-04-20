import { beforeEach, describe, expect, test, jest } from '@jest/globals'
import {
  clearPendingSeatRelease,
  getPendingSeatRelease,
  getSeatSessionToken,
  resetSeatSessionToken,
  savePendingSeatRelease,
} from './seatSession'

describe('frontend-user seatSession', () => {
  beforeEach(() => {
    sessionStorage.clear()
    jest.restoreAllMocks()
  })

  test('creates and reuses a seat session token', () => {
    const first = getSeatSessionToken()
    const second = getSeatSessionToken()

    expect(first).toBeTruthy()
    expect(second).toBe(first)
  })

  test('resets the seat session token', () => {
    const first = getSeatSessionToken()
    const second = resetSeatSessionToken()

    expect(second).toBeTruthy()
    expect(second).not.toBe(first)
    expect(getSeatSessionToken()).toBe(second)
  })

  test('stores and clears pending seat-release payloads', () => {
    const payload = { showId: 12, seatCodes: ['A1', 'A2'], sessionToken: 'seat-token' }

    savePendingSeatRelease(payload)
    expect(getPendingSeatRelease()).toEqual(payload)

    clearPendingSeatRelease()
    expect(getPendingSeatRelease()).toBe(null)
  })

  test('falls back safely when sessionStorage access fails', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })

    const token = getSeatSessionToken()

    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(10)
  })
})
