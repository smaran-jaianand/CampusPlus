import { useWallet } from '@txnlab/use-wallet-react'
import { QrCode, Timer, Copy, CheckCircle, RefreshCw } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useSnackbar } from 'notistack'
import { generateAttendanceToken, getValidToken, AttendanceToken, getAttendanceHistory } from '../../utils/attendance'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../../utils/network/getAlgoClientConfigs'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'

const Attendance: React.FC = () => {
    const { activeAddress } = useWallet()
    const { enqueueSnackbar } = useSnackbar()
    const [token, setToken] = useState<AttendanceToken | null>(null)
    const [timeLeft, setTimeLeft] = useState<string>('')
    const [copied, setCopied] = useState(false)
    const [isConfirmed, setIsConfirmed] = useState(false)
    const [history, setHistory] = useState<AttendanceToken[]>([])
    const [verifiedTokens, setVerifiedTokens] = useState<Set<string>>(new Set())

    // Load existing token when component mounts or active address changes
    useEffect(() => {
        if (activeAddress) {
            setToken(getValidToken(activeAddress))
            setHistory(getAttendanceHistory(activeAddress))
        } else {
            setToken(null)
            setHistory([])
            setVerifiedTokens(new Set())
        }
    }, [activeAddress])

    // Update time left ticker
    useEffect(() => {
        if (!token) return

        const interval = setInterval(() => {
            const now = Date.now()
            const diff = token.expiresAt - now

            if (diff <= 0) {
                setToken(null) // Token expired
                setTimeLeft('Expired')
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60))
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const secs = Math.floor((diff % (1000 * 60)) / 1000)
                setTimeLeft(`${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`)
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [token])

    // Poll for attendance confirmation globally
    useEffect(() => {
        if (!activeAddress || history.length === 0) return

        const indexerConfig = getIndexerConfigFromViteEnvironment()
        const algodConfig = getAlgodConfigFromViteEnvironment()
        const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })

        const checkConfirmation = async () => {
            try {
                // To prevent indexer timeouts, only search transactions from the last 14 days for history
                const twoWeeksAgo = new Date()
                twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
                const minRoundTime = twoWeeksAgo.toISOString()

                // Search for any transaction with the wallet's specific prefix
                const walletPrefix = new TextEncoder().encode(`ATTENDANCE_TOKEN:ATT-${activeAddress.substring(0, 8)}`)
                const response = await algorand.client.indexer.searchForTransactions()
                    .notePrefix(walletPrefix)
                    .afterTime(minRoundTime)
                    .do()

                if (response.transactions && response.transactions.length > 0) {
                    const verifiedSet = new Set<string>()

                    for (const txn of response.transactions) {
                        try {
                            if (txn.note) {
                                // Handle both runtime base64 strings (Indexer behavior) and expected Uint8Arrays (TypeScript behavior)
                                let decodedNote = ''
                                if (typeof txn.note === 'string') {
                                    decodedNote = atob(txn.note)
                                } else {
                                    decodedNote = new TextDecoder().decode(txn.note)
                                }

                                if (decodedNote.startsWith('ATTENDANCE_TOKEN:')) {
                                    const tokenId = decodedNote.split(':')[1]
                                    verifiedSet.add(tokenId)
                                }
                            }
                        } catch (e) { /* ignore decode errors for malformed notes */ }
                    }

                    setVerifiedTokens(verifiedSet)

                    // Update active token confirmed status if it's in the set
                    if (token && verifiedSet.has(token.tokenString)) {
                        setIsConfirmed(true)
                    }
                }
            } catch (error) {
                console.error('Error checking confirmation', error)
            }
        }

        checkConfirmation()
        const interval = setInterval(checkConfirmation, 10000) // Poll every 10 seconds

        return () => clearInterval(interval)
    }, [activeAddress, history, token])

    const handleGenerate = () => {
        if (!activeAddress) {
            enqueueSnackbar('Please connect your wallet first', { variant: 'error' })
            return
        }
        const newToken = generateAttendanceToken(activeAddress)
        setToken(newToken)
        setHistory(getAttendanceHistory(activeAddress)) // Refresh history state
        setIsConfirmed(false)
        enqueueSnackbar('New Attendance Token generated!', { variant: 'success' })
    }

    const handleCopy = () => {
        if (token) {
            navigator.clipboard.writeText(token.tokenString)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
            enqueueSnackbar('Token copied to clipboard', { variant: 'success' })
        }
    }

    return (
        <div className="flex flex-col items-center max-w-2xl mx-auto w-full">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-indigo-900 mb-2">Daily Attendance</h1>
                <p className="text-indigo-600/80">Generate your time-bound access pass to mark your presence.</p>
            </div>

            {!activeAddress ? (
                <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-10 w-full text-center flex flex-col items-center">
                    <QrCode size={64} className="text-indigo-200 mb-4" />
                    <h2 className="text-xl font-semibold text-indigo-800 mb-2">Wallet Disconnected</h2>
                    <p className="text-indigo-600 mb-6 max-w-sm">Connect your student wallet from the navbar to generate your attendance token.</p>
                </div>
            ) : token ? (
                <div className="bg-white border ring-1 ring-indigo-50 shadow-xl rounded-3xl p-8 w-full max-w-md relative overflow-hidden">
                    {/* Background pattern */}
                    <div className="absolute top-0 right-0 -m-4 w-32 h-32 bg-indigo-50 rounded-full blur-2xl opacity-50 pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-6">
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                Active Pass
                            </span>
                            <div className="flex items-center gap-2 text-indigo-500 text-sm font-semibold font-mono bg-indigo-50 px-3 py-1 rounded-lg">
                                <Timer size={14} />
                                {timeLeft}
                            </div>
                        </div>

                        <div className="text-center mb-8">
                            <p className="text-sm text-gray-500 mb-2 font-medium">Your 24HR Token</p>
                            <div
                                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-2xl font-bold text-indigo-900 tracking-wider flex items-center justify-center gap-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                                onClick={handleCopy}
                            >
                                {token.tokenString}
                                {copied ? <CheckCircle size={20} className="text-green-500" /> : <Copy size={20} className="text-indigo-300 group-hover:text-indigo-500" />}
                            </div>
                        </div>

                        {isConfirmed ? (
                            <div className="bg-green-600 text-white rounded-2xl p-5 mb-6 text-center shadow-lg shadow-green-200">
                                <CheckCircle size={48} className="mx-auto mb-3 opacity-90" />
                                <h3 className="text-xl font-bold mb-1">Attendance Confirmed!</h3>
                                <p className="text-sm font-medium opacity-90">Your presence has been verified on-chain.</p>
                            </div>
                        ) : (
                            <div className="bg-indigo-600 text-white rounded-2xl p-5 mb-6 text-center shadow-lg shadow-indigo-200">
                                <QrCode size={48} className="mx-auto mb-3 opacity-80" />
                                <p className="text-sm font-medium opacity-90">Present this token to the administrative staff.</p>
                            </div>
                        )}

                        <button
                            onClick={handleGenerate}
                            className="w-full btn btn-ghost text-indigo-500 hover:bg-indigo-50 flex gap-2 rounded-xl"
                        >
                            <RefreshCw size={16} />
                            Regenerate Token
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white border rounded-3xl p-8 w-full max-w-md shadow-xl text-center">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <QrCode size={36} className="text-indigo-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">No Active Token</h2>
                    <p className="text-gray-500 mb-8 font-light">
                        You haven't generated an attendance token for today or your previous token has expired.
                    </p>

                    <button
                        onClick={handleGenerate}
                        className="w-full btn btn-primary border-none bg-indigo-600 hover:bg-indigo-700 text-white text-lg rounded-xl h-14 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all font-semibold"
                    >
                        Generate Attendance Pass
                    </button>
                </div>
            )}

            {/* Attendance History Section */}
            {activeAddress && (
                <div className="mt-12 w-full">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Attendance History</h2>
                            <p className="text-gray-500 font-medium">Log of your daily tokens and verification status.</p>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-center">
                            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">Attendance Rate</p>
                            <p className="text-2xl font-black text-indigo-900">
                                {(() => {
                                    if (history.length === 0) return 0;
                                    const twoWeeksAgo = new Date();
                                    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
                                    const twoWeeksMs = twoWeeksAgo.getTime();
                                    const validHistory = history.filter(h => h.timestamp >= twoWeeksMs);
                                    const validHistoryCount = validHistory.length;
                                    if (validHistoryCount === 0) return 0;
                                    const validVerifiedCount = validHistory.filter(h => verifiedTokens.has(h.tokenString)).length;
                                    return Math.round((validVerifiedCount / validHistoryCount) * 100);
                                })()}%
                            </p>
                        </div>
                    </div>

                    <div className="bg-white border rounded-3xl shadow-lg shadow-indigo-100/50 overflow-hidden w-full">
                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-sm uppercase px-6 border-b border-slate-100">
                                        <th className="font-bold py-4">Day / Date</th>
                                        <th className="font-bold py-4">Temp Key</th>
                                        <th className="font-bold py-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.length > 0 ? (
                                        [...history].reverse().map((record, idx) => {
                                            const isVerified = verifiedTokens.has(record.tokenString)
                                            const dateObj = new Date(record.timestamp)
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                                                    <td className="py-4 font-medium text-slate-800">
                                                        <div className="flex flex-col">
                                                            <span>{dateObj.toLocaleDateString(undefined, { weekday: 'long' })}</span>
                                                            <span className="text-xs text-slate-400 font-normal">{dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} - {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4">
                                                        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                                                            {record.tokenString}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        {isVerified ? (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-full border border-green-100">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                                Verified
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 text-xs font-bold rounded-full border border-amber-100">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                                                Pending
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={3} className="text-center py-10 text-slate-400 font-medium">
                                                No attendance history found. Generate your first token above.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Attendance
