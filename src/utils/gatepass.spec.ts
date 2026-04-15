import {
  approveEntryRequest,
  DESIGNATED_RETURN_HOUR,
  getGatepassStudentState,
  getLateCountForCurrentMonth,
  getPendingEntryRequests,
  isGatepassDisabledForMonth,
  markExitedCampus,
  requestCampusEntry,
} from './gatepass'

class LocalStorageMock {
  private store: Record<string, string> = {}

  clear() {
    this.store = {}
  }

  getItem(key: string) {
    return this.store[key] || null
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value)
  }

  removeItem(key: string) {
    delete this.store[key]
  }
}

describe('gatepass utilities', () => {
  const wallet = 'WALLET_ABC123'
  const localStorageMock = new LocalStorageMock()

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true,
    })
    localStorage.clear()
  })

  it('records student exit time', () => {
    const exitAt = new Date(2026, 3, 10, 14, 30, 0, 0).getTime()
    markExitedCampus(wallet, exitAt)

    const state = getGatepassStudentState(wallet)
    expect(state.lastExitAt).toBe(exitAt)
  })

  it('creates a pending entry request after exit', () => {
    const exitAt = new Date(2026, 3, 10, 14, 30, 0, 0).getTime()
    const requestAt = new Date(2026, 3, 10, 17, 0, 0, 0).getTime()

    markExitedCampus(wallet, exitAt)
    const request = requestCampusEntry(wallet, requestAt)
    const pending = getPendingEntryRequests()

    expect(request).not.toBeNull()
    expect(request?.status).toBe('pending')
    expect(pending).toHaveLength(1)
    expect(pending[0].wallet).toBe(wallet)
  })

  it('disables gatepass for month after 3 late approved entries', () => {
    const monthDate = new Date(2026, 3, 1, 10, 0, 0, 0).getTime()
    const lateApprovalTimes = [2, 5, 9].map((day) => new Date(2026, 3, day, DESIGNATED_RETURN_HOUR + 1, 0, 0, 0).getTime())

    for (const approvedAt of lateApprovalTimes) {
      const exitAt = approvedAt - 2 * 60 * 60 * 1000
      const requestAt = approvedAt - 60 * 60 * 1000

      markExitedCampus(wallet, exitAt)
      const request = requestCampusEntry(wallet, requestAt)
      expect(request).not.toBeNull()
      approveEntryRequest(request!.id, approvedAt)
    }

    expect(getLateCountForCurrentMonth(wallet, monthDate)).toBe(3)
    expect(isGatepassDisabledForMonth(wallet, monthDate)).toBe(true)
  })
})
