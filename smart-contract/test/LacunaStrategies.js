// We import Chai to use its asserting functions here.
const { expect } = require("chai");

describe("Lacuna Strategies Example Contract", function () {

    let Lacuna;
    let hardhatLacuna;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
        // Get the ContractFactory and Signers here.
        Lacuna = await ethers.getContractFactory("LacunaStrategies");
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        // To deploy our contract, we just have to call Token.deploy() and await
        // for it to be deployed(), which happens once its transaction has been
        // mined.
        hardhatLacuna = await Lacuna.deploy(
            "0xc648C07624f4F6acb40e2Ca3a8D2cAF730EDD960",
            ["0x08D8e1A0E3263A251dbf36455d6134bD30ABD230"],
            [1]
        );
    });

    // You can nest describe calls to create subsections.
    describe("Deployment", function () {
        // `it` is another Mocha function. This is the one you use to define your
        // tests. It receives the test name, and a callback function.

        // If the callback function is async, Mocha will `await` it.
        it("Shall set the right owner", async function () {
            // Expect receives a value, and wraps it in an Assertion object. These
            // objects have a lot of utility methods to assert values.

            // This test expects the owner variable stored in the contract to be equal
            // to our Signer's owner.
            expect(await hardhatLacuna.owner()).to.equal(owner.address);
        });
        it("Shall set the correct Coupon Signer", async function () {
            expect(await hardhatLacuna.couponSigner()).to.equal("0xc648C07624f4F6acb40e2Ca3a8D2cAF730EDD960")
        })
    });

    describe("Admin Methods", function () {
        it("Shall allow owner to set Coupon Signer", async function () {
            await hardhatLacuna.setCouponSigner("0x632ddb36bd1b733b86aefe322dec3e0b3eaadcec");
            const check = await hardhatLacuna.couponSigner();
            expect(check).to.equal("0x632ddb36bd1b733B86AefE322dec3e0B3eAAdCec");
        })
        it("Shall not allow non-owner to set Coupon Signer", async function () {
            await expect(
                hardhatLacuna.connect(addr1).setCouponSigner("0x632ddb36bd1b733b86aefe322dec3e0b3eaadcec")
            ).to.be.revertedWith("Ownable: caller is not the owner");
        })
    });

    describe("Minting Methods", function () {
        it("Shall not allow Public Mint with insufficient funds", async function () {
            await expect(
                hardhatLacuna.connect(addr1).mint(1, { value: 600000000000000 })
            ).to.be.revertedWith("Incorrect Payment");
        })
        it("Shall allow Public Mint with sufficient funds", async function () {
            await hardhatLacuna.connect(addr1).mint(1, {value: 700000000000000});
            const check = await hardhatLacuna.balanceOf(addr1.address);
            expect(check).to.equal(1)
        })

    })
});