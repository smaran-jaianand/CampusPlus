import { useWallet } from '@txnlab/use-wallet-react'
import { ShieldCheck, ShieldAlert, LogOut, ArrowRightCircle } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { getValidToken, AttendanceToken } from '../../utils/attendance'

const Gatepass: React.FC = () => {
    const { activeAddress } = useWallet()
    const [token, setToken] = useState<AttendanceToken | null>(null)

    useEffect(() => {
        if (activeAddress) {
            setToken(getValidToken(activeAddress))
        } else {
            setToken(null)
        }
    }, [activeAddress])

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
                                    <p className="font-semibold text-emerald-600">{new Date(token.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <button className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-4 rounded-xl flex items-center justify-between font-bold transition-colors group">
                                    <span className="flex items-center gap-3">
                                        <ArrowRightCircle size={20} className="text-emerald-500" />
                                        Entry Scan
                                    </span>
                                    <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-1 rounded-md">Ready</span>
                                </button>
                                <button className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 p-4 rounded-xl flex items-center justify-between font-bold transition-colors">
                                    <span className="flex items-center gap-3">
                                        <LogOut size={20} className="text-gray-400" />
                                        Exit Scan
                                    </span>
                                </button>
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
                                Your daily attendance token is either missing or has expired. Please report to the Attendance section to generate a new token.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Gatepass
