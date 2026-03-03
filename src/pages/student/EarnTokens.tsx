import { useWallet } from '@txnlab/use-wallet-react'
import { Award, CheckCircle, Flame, Star, Zap } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useSnackbar } from 'notistack'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import * as algokit from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../../utils/network/getAlgoClientConfigs'
import { BURN_ADDRESS } from './Grievances'
import { ADMIN_WALLET_ADDRESS } from '../../config/admin.config'

interface Mission {
    id: string
    title: string
    description: string
    reward: number
    icon: React.ReactNode
    color: string
}

const MISSIONS: Mission[] = [
    {
        id: 'Campus_Tour',
        title: 'Complete Welcome Tour',
        description: 'Explore the main campus facilities and check-in at the student center.',
        reward: 50,
        icon: <Star size={24} className="text-amber-500" />,
        color: 'bg-amber-100',
    },
    {
        id: 'Discord_Join',
        title: 'Join Student Discord',
        description: 'Connect your wallet in the official university Discord server.',
        reward: 25,
        icon: <Flame size={24} className="text-orange-500" />,
        color: 'bg-orange-100',
    },
    {
        id: 'Library_Orientation',
        title: 'Library Orientation',
        description: 'Attend the 15-minute library resource orientation session.',
        reward: 100,
        icon: <Zap size={24} className="text-purple-500" />,
        color: 'bg-purple-100',
    }
]

const EarnTokens: React.FC = () => {
    const { activeAddress, transactionSigner } = useWallet()
    const { enqueueSnackbar } = useSnackbar()
    const [completedMissions, setCompletedMissions] = useState<Set<string>>(new Set())
    const [pendingMissions, setPendingMissions] = useState<Set<string>>(new Set())
    const [rejectedMissions, setRejectedMissions] = useState<Set<string>>(new Set())
    const [loadingMission, setLoadingMission] = useState<string | null>(null)

    const algodConfig = getAlgodConfigFromViteEnvironment()
    const algorand = AlgorandClient.fromConfig({ algodConfig })
    algorand.setDefaultSigner(transactionSigner)

    // Load completed missions by checking indexer for self-transactions
    useEffect(() => {
        if (!activeAddress) {
            setCompletedMissions(new Set())
            return
        }

        const fetchStatus = async () => {
            try {
                const indexerConfig = getIndexerConfigFromViteEnvironment()
                const algorand = AlgorandClient.fromConfig({ algodConfig: getAlgodConfigFromViteEnvironment(), indexerConfig })

                // 1. Fetch pending requests (Sent to zero address by student)
                const requestPrefix = new TextEncoder().encode('MISSION_REQUEST:')
                const requestResponse = await algorand.client.indexer.searchForTransactions()
                    .address(activeAddress)
                    .addressRole('sender')
                    .txType('pay')
                    .notePrefix(requestPrefix)
                    .do()

                // 2. Fetch admin verdicts (Sent from Admin to student)
                const rewardPrefix = new TextEncoder().encode('MISSION_REWARD:')
                const rewardResponse = await algorand.client.indexer.searchForTransactions()
                    .address(activeAddress)
                    .addressRole('receiver')
                    .txType('pay')
                    .notePrefix(rewardPrefix)
                    .do()

                const rejectPrefix = new TextEncoder().encode('MISSION_REJECTED:')
                const rejectResponse = await algorand.client.indexer.searchForTransactions()
                    .address(activeAddress)
                    .addressRole('receiver')
                    .txType('pay')
                    .notePrefix(rejectPrefix)
                    .do()

                const pending = new Set<string>()
                const completed = new Set<string>()
                const rejected = new Set<string>()

                const parseNotes = (response: any, targetSet: Set<string>, prefixLength: number) => {
                    if (response.transactions) {
                        for (const txn of response.transactions) {
                            try {
                                if (txn.note) {
                                    let decodedNote = typeof txn.note === 'string' ? atob(txn.note) : new TextDecoder().decode(txn.note)
                                    // note format is Prefix:ID e.g. MISSION_REQUEST:Campus_Tour
                                    const parts = decodedNote.split(':')
                                    if (parts.length >= 2) {
                                        targetSet.add(parts.slice(1).join(':'))
                                    }
                                }
                            } catch (e) { }
                        }
                    }
                }

                parseNotes(requestResponse, pending, 'MISSION_REQUEST:'.length)

                // Only accept rewards/rejections if they actually came from the Admin
                if (rewardResponse.transactions) {
                    const validRewards = rewardResponse.transactions.filter((t: any) => t.sender === ADMIN_WALLET_ADDRESS)
                    parseNotes({ transactions: validRewards }, completed, 'MISSION_REWARD:'.length)
                }

                if (rejectResponse.transactions) {
                    const validRejects = rejectResponse.transactions.filter((t: any) => t.sender === ADMIN_WALLET_ADDRESS)
                    parseNotes({ transactions: validRejects }, rejected, 'MISSION_REJECTED:'.length)
                }

                // Remove pending state if it's been completed or rejected
                completed.forEach(id => pending.delete(id))
                rejected.forEach(id => pending.delete(id))

                setPendingMissions(pending)
                setCompletedMissions(completed)
                setRejectedMissions(rejected)

            } catch (error) {
                console.error('Error fetching mission statuses:', error)
            }
        }

        fetchStatus()
    }, [activeAddress])

    const handleCompleteMission = async (mission: Mission) => {
        if (!activeAddress) {
            enqueueSnackbar('Please connect your wallet first', { variant: 'warning' })
            return
        }
        if (completedMissions.has(mission.id) || pendingMissions.has(mission.id)) return

        setLoadingMission(mission.id)
        try {
            enqueueSnackbar(`Please sign the request for your ${mission.reward} credits...`, { variant: 'info' })

            // Send a 0 ALGO request to the burn address. Admin will monitor this.
            const noteString = `MISSION_REQUEST:${mission.id}`

            await algorand.send.payment({
                sender: activeAddress,
                receiver: BURN_ADDRESS,
                amount: algokit.microAlgos(0),
                note: noteString,
            })

            enqueueSnackbar(`Mission Complete Request Sent! Pending Admin Approval.`, { variant: 'success' })
            setPendingMissions(prev => new Set(prev).add(mission.id))
        } catch (error: any) {
            console.error(error)
            enqueueSnackbar(error.message || 'Failed to complete mission', { variant: 'error' })
        } finally {
            setLoadingMission(null)
        }
    }

    return (
        <div className="flex flex-col max-w-4xl mx-auto w-full">
            <div className="mb-10 text-center">
                <h1 className="text-3xl font-black text-indigo-900 mb-2">Earn Campus Credits</h1>
                <p className="text-indigo-700/80 font-medium">Complete university missions to earn tokens for the campus store.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {MISSIONS.map((mission) => {
                    const isCompleted = completedMissions.has(mission.id)
                    const isPending = pendingMissions.has(mission.id)
                    const isRejected = rejectedMissions.has(mission.id)
                    const isLoading = loadingMission === mission.id

                    return (
                        <div key={mission.id} className={`bg-white border rounded-3xl p-6 relative overflow-hidden transition-all duration-300 ${isCompleted ? 'border-green-200 bg-green-50/30' : isRejected ? 'border-red-200 bg-red-50/30' : 'border-indigo-100 shadow-xl shadow-indigo-100/50 hover:-translate-y-1'}`}>

                            {isCompleted && (
                                <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                                    <CheckCircle size={14} />
                                    Approved
                                </div>
                            )}

                            {isRejected && (
                                <div className="absolute top-4 right-4 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 opacity-70">
                                    Rejected
                                </div>
                            )}

                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isCompleted ? 'bg-green-100 grayscale opacity-50' : isRejected ? 'bg-red-100 grayscale opacity-50' : mission.color}`}>
                                {mission.icon}
                            </div>

                            <h3 className={`text-xl font-bold mb-2 ${isCompleted || isRejected ? 'text-slate-500' : 'text-slate-800'}`}>
                                {mission.title}
                            </h3>
                            <p className={`text-sm mb-6 ${isCompleted || isRejected ? 'text-slate-400' : 'text-slate-500'}`}>
                                {mission.description}
                            </p>

                            <div className="mt-auto flex items-center justify-between">
                                <div className={`flex items-center gap-1.5 font-black text-lg ${isCompleted || isRejected ? 'text-slate-400' : 'text-indigo-600'}`}>
                                    <Award size={20} className={isCompleted || isRejected ? 'text-slate-400' : 'text-indigo-500'} />
                                    +{mission.reward}
                                </div>

                                <button
                                    onClick={() => handleCompleteMission(mission)}
                                    disabled={isCompleted || isPending || isRejected || isLoading || !activeAddress}
                                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ${isCompleted
                                        ? 'bg-green-100 text-green-700 shadow-none cursor-default'
                                        : isRejected
                                            ? 'bg-red-100 text-red-500 shadow-none cursor-default'
                                            : isPending
                                                ? 'bg-amber-100 text-amber-700 shadow-none cursor-wait'
                                                : isLoading
                                                    ? 'bg-indigo-100 text-indigo-400 shadow-none cursor-wait'
                                                    : !activeAddress
                                                        ? 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed'
                                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-indigo-300'
                                        }`}
                                >
                                    {isCompleted ? 'Claimed' : isRejected ? 'Denied' : isPending ? 'Pending Approval' : isLoading ? 'Signing...' : 'Request Reward'}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {!activeAddress && (
                <div className="mt-8 text-center text-sm font-medium text-amber-600 bg-amber-50 py-3 rounded-xl border border-amber-100">
                    Connect your wallet to start earning credits!
                </div>
            )}
        </div>
    )
}

export default EarnTokens
