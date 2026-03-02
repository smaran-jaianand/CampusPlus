import React from 'react';
import { Shield, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PortalSelection: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-teal-500/20 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px]"></div>
            </div>

            <div className="z-10 text-center max-w-4xl px-4">
                <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight">
                    Block<span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400">Campus</span>
                </h1>
                <p className="text-lg md:text-xl text-slate-300 mb-16 max-w-2xl mx-auto font-light leading-relaxed">
                    The next-generation, on-chain campus management system powered by Algorand. Please select your portal to continue.
                </p>

                <div className="grid md:grid-cols-2 gap-8 md:gap-12 max-w-3xl mx-auto">
                    {/* Student Portal Card */}
                    <div
                        onClick={() => navigate('/student')}
                        className="group cursor-pointer bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 hover:bg-slate-800 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.3)] flex flex-col items-center text-center"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform group-hover:bg-indigo-500 group-hover:text-white duration-300">
                            <User size={40} strokeWidth={1.5} />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Student Portal</h2>
                        <p className="text-slate-400 font-light text-sm">
                            Generate attendance tokens, check your gatepass, and manage your academic assets and credits.
                        </p>
                    </div>

                    {/* Admin Portal Card */}
                    <div
                        onClick={() => navigate('/admin')}
                        className="group cursor-pointer bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 hover:bg-slate-800 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(20,184,166,0.3)] flex flex-col items-center text-center"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-400 mb-6 group-hover:scale-110 transition-transform group-hover:bg-teal-500 group-hover:text-white duration-300">
                            <Shield size={40} strokeWidth={1.5} />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Admin Portal</h2>
                        <p className="text-slate-400 font-light text-sm">
                            Verify student attendance, mint NFTs, and distribute campus credits securely on-chain.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PortalSelection;
