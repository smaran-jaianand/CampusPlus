export interface GatepassEntryRequest {
  id: string
  wallet: string
  exitAt: number
  requestedAt: number
  status: 'pending' | 'approved'
  approvedAt?: number
  wasLate?: boolean
}

interface GatepassStudentState {
  wallet: string
  lastExitAt: number | null
  currentRequestId: string | null
  lateCounts: Record<string, number>
  disabledMonth: string | null
}

const REQUESTS_KEY = 'gatepass_requests_v1'
const STUDENT_STATE_KEY = 'gatepass_student_state_v1'
export const DESIGNATED_RETURN_HOUR = 20
export const MAX_LATE_ENTRIES_PER_MONTH = 3

const getMonthKey = (timestamp: number) => {
  const date = new Date(timestamp)
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}`
}

const getInitialStudentState = (wallet: string): GatepassStudentState => ({
  wallet,
  lastExitAt: null,
  currentRequestId: null,
  lateCounts: {},
  disabledMonth: null,
})

const getStudentStorageKey = (wallet: string) => `${STUDENT_STATE_KEY}_${wallet}`

const readStudentState = (wallet: string): GatepassStudentState => {
  const raw = localStorage.getItem(getStudentStorageKey(wallet))
  if (!raw) return getInitialStudentState(wallet)
  try {
    const parsed = JSON.parse(raw) as GatepassStudentState
    return { ...getInitialStudentState(wallet), ...parsed, wallet }
  } catch {
    return getInitialStudentState(wallet)
  }
}

const writeStudentState = (state: GatepassStudentState) => {
  localStorage.setItem(getStudentStorageKey(state.wallet), JSON.stringify(state))
}

const readRequests = (): GatepassEntryRequest[] => {
  const raw = localStorage.getItem(REQUESTS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as GatepassEntryRequest[]
  } catch {
    return []
  }
}

const writeRequests = (requests: GatepassEntryRequest[]) => {
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests))
}

export const isLateEntry = (timestamp: number) => new Date(timestamp).getHours() > DESIGNATED_RETURN_HOUR

export const isGatepassDisabledForMonth = (wallet: string, timestamp = Date.now()) => {
  const state = readStudentState(wallet)
  return state.disabledMonth === getMonthKey(timestamp)
}

export const getLateCountForCurrentMonth = (wallet: string, timestamp = Date.now()) => {
  const state = readStudentState(wallet)
  return state.lateCounts[getMonthKey(timestamp)] || 0
}

export const getGatepassStudentState = (wallet: string) => readStudentState(wallet)

export const markExitedCampus = (wallet: string, timestamp = Date.now()) => {
  const state = readStudentState(wallet)
  state.lastExitAt = timestamp
  state.currentRequestId = null
  writeStudentState(state)
  return state
}

export const requestCampusEntry = (wallet: string, timestamp = Date.now()) => {
  const state = readStudentState(wallet)
  if (!state.lastExitAt) return null
  if (isGatepassDisabledForMonth(wallet, timestamp)) return null

  const requests = readRequests()
  const existingPending = requests.find((r) => r.wallet === wallet && r.status === 'pending')
  if (existingPending) {
    state.currentRequestId = existingPending.id
    writeStudentState(state)
    return existingPending
  }

  const request: GatepassEntryRequest = {
    id: `ENTRY-${wallet.substring(0, 8)}-${timestamp.toString(36).toUpperCase()}`,
    wallet,
    exitAt: state.lastExitAt,
    requestedAt: timestamp,
    status: 'pending',
  }
  requests.push(request)
  writeRequests(requests)

  state.currentRequestId = request.id
  writeStudentState(state)
  return request
}

export const getCurrentRequestForStudent = (wallet: string) => {
  const state = readStudentState(wallet)
  if (!state.currentRequestId) return null
  const requests = readRequests()
  return requests.find((r) => r.id === state.currentRequestId) || null
}

export const getPendingEntryRequests = () => readRequests().filter((r) => r.status === 'pending')

export const approveEntryRequest = (requestId: string, approvedAt = Date.now()) => {
  const requests = readRequests()
  const requestIndex = requests.findIndex((r) => r.id === requestId)
  if (requestIndex === -1) return null
  if (requests[requestIndex].status === 'approved') return requests[requestIndex]

  const request = requests[requestIndex]
  const updatedRequest: GatepassEntryRequest = {
    ...request,
    status: 'approved',
    approvedAt,
    wasLate: isLateEntry(approvedAt),
  }
  requests[requestIndex] = updatedRequest
  writeRequests(requests)

  const state = readStudentState(request.wallet)
  const monthKey = getMonthKey(approvedAt)
  if (updatedRequest.wasLate) {
    const nextLateCount = (state.lateCounts[monthKey] || 0) + 1
    state.lateCounts[monthKey] = nextLateCount
    if (nextLateCount >= MAX_LATE_ENTRIES_PER_MONTH) {
      state.disabledMonth = monthKey
    }
  }
  state.lastExitAt = null
  state.currentRequestId = null
  writeStudentState(state)

  return updatedRequest
}
