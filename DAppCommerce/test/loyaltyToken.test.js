const GroceryPayment = artifacts.require("GroceryPayment");
const LoyaltyRewards = artifacts.require("LoyaltyRewards");
const MembershipNFT = artifacts.require("MembershipNFT");

contract("LoyaltyRewards", (accounts) => {
  const [seller, buyer, attacker] = accounts;

  async function deployAll() {
    const loyalty = await LoyaltyRewards.new({ from: seller });
    const membership = await MembershipNFT.new({ from: seller });
    const payment = await GroceryPayment.new(loyalty.address, { from: seller });

    await loyalty.setPaymentContract(payment.address, { from: seller });
    await loyalty.setMembershipContract(membership.address, { from: seller });
    await membership.setLoyaltyContract(loyalty.address, { from: seller });

    return { loyalty, membership, payment };
  }

  it("redeems loyalty points", async () => {
    const { loyalty, payment } = await deployAll();
    const price = web3.utils.toWei("0.01", "ether");
    await payment.addProduct("Eggs", "Free range eggs", price, { from: seller });
    await payment.purchaseProduct(1, { from: buyer, value: price });

    const before = await loyalty.balanceOf(buyer);
    await loyalty.redeem(5, { from: buyer });
    const after = await loyalty.balanceOf(buyer);

    assert.equal(after.toNumber(), before.toNumber() - 5, "points reduced after redeem");
  });

  it("blocks non-payment contract from issuing rewards", async () => {
    const loyalty = await LoyaltyRewards.new({ from: seller });
    try {
      await loyalty.recordPurchase(attacker, 10, 100, { from: attacker });
      assert.fail("should not allow recordPurchase");
    } catch (err) {
      assert(err.message.includes("Only payment contract"), "expected Only payment contract revert");
    }
  });
});
