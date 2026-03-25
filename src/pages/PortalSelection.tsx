import React, { useEffect, useRef, useState } from 'react';
import { Shield, User, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PARTICLE_COUNT = 24;

const PortalSelection: React.FC = () => {
    const navigate = useNavigate();
    const bgRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

    // Track mouse for reactive background shift
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            setMousePos({
                x: e.clientX / window.innerWidth,
                y: e.clientY / window.innerHeight,
            });
        };
        window.addEventListener('mousemove', handler);
        return () => window.removeEventListener('mousemove', handler);
    }, []);

    // Generate stable random particles on mount
    const particles = useRef(
        Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
            left: `${Math.random() * 100}%`,
            size: 2 + Math.random() * 3,
            duration: 8 + Math.random() * 14,
            delay: Math.random() * 10,
            opacity: 0.08 + Math.random() * 0.15,
        }))
    ).current;

    const offsetX = (mousePos.x - 0.5) * 30;
    const offsetY = (mousePos.y - 0.5) * 20;

    return (
        <div className="landing-bg min-h-screen flex flex-col items-center justify-center relative">
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 grid-pattern z-[1]" />

            {/* Reactive floating orbs that follow mouse subtly */}
            <div
                ref={bgRef}
                className="absolute inset-0 z-0 transition-transform duration-[2000ms] ease-out"
                style={{ transform: `translate(${offsetX}px, ${offsetY}px)` }}
            >
                <div className="orb orb-1" />
                <div className="orb orb-2" />
                <div className="orb orb-3" />
            </div>

            {/* Rising particles */}
            {particles.map((p, i) => (
                <div
                    key={i}
                    className="particle"
                    style={{
                        left: p.left,
                        bottom: '-10px',
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        animationDuration: `${p.duration}s`,
                        animationDelay: `${p.delay}s`,
                        opacity: p.opacity,
                    }}
                />
            ))}

            {/* Main content */}
            <div className="z-10 text-center max-w-4xl px-6 w-full">
                {/* Logo / Badge */}
                <div className="fade-up flex items-center justify-center mb-8">
                    <div className="flex items-center gap-2.5 bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-full px-5 py-2 text-xs tracking-widest uppercase font-semibold text-slate-400">
                        <Zap size={14} className="text-teal-400" />
                        Powered by Algorand
                    </div>
                </div>

                {/* Title */}
                <h1 className="fade-up fade-up-delay-1 text-5xl md:text-7xl lg:text-8xl font-black text-white mb-5 tracking-tighter leading-[0.9]">
                    Campus<span className="text-shimmer">Plus</span>
                </h1>

                <p className="fade-up fade-up-delay-2 text-base md:text-lg text-slate-400 mb-14 max-w-xl mx-auto font-normal leading-relaxed">
                    On-chain campus management — attendance tracking, digital credentials, and a token economy built on Algorand.
                </p>

                {/* Portal Cards with 3D Perspective */}
                <div className="perspective-container fade-up fade-up-delay-3 grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    {/* Student Card */}
                    <div
                        onClick={() => navigate('/student')}
                        className="card-3d shine-sweep glow-border group cursor-pointer bg-[#111827]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-7 flex flex-col items-start text-left"
                    >
                        <div className="pulse-ring w-14 h-14 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5 group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-500 transition-all duration-300">
                            <User size={28} strokeWidth={1.5} />
                        </div>

                        <h2 className="text-lg font-bold text-white mb-1.5 tracking-tight">Student Portal</h2>
                        <p className="text-slate-500 text-[13px] leading-relaxed mb-6">
                            Attendance tokens, gatepasses, NFT achievements, and your on-chain campus profile.
                        </p>

                        <div className="mt-auto flex items-center gap-2 text-indigo-400 text-sm font-semibold group-hover:gap-3 transition-all duration-300">
                            Enter <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                        </div>
                    </div>

                    {/* Admin Card */}
                    <div
                        onClick={() => navigate('/admin')}
                        className="card-3d card-3d-alt shine-sweep glow-border group cursor-pointer bg-[#111827]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-7 flex flex-col items-start text-left"
                    >
                        <div className="pulse-ring w-14 h-14 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-5 group-hover:bg-teal-500 group-hover:text-white group-hover:border-teal-500 transition-all duration-300">
                            <Shield size={28} strokeWidth={1.5} />
                        </div>

                        <h2 className="text-lg font-bold text-white mb-1.5 tracking-tight">Admin Portal</h2>
                        <p className="text-slate-500 text-[13px] leading-relaxed mb-6">
                            Verify attendance, mint certificates, distribute credits, and manage the campus economy.
                        </p>

                        <div className="mt-auto flex items-center gap-2 text-teal-400 text-sm font-semibold group-hover:gap-3 transition-all duration-300">
                            Enter <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                        </div>
                    </div>
                </div>

                {/* Footer hint */}
                <p className="fade-up fade-up-delay-3 text-slate-600 text-xs mt-12 tracking-wide">
                    Connect your Algorand wallet inside either portal to get started.
                </p>
            </div>
        </div>
    );
};

export default PortalSelection;
