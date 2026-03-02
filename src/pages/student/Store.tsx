import { useWallet } from '@txnlab/use-wallet-react'
import { ShoppingBag, Coffee, BookOpen, Utensils, AlertCircle } from 'lucide-react'
import React from 'react'
import { useSnackbar } from 'notistack'

const Store: React.FC = () => {
    const { activeAddress } = useWallet()
    const { enqueueSnackbar } = useSnackbar()

    const handlePurchase = (item: string, cost: number) => {
        if (!activeAddress) {
            enqueueSnackbar('Please connect your wallet first', { variant: 'error' })
            return
        }
        // This is a UI mockup for the workshop. Real implementation would use assetTransfer
        enqueueSnackbar(`Initiating purchase: ${item} for ${cost} CRED`, { variant: 'info' })
    }

    return (
        <div className="flex flex-col max-w-4xl mx-auto w-full">
            <div className="mb-10 text-center">
                <h1 className="text-3xl font-bold text-indigo-900 mb-2">Campus Store & Cafeteria</h1>
                <p className="text-indigo-600/80">Spend your campus credits on meals, stationary, and goods.</p>
            </div>

            {!activeAddress ? (
                <div className="bg-white border rounded-3xl p-10 w-full text-center shadow-lg shadow-indigo-100 flex flex-col items-center justify-center max-w-2xl mx-auto">
                    <ShoppingBag size={64} className="text-gray-300 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Authentication Required</h2>
                    <p className="text-gray-500 max-w-sm">Connect your student wallet to browse and purchase items.</p>
                </div>
            ) : (
                <>
                    {/* Mockup alert */}
                    <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 mb-8 flex items-start gap-3">
                        <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="font-bold">Workshop Note</p>
                            <p className="text-sm">Purchasing items required opting into the CRED asset and performing an asset transfer smart contract call. This UI provides the layout structure.</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Item 1 */}
                        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl hover:-translate-y-1 transition-transform cursor-pointer group">
                            <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Utensils size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Standard Meal Plan</h3>
                            <p className="text-slate-500 text-sm mb-6 h-10">Daily cafeteria access with 2 full meals.</p>

                            <div className="flex justify-between items-center mt-auto">
                                <span className="font-black text-xl text-slate-800">150 <span className="text-sm text-slate-400 font-bold">CRED</span></span>
                                <button
                                    onClick={() => handlePurchase('Meal Plan', 150)}
                                    className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-xl font-bold transition-colors text-sm"
                                >
                                    Purchase
                                </button>
                            </div>
                        </div>

                        {/* Item 2 */}
                        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl hover:-translate-y-1 transition-transform cursor-pointer group">
                            <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <BookOpen size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Textbook Package</h3>
                            <p className="text-slate-500 text-sm mb-6 h-10">Digital access to core computer science texts.</p>

                            <div className="flex justify-between items-center mt-auto">
                                <span className="font-black text-xl text-slate-800">450 <span className="text-sm text-slate-400 font-bold">CRED</span></span>
                                <button
                                    onClick={() => handlePurchase('Textbook Package', 450)}
                                    className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-xl font-bold transition-colors text-sm"
                                >
                                    Purchase
                                </button>
                            </div>
                        </div>

                        {/* Item 3 */}
                        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl hover:-translate-y-1 transition-transform cursor-pointer group">
                            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Coffee size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Premium Coffee</h3>
                            <p className="text-slate-500 text-sm mb-6 h-10">Any large espresso drink from the campus cafe.</p>

                            <div className="flex justify-between items-center mt-auto">
                                <span className="font-black text-xl text-slate-800">15 <span className="text-sm text-slate-400 font-bold">CRED</span></span>
                                <button
                                    onClick={() => handlePurchase('Coffee', 15)}
                                    className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-xl font-bold transition-colors text-sm"
                                >
                                    Purchase
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default Store
