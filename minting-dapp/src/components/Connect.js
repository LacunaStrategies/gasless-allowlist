import { useState } from 'react'

const Connect = ({ setCurrentAccount }) => {

    const [connecting, setConnecting] = useState(false)

    const connectWallet = async () => {

        // Disable connect button
        setConnecting(true)
        console.log(connecting)
        try {
            const { ethereum } = window

            // Check for Metamask
            if (!ethereum) {
                alert('Metamask not detected')
                setConnecting(false)
                return
            }

            const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
            setCurrentAccount(accounts[0])
            setConnecting(false)
        } catch (err) {
            setConnecting(false)
            console.log('Error connecting to metamask', err)
        }
    }

    return (
        <>
            <button
                type="button"
                disabled={connecting}
                onClick={connectWallet}
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 disabled:bg-gray-600 hover:disabled:bg-gray-600"
            >{connecting ? 'Connecting...' : 'Connect'}</button>
        </>
    );
}

export default Connect;