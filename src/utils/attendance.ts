// Utility functions to handle attendance tokens

export interface AttendanceToken {
    wallet: string
    timestamp: number
    expiresAt: number
    tokenString: string
}

const TOKEN_KEY = 'attendance_token_v1'
const HISTORY_KEY = 'attendance_history_v1'
const TOKEN_DURATION = 24 * 60 * 60 * 1000 // 24 hours in ms

export const generateAttendanceToken = (walletAddress: string): AttendanceToken => {
    const now = Date.now()
    const token: AttendanceToken = {
        wallet: walletAddress,
        timestamp: now,
        expiresAt: now + TOKEN_DURATION,
        // Simple hash-like string consisting of address prefix and timestamp
        tokenString: `ATT-${walletAddress.substring(0, 8)}-${now.toString(36).toUpperCase()}`,
    }

    localStorage.setItem(`${TOKEN_KEY}_${walletAddress}`, JSON.stringify(token))

    // Add to history (One Day One Key logic)
    const history = getAttendanceHistory(walletAddress)
    const todayStr = new Date(now).toDateString()

    const existingIndex = history.findIndex(t => new Date(t.timestamp).toDateString() === todayStr)
    if (existingIndex !== -1) {
        history[existingIndex] = token // Update existing entry for today
    } else {
        history.push(token) // Add new entry
    }

    localStorage.setItem(`${HISTORY_KEY}_${walletAddress}`, JSON.stringify(history))

    return token
}

export const getValidToken = (walletAddress: string): AttendanceToken | null => {
    const stored = localStorage.getItem(`${TOKEN_KEY}_${walletAddress}`)
    if (!stored) return null

    try {
        const token: AttendanceToken = JSON.parse(stored)
        if (Date.now() > token.expiresAt) {
            // Expired
            localStorage.removeItem(`${TOKEN_KEY}_${walletAddress}`)
            return null
        }
        return token
    } catch (e) {
        return null
    }
}

export const getAttendanceHistory = (walletAddress: string): AttendanceToken[] => {
    const stored = localStorage.getItem(`${HISTORY_KEY}_${walletAddress}`)
    if (!stored) return []

    try {
        return JSON.parse(stored) as AttendanceToken[]
    } catch (e) {
        return []
    }
}
