import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import React, { useMemo, useState } from 'react'
import { PlusCircle, Image as ImageIcon, CheckCircle, Flame, Send } from 'lucide-react'
import { getAlgodConfigFromViteEnvironment } from '../../utils/network/getAlgoClientConfigs'
import { ipfsHttpUrl, pinFileToIPFS, pinJSONToIPFS } from '../../utils/pinata'

const MintNFTAdmin: React.FC = () => {
    const { activeAddress, transactionSigner } = useWallet()
    const { enqueueSnackbar } = useSnackbar()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [mintedId, setMintedId] = useState<bigint | null>(null)

    // Quick Send State
    const [recipientAddress, setRecipientAddress] = useState('')
    const [sendingNFT, setSendingNFT] = useState(false)

    const algorand = useMemo(() => {
        const algodConfig = getAlgodConfigFromViteEnvironment()
        const client = AlgorandClient.fromConfig({ algodConfig })
        client.setDefaultSigner(transactionSigner)
        return client
    }, [transactionSigner])

    async function sha256Hex(data: Uint8Array): Promise<string> {
        const digest = await crypto.subtle.digest('SHA-256', data as unknown as BufferSource)
        const hashArray = Array.from(new Uint8Array(digest))
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    }

    const onMint = async () => {
        if (!activeAddress) {
            enqueueSnackbar('Connect a wallet first', { variant: 'error' })
            return
        }
        if (!name || !description) {
            enqueueSnackbar('Fill all fields', { variant: 'error' })
            return
        }
        if (!file) {
            enqueueSnackbar('Select an image', { variant: 'error' })
            return
        }

        setLoading(true)
        setMintedId(null)
        try {
            enqueueSnackbar('Uploading image to IPFS...', { variant: 'info' })
            const filePin = await pinFileToIPFS(file)
            const imageUrl = ipfsHttpUrl(filePin.IpfsHash)

            const metadata = {
                name,
                description,
                image: imageUrl,
                image_mimetype: file.type || 'image/png',
                external_url: imageUrl,
                properties: {
                    issuer: 'BlockCampus System',
                },
            }

            enqueueSnackbar('Uploading metadata to IPFS...', { variant: 'info' })
            const jsonPin = await pinJSONToIPFS(metadata)
            const metadataUrl = `${ipfsHttpUrl(jsonPin.IpfsHash)}#arc3`

            const metaBytes = new TextEncoder().encode(JSON.stringify(metadata))
            const metaHex = await sha256Hex(metaBytes)
            const metadataHash = new Uint8Array(metaHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)))

            enqueueSnackbar('Please sign transaction...', { variant: 'info' })

            const result = await algorand.send.assetCreate({
                sender: activeAddress,
                total: 1n,
                decimals: 0,
                unitName: 'CERT',
                assetName: name,
                manager: activeAddress,
                reserve: activeAddress,
                freeze: activeAddress,
                clawback: activeAddress,
                url: metadataUrl,
                metadataHash,
                defaultFrozen: false,
            })

            setMintedId(result.assetId)
            enqueueSnackbar(`Successfully minted NFT with ID ${result.assetId}`, { variant: 'success' })
            setName('')
            setDescription('')
            setFile(null)
        } catch (e: any) {
            console.error(e)
            enqueueSnackbar(e.message || 'Failed to mint NFT', { variant: 'error' })
        } finally {
            setLoading(false)
        }
    }

    const onSendNFT = async () => {
        if (!activeAddress) {
            enqueueSnackbar('Connect a wallet first', { variant: 'error' })
            return
        }
        if (!mintedId) {
            enqueueSnackbar('No NFT minted', { variant: 'error' })
            return
        }
        if (!recipientAddress || recipientAddress.length !== 58) {
            enqueueSnackbar('Invalid Algorand address', { variant: 'error' })
            return
        }

        setSendingNFT(true)
        try {
            enqueueSnackbar('Please sign the transfer transaction...', { variant: 'info' })

            await algorand.send.assetTransfer({
                sender: activeAddress,
                receiver: recipientAddress,
                assetId: mintedId,
                amount: 1n,
            })

            enqueueSnackbar(`Successfully sent NFT to ${recipientAddress.substring(0, 8)}...`, { variant: 'success' })
            setRecipientAddress('')
            // Optionally clear mintedId to return to fresh state
            // setMintedId(null)
        } catch (e: any) {
            console.error(e)
            enqueueSnackbar(e.message || 'Transfer failed. Has the student opted in to this Asset ID?', { variant: 'error' })
        } finally {
            setSendingNFT(false)
        }
    }

    return (
        <div className="flex flex-col max-w-4xl mx-auto w-full">
            <div className="mb-10 text-center">
                <h1 className="text-3xl font-black text-fuchsia-900 mb-2">Mint NFT Certificates</h1>
                <p className="text-fuchsia-700/80 font-medium">Issue digital awards and certificates to students on-chain.</p>
            </div>

            <div className="bg-white border border-fuchsia-50 rounded-3xl p-8 shadow-xl shadow-purple-100 max-w-2xl mx-auto relative overflow-hidden w-full">
                <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-50 rounded-full blur-2xl -translate-y-10 translate-x-10"></div>

                {mintedId ? (
                    <div className="text-center py-10 relative z-10">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                            <CheckCircle size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">NFT Successfully Minted!</h2>
                        <p className="text-gray-500 mb-6 font-medium">The certificate is now on the Algorand blockchain.</p>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-lg text-slate-800 mb-8 inline-block shadow-sm">
                            Asset ID: {mintedId.toString()}
                        </div>

                        {/* Quick Send Section */}
                        <div className="max-w-md mx-auto bg-white border border-slate-100 rounded-2xl p-6 shadow-sm mb-8">
                            <h3 className="font-bold text-slate-800 mb-2 flex items-center justify-center gap-2">
                                <Send size={18} className="text-fuchsia-500" /> Quick Transfer
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">
                                Send this NFT directly to a student. <br />
                                <strong className="text-amber-600">Note:</strong> The student must opt-in to Asset ID {mintedId.toString()} first.
                            </p>
                            <input
                                type="text"
                                className="block w-full px-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 focus:ring-0 focus:border-fuchsia-400 transition-colors shadow-sm font-mono text-xs mb-3"
                                placeholder="Student Wallet Address"
                                value={recipientAddress}
                                onChange={(e) => setRecipientAddress(e.target.value)}
                                disabled={sendingNFT}
                            />
                            <button
                                onClick={onSendNFT}
                                disabled={sendingNFT || !recipientAddress || recipientAddress.length !== 58}
                                className={`w-full h-10 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${sendingNFT || !recipientAddress || recipientAddress.length !== 58
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed hidden md:flex'
                                    : 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200'
                                    }`}
                            >
                                {sendingNFT ? (
                                    <><span className="loading loading-spinner loading-xs"></span> Sending...</>
                                ) : (
                                    'Send to Student'
                                )}
                            </button>
                        </div>

                        <div>
                            <button
                                onClick={() => {
                                    setMintedId(null)
                                    setRecipientAddress('')
                                }}
                                disabled={sendingNFT}
                                className="btn bg-fuchsia-600 hover:bg-fuchsia-700 text-white border-none rounded-xl px-8 shadow-lg shadow-fuchsia-200"
                            >
                                Mint Another Certificate
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="relative z-10 space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                Certificate Title
                            </label>
                            <input
                                type="text"
                                className="block w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 focus:ring-0 focus:border-fuchsia-400 transition-colors shadow-sm"
                                placeholder="e.g. Hackathon Winner Fall '25"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={loading}
                                maxLength={32}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                Description / Details
                            </label>
                            <textarea
                                className="block w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 focus:ring-0 focus:border-fuchsia-400 transition-colors shadow-sm resize-none h-24"
                                placeholder="Details about the achievement..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                Artwork / File
                            </label>
                            <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <ImageIcon className="w-8 h-8 mb-2 text-slate-400" />
                                        <p className="mb-1 text-sm text-slate-500 font-medium">
                                            {file ? file.name : <><span className="font-semibold text-fuchsia-600">Click to upload</span> or drag and drop</>}
                                        </p>
                                        {!file && <p className="text-xs text-slate-400">PNG, JPG, GIF (MAX. 5MB)</p>}
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        disabled={loading}
                                    />
                                </label>
                            </div>
                        </div>

                        <button
                            onClick={onMint}
                            disabled={loading || !activeAddress}
                            className={`w-full mt-4 h-14 rounded-xl flex items-center justify-center gap-2 font-bold text-lg transition-all shadow-lg ${loading || !activeAddress
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                : 'bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white shadow-fuchsia-200 hover:shadow-purple-300'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <span className="loading loading-spinner loading-sm"></span>
                                    Minting to Blockchain...
                                </>
                            ) : (
                                <>
                                    <Flame size={20} />
                                    Mint NFT Certificate
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default MintNFTAdmin
