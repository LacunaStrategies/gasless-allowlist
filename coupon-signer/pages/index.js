import { keccak256, toBuffer, ecsign, bufferToHex } from 'ethereumjs-util';
import { ethers } from 'ethers';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="text-center">
      <h1 className="text-8xl font-bold uppercase text-center">Coupon Signer</h1>
      <Link href="/api/retrieveCoupons">
        <a
          className="text-white inline-block mt-8 bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-cyan-300 dark:focus:ring-cyan-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2"
        >Retrieve Coupons</a>
      </Link>
    </div>
  )
}
