import { useWallet } from '@txnlab/use-wallet-react'
import { CheckCircle, AlertCircle, ShieldAlert, CheckSquare, MapPin, Image as ImageIcon } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useSnackbar } from 'notistack'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import * as algokit from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../../utils/network/getAlgoClientConfigs'
import { BURN_ADDRESS } from '../student/Grievances'

interface Ticket {
    id: string
    message: string
    timestamp: number
    isResolved: boolean
    severity?: string
    address?: string
    image?: string
}

const GrievancesAdmin: React.FC = () => {
    const { activeAddress, transactionSigner } = useWallet()
    const { enqueueSnackbar } = useSnackbar()
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [isLoadingInit, setIsLoadingInit] = useState(true)
    const [isResolving, setIsResolving] = useState<string | null>(null)

    const algodConfig = getAlgodConfigFromViteEnvironment()
    const algorand = AlgorandClient.fromConfig({ algodConfig })
    algorand.setDefaultSigner(transactionSigner)

    const fetchTickets = async () => {
        try {
            const indexerConfig = getIndexerConfigFromViteEnvironment()
            const algorand = AlgorandClient.fromConfig({ algodConfig: getAlgodConfigFromViteEnvironment(), indexerConfig })

            // 1. Fetch all grievance tickets globally
            const ticketPrefix = new TextEncoder().encode('GRIEVANCE_TICKET:')
            const ticketResponse = await algorand.client.indexer.searchForTransactions()
                .address(BURN_ADDRESS)
                .addressRole('receiver')
                .txType('pay')
                .notePrefix(ticketPrefix)
                .do()

            // 2. Fetch all resolution labels globally
            const resolvePrefix = new TextEncoder().encode('RESOLVE_GRIEVANCE:')
            const resolveResponse = await algorand.client.indexer.searchForTransactions()
                .address(BURN_ADDRESS)
                .addressRole('receiver')
                .txType('pay')
                .notePrefix(resolvePrefix)
                .do()

            const resolvedTxids = new Set<string>()
            if (resolveResponse.transactions) {
                for (const txn of resolveResponse.transactions) {
                    try {
                        if (txn.note) {
                            let decodedNote = ''
                            if (typeof txn.note === 'string') {
                                decodedNote = atob(txn.note)
                            } else {
                                decodedNote = new TextDecoder().decode(txn.note)
                            }
                            if (decodedNote.startsWith('RESOLVE_GRIEVANCE:')) {
                                resolvedTxids.add(decodedNote.split(':')[1])
                            }
                        }
                    } catch (e) { }
                }
            }

            const parsedTickets: Ticket[] = []
            if (ticketResponse.transactions) {
                for (const txn of ticketResponse.transactions) {
                    try {
                        if (txn.note) {
                            let decodedNote = ''
                            if (typeof txn.note === 'string') {
                                decodedNote = atob(txn.note)
                            } else {
                                decodedNote = new TextDecoder().decode(txn.note)
                            }
                            // Expected format: GRIEVANCE_TICKET:{timestamp}:{message}
                            if (decodedNote.startsWith('GRIEVANCE_TICKET:')) {
                                const parts = decodedNote.substring('GRIEVANCE_TICKET:'.length).split(':')
                                if (parts.length >= 2 && txn.id) {
                                    const timestamp = parseInt(parts[0], 10)
                                    const msgStr = parts.slice(1).join(':') // rejoin rest of message

                                    let msg = msgStr
                                    let severity = 'low'
                                    let address = ''
                                    let imgUrl = ''

                                    try {
                                        if (msgStr.startsWith('{')) {
                                            const payload = JSON.parse(msgStr)
                                            msg = payload.m || ''
                                            severity = payload.s || 'low'
                                            address = payload.a || ''
                                            imgUrl = payload.i || ''
                                        }
                                    } catch (e) { }

                                    parsedTickets.push({
                                        id: txn.id,
                                        message: msg,
                                        severity,
                                        address,
                                        image: imgUrl,
                                        timestamp: timestamp * 1000,
                                        isResolved: resolvedTxids.has(txn.id)
                                    })
                                }
                            }
                        }
                    } catch (e) { }
                }
            }

            // Sort by newest first
            parsedTickets.sort((a, b) => b.timestamp - a.timestamp)
            setTickets(parsedTickets)

        } catch (error) {
            console.error('Error fetching tickets', error)
        } finally {
            setIsLoadingInit(false)
        }
    }

    useEffect(() => {
        fetchTickets()
    }, [activeAddress])

    const handleResolve = async (ticketId: string) => {
        if (!activeAddress) {
            enqueueSnackbar('Please connect your admin wallet first', { variant: 'warning' })
            return
        }

        setIsResolving(ticketId)
        try {
            enqueueSnackbar('Please sign the transaction to mark as fixed...', { variant: 'info' })

            const noteString = `RESOLVE_GRIEVANCE:${ticketId}`

            await algorand.send.payment({
                sender: activeAddress,
                receiver: BURN_ADDRESS,
                amount: algokit.microAlgos(0),
                note: noteString,
            })

            enqueueSnackbar('Grievance marked as fixed!', { variant: 'success' })
            // Refresh tickets to show the update
            setTimeout(fetchTickets, 3000)
        } catch (error: any) {
            console.error(error)
            enqueueSnackbar(error.message || 'Failed to resolve grievance', { variant: 'error' })
        } finally {
            setIsResolving(null)
        }
    }

    const openTickets = tickets.filter(t => !t.isResolved)
    const resolvedTickets = tickets.filter(t => t.isResolved)

    return (
        <div className="flex flex-col max-w-5xl mx-auto w-full">
            <div className="mb-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-teal-200">
                    <ShieldAlert size={32} />
                </div>
                <h1 className="text-3xl font-black text-emerald-950 mb-2">Grievance Management</h1>
                <p className="text-emerald-800/80 font-medium max-w-lg">Review and resolve anonymous complaints submitted securely via the blockchain.</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Open Tickets Column */}
                <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <AlertCircle size={20} className="text-amber-500" />
                            Needs Attention
                        </h2>
                        <span className="text-sm font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">{openTickets.length} Open</span>
                    </div>

                    <div className="bg-white border border-amber-100 rounded-3xl p-6 shadow-xl shadow-amber-100/30 min-h-[400px]">
                        {isLoadingInit ? (
                            <div className="h-full flex items-center justify-center text-slate-400 gap-3 font-semibold pt-10">
                                <span className="loading loading-spinner"></span> Retrieving logs...
                            </div>
                        ) : openTickets.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 pt-10">
                                <CheckCircle size={48} className="mb-4 text-emerald-300" />
                                <p className="font-semibold text-lg text-emerald-700">All caught up!</p>
                                <p className="text-sm">No active grievances exist.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {openTickets.map(ticket => (
                                    <div key={ticket.id} className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/40 rounded-full blur-xl -translate-y-8 translate-x-8"></div>

                                        <div className="flex justify-between items-start mb-4 relative z-10">
                                            <span className="text-xs text-slate-500 font-medium bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100 font-mono">
                                                Ticket #{ticket.id.slice(-6).toUpperCase()}
                                            </span>
                                            <span className="text-xs text-slate-400 font-medium">
                                                {new Date(ticket.timestamp).toLocaleString(undefined, {
                                                    month: 'short', day: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                        </div>

                                        <p className="text-slate-700 font-medium whitespace-pre-wrap leading-relaxed text-sm mb-4 relative z-10">
                                            "{ticket.message}"
                                        </p>

                                        {(ticket.address || ticket.image || ticket.severity) && (
                                            <div className="mb-5 pt-3 border-t border-amber-200/50 flex flex-wrap gap-2 items-center relative z-10">
                                                {ticket.severity && ticket.severity !== 'low' && (
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md capitalize ${ticket.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                                            ticket.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                                                'bg-amber-200 text-amber-800'
                                                        }`}>
                                                        {ticket.severity}
                                                    </span>
                                                )}
                                                {ticket.address && (
                                                    <span className="text-[10px] font-bold text-slate-600 bg-white/60 border border-amber-200/50 px-2 py-1 rounded-md flex items-center gap-1 cursor-default">
                                                        <MapPin size={12} /> {ticket.address}
                                                    </span>
                                                )}
                                                {ticket.image && (
                                                    <a href={ticket.image} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-blue-700 bg-blue-100/80 border border-blue-200 px-2 py-1 rounded-md flex items-center gap-1 hover:bg-blue-200 transition-colors">
                                                        <ImageIcon size={12} /> Proof
                                                    </a>
                                                )}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => handleResolve(ticket.id)}
                                            disabled={isResolving === ticket.id || !activeAddress}
                                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${isResolving === ticket.id || !activeAddress
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : 'bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-200'
                                                }`}
                                        >
                                            {isResolving === ticket.id ? (
                                                <><span className="loading loading-spinner loading-xs"></span> Resolving...</>
                                            ) : (
                                                <><CheckSquare size={16} /> Mark as Fixed</>
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Resolved Tickets Column */}
                <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <CheckCircle size={20} className="text-emerald-500" />
                            Resolved Tickets
                        </h2>
                        <span className="text-sm font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">{resolvedTickets.length} Fixed</span>
                    </div>

                    <div className="bg-white border text-left border-emerald-100 rounded-3xl p-6 shadow-xl shadow-emerald-100/30 min-h-[400px]">
                        {isLoadingInit ? (
                            <div className="h-full flex items-center justify-center text-slate-400 gap-3 font-semibold pt-10">
                                <span className="loading loading-spinner"></span> Retrieving logs...
                            </div>
                        ) : resolvedTickets.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 pt-10">
                                <p className="font-semibold px-4 text-center">No resolved grievances yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 opacity-75 hover:opacity-100 transition-opacity">
                                {resolvedTickets.map(ticket => (
                                    <div key={ticket.id} className="bg-emerald-50/30 border border-emerald-100 rounded-2xl p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                                    Fixed
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    #{ticket.id.slice(-6).toUpperCase()}
                                                </span>
                                            </div>
                                            <span className="text-xs text-slate-400">
                                                {new Date(ticket.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-slate-600 text-sm italic line-clamp-2">
                                            "{ticket.message}"
                                        </p>

                                        {(ticket.address || ticket.image || ticket.severity) && (
                                            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                                                {ticket.severity && ticket.severity !== 'low' && (
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${ticket.severity === 'critical' ? 'bg-red-50 text-red-600' :
                                                            ticket.severity === 'high' ? 'bg-orange-50 text-orange-600' :
                                                                'bg-amber-50 text-amber-600'
                                                        }`}>
                                                        {ticket.severity}
                                                    </span>
                                                )}
                                                {ticket.address && (
                                                    <span className="text-[9px] font-medium text-slate-500 bg-white/50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                        <MapPin size={10} /> {ticket.address}
                                                    </span>
                                                )}
                                                {ticket.image && (
                                                    <a href={ticket.image} target="_blank" rel="noopener noreferrer" className="text-[9px] font-medium text-blue-500 bg-white/50 px-1.5 py-0.5 rounded flex items-center gap-0.5 hover:bg-blue-50">
                                                        <ImageIcon size={10} /> Image
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default GrievancesAdmin
