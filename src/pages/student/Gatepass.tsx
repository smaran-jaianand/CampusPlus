import { useWallet } from '@txnlab/use-wallet-react'
import { ShieldCheck, ShieldAlert, LogOut, ArrowRightCircle } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useSnackbar } from 'notistack'
import { getValidToken, AttendanceToken } from '../../utils/attendance'
import {
  getCurrentRequestForStudent,
  getGatepassStudentState,
  getLateCountForCurrentMonth,
  isGatepassDisabledForMonth,
  markExitedCampus,
  requestCampusEntry,
} from '../../utils/gatepass'

const Gatepass: React.FC = () => {
  const { activeAddress } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const [token, setToken] = useState<AttendanceToken | null>(null)
  const [lastExitAt, setLastExitAt] = useState<number | null>(null)
  const [entryRequestStatus, setEntryRequestStatus] = useState<'pending' | 'approved' | null>(null)
  const [entryRequestTime, setEntryRequestTime] = useState<number | null>(null)
  const [lateCount, setLateCount] = useState(0)
  const [isDisabledForMonth, setIsDisabledForMonth] = useState(false)

  const refreshGatepassState = (wallet: string) => {
    setToken(getValidToken(wallet))
    const state = getGatepassStudentState(wallet)
    const request = getCurrentRequestForStudent(wallet)
    setEntryRequestStatus(request?.status || null)
    setEntryRequestTime(request?.requestedAt || null)
    setLastExitAt(state.lastExitAt)
    setLateCount(getLateCountForCurrentMonth(wallet))
    setIsDisabledForMonth(isGatepassDisabledForMonth(wallet))
  }

  useEffect(() => {
    if (activeAddress) {
      refreshGatepassState(activeAddress)
      const interval = window.setInterval(() => refreshGatepassState(activeAddress), 3000)
      return () => window.clearInterval(interval)
    } else {
      setToken(null)
      setEntryRequestStatus(null)
      setEntryRequestTime(null)
      setLastExitAt(null)
      setLateCount(0)
      setIsDisabledForMonth(false)
    }
  }, [activeAddress])

  const handleExitScan = () => {
    if (!activeAddress) return
    if (isDisabledForMonth) {
      enqueueSnackbar('Gatepass is disabled for this month due to late entry threshold.', { variant: 'warning' })
      return
    }
    const state = markExitedCampus(activeAddress)
    setLastExitAt(state.lastExitAt)
    setEntryRequestStatus(null)
    setEntryRequestTime(null)
    setIsDisabledForMonth(isGatepassDisabledForMonth(activeAddress))
    enqueueSnackbar('Exit time recorded successfully.', { variant: 'success' })
  }

  const handleEntryScan = () => {
    if (!activeAddress) return
    if (isDisabledForMonth) {
      enqueueSnackbar('Gatepass is disabled for this month due to late entry threshold.', { variant: 'warning' })
      return
    }
    const request = requestCampusEntry(activeAddress)
    if (!request) {
      enqueueSnackbar('Please scan exit first before requesting entry approval.', { variant: 'warning' })
      return
    }
    setEntryRequestStatus(request.status)
    setEntryRequestTime(request.requestedAt)
    setLastExitAt(request.exitAt)
    enqueueSnackbar('Entry request sent to admin for approval.', { variant: 'info' })
  }

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto w-full">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-indigo-900 mb-2">Campus Gatepass</h1>
        <p className="text-indigo-600/80">Check your current campus access authorization.</p>
      </div>

      {!activeAddress ? (
        <div className="bg-white border rounded-3xl p-10 w-full text-center shadow-lg shadow-indigo-100">
          <ShieldAlert size={64} className="text-gray-300 mb-4 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Authentication Required</h2>
          <p className="text-gray-500 max-w-sm mx-auto">Please connect your student wallet to view your gatepass status.</p>
        </div>
      ) : token ? (
        <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl p-1 w-full max-w-md shadow-2xl shadow-emerald-200">
          <div className="bg-white rounded-[23px] overflow-hidden">
            <div className="bg-emerald-500 text-white p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl -translate-y-10 translate-x-10"></div>
              <ShieldCheck size={80} className="mx-auto mb-4 drop-shadow-md text-white/90" />
              <h2 className="text-3xl font-black mb-1">ACCESS GRANTED</h2>
              <p className="text-emerald-100 font-medium">Clearance Level: Student</p>
            </div>

            <div className="p-8">
              <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Token ID</p>
                  <p className="font-mono text-sm font-semibold text-gray-800">{token.tokenString.substring(0, 15)}...</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Valid Until</p>
                  <p className="font-semibold text-emerald-600">
                    {new Date(token.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleEntryScan}
                  disabled={isDisabledForMonth || !lastExitAt}
                  className={`w-full p-4 rounded-xl flex items-center justify-between font-bold transition-colors group ${
                    isDisabledForMonth || !lastExitAt
                      ? 'bg-emerald-50 text-emerald-300 cursor-not-allowed'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <ArrowRightCircle size={20} className="text-emerald-500" />
                    Entry Scan
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-md ${entryRequestStatus === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-200 text-emerald-800'}`}
                  >
                    {entryRequestStatus === 'pending' ? 'Pending Admin' : 'Ready'}
                  </span>
                </button>
                <button
                  onClick={handleExitScan}
                  disabled={isDisabledForMonth}
                  className={`w-full p-4 rounded-xl flex items-center justify-between font-bold transition-colors ${
                    isDisabledForMonth ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <LogOut size={20} className="text-gray-400" />
                    Exit Scan
                  </span>
                </button>
              </div>

              <div className="mt-6 text-left text-sm text-gray-600 space-y-2">
                {lastExitAt && (
                  <p>
                    Last exit time: <span className="font-semibold">{new Date(lastExitAt).toLocaleString()}</span>
                  </p>
                )}
                {entryRequestStatus && entryRequestTime && (
                  <p>
                    Entry request: <span className="font-semibold capitalize">{entryRequestStatus}</span> (
                    {new Date(entryRequestTime).toLocaleString()})
                  </p>
                )}
                <p>
                  Late returns this month:{' '}
                  <span className={`font-semibold ${lateCount >= 3 ? 'text-rose-600' : 'text-emerald-600'}`}>{lateCount}/3</span>
                </p>
                {isDisabledForMonth && (
                  <p className="text-rose-600 font-semibold">Gatepass is disabled for the current month because late returns reached 3.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-rose-400 to-red-500 rounded-3xl p-1 w-full max-w-md shadow-2xl shadow-rose-200">
          <div className="bg-white rounded-[23px] overflow-hidden">
            <div className="bg-rose-500 text-white p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl -translate-y-10 translate-x-10"></div>
              <ShieldAlert size={80} className="mx-auto mb-4 drop-shadow-md text-white/90" />
              <h2 className="text-3xl font-black mb-1">ACCESS DENIED</h2>
              <p className="text-rose-100 font-medium">No valid attendance record.</p>
            </div>

            <div className="p-8 text-center">
              <p className="text-gray-600 mb-6">
                Your daily attendance token is either missing or has expired. Please report to the Attendance section to generate a new
                token.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Gatepass
