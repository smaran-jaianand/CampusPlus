import { useWallet } from '@txnlab/use-wallet-react';
import { LogOut, QrCode, Shield, User, ShoppingBag } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ConnectWallet from '../ConnectWallet';

const StudentNavbar: React.FC = () => {
    const { activeAddress } = useWallet();
    const navigate = useNavigate();
    const location = useLocation();
    const [openWalletModal, setOpenWalletModal] = useState<boolean>(false);

    const toggleWalletModal = () => {
        setOpenWalletModal(!openWalletModal);
    };

    const navLinks = [
        { name: 'Attendance', path: '/student', icon: <QrCode size={18} /> },
        { name: 'Gatepass', path: '/student/gatepass', icon: <Shield size={18} /> },
        { name: 'Profile', path: '/student/profile', icon: <User size={18} /> },
        { name: 'Store', path: '/student/store', icon: <ShoppingBag size={18} /> },
    ];

    return (
        <>
            <nav className="bg-white/60 backdrop-blur-lg shadow-sm border-b border-indigo-100 px-6 py-4 flex justify-between items-center z-50 sticky top-0">
                <div className="flex items-center gap-6 text-indigo-900">
                    <Link to="/" className="text-xl font-black tracking-tight flex items-center gap-2">
                        <span className="bg-indigo-600 text-white rounded-lg px-2 py-0.5 shadow-md">Student</span>
                        Hub
                    </Link>
                    <div className="hidden md:flex gap-1 ml-4 bg-white/50 p-1 rounded-xl shadow-inner border border-white">
                        {navLinks.map((link) => {
                            const isActive = location.pathname === link.path || (link.path !== '/student' && location.pathname.startsWith(link.path));
                            return (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive ? 'bg-white text-indigo-600 shadow-md ring-1 ring-indigo-100' : 'hover:bg-white/60 text-indigo-900/70'
                                        }`}
                                >
                                    {link.icon}
                                    {link.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <div className="flex gap-4 items-center">
                    <button
                        className={`btn btn-sm ${activeAddress ? 'btn-outline border-indigo-300 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400' : 'btn-primary bg-indigo-600 hover:bg-indigo-700 border-none'} px-5 rounded-xl shadow-md`}
                        onClick={toggleWalletModal}
                    >
                        {activeAddress ? 'Connected' : 'Connect Wallet'}
                    </button>
                    <button onClick={() => navigate('/')} className="btn btn-ghost btn-sm btn-circle text-indigo-400 hover:text-indigo-600" title="Exit to Selection">
                        <LogOut size={18} />
                    </button>
                </div>
            </nav>
            <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
        </>
    );
};

export default StudentNavbar;
