// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { keccak256, toBuffer, ecsign, bufferToHex } from 'ethereumjs-util';
import { ethers } from 'ethers';

export default function handler(req, res) {
  
  const fs = require('fs')

  // Private key generated from ethers.Wallet.createRandom()
  // @notice The address used in your Smart Contract to verify the coupon must be the public address for private key  
  const signerPvtKeyString = process.env.COUPON_SIGNING_KEY || "";
  const signerPvtKey = Buffer.from(signerPvtKeyString, "hex");

  // The JSON object of whitelist addresses
  // @notice The JSON structure should be: key = wallet address (string), value = allotted mints (int)
  // @example:
  // {"0x123456789...":2,"0x987654321...":10}
  const whitelistFile = 'devwhitelist.json'; // should be an API req variable
  const whitelistAddresses = require(`/lib/${whitelistFile}`);
  
  // Enumerated value; this should match the struct variable in your Smart Contract
  const CouponTypeEnum = {
    Whitelist: 0
  }

  // HELPER FUNCTIONS
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

  const couponsSetup = () => {
    if (fs.existsSync('lib/coupons')) {
      fs.rmSync('lib/coupons', { recursive: true})
    }
    fs.mkdirSync('lib/coupons');
  }

  const generateWhitelistCoupons = () => {
    let coupons = {};

    couponsSetup();

    try {
      for ( const [address, qty] of Object.entries(whitelistAddresses) ) {
        
        if (ethers.utils.isAddress(address)){          
          const userAddress = ethers.utils.getAddress(address);
        
          const hashBuffer = generateHashBuffer(
            ["uint256", "uint256", "address"],
            [CouponTypeEnum["Whitelist"], qty, userAddress]
          );
        
          const coupon = createCoupon(hashBuffer, signerPvtKey);
          coupons[userAddress.toLowerCase()] = {
            qty,
            coupon: serializeCoupon(coupon)
          }
        } else {
          console.log(address + ': Invalid Address')
        }
      }
      const writeData = JSON.stringify(coupons, null, 2);
      fs.writeFileSync('lib/coupons/devwhitelistCoupons.json', writeData);
    } catch (err) {
      console.log(err)
    }
  }


  generateWhitelistCoupons();  

  res.status(200).json({ message: 'Success!' })
}
