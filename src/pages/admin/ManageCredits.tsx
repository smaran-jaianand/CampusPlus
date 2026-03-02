import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import React, { useMemo, useState } from 'react'
import { Coins, Send, CheckCircle, Store } from 'lucide-react'
import { getAlgodConfigFromViteEnvironment } from '../../utils/network/getAlgoClientConfigs'

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

    const algorand = useMemo(() => {
        const algodConfig = getAlgodConfigFromViteEnvironment()
        const client = AlgorandClient.fromConfig({ algodConfig })
        client.setDefaultSigner(transactionSigner)
        return client
    }, [transactionSigner])

    const onCreateTokens = async () => {
        if (!activeAddress) return enqueueSnackbar('Connect a wallet first', { variant: 'error' })
        if (!total || isNaN(Number(total)) || Number(total) <= 0) return enqueueSnackbar('Invalid total amount', { variant: 'error' })

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
        if (!activeAddress) return enqueueSnackbar('Connect a wallet first', { variant: 'error' })
        if (!sendAssetId || !sendAmount || !recipient) return enqueueSnackbar('Fill all fields', { variant: 'error' })
        if (recipient.length !== 58) return enqueueSnackbar('Invalid algorand address', { variant: 'error' })

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
        </div>
    )
}

export default ManageCreditsAdmin
