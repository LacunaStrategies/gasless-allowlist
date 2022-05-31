# Gasless Allowlist (ECRecover)  
06.01.2022  

Discord: @Rhaphie#3352  
Twitter: [@LacunaStrats](https://twitter.com/LacunaStrats)  

# Overview
The methods I suspect most individuals are aware of for handling a presale/allowlist are through an array (expensive!), a Merkle Tree (rigid and painful), or the EIP-712 standard. This article outlines an alternative approach through the application of coupons / vouchers, using ECSign and ECRecover, which is completely gasless and extremely flexible. This article covers the steps to setting up your own gasless allowlist.

# Key Sections
1. [Coupon Signer](#coupon-signer): Generating the private/public keys needed to sign our coupons
2. [Smart Contract Validation](#smart-contract-validation): Setting up the structure and validation method in our Smart Contract for our coupons
3. [Generating Coupons](#generati-coupons): Creating the functionality to generate and update our coupons off-chain
4. [dApp Coupon Mint](#dapp-coupon-mint): Setting up our dApp to include the coupons in our mint function.

# Coupon Signer
The first thing we are going to need for our coupons is a private/public key pair from the wallet that will be used to sign  the coupons.  This key/value pair does not need to represent an existing wallet, nor does it need to be associated with anything else in your project. While we could use an existing wallet, I recommend the process of creating a random wallet. The private key generated from this wallet will be used to create the hashed signature, which will only return a valid response when checked against the public key in our validation method. A coupon signed by any other private key or a coupon that has been modified without being re-signed with the private key will fail validation. It is for this reason that our private key MUST remain properly secured and secreted away!  In the event the private key is lost or exposed, we will need to generate a new set of coupons with a new private key, updating the public key (used to validate the coupons) in our Smart Contract accordingly. Fortunately, this is easy to do…but try not to lose that key.

## Generating The Random Wallet
Open up a terminal (CMD) - we will need both Node and Ethers.js installed.  Inside of the terminal, run the following commands:

```
*node*
const ethers = require('ethers')
const wallet = ethers.Wallet.createRandom()
console.log('Public Address:', wallet.address)
console.log('Private Key:', wallet.privateKey)
```

There you have it. Simple. If you lose this key pair, simply repeat this process, regenerate your replacement coupons, and update the public address in your Smart Contract!

# Smart Contract Validation
The approach we will be using is a multi-use coupon - a coupon that is associated with a wallet address and includes a specified number of mints allocated to it. Unlike a single-use coupon, these coupons can be re-used by the holder until they have reached their maximum allocated mints. We will need a few pieces to properly track and validate our coupons: struct objects, an enum object, an address mapping variable, and a validation method. Important: If you choose to create a one-time-use coupon, it is highly recommended that you also include and check for a nonce in order to avoid the coupon being abused. One-time-use coupons will not be covered in this article.

## Structs
The struct object allows us to define the data type structure we will be using when generating our coupons and tracking coupon mints. If you expect your coupon types to change post-deployment, you may want to include a method for updating this variable. For the purposes of this explanation, we will assume that the coupon types are not going to change and our struct will be immutable once the contract is deployed.

The first struct we define is MintTypes, which will be used to differentiate the possible coupon types minted by each address:

```
struct MintTypes {
    uint256 _presaleMintsByAddress;
    uint256 _teamMintsByAddress;
}
```

The second struct we define is the Coupon which will be used to match the structure of the signature created (which returns an object with r, s, and v components from the signature) and validate the coupons we are generating off-chain:

```
struct Coupon {
    bytes32 r;
    bytes32 s;
    uint8 v;
}
```

## Enum
We will be using an Enum variable to specify the coupon types being used. This enum will be used to create the digest (an encoded hash of coupon type, allotted amount, and message sender) that is used to validate against the coupon being received. Note: Internally, enums are treated as numbers; you will see this applied when we generate our coupons.  Again, if you expect your coupon types to change post-deployment, you may want to include a method for updating this variable. For the purposes of this explanation, we will assume that the coupon types are not going to change and that our enum will be immutable once the contract is deployed. The two coupon types we will be using are “Presale” (for our reduced price presale minting) and “Team” (for free mints allocated to team members’ contributions on the project).  This can easily be expanded upon to create “Marketing”, “Discount”, or any number of alternate use cases.

```
enum CouponType {
    Presale,
    Team
}
```

## Address Mapping
We will be using address mapping for each of our mint types in order to keep track of the number of mints completed by each address. Doing this will allow us to prevent a wallet from minting more than the allotted amount in their coupon. This also allows us to quickly and easily modify their allotment off-chain while keeping track of their current status.

```
mapping(address => MintTypes) public addressToMinted;
```

## Validation Method
We will be using a helper method to validate that the recovery of the coupon (using ecrecover, which you can read more about here) returns an address that matches the expected public address of our signing wallet. Tampering with an existing coupon or attempting to sign a coupon with a different wallet will produce an incorrect response and cause our validation to fail. Since we are including the wallet the coupon is assigned to, the coupon type, and the allotted amount in the signature of the coupon, we are able to securely prevent the coupon from being tampered with.

```
/**
 * * Verify Coupon
 * @dev Verify that the coupon sent was signed by the coupon signer and is a valid coupon
 * @notice Valid coupons will include coupon signer, type [Presale, Team, Discount], address, and allotted mints
 * @notice Returns a boolean value
 * @param digest The digest
 * @param coupon The coupon
 */
function _isVerifiedCoupon(bytes32 digest, Coupon memory coupon) internal view returns (bool) {
    address signer = ecrecover(digest, coupon.v, coupon.r, coupon.s);
    require(signer != address(0), 'Zero Address');
    return signer == couponSigner;
}
```

## Using The Validation
Below is an example of a mint function which creates a hashed digest from the coupon type, allotted mints, and signing address to then be passed, along with the coupon, to our validation function before proceeding to allow a mint. Here, we also check the number of coupon mints that have been completed and update our count accordingly. Attempting to mint from an address that does not match the coupon, or passing an invalid allotment value will cause the coupon validation require statement to fail. Attempting to mint a qty in excess of the allotted amount will cause our max allotted require statement to fail.

```
/**
 * * Mint Presale Tokens
 * @dev Minting function for tokens available during the Presale phase
 * @notice Minting Presale tokens requires a valid coupon, associated with wallet and allotted amount
 * @param qty The number of tokens being minted by sender
 * @param allotted The allotted number of tokens specified in the Presale Coupon
 * @param coupon The signed coupon
 */
function mintPresale(uint256 qty, uint256 allotted, Coupon memory coupon) external {
    // Verify phase is not locked
    require(phase == SalePhase.Presale, "Presale Not Active");
    // Create digest to verify against signed coupon
    bytes32 digest = keccak256(
        abi.encode(CouponType.Presale, allotted, _msgSender())
    );
    // Verify digest against signed coupon
    require(_isVerifiedCoupon(digest, coupon), "Invalid Coupon");
    // Verify quantity (including already minted presale tokens) does not exceed allotted amount
    require( qty + addressToMinted[_msgSender()]._presaleMintsByAddress < _allotted + 1, "Exceeds Max Allotted");
    require(msg.value == qty * presaleMintPrice, "Incorrect Payment")
    // Increment number of presale tokens minted by wallet
    addressToMinted[_msgSender()]._presaleMintsByAddress += qty;

    // Mint Reserve Tokens
    _mint(_msgSender(), qty, "", true);
}
```

## Putting It All Together
You can find an example Smart Contract utilizing the items outlined above in the source code of this repo.

# Generating Coupons
We're going to generate our coupons in a separate application, securely detached from everything else. You will need a couple of packages installed in your project folder for this.

## Set Up The Environment
Open up your terminal and navigate to your preferred project folder.  In your terminal, run the following commands:

```
npm i create-next-app coupon-generator
cd coupon-generator
npm i ethereumjs-util ethers
npm run dev
```

Open your project in Visual Studio Code (or your preferred IDE)

## Add Environment Variables
Create a .env.local file at the root of your project (ensure that your gitignore file ignores .env files - even though you are not intending to release this code to production, it is always a good idea to play it safe!)
Add the following variables to your .env.local file:

```
COUPON_SIGNING_KEY="YOUR_GENERATED_PRIVATE_KEY"
COUPON_PUBLIC_KEY="YOUR_GENERATED_PUBLIC_ADDRESS"
```

**Note:** The privateKey generated in our previous step will include a “0x” that needs to be removed in order for it to properly buffer to the expected value (Uint8Array / Length 32).

## Upload Coupon Address Lists
We will be using JSON files to load our list of addresses and their associated mint allotments, which will later be converted into coupons. 

1. Create a folder called “lib” in the root of your project
2. Create a file called presaleAddressList.json in the new /lib folder
3. Create a file called teamAddressList.json in the new /lib folder
4. Inside each of these files, add the associated list of addresses and their mint allotments with the following structure:

```
{
    "0xd242F13432452e0A8b02768224b1D35885b4f8B2": 2,
    "0x5700E2AAEB6aE0a0985E94d6505bCC058ebFaA64": 4,
    "0x48fc468c2291badaCd0B46f233a0F3e217b329f9": 1,
    "0x912f9b9337F84648d08D4399aaF10FafDaC1Fe30": 2
}
```

## Create Folder for Coupons
We will be loading the generated coupons into a dedicated folder for easy access after they have been generated.  

Create a folder called “coupons” in the root of your project

## Create the Endpoint
We will be creating our coupon generation script as an API endpoint in our NextJS project.  While we will not be setting this up as a true API with all of the bells and whistles, setting it up this way allows the option to expand on how you implement and work with coupon generation (e.g., creating a full blown UI/UX for generating the random wallet, uploading address list data, and more dynamic handling of all the moving pieces from a single application page).

Create a retrieveCoupons.js file inside the /api folder of your project
Import the following functionality from our installed packages at the top of this file:

```
import { keccak256, toBuffer, ecsign, bufferToHex } from 'ethereumjs-util';
import { ethers } from 'ethers';
const fs = require('fs')
```

Add an exported default handler function - the rest of our code will be added inside of this function:

```
export default function handler(req, res) {

}
```

Let’s start by setting a “type” variable that we’ll expect to receive as a query parameter for our endpoint (allowing us to generate the coupons of the appropriate coupon type).  We’ll also add two conditional checks to ensure the query parameter has been correctly sent with the API request:

```
let {type} = req.query
if (type === undefined){
    res.status(400).json({message:'Error: Invalid Request - "type" is a required parameter'})
    return
}
if (type !== "presale" && type !== "team"){
    res.status(400).json({message:'Error: Invalid Request - valid "type" values are "presale" and "team"'})
    return
}  
```

Next, we’ll add an empty object variable which is where we will ultimately load all of our coupons:

```
let coupons = {};
```

Next, import the private key of our randomly generated signing wallet from the environment variables, using the Buffer utility function to convert the string to a buffered hex value:

```
const signerPvtKeyString = process.env.COUPON_SIGNING_KEY || "";
const signerPvtKey = Buffer.from(signerPvtKeyString, "hex");
```

Now let’s import the address lists, using a switch statement to import the correct address list file associated with the coupon type received by the type param:

```
let addressList
    switch(type) {
        case "presale":
        addressList = require('/lib/presaleAddressList.json')
        break;
    case "team":
        addressList = require('/lib/teamAddressList.json')
        break;
}
```

Next, we need to create an object variable to replicate the structure of the enum Coupon variable we added to our smart contract.  Important: enumerated variables in Solidity are translated to numbers with an index of 0, so it is extremely important that the structure of this variable match our smart contract enum variable exactly:

```
const CouponTypeEnum = {
    Presale: 0,
    Team: 1
}
```

Next, we are going to create some helper functions that will be used inside of the generateCoupons() function we will be creating later.

createCoupon() takes a hashed value and the buffered hex of the private key from our signing wallet and uses ethereumjs-util’s ecsign function to return an ECDSA signature
generateHashBuffer() takes our types and value arrays and uses ethereumjs-util’s toBuffer and keccak256 functions to  return a buffered keccak256 hash
serializeCoupon() takes our signed coupon and serializes it in our final “coupon” object

```
function createCoupon(hash, signerPvtKey) {
    return ecsign(hash, signerPvtKey);
}
function generateHashBuffer(typesArray, valueArray) {
    return keccak256(
        toBuffer(ethers.utils.defaultAbiCoder.encode(typesArray,valueArray))
    )
}
function serializeCoupon(coupon) {
    return {
        r: bufferToHex(coupon.r),
        s: bufferToHex(coupon.s),
        v: coupon.v,
    }
}
```

This next piece is to create and call our primary generateCoupons() function.  There is a LOT going on here, so I have done my best to add comments breaking down each of the pieces, rather than attempt to explain each piece separately:

```
/**
 * * generateCoupons
 * @dev This function iterates through a list of addresses, converting them
 * to a signed hash of the coupon details and writing them out to a JSON file
 */
const generateCoupons = () => {
  try {
    // Iterate through addresses list
    for ( const [address, qty] of Object.entries(addressList) ) {
      
      // Verify that the address is a valid address (many presale/allowlist signups include invalid addresses)
      if (ethers.utils.isAddress(address)){

        // Set userAddress to a Checksum Address of the address
        // If address is an invalid 40-nibble HexString or if it contains mixed case 
        //   and the checksum is invalid, an INVALID_ARGUMENT Error is thrown.
        // The value of address may be any supported address format.
        const userAddress = ethers.utils.getAddress(address);
      
        // Set our Coupon Type
        let couponType
        switch(type) {
          case "presale":
              couponType = CouponTypeEnum["Presale"]
              break;
          case "team":
              couponType = CouponTypeEnum["Team"]
              break;
        }

        // Call our helper function to generate the hash buffer
        const hashBuffer = generateHashBuffer(
          ["uint256", "uint256", "address"],
          [couponType, qty, userAddress]
        );
      
        // Call our helper function to sign our hashed buffer and create the coupon
        const coupon = createCoupon(hashBuffer, signerPvtKey);

        // Add the wallet address with allotted mints and coupon to our coupons object
        coupons[userAddress.toLowerCase()] = {
          qty,
          coupon: serializeCoupon(coupon)
        }
      } else {
        // Kick out a log of addresses that were flagged as invalid
       console.log(address + ': Invalid Address')
      }
    }

    // Convert our coupons object to a readable string
    const writeData = JSON.stringify(coupons, null, 2);

    // Write our coupons to a JSON file based on the type param received
    fs.writeFileSync(`coupons/${type}Coupons.json`, writeData);

  } catch (err) {
    // Log errors and send associated response status code with error message
    console.error(err)
    res.status(500).json({ message: err })
  }
}

// Call our generateCoupons function
generateCoupons();
```

Assuming that everything went well and nothing broke!  We’ll wrap up our endpoint with a final success response:

```
res.status(200).json({ message: 'Success!'})
```

# dApp Coupon Mint
I’m going to make the assumption that you already have experience writing a minting dApp and will only need to know how to make use of these coupons we have created and set up validation for in our smart contract.  

## Importing Coupons
For starters, we will need to create access to our coupons.  This can be done multiple different ways: loading them into a database and querying based on wallet address, uploading them to a folder in our minting dApp and querying via an API endpoint, or simply importing them directly.  For simplicity sake, we will be importing the JSON directly in this example:

```
const presaleCoupons = require('./coupons/presaleCoupons.json');
const teamCoupons = require('./coupons/teamCoupons.json');
```

## Validation
Assuming that we have a connected wallet - let’s say that you’ve assigned it to a “currentAccount” variable - we can now utilize a validation function to check for a valid coupon.  Depending on your dApp and use-case, the implementations are numerous and I will not go into how specifically you should handle your client-side validation, but some example checks might be the following…

Check for a valid coupon:

```
const haspresaleCoupon = () => {
    const couponExists = (presaleCoupons[currentAccount] === undefined) ? false : true
    return couponExists
  }
```

Restrict maximum mint quantity (Note: you may also want to validate the amount they have already minted and reduce their maximum increment accordingly on line 4):

```
const incrementCounter = () => {
    let maxIncrement
    if ( phase === 3 && hasPresaleCoupon() ){
        maxIncrement = coupons[currentAccount].qty
    } else {
        maxIncrement = maxPerTx
    }
    if (mintQty + 1 > maxIncrement){
        setMintQty(maxIncrement)
    } else {
        setMintQty(mintQty + 1);
    }
}
```

Prevent a mint attempt if the connected wallet does not have a valid coupon:

```
const mintPresaleNfts = async () => {
    if ( !hasPresaleCoupon() ){
        alert('You do not have a Presale Coupon! Why are you trying to waste gas?!')
        return
    }
    ...
}
```

## Coupon Mint Transaction
Based on the mintPresaleNfts function listed as an example in our Smart Contract Validation section above, we are looking to pass 3 parameters (along with our options object) to the mintPresaleNfts function on the contract: _qty, _allotted, _coupon.  Below is a short and simple example of a mint function (using EthersJS with MetaMask as the provider) utilizing the coupons we have created:

```
try {
  const { ethereum } = window

  if (ethereum) {

    const provider = new ethers.providers.Web3Provider(ethereum)
    const signer = provider.getSigner()
    const nftContract = new ethers.Contract(
      nftContractAddress,
      NFT.abi,
      signer
    )

    const options = {
      value: ethers.utils.parseEther(String(totalPrice))
    }

    let nftTx = await nftContract.mintPresale(mintQty,presaleCoupons[currentAccount].qty,presaleCoupons[currentAccount].coupon,options)
    console.log('Minting....', nftTx.hash)

    let tx = await nftTx.wait()
    console.log('Mined!', tx)

    let event = tx.events[0]
    console.log(event)

  } else {
    console.error("Ethereum object doesn't exist!")
  }
} catch (error) {
  console.error('Error Minting: ', error)
}
```

And there you have it!  A sample project, putting it all together, can be found in this GitHub repo. For brevity's sake, this sample project is intended as a point of reference only and excludes a number of checks and methods that should be included for a fully production-ready contract.
