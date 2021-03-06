import { useState } from 'react'
import { ethers } from 'ethers'
import Quantity from './Quantity'
import teamCoupons from '../utils/teamCoupons.json'
import NFT from '../utils/abi.json'
import { contractAddress } from '../config'

const MintTeam = ({ currentAccount, totalMinted, setTotalMinted }) => {

    // Set state variables
    const [mintQty, setMintQty] = useState(0)
    const [minting, setMinting] = useState(false)

    // If account does not have a valid coupon, return only a notification message
    if (teamCoupons[currentAccount] === undefined)
        return 'No valid team mint coupons found'

    // Retrieve allotted mints from team coupon data
    const allottedTeamMints     = teamCoupons[currentAccount].qty
    // Set available mints based on allotted mints minus total team mints
    const availableTeamMints    = totalMinted !== undefined ? allottedTeamMints - parseInt(totalMinted.team) : 0
    // Retrieve coupon from team coupon data
    const coupon                = teamCoupons[currentAccount].coupon

    /**
     * * Mint NFTs
     * @dev Mint function for the mintTeam method from our smart contract
     * @notice The mintTeam function accepts 3 parameters: (mintQt, allotted, coupon) and is non-payable
     */
    const mintNfts = async () => {
        // Update mint button to disabled and "minting" text
        setMinting(true)

        try {
            const { ethereum } = window
            if (ethereum) {

                // Connect to contract
                const provider = new ethers.providers.Web3Provider(ethereum)
                const signer = provider.getSigner()
                const nftContract = new ethers.Contract(
                    contractAddress,
                    NFT.abi,
                    signer
                )

                // Initiate mint transaction
                let nftTx = await nftContract.mintTeam(mintQty, allottedTeamMints, coupon)

                // Log the transaction hash (preferably, set this to a variable and display this to the user)
                console.log('Minting....', nftTx.hash)
                
                // Assign transaction details to a variable (unused, but could be used to display details to user)
                let tx = await nftTx.wait()
                console.log('Minted!', tx)

                // Re-enable mint button
                setMinting(false)

                // Updated totalMinted state variable
                nftContract.addressToMinted(currentAccount)
                .then((data) => {
                  let totalMints = {
                    "presale": String(data._presaleMintsByAddress),
                    "team": String(data._teamMintsByAddress)
                  }
                  setTotalMinted(totalMints)
                })
            } else {
                console.error("Ethereum object doesn't exist!")
                setMinting(false)
            }
        } catch (err) {
            console.error(err)
            setMinting(false)
        }
    }

    return (
        <>
            <div className="mb-4">You have {availableTeamMints} Team Coupon mints remaining!</div>
            <Quantity
                mintQty={mintQty}
                setMintQty={setMintQty}
                max={availableTeamMints}
            />
            <button
                onClick={mintNfts}
                disabled={(mintQty === 0 || minting) ? true : false}
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 disabled:bg-gray-600 hover:disabled:bg-gray-600"
            >{minting ? 'Minting...' : 'Mint'}</button>
        </>
    );
}

export default MintTeam;