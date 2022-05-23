import { useState } from 'react'
import { ethers } from 'ethers'
import Quantity from './Quantity'
import presaleCoupons from '../utils/presaleCoupons.json'
import NFT from '../utils/abi.json'
import { contractAddress } from '../config'


const MintPresale = ({ currentAccount, totalMinted, setTotalMinted }) => {

    const [mintQty, setMintQty] = useState(0)
    const [minting, setMinting] = useState(false)

    if (presaleCoupons[currentAccount] === undefined)
        return 'No valid presale mint coupons found'

    const allottedPresaleMints  = presaleCoupons[currentAccount].qty
    const availableTeamMints    = totalMinted !== undefined ? allottedPresaleMints - parseInt(totalMinted.presale) : 0
    const coupon                = presaleCoupons[currentAccount].coupon

    console.log(coupon)

    const mintNfts = async () => {
        setMinting(true)

        try {
            const { ethereum } = window
            if (ethereum) {

                const provider = new ethers.providers.Web3Provider(ethereum)
                const signer = provider.getSigner()
                const nftContract = new ethers.Contract(
                    contractAddress,
                    NFT.abi,
                    signer
                )

                let nftTx = await nftContract.mintPresale(mintQty, allottedPresaleMints, coupon)

                console.log('Minting....', nftTx.hash)

                let tx = await nftTx.wait()

                setMinting(false)

                console.log('Minted!', tx)

                let event = tx.events[0]
                console.log(event)
                
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
                setMinting(0)
            }
        } catch (err) {
            console.error(err)
            setMinting(0)
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

export default MintPresale;