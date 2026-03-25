import { useWallet } from '@txnlab/use-wallet-react'
import { CheckSquare, LogOut, MessageSquare, PlusCircle, Send, ShieldCheck } from 'lucide-react'
import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ADMIN_WALLET_ADDRESS } from '../../config/admin.config'
import ConnectWallet from '../ConnectWallet'

const AdminNavbar: React.FC = () => {
  const { activeAddress } = useWallet()
  const navigate = useNavigate()
  const location = useLocation()
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)

  const toggleWalletModal = () => {
    setOpenWalletModal(!openWalletModal)
  }

  const isAuthorizedAdmin = activeAddress === ADMIN_WALLET_ADDRESS

  const navLinks = [
    { name: 'Dashboard', path: '/admin', icon: <ShieldCheck size={18} /> },
    { name: 'Sign Attendance', path: '/admin/sign', icon: <CheckSquare size={18} /> },
    { name: 'Mint NFTs', path: '/admin/mint', icon: <PlusCircle size={18} /> },
    { name: 'Manage Credits', path: '/admin/credits', icon: <Send size={18} /> },
    { name: 'Grievances', path: '/admin/grievances', icon: <MessageSquare size={18} /> },
    { name: 'Attendance Monitor', path: 'http://localhost:8000', icon: <MessageSquare size={18} /> },
  ]

  return (
    <>
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center z-50 sticky top-0">
        <div className="flex items-center gap-6 text-teal-800">
          <Link to="/" className="text-xl font-black tracking-tighter flex items-center gap-2">
            <span className="bg-teal-600 text-white rounded-md p-1">ADMIN</span>
            Portal
          </Link>
          <div className="hidden md:flex gap-1 ml-4">
            {(!activeAddress || isAuthorizedAdmin) &&
              navLinks.map((link) => {
                const isActive = location.pathname === link.path || (link.path !== '/admin' && location.pathname.startsWith(link.path))
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                      isActive ? 'bg-teal-100 text-teal-700 shadow-sm' : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    {link.icon}
                    {link.name}
                  </Link>
                )
              })}
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <button
            className={`btn btn-sm ${!activeAddress ? 'btn-accent' : isAuthorizedAdmin ? 'btn-outline btn-accent' : 'btn-error'} px-4 rounded-full shadow-sm`}
            onClick={toggleWalletModal}
          >
            {!activeAddress ? 'Connect Admin Wallet' : isAuthorizedAdmin ? 'Admin Connected' : 'Unauthorized'}
          </button>
          <button onClick={() => navigate('/')} className="btn btn-ghost btn-sm btn-circle text-gray-500" title="Exit to Selection">
            <LogOut size={18} />
          </button>
        </div>
      </nav>
      <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
    </>
  )
}

export default AdminNavbar
