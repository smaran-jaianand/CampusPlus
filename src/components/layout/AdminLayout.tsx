import React from 'react';
import { Outlet } from 'react-router-dom';
import { useWallet } from '@txnlab/use-wallet-react';
import { Lock, AlertTriangle } from 'lucide-react';
import { ADMIN_WALLET_ADDRESS } from '../../config/admin.config';
import AdminNavbar from './AdminNavbar';

const AdminLayout: React.FC = () => {
    const { activeAddress } = useWallet();

    // Security Middleware: Check if connected wallet is the authorized admin
    const isUnauthorized = activeAddress && activeAddress !== ADMIN_WALLET_ADDRESS;

    return (
        <div className="min-h-screen bg-gradient-to-tr from-teal-400 via-cyan-300 to-sky-400 flex flex-col relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-48 -translate-y-48"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-900/10 rounded-full blur-3xl translate-x-48 translate-y-48"></div>

            <AdminNavbar />

            <div className="flex-grow flex flex-col p-4 md:p-8 relative z-10 w-full max-w-7xl mx-auto">
                {isUnauthorized ? (
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-red-100 flex-grow flex items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
                        <div className="max-w-md flex flex-col items-center">
                            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
                                <Lock size={40} className="text-red-500 relative z-10" />
                                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Access Restricted</h2>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
                                <p className="text-amber-800 text-sm font-medium flex items-start gap-3">
                                    <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                                    Your connected wallet ({activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}) does not have administrative privileges for this portal.
                                </p>
                            </div>
                            <p className="text-slate-500 mb-8 font-medium">
                                Please disconnect this wallet from the navigation menu and connect with the authorized Master Admin account.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl w-full flex-grow flex flex-col p-6 overflow-hidden">
                        <Outlet />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminLayout;
