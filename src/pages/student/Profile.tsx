import { useWallet } from '@txnlab/use-wallet-react'
import { User, Wallet, Activity, Award, BookOpen } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { getAttendanceHistory, AttendanceToken } from '../../utils/attendance'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../../utils/network/getAlgoClientConfigs'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'

const Profile: React.FC = () => {
    const { activeAddress } = useWallet()
    const [history, setHistory] = useState<AttendanceToken[]>([])
    const [verifiedCount, setVerifiedCount] = useState<number>(0)
    const [attendanceRate, setAttendanceRate] = useState<number>(0)

    // Load history and verify tokens on mount
    useEffect(() => {
        if (!activeAddress) {
            setHistory([])
            setVerifiedCount(0)
            setAttendanceRate(0)
            return
        }

        const localHistory = getAttendanceHistory(activeAddress)
        setHistory(localHistory)

        if (localHistory.length === 0) {
            setAttendanceRate(0)
            return
        }

        const checkConfirmation = async () => {
            try {
                const indexerConfig = getIndexerConfigFromViteEnvironment()
                const algodConfig = getAlgodConfigFromViteEnvironment()
                const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })

                // Look back 14 days
                const twoWeeksAgo = new Date()
                twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

                const walletPrefix = new TextEncoder().encode(`ATTENDANCE_TOKEN:ATT-${activeAddress.substring(0, 8)}`)
                const response = await algorand.client.indexer.searchForTransactions()
                    .notePrefix(walletPrefix)
                    .afterTime(twoWeeksAgo.toISOString())
                    .do()

                if (response.transactions && response.transactions.length > 0) {
                    const verifiedSet = new Set<string>()
                    for (const txn of response.transactions) {
                        try {
                            if (txn.note) {
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
                        } catch (e) { }
                    }
                    setVerifiedCount(verifiedSet.size)
                    setAttendanceRate(Math.round((verifiedSet.size / localHistory.length) * 100))
                }
            } catch (error) {
                console.error(error)
            }
        }

        checkConfirmation()
    }, [activeAddress])

    return (
        <div className="flex flex-col max-w-4xl mx-auto w-full">
            <div className="mb-10 text-center">
                <h1 className="text-3xl font-bold text-indigo-900 mb-2">Student Profile</h1>
                <p className="text-indigo-600/80">Manage your identity and digital assets.</p>
            </div>

            {!activeAddress ? (
                <div className="bg-white border rounded-3xl p-10 w-full text-center shadow-lg shadow-indigo-100 flex flex-col items-center justify-center max-w-2xl mx-auto">
                    <User size={64} className="text-gray-300 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Not Logged In</h2>
                    <p className="text-gray-500 max-w-sm">Connect your student wallet to view your personalized profile.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-3 gap-6">
                    {/* Identity Card */}
                    <div className="md:col-span-1 bg-white rounded-3xl p-6 shadow-xl border border-indigo-50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700"></div>

                        <div className="flex flex-col items-center relative z-10 text-center">
                            <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 mb-4 ring-4 ring-white">
                                <User size={40} className="text-white" />
                            </div>

                            <h2 className="text-xl font-bold text-gray-800 mb-1">Student #4092</h2>
                            <p className="text-sm font-medium text-indigo-500 mb-6 bg-indigo-50 px-3 py-1 rounded-full">Computer Science</p>

                            <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-4 text-left">
                                <div className="flex items-center gap-2 mb-2">
                                    <Wallet size={16} className="text-slate-400" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Connected Wallet</span>
                                </div>
                                <p className="text-slate-800 font-mono text-sm break-all font-medium leading-relaxed">
                                    {activeAddress}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats & Assets */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-teal-400 to-emerald-500 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/20 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
                                <Activity size={28} className="mb-4 text-teal-100" />
                                <p className="text-teal-100 font-medium text-sm mb-1">Attendance Rate</p>
                                <h3 className="text-4xl font-black">{attendanceRate}%</h3>
                            </div>

                            <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/20 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
                                <Award size={28} className="mb-4 text-amber-100" />
                                <p className="text-amber-100 font-medium text-sm mb-1">Campus Credits</p>
                                <h3 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-amber-100">1,250</h3>
                            </div>
                        </div>

                        {/* Recent Activity Mockup */}
                        <div className="bg-white rounded-3xl p-6 shadow-xl border border-indigo-50">
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <BookOpen size={20} className="text-indigo-500" />
                                    Recent Academic Assets
                                </h3>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold shrink-0">
                                        NFT
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm">Dean's List Certificate F25</h4>
                                        <p className="text-xs text-gray-500 font-medium mt-0.5">Minted: 2 months ago • ARC-3 Standard</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                                        NFT
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm">Hackathon Winner F25</h4>
                                        <p className="text-xs text-gray-500 font-medium mt-0.5">Minted: 3 months ago • ARC-3 Standard</p>
                                    </div>
                                </div>
                            </div>

                            <button className="w-full mt-4 py-3 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">
                                View All Assets in Explorer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Profile
