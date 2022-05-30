import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import Connect from './components/Connect'
import ConnectedAddress from './components/ConnectedAddress'
import Heading from './components/Heading'
import MintTeam from './components/MintTeam'
import MintPresale from './components/MintPresale'
import MintLocked from './components/MintLocked'

import NFT from './utils/abi.json'
import { contract, activePhase, activeNetwork } from './config'

function App() {

  const [correctNetwork, setCorrectNetwork] = useState(false)
  const [currentAccount, setCurrentAccount] = useState('')
  const [totalMinted, setTotalMinted] = useState()

  useEffect(() => {
    // Check correct network on first render
    checkCorrectNetwork()

    const { ethereum } = window
    if (ethereum) {

      // Add listener for Account changes
      ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setCurrentAccount(accounts[0]);
        } else {
          setCurrentAccount('');
        }
      });

      // Add listener for Chain changes
      ethereum.on("chainChanged", (chainId) => {
        if (chainId === activeNetwork.chainId) {
          window.location.reload();
        } else {
          setCorrectNetwork(false);
        }
      });
    }
  }, []);

  /**
 * * Check Correct Network
 * @dev Verify that current chain ID is Correct
 */
  const checkCorrectNetwork = async () => {
    const { ethereum } = window
    let chainId = await ethereum.request({ method: 'eth_chainId' })

    if (chainId === activeNetwork.chainId) {
      setCorrectNetwork(true)
    } else {
      setCorrectNetwork(false)
    }
  }

  useEffect(() => {
    if (currentAccount !== '') {
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

          nftContract.addressToMinted(currentAccount)
            .then((data) => {
              let totalMints = {
                "presale": String(data._presaleMintsByAddress),
                "team": String(data._teamMintsByAddress)
              }
              setTotalMinted(totalMints)
            })
        }
        console.log('Account Changed')
      } catch (error) {
        console.error(error);
      }
    }
  }, [currentAccount])

  // Set mint component to display, based on active phase
  let mintComponent
  switch (activePhase) {
    case "presale":
      mintComponent = <MintPresale
        currentAccount={currentAccount}
        setTotalMinted={setTotalMinted}
        totalMinted={totalMinted}
      />
      break;
    case "team":
      mintComponent = <MintTeam
        currentAccount={currentAccount}
        setTotalMinted={setTotalMinted}
        totalMinted={totalMinted}
      />
      break;
    default:
      mintComponent = <MintLocked />
  }

  // If not on the correct network, prevent any actions from being taken
  if (!correctNetwork)
    return <div className="text-white text-center text-xl">{`You are not corrected to the correct network!  Please switch to the ${activeNetwork.name}`}</div>

  return (
    <div className="App text-center py-14 text-white">
      {/* Display connected account for a better user experience */}
      <ConnectedAddress
        currentAccount={currentAccount}
      />

      {/* Tell them a little bit about the page */}
      <Heading />

      {/* Display UI based on connection status and mint phase */}
      {
        currentAccount === '' ? (
          <Connect
            setCurrentAccount={setCurrentAccount}
            currentAccount={currentAccount}
            setTotalMinted={setTotalMinted}
          />
        ) : (
          mintComponent
        )
      }
    </div>
  );
}

export default App;
