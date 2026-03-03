import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import React, { useMemo, useState, useEffect } from 'react'
import { Coins, Send, CheckCircle, Store, Flame, AlertCircle, CheckSquare } from 'lucide-react'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../../utils/network/getAlgoClientConfigs'
import { BURN_ADDRESS } from '../student/Grievances'
import { STUDENT_ROSTER } from '../../config/admin.config'
import * as algokit from '@algorandfoundation/algokit-utils'

interface MissionRequest {
    txId: string
    studentAddress: string
    missionId: string
    timestamp: number
}

const ManageCreditsAdmin: React.FC = () => {
    const { activeAddress, transactionSigner } = useWallet()
    const { enqueueSnackbar } = useSnackbar()

    // Create Tokens State
    const [total, setTotal] = useState('1000000')
    const [loadingCreate, setLoadingCreate] = useState(false)

    // Send Tokens State
    const [sendAssetId, setSendAssetId] = useState('')
    const [sendAmount, setSendAmount] = useState('')
    const [recipient, setRecipient] = useState('')
    const [loadingSend, setLoadingSend] = useState(false)

    // Mission Request State
    const [pendingRequests, setPendingRequests] = useState<MissionRequest[]>([])
    const [loadingTasks, setLoadingTasks] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)

    const algorand = useMemo(() => {
        const algodConfig = getAlgodConfigFromViteEnvironment()
        const client = AlgorandClient.fromConfig({ algodConfig })
        client.setDefaultSigner(transactionSigner)
        return client
    }, [transactionSigner])

    const fetchMissionRequests = async () => {
        try {
            setLoadingTasks(true)
            const indexerConfig = getIndexerConfigFromViteEnvironment()
            const indexer = AlgorandClient.fromConfig({ algodConfig: getAlgodConfigFromViteEnvironment(), indexerConfig }).client.indexer

            // 1. Fetch all MISSION_REQUESTs sent to the BURN_ADDRESS
            const requestPrefix = new TextEncoder().encode('MISSION_REQUEST:')
            const requestResponse = await indexer.searchForTransactions()
                .address(BURN_ADDRESS)
                .addressRole('receiver')
                .txType('pay')
                .notePrefix(requestPrefix)
                .do()

            // 2. Fetch all MISSION_REWARDs and REJECTs sent BY this admin address
            const rewardPrefix = new TextEncoder().encode('MISSION_REWARD:')
            const rewardResponse = activeAddress ? await indexer.searchForTransactions()
                .address(activeAddress)
                .addressRole('sender')
                .txType('pay')
                .notePrefix(rewardPrefix)
                .do() : { transactions: [] }

            const rejectPrefix = new TextEncoder().encode('MISSION_REJECTED:')
            const rejectResponse = activeAddress ? await indexer.searchForTransactions()
                .address(activeAddress)
                .addressRole('sender')
                .txType('pay')
                .notePrefix(rejectPrefix)
                .do() : { transactions: [] }

            // Build set of resolved requests (student + missionId)
            const resolvedPairs = new Set<string>()

            const processVerdict = (txn: any) => {
                try {
                    if (txn.note) {
                        let decodedNote = typeof txn.note === 'string' ? atob(txn.note) : new TextDecoder().decode(txn.note)
                        const parts = decodedNote.split(':') // e.g MISSION_REWARD:Campus_Tour
                        if (parts.length >= 2) {
                            const missionId = parts.slice(1).join(':')
                            resolvedPairs.add(`${txn.receiver}_${missionId}`)
                        }
                    }
                } catch (e) { }
            }

            if (rewardResponse.transactions) rewardResponse.transactions.forEach(processVerdict)
            if (rejectResponse.transactions) rejectResponse.transactions.forEach(processVerdict)

            // Parse incoming requests
            const pending: MissionRequest[] = []
            if (requestResponse.transactions) {
                for (const txn of requestResponse.transactions) {
                    try {
                        if (txn.note) {
                            let decodedNote = typeof txn.note === 'string' ? atob(txn.note) : new TextDecoder().decode(txn.note)
                            if (decodedNote.startsWith('MISSION_REQUEST:')) {
                                const missionId = decodedNote.split(':')[1] || ''
                                const student = (txn.sender as string) || ''

                                // Security Check: Only process requests from enrolled student wallets
                                if (student && STUDENT_ROSTER.includes(student)) {
                                    // Check if Admin has already resolved this specific student/mission combo
                                    if (!resolvedPairs.has(`${student}_${missionId}`)) {
                                        pending.push({
                                            txId: txn.id,
                                            studentAddress: student,
                                            missionId,
                                            timestamp: (txn.roundTime || 0) * 1000 || Date.now()
                                        })
                                    }
                                }
                            }
                        }
                    } catch (e) { }
                }
            }

            // Deduplicate requests by same person for same mission
            const uniquePending = pending.filter((v, i, a) => a.findIndex(v2 => (v2.studentAddress === v.studentAddress && v2.missionId === v.missionId)) === i)
            // Sort by oldest first
            uniquePending.sort((a, b) => a.timestamp - b.timestamp)

            setPendingRequests(uniquePending)
        } catch (error) {
            console.error('Error fetching mission requests', error)
        } finally {
            setLoadingTasks(false)
        }
    }

    useEffect(() => {
        fetchMissionRequests()
    }, [activeAddress])

    const handleApproveMission = async (request: MissionRequest) => {
        if (!activeAddress) {
            enqueueSnackbar('Connect admin wallet', { variant: 'error' })
            return
        }

        setProcessingId(request.txId)
        try {
            // Generate a random ALGO reward between 0.2 and 1.0
            const randomAlgoReward = (Math.random() * (1.0 - 0.2) + 0.2).toFixed(2)

            enqueueSnackbar(`Sending ${randomAlgoReward} ALGO to student...`, { variant: 'info' })

            // The note must match exactly what the Student UI expects: MISSION_REWARD:{id}
            const noteString = `MISSION_REWARD:${request.missionId}`

            await algorand.send.payment({
                sender: activeAddress,
                receiver: request.studentAddress,
                amount: algokit.algos(Number(randomAlgoReward)),
                note: noteString
            })

            enqueueSnackbar(`Successfully paid ${randomAlgoReward} ALGO and approved mission!`, { variant: 'success' })
            fetchMissionRequests() // Refresh list
        } catch (error: any) {
            console.error(error)
            enqueueSnackbar(error.message || 'Payment failed', { variant: 'error' })
        } finally {
            setProcessingId(null)
        }
    }

    const handleRejectMission = async (request: MissionRequest) => {
        if (!activeAddress) {
            enqueueSnackbar('Connect admin wallet', { variant: 'error' })
            return
        }

        setProcessingId(request.txId)
        try {
            enqueueSnackbar(`Rejecting mission...`, { variant: 'info' })
            const noteString = `MISSION_REJECTED:${request.missionId}`

            // Send 0 ALGO to self, just to log the rejection on-chain so the student UI can read it
            await algorand.send.payment({
                sender: activeAddress,
                receiver: request.studentAddress,
                amount: algokit.microAlgos(0),
                note: noteString
            })

            enqueueSnackbar(`Mission rejected.`, { variant: 'success' })
            fetchMissionRequests()
        } catch (error: any) {
            console.error(error)
            enqueueSnackbar(error.message || 'Rejection failed', { variant: 'error' })
        } finally {
            setProcessingId(null)
        }
    }

    const onCreateTokens = async () => {
        if (!activeAddress) {
            enqueueSnackbar('Connect a wallet first', { variant: 'error' })
            return
        }
        if (!total || isNaN(Number(total)) || Number(total) <= 0) {
            enqueueSnackbar('Invalid total amount', { variant: 'error' })
            return
        }

        setLoadingCreate(true)
        try {
            enqueueSnackbar('Please sign transaction...', { variant: 'info' })
            const result = await algorand.send.assetCreate({
                sender: activeAddress,
                total: BigInt(total),
                decimals: 0,
                unitName: 'CRED',
                assetName: 'Campus Credit',
                manager: activeAddress,
                reserve: activeAddress,
                freeze: activeAddress,
                clawback: activeAddress,
                defaultFrozen: false,
            })
            enqueueSnackbar(`Successfully minted ${total} Credits. Asset ID: ${result.assetId}`, { variant: 'success' })
            setSendAssetId(result.assetId.toString())
        } catch (e: any) {
            console.error(e)
            enqueueSnackbar(e.message || 'Failed to create Credits', { variant: 'error' })
        } finally {
            setLoadingCreate(false)
        }
    }

    const onSendTokens = async () => {
        if (!activeAddress) {
            enqueueSnackbar('Connect a wallet first', { variant: 'error' })
            return
        }
        if (!sendAssetId || !sendAmount || !recipient) {
            enqueueSnackbar('Fill all fields', { variant: 'error' })
            return
        }
        if (recipient.length !== 58) {
            enqueueSnackbar('Invalid algorand address', { variant: 'error' })
            return
        }

        setLoadingSend(true)
        try {
            enqueueSnackbar('Please sign transaction...', { variant: 'info' })
            await algorand.send.assetTransfer({
                sender: activeAddress,
                receiver: recipient,
                assetId: BigInt(sendAssetId),
                amount: BigInt(sendAmount),
            })
            enqueueSnackbar(`Sent ${sendAmount} credits to ${recipient.substring(0, 8)}...`, { variant: 'success' })
            setSendAmount('')
            setRecipient('')
        } catch (e: any) {
            console.error(e)
            enqueueSnackbar(e.message || 'Failed to send Credits (Are they opted in?)', { variant: 'error' })
        } finally {
            setLoadingSend(false)
        }
    }

    return (
        <div className="flex flex-col max-w-5xl mx-auto w-full">
            <div className="mb-10 text-center">
                <h1 className="text-3xl font-black text-emerald-900 mb-2">Manage Campus Credits</h1>
                <p className="text-emerald-700/80 font-medium">Mint and distribute fungible tokens for the campus economy.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Create Credits Section */}
                <div className="bg-white border border-emerald-50 rounded-3xl p-8 shadow-xl shadow-emerald-100 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl -translate-y-10 translate-x-10"></div>

                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                            <Coins size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Mint Credits</h2>
                            <p className="text-sm text-slate-500">Create the standard "CRED" campus token.</p>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10 flex-grow">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                Total Supply
                            </label>
                            <input
                                type="number"
                                className="block w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 focus:ring-0 focus:border-emerald-400 transition-colors shadow-sm"
                                placeholder="e.g. 1000000"
                                value={total}
                                onChange={(e) => setTotal(e.target.value)}
                                disabled={loadingCreate}
                            />
                        </div>

                        <div className="bg-emerald-50 text-emerald-800 text-sm p-4 rounded-xl border border-emerald-100 flex items-start gap-3 mt-4">
                            <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                            <p>This will create an Algorand Standard Asset (ASA) named <strong>Campus Credit</strong> with the unit <strong>CRED</strong> and 0 decimals.</p>
                        </div>
                    </div>

                    <button
                        onClick={onCreateTokens}
                        disabled={loadingCreate || !activeAddress}
                        className={`w-full mt-6 h-14 rounded-xl flex items-center justify-center gap-2 font-bold text-lg transition-all shadow-lg ${loadingCreate || !activeAddress
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200 hover:shadow-emerald-300'
                            }`}
                    >
                        {loadingCreate ? (
                            <><span className="loading loading-spinner loading-sm"></span> Minting...</>
                        ) : (
                            <><Store size={20} /> Mint New Credits</>
                        )}
                    </button>
                </div>

                {/* Send Credits Section */}
                <div className="bg-white border border-teal-50 rounded-3xl p-8 shadow-xl shadow-teal-100 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-2xl -translate-y-10 translate-x-10"></div>

                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center">
                            <Send size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Distribute</h2>
                            <p className="text-sm text-slate-500">Send credits to opted-in student wallets.</p>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10 flex-grow">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                Asset ID (CRED)
                            </label>
                            <input
                                type="text"
                                className="block w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 focus:ring-0 focus:border-teal-400 transition-colors shadow-sm font-mono"
                                placeholder="e.g. 1045892"
                                value={sendAssetId}
                                onChange={(e) => setSendAssetId(e.target.value)}
                                disabled={loadingSend}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                Amount to Send
                            </label>
                            <input
                                type="number"
                                className="block w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 focus:ring-0 focus:border-teal-400 transition-colors shadow-sm"
                                placeholder="e.g. 50"
                                value={sendAmount}
                                onChange={(e) => setSendAmount(e.target.value)}
                                disabled={loadingSend}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                Student Wallet
                            </label>
                            <input
                                type="text"
                                className="block w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 focus:ring-0 focus:border-teal-400 transition-colors shadow-sm font-mono text-sm"
                                placeholder="58-character Algorand address"
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                disabled={loadingSend}
                            />
                        </div>
                    </div>

                    <button
                        onClick={onSendTokens}
                        disabled={loadingSend || !activeAddress}
                        className={`w-full mt-6 h-14 rounded-xl flex items-center justify-center gap-2 font-bold text-lg transition-all shadow-lg ${loadingSend || !activeAddress
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-teal-500 hover:bg-teal-600 text-white shadow-teal-200 hover:shadow-teal-300'
                            }`}
                    >
                        {loadingSend ? (
                            <><span className="loading loading-spinner loading-sm"></span> Sending...</>
                        ) : (
                            <><Send size={20} /> Transfer Credits</>
                        )}
                    </button>
                </div>
            </div>

            {/* Pending Mission Requests Section */}
            <div className="mt-8 bg-white border border-indigo-50 rounded-3xl p-8 shadow-xl shadow-indigo-100/50 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/50 rounded-full blur-3xl -translate-y-10 translate-x-10"></div>

                <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                            <Flame size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Pending Mission Requests</h2>
                            <p className="text-sm text-slate-500">Approve student missions to automatically send ALGO rewards (0.2 - 1.0 ALGO).</p>
                        </div>
                    </div>
                    <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-bold">
                        {pendingRequests.length} Pending
                    </span>
                </div>

                <div className="relative z-10 w-full">
                    {loadingTasks ? (
                        <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-3">
                            <span className="loading loading-spinner text-indigo-400"></span>
                            Fetching blockchain intents...
                        </div>
                    ) : pendingRequests.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                            <CheckCircle size={40} className="mb-3 text-indigo-200" />
                            <p className="font-semibold text-slate-500">All caught up!</p>
                            <p className="text-sm">No new mission rewards requested.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingRequests.map(req => (
                                <div key={req.txId} className="bg-indigo-50/30 border border-indigo-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-indigo-50/60">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-sm shrink-0 mt-1 md:mt-0">
                                            <AlertCircle size={20} className="text-indigo-500" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 flex items-center gap-2">
                                                Mission: <span className="text-indigo-600 font-mono text-sm bg-indigo-100/50 px-2 py-0.5 rounded-md">{req.missionId}</span>
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1 font-mono tracking-tight">
                                                Student: {req.studentAddress.slice(0, 12)}...{req.studentAddress.slice(-8)}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Requested: {new Date(req.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                                        <button
                                            onClick={() => handleRejectMission(req)}
                                            disabled={processingId !== null || !activeAddress}
                                            className="px-4 py-2 rounded-xl font-bold text-xs bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-red-500 disabled:opacity-50 transition-colors"
                                        >
                                            Deny
                                        </button>
                                        <button
                                            onClick={() => handleApproveMission(req)}
                                            disabled={processingId !== null || !activeAddress}
                                            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm ${processingId === req.txId
                                                ? 'bg-indigo-100 text-indigo-400 cursor-wait'
                                                : processingId !== null || !activeAddress
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed hidden md:flex'
                                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                                                }`}
                                        >
                                            {processingId === req.txId ? (
                                                <><span className="loading loading-spinner loading-xs"></span> Paying...</>
                                            ) : (
                                                <><CheckSquare size={16} /> Pay Random ALGO Reward</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ManageCreditsAdmin
