import { useWallet } from '@txnlab/use-wallet-react'
import { CheckCircle, AlertCircle, MessageSquare, Send, Clock, UserX, MapPin, Image as ImageIcon } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useSnackbar } from 'notistack'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import * as algokit from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../../utils/network/getAlgoClientConfigs'
import { pinFileToIPFS, ipfsHttpUrl } from '../../utils/pinata'

// Legitimate Testnet address used as the global grievance board (receiver must be funded to pass PeraWallet simulation)
export const BURN_ADDRESS = 'GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A'

interface Ticket {
    id: string
    message: string
    timestamp: number
    isResolved: boolean
    severity?: string
    address?: string
    image?: string
}

const Grievances: React.FC = () => {
    const { activeAddress, transactionSigner } = useWallet()
    const { enqueueSnackbar } = useSnackbar()
    const [message, setMessage] = useState('')
    const [severity, setSeverity] = useState('low')
    const [location, setLocation] = useState('')
    const [image, setImage] = useState<File | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [isLoadingInit, setIsLoadingInit] = useState(true)

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
                                if (parts.length >= 2) {
                                    const timestamp = parseInt(parts[0], 10)
                                    const msgStr = parts.slice(1).join(':') // rejoin rest of message if it contained colons

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

                                    if (txn.id) {
                                        parsedTickets.push({
                                            id: txn.id,
                                            message: msg,
                                            severity,
                                            address,
                                            image: imgUrl,
                                            timestamp: timestamp * 1000, // convert sec to ms
                                            isResolved: resolvedTxids.has(txn.id)
                                        })
                                    }
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!activeAddress) {
            enqueueSnackbar('Please connect your wallet first', { variant: 'warning' })
            return
        }
        if (!message.trim()) {
            enqueueSnackbar('Message cannot be empty', { variant: 'error' })
            return
        }

        setIsSubmitting(true)
        try {
            enqueueSnackbar('Preparing your anonymous ticket...', { variant: 'info' })

            let ipfsUrl = ''
            if (image) {
                enqueueSnackbar('Uploading image anonymously to IPFS...', { variant: 'info' })
                const filePin = await pinFileToIPFS(image)
                ipfsUrl = ipfsHttpUrl(filePin.IpfsHash)
            }

            enqueueSnackbar('Please sign the transaction to submit to the global board...', { variant: 'info' })

            // Unix timestamp in seconds
            const ts = Math.floor(Date.now() / 1000)

            const payload = {
                m: message.trim(),
                s: severity,
                a: location.trim(),
                i: ipfsUrl
            }

            const noteString = `GRIEVANCE_TICKET:${ts}:${JSON.stringify(payload)}`

            await algorand.send.payment({
                sender: activeAddress,
                receiver: BURN_ADDRESS,
                amount: algokit.microAlgos(0),
                note: noteString,
            })

            // Optimistic UI update for instant feedback
            const newTicket: Ticket = {
                id: `pending-${ts}`,
                message: message.trim(),
                severity,
                address: location.trim(),
                image: ipfsUrl,
                timestamp: ts * 1000,
                isResolved: false,
            }
            setTickets(prev => [newTicket, ...prev])

            enqueueSnackbar('Anonymous Grievance Submitted Successfully!', { variant: 'success' })
            setMessage('')
            setLocation('')
            setImage(null)
            // Refresh tickets to show the new submission
            setTimeout(fetchTickets, 3000) // slight delay for block propagation
        } catch (error: any) {
            console.error(error)
            enqueueSnackbar(error.message || 'Failed to submit grievance', { variant: 'error' })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col max-w-5xl mx-auto w-full">
            <div className="mb-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-rose-200">
                    <UserX size={32} />
                </div>
                <h1 className="text-3xl font-black text-rose-950 mb-2">Anonymous Grievances</h1>
                <p className="text-rose-800/80 font-medium max-w-lg">Submit campus issues or concerns safely. All tickets are logged anonymously onto the blockchain where admins can view and resolve them openly.</p>
            </div>

            <div className="grid lg:grid-cols-5 gap-8">
                {/* Submit Form */}
                <div className="lg:col-span-2">
                    <div className="bg-white border text-left border-rose-100 rounded-3xl p-6 shadow-xl shadow-rose-100/50 relative overflow-hidden h-full flex flex-col">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-2xl -translate-y-10 translate-x-10"></div>

                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
                                <MessageSquare size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">New Ticket</h2>
                                <p className="text-xs text-slate-500 font-medium tracking-wide">COMPLETELY ANONYMOUS</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-grow relative z-10">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Your Issue</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Describe the problem you are facing..."
                                className="w-full flex-grow min-h-[160px] p-4 bg-slate-50 border-2 border-slate-100 rounded-xl resize-none focus:outline-none focus:border-rose-300 focus:bg-white transition-all text-slate-700 mb-6"
                                disabled={isSubmitting}
                                maxLength={800} // indexer note limits around 1kb typically
                            />

                            <button
                                type="submit"
                                disabled={isSubmitting || !activeAddress || !message.trim()}
                                className={`w-full mt-auto h-14 rounded-xl flex items-center justify-center gap-2 font-bold text-lg transition-all shadow-lg ${isSubmitting || !activeAddress || !message.trim()
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                    : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200 hover:shadow-rose-300'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <><span className="loading loading-spinner loading-sm"></span> Submitting Securely...</>
                                ) : (
                                    <><Send size={20} /> Send Anonymously</>
                                )}
                            </button>

                            {!activeAddress && (
                                <p className="text-xs text-center mt-4 text-rose-500 font-medium">Connect wallet to submit. Your address is wiped from our front-end displays making it extremely hard to trace back to you.</p>
                            )}
                        </form>
                    </div>
                </div>

                {/* Public Ticket Feed */}
                <div className="lg:col-span-3 flex flex-col">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Clock size={20} className="text-slate-400" />
                            Global Ticket View
                        </h2>
                        <span className="text-sm font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{tickets.length} Total</span>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-lg shadow-slate-100/50 flex flex-col flex-grow">
                        {isLoadingInit ? (
                            <div className="h-48 flex items-center justify-center text-slate-400 gap-3 font-semibold">
                                <span className="loading loading-spinner"></span> Loading blockchain tickets...
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="flex-grow flex flex-col items-center justify-center text-slate-400 py-10">
                                <CheckCircle size={48} className="mb-4 text-slate-200" />
                                <p className="font-semibold text-lg">No grievances reported.</p>
                                <p className="text-sm">The campus is peaceful.</p>
                            </div>
                        ) : (
                            <div className="overflow-y-auto max-h-[500px] pr-2 space-y-4">
                                {tickets.map(ticket => (
                                    <div key={ticket.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 transition-all hover:border-rose-100 hover:shadow-md">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                {ticket.isResolved ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                                        <CheckCircle size={14} /> Fixed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                                                        <AlertCircle size={14} /> Open
                                                    </span>
                                                )}
                                                <span className="text-xs text-slate-400 font-medium bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100 font-mono">
                                                    {ticket.isResolved ? 'Resolved Issue' : 'Active Ticket'}
                                                </span>
                                            </div>
                                            <span className="text-xs text-slate-400 font-medium">
                                                {new Date(ticket.timestamp).toLocaleString(undefined, {
                                                    month: 'short', day: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                        </div>

                                        <div className="mt-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <p className="text-gray-700 leading-relaxed font-medium">
                                                "{ticket.message}"
                                            </p>

                                            {(ticket.address || ticket.image || ticket.severity) && (
                                                <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap gap-2 items-center">
                                                    {ticket.severity && ticket.severity !== 'low' && (
                                                        <span className={`text-xs font-bold px-2 py-1 rounded-md capitalize ${ticket.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                                                ticket.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                                                    'bg-amber-100 text-amber-700'
                                                            }`}>
                                                            {ticket.severity} Priority
                                                        </span>
                                                    )}
                                                    {ticket.address && (
                                                        <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                                            <MapPin size={14} /> {ticket.address}
                                                        </span>
                                                    )}
                                                    {ticket.image && (
                                                        <a href={ticket.image} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-blue-200 transition-colors">
                                                            <ImageIcon size={14} /> View Evidence
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
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

export default Grievances
