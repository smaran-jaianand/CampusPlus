import * as algosdk from 'algosdk'
import { useWallet } from '@txnlab/use-wallet-react'
import { Search, CheckSquare, ShieldCheck, ArrowRight } from 'lucide-react'
import React, { useState, useMemo } from 'react'
import { useSnackbar } from 'notistack'
import { getAlgodConfigFromViteEnvironment } from '../../utils/network/getAlgoClientConfigs'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import * as algokit from '@algorandfoundation/algokit-utils'

const SignAttendance: React.FC = () => {
    const { activeAddress, transactionSigner } = useWallet()
    const { enqueueSnackbar } = useSnackbar()
    const [tokenInput, setTokenInput] = useState('')
    const [isSigning, setIsSigning] = useState(false)

    const algorand = useMemo(() => {
        const algodConfig = getAlgodConfigFromViteEnvironment()
        const client = AlgorandClient.fromConfig({ algodConfig })
        client.setDefaultSigner(transactionSigner)
        return client
    }, [transactionSigner])

    const handleSign = async () => {
        if (!activeAddress) {
            enqueueSnackbar('Connect wallet first', { variant: 'error' })
            return
        }

        if (!tokenInput) {
            enqueueSnackbar('Please enter a daily token ID', { variant: 'error' })
            return
        }

        setIsSigning(true)

        try {
            enqueueSnackbar('Awaiting signature...', { variant: 'info' })

            const result = await algorand.send.payment({
                sender: activeAddress,
                receiver: activeAddress,
                amount: algokit.microAlgos(0),
                note: `ATTENDANCE_TOKEN:${tokenInput}`
            })

            enqueueSnackbar(`Attendance marked! TX ID: ${result.transaction.txID()}`, { variant: 'success' })
            setTokenInput('')
        } catch (e: any) {
            console.error(e)
            enqueueSnackbar(e.message || 'Failed to sign attendance', { variant: 'error' })
        } finally {
            setIsSigning(false)
        }
    }

    return (
        <div className="flex flex-col max-w-4xl mx-auto w-full">
            <div className="mb-10 text-center">
                <h1 className="text-3xl font-black text-teal-900 mb-2">Sign Attendance</h1>
                <p className="text-teal-700/80 font-medium">Verify student presence via on-chain proof.</p>
            </div>

            <div className="bg-white border border-teal-50 rounded-3xl p-8 md:p-12 w-full shadow-xl shadow-cyan-100/50 max-w-2xl mx-auto relative overflow-hidden">
                <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-teal-50 rounded-full blur-3xl"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-50 rounded-full blur-2xl -translate-y-10 translate-x-10"></div>

                <div className="relative z-10 space-y-8">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <ShieldCheck size={16} className="text-teal-500" />
                            Daily Token ID
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-mono focus:ring-0 focus:border-teal-400 transition-colors shadow-sm"
                                placeholder="ATT-XXXXXX-XXXXX"
                                value={tokenInput}
                                onChange={(e) => setTokenInput(e.target.value)}
                                disabled={isSigning}
                            />
                        </div>
                    </div>



                    <div className="pt-6 border-t border-slate-100">
                        <button
                            onClick={handleSign}
                            disabled={isSigning || !activeAddress}
                            className={`w-full h-16 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg transition-all shadow-lg ${isSigning || !activeAddress
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border-none'
                                : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-teal-200 hover:shadow-cyan-300 border-none'
                                }`}
                        >
                            {isSigning ? (
                                <>
                                    <span className="loading loading-spinner loading-md"></span>
                                    Processing Transaction...
                                </>
                            ) : (
                                <>
                                    <CheckSquare size={24} />
                                    Confirm & Mark Attendance
                                </>
                            )}
                        </button>

                        {!activeAddress && (
                            <p className="text-center text-sm text-red-500 mt-4 font-medium flex items-center justify-center gap-2">
                                Administrator wallet connection required. <ArrowRight size={14} />
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SignAttendance
