/**  
 SPDX-License-Identifier: GPL-3.0
 Written by: @Rhaphie // Lacuna Strategies
*/

// Solidity Version
pragma solidity ^0.8.9;

// Inherited Contracts Being Used
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "erc721a/contracts/ERC721A.sol";

contract LacunaStrategies is ERC721A, Ownable {

    address public              couponSigner; // Address of the wallet that generated the coupons
    uint256 public  constant    MINT_PRICE = 0.0007 ether; // Price of each NFT in Ethereum during Public Sale
    uint256 public  constant    PRESALE_MINT_PRICE = 0.0002 ether; // Price of each NFT in Ethereum during Presale
    
    struct MintTypes {
		uint256 _presaleMintsByAddress; // Mint type used to track number of presale mints by address
        uint256 _teamMintsByAddress; // Mint type used to track number of team mints by address
	}

    struct Coupon {
		bytes32 r;
		bytes32 s;
		uint8 v;
	}

    enum CouponType {
		Presale,
        Team
	}

    mapping(address => MintTypes) public addressToMinted;

    PaymentSplitter private splitter; // Payment splitter for allocating % shares to specified wallets

    constructor(
        address couponSigner_,
        address[] memory payees,
        uint256[] memory shares
    ) ERC721A("LacunaStrategies", "LAST") {
        couponSigner = couponSigner_;
        splitter = new PaymentSplitter(payees, shares);
    }

    // ====== Admin Functions ====== //
    /**
     * * Release Payout
     * @dev Disburse payments to associated payees according to shareholder amount.
     * @param account Payee wallet address to release payment for
     */
    function release(address payable account) public virtual onlyOwner {
        splitter.release(account);
    }

    /**
     * * Set Coupon Signer
     * @dev Set the coupon signing wallet
     * @param couponSigner_ The new coupon signing wallet address
     */
    function setCouponSigner(address couponSigner_) external onlyOwner {
        couponSigner = couponSigner_;
    }

    // ====== Helper Function ====== //
    /**
     * * Verify Coupon
     * @dev Verify that the coupon sent was signed by the coupon signer and is a valid coupon
     * @notice Valid coupons will include coupon signer, type [Presale, Team], address, and allotted mints
     * @notice Returns a boolean value
     * @param digest The digest
     * @param coupon The coupon
     */
	function _isVerifiedCoupon(bytes32 digest, Coupon memory coupon) internal view returns (bool) {
		address signer = ecrecover(digest, coupon.v, coupon.r, coupon.s);
        require(signer != address(0), 'Zero Address');
		return signer == couponSigner;
	}

    // ====== Minting Functions ====== //
    /**
     * * Mint Public Sale Tokens
     * @dev Minting function for public sale tokens
     * @param qty The number of tokens being minted by sender
     */
    function mint(uint256 qty) external payable {
        // Verify Payment
        require(msg.value == MINT_PRICE * qty, "Incorrect Payment");

        // Mint Tokens
        _mint(_msgSender(), qty);

        // Split Payment
        payable(splitter).transfer(msg.value);
    }

    /**
     * * Mint Presale Tokens
     * @dev Minting function for Presale Coupon holders
     * @notice Presale mint requires a valid presale coupon, associated with sender and allotted amount
     * @param qty The number of tokens being minted by sender
     * @param allotted The max allotment of tokens specified in the presale Coupon
     * @param coupon The signed coupon
     */
    function mintPresale(uint256 qty, uint256 allotted, Coupon memory coupon) external payable {
        // Verify Payment
        require(msg.value == PRESALE_MINT_PRICE * qty, "Incorrect Payment");

        // Verify quantity (including previous presale mints) does not exceed allotted presale amount
        require(qty + addressToMinted[_msgSender()]._presaleMintsByAddress < allotted + 1, "Exceeds Max Allotted");

        // Create digest to verify against signed coupon
        bytes32 digest = keccak256(
			abi.encode(CouponType.Presale, allotted, _msgSender())
		);

        // Verify digest against signed coupon
        require(_isVerifiedCoupon(digest, coupon), "Invalid Coupon");

        // Increment number of Presale tokens minted by wallet
        addressToMinted[_msgSender()]._presaleMintsByAddress += qty;

        // Mint Presale Tokens
        _safeMint(_msgSender(), qty);

        // Split Payment
        payable(splitter).transfer(msg.value);
    }

    /**
     * * Mint Team Tokens
     * @dev Minting function for Team Coupon holders
     * @notice Team mint requires a valid team coupon, associated with sender and allotted amount
     * @param qty The number of tokens being minted by sender
     * @param allotted The allotted number of tokens specified in the Team Coupon
     * @param coupon The signed coupon
     */
    function mintTeam(uint256 qty, uint256 allotted, Coupon memory coupon) external {
        // Create digest to verify against signed coupon
        bytes32 digest = keccak256(
			abi.encode(CouponType.Team, allotted, _msgSender())
		);

        // Verify digest against signed coupon
        require(_isVerifiedCoupon(digest,coupon), "Invalid Coupon");

        // Verify quantity (including previous team mints) does not exceed allotted team amount
        require(qty + addressToMinted[_msgSender()]._teamMintsByAddress < allotted + 1, "Exceeds Max Allotted");

        // Increment number of Team tokens minted by wallet
        addressToMinted[_msgSender()]._teamMintsByAddress += qty;

        // Mint Team Tokens
        _safeMint(_msgSender(), qty);
    }
}
