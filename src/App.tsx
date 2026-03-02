import { SupportedWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

// Layouts
import PortalSelection from './pages/PortalSelection'
import StudentLayout from './components/layout/StudentLayout'
import AdminLayout from './components/layout/AdminLayout'

// Student Pages
import Attendance from './pages/student/Attendance'
import Gatepass from './pages/student/Gatepass'
import Profile from './pages/student/Profile'
import Store from './pages/student/Store'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import SignAttendance from './pages/admin/SignAttendance'
import MintNFTAdmin from './pages/admin/MintNFT'
import ManageCreditsAdmin from './pages/admin/ManageCredits'

let supportedWallets: SupportedWallet[]
if (import.meta.env.VITE_ALGOD_NETWORK === 'localnet') {
  const kmdConfig = getKmdConfigFromViteEnvironment()
  supportedWallets = [
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ]
} else {
  supportedWallets = [
    { id: WalletId.DEFLY },
    { id: WalletId.PERA },
    { id: WalletId.EXODUS },
    { id: WalletId.LUTE },
  ]
}

export default function App() {
  const algodConfig = getAlgodConfigFromViteEnvironment()

  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks: {
      [algodConfig.network]: {
        algod: {
          baseServer: algodConfig.server,
          port: algodConfig.port,
          token: String(algodConfig.token),
        },
      },
    },
    options: {
      resetNetwork: true,
    },
  })

  return (
    <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      <WalletProvider manager={walletManager}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PortalSelection />} />

            {/* Student Portal Routes */}
            <Route path="/student" element={<StudentLayout />}>
              <Route index element={<Attendance />} />
              <Route path="gatepass" element={<Gatepass />} />
              <Route path="profile" element={<Profile />} />
              <Route path="store" element={<Store />} />
            </Route>

            {/* Admin Portal Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="sign" element={<SignAttendance />} />
              <Route path="mint" element={<MintNFTAdmin />} />
              <Route path="credits" element={<ManageCreditsAdmin />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </WalletProvider>
    </SnackbarProvider>
  )
}
