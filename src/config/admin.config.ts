// ==========================================
// MASTER ADMIN CONFIGURATION
// ==========================================

// Replace this placeholder with the exact Algorand Wallet Address you will use to log into the Admin Portal.
// Any other wallet trying to access the /admin routes will be securely blocked.
export const ADMIN_WALLET_ADDRESS = 'K7QYBWXS66Y67XZKKCWU2GJEUDWSEG5Q5K5BUTPAURKJYI3ZSJZ25EV6VY'

// ==========================================
// STUDENT ROSTER CONFIGURATION
// ==========================================

// An array of authorized Student Wallet Addresses. 
// The Admin Portal will only process reward requests from wallets explicitly listed here.
// e.g. ['WALLET_1...', 'WALLET_2...']
export const STUDENT_ROSTER: string[] = [
    // Add student wallet addresses here
]
