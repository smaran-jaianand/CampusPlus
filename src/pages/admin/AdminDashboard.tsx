import { useWallet } from '@txnlab/use-wallet-react'
import { ShieldCheck, Users, CheckSquare, PlusCircle, Send } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../../utils/network/getAlgoClientConfigs'
import { STUDENT_ROSTER } from '../../config/admin.config'

const AdminDashboard: React.FC = () => {
    const { activeAddress } = useWallet()

    const [stats, setStats] = useState({
        students: 0,
        presentToday: 0,
        certsIssued: 0,
        tokensCirculating: 0
    })
    const [loadingStats, setLoadingStats] = useState(false)

    useEffect(() => {
        if (!activeAddress) return

        const fetchDashboardStats = async () => {
            setLoadingStats(true)
            try {
                const indexerConfig = getIndexerConfigFromViteEnvironment()
                const indexer = AlgorandClient.fromConfig({ algodConfig: getAlgodConfigFromViteEnvironment(), indexerConfig }).client.indexer

                // 1. Total Enrolled Students (From our static roster for now)
                const totalStudents = STUDENT_ROSTER.length

                // 2. Present Today (Count of ATTENDANCE_TICKET transactions from Admin today)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const isoDateString = today.toISOString()

                const attendancePrefix = new TextEncoder().encode('ATTENDANCE_TICKET')
                const attendanceResponse = await indexer.searchForTransactions()
                    .address(activeAddress)
                    .addressRole('sender')
                    .txType('pay')
                    .notePrefix(attendancePrefix)
                    .afterTime(isoDateString)
                    .do()

                // Since attendance is one ticket per student per day, just count valid payloads sent to roster members
                const presentToday = attendanceResponse.transactions?.filter((txn: any) => txn.receiver && STUDENT_ROSTER.includes(txn.receiver)).length || 0

                // 3. Certificates Issued (Count of ASA creations by Admin with unitName 'CERT')
                const assetsResponse = await indexer.searchForAssets()
                    .creator(activeAddress)
                    .unit('CERT')
                    .do()

                const certsIssued = assetsResponse.assets?.length || 0

                // 4. Tokens Distributed (Sum of all real ALGO sent via MISSION_REWARD)
                const rewardPrefix = new TextEncoder().encode('MISSION_REWARD:')
                const rewardResponse = await indexer.searchForTransactions()
                    .address(activeAddress)
                    .addressRole('sender')
                    .txType('pay')
                    .notePrefix(rewardPrefix)
                    .do()

                let tokensCirculating = 0
                if (rewardResponse.transactions) {
                    for (const txn of rewardResponse.transactions) {
                        if (txn['payment-transaction'] && txn['payment-transaction'].amount) {
                            // Sum microAlgos and convert to ALGO
                            const amountAlgo = txn['payment-transaction'].amount / 1_000_000
                            tokensCirculating += amountAlgo
                        }
                    }
                }

                setStats({
                    students: totalStudents,
                    presentToday,
                    certsIssued,
                    tokensCirculating: parseFloat(tokensCirculating.toFixed(2))
                })

            } catch (error) {
                console.error("Failed to load dashboard stats", error)
            } finally {
                setLoadingStats(false)
            }
        }

        fetchDashboardStats()
    }, [activeAddress])

    return (
        <div className="flex flex-col max-w-5xl mx-auto w-full">
            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black text-teal-900 mb-2 flex items-center gap-3">
                        <ShieldCheck size={36} className="text-teal-500" />
                        Admin Command Center
                    </h1>
                    <p className="text-teal-700/80 font-medium">Manage student attendance, digital assets, and campus economy.</p>
                </div>

                {activeAddress && (
                    <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-teal-800 font-mono">ID: {activeAddress.substring(0, 10)}...</span>
                    </div>
                )}
            </div>

            {!activeAddress ? (
                <div className="bg-white border rounded-3xl p-12 w-full text-center shadow-lg shadow-teal-100/50 flex flex-col items-center justify-center max-w-2xl mx-auto">
                    <ShieldCheck size={72} strokeWidth={1.5} className="text-teal-200 mb-6" />
                    <h2 className="text-2xl font-bold text-teal-900 mb-3">Admin Authentication Required</h2>
                    <p className="text-teal-600/80 max-w-md font-medium">Please connect your authorized administrative wallet to access the command center.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Sign Attendance Card */}
                    <Link to="/admin/sign" className="group bg-white rounded-3xl p-8 shadow-lg shadow-teal-100/50 border border-teal-50 hover:-translate-y-2 hover:shadow-xl hover:shadow-cyan-200/50 transition-all duration-300 relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-50 rounded-full blur-2xl -translate-y-10 translate-x-10 group-hover:bg-cyan-100 transition-colors"></div>

                        <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-md shadow-cyan-200 group-hover:scale-110 transition-transform relative z-10">
                            <CheckSquare size={32} />
                        </div>

                        <h2 className="text-xl font-bold text-slate-800 mb-2 relative z-10">Sign Attendance</h2>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed relative z-10 flex-grow">
                            Verify student daily tokens and mark attendance via zero-ALGO on-chain transactions.
                        </p>

                        <div className="mt-6 text-cyan-600 font-bold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                            Launch Module &rarr;
                        </div>
                    </Link>

                    {/* Mint NFTs Card */}
                    <Link to="/admin/mint" className="group bg-white rounded-3xl p-8 shadow-lg shadow-teal-100/50 border border-teal-50 hover:-translate-y-2 hover:shadow-xl hover:shadow-fuchsia-200/50 transition-all duration-300 relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-50 rounded-full blur-2xl -translate-y-10 translate-x-10 group-hover:bg-fuchsia-100 transition-colors"></div>

                        <div className="w-16 h-16 bg-gradient-to-br from-fuchsia-400 to-purple-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-md shadow-fuchsia-200 group-hover:scale-110 transition-transform relative z-10">
                            <PlusCircle size={32} />
                        </div>

                        <h2 className="text-xl font-bold text-slate-800 mb-2 relative z-10">Mint Certificates</h2>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed relative z-10 flex-grow">
                            Issue ARC-3 non-fungible tokens to students for awards, achievements, and graduation.
                        </p>

                        <div className="mt-6 text-fuchsia-600 font-bold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                            Launch Module &rarr;
                        </div>
                    </Link>

                    {/* Manage Credits Card */}
                    <Link to="/admin/credits" className="group bg-white rounded-3xl p-8 shadow-lg shadow-teal-100/50 border border-teal-50 hover:-translate-y-2 hover:shadow-xl hover:shadow-emerald-200/50 transition-all duration-300 relative overflow-hidden flex flex-col md:col-span-2 lg:col-span-1">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl -translate-y-10 translate-x-10 group-hover:bg-emerald-100 transition-colors"></div>

                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-md shadow-emerald-200 group-hover:scale-110 transition-transform relative z-10">
                            <Send size={32} />
                        </div>

                        <h2 className="text-xl font-bold text-slate-800 mb-2 relative z-10">Distribute Credits</h2>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed relative z-10 flex-grow">
                            Manage and send campus fungible tokens to student wallets for cafeteria and bookstore purchases.
                        </p>

                        <div className="mt-6 text-emerald-600 font-bold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                            Launch Module &rarr;
                        </div>
                    </Link>

                    {/* Quick Stats */}
                    <div className="md:col-span-2 lg:col-span-3 bg-slate-900 rounded-3xl p-8 shadow-xl relative overflow-hidden mt-4">
                        <div className="absolute -right-20 -top-20 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl"></div>

                        <div className="flex items-center gap-3 mb-8">
                            <Users size={24} className="text-teal-400" />
                            <h3 className="text-xl font-bold text-white">Campus Overview</h3>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="border-l-2 border-teal-500/30 pl-4 transition-all hover:border-teal-500 focus-within:border-teal-500">
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Students</p>
                                <p className="text-3xl font-black text-white">
                                    {loadingStats ? <span className="loading loading-spinner loading-md text-teal-500 opacity-50"></span> : stats.students}
                                </p>
                            </div>
                            <div className="border-l-2 border-cyan-500/30 pl-4 transition-all hover:border-cyan-500 focus-within:border-cyan-500">
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Present Today</p>
                                <p className="text-3xl font-black text-cyan-400">
                                    {loadingStats ? <span className="loading loading-spinner loading-md text-cyan-500 opacity-50"></span> : stats.presentToday}
                                </p>
                            </div>
                            <div className="border-l-2 border-fuchsia-500/30 pl-4 transition-all hover:border-fuchsia-500 focus-within:border-fuchsia-500">
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Certificates Issued</p>
                                <p className="text-3xl font-black text-white">
                                    {loadingStats ? <span className="loading loading-spinner loading-md text-fuchsia-500 opacity-50"></span> : stats.certsIssued.toLocaleString()}
                                </p>
                            </div>
                            <div className="border-l-2 border-emerald-500/30 pl-4 transition-all hover:border-emerald-500 focus-within:border-emerald-500">
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Rewards Disbursed</p>
                                <p className="text-3xl font-black text-white flex items-end gap-1">
                                    {loadingStats ? <span className="loading loading-spinner loading-md text-emerald-500 opacity-50"></span> : (
                                        <>
                                            {stats.tokensCirculating.toLocaleString()} <span className="text-sm text-emerald-500 mb-1 font-bold">ALGO</span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminDashboard
