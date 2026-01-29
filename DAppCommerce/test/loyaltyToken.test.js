const GymMembershipPayment = artifacts.require("GymMembershipPayment");
const LoyaltyRewards = artifacts.require("LoyaltyRewards");
const MembershipNFT = artifacts.require("MembershipNFT");

contract("LoyaltyRewards", (accounts) => {
  const [seller, buyer, attacker] = accounts;

  async function deployAll() {
    const loyalty = await LoyaltyRewards.new({ from: seller });
    const membership = await MembershipNFT.new({ from: seller });
    const payment = await GymMembershipPayment.new(loyalty.address, { from: seller });

    await loyalty.setPaymentContract(payment.address, { from: seller });
    await loyalty.setMembershipContract(membership.address, { from: seller });
    await membership.setLoyaltyContract(loyalty.address, { from: seller });

    return { loyalty, membership, payment };
  }

  it("redeems loyalty points", async () => {
    const { loyalty, payment } = await deployAll();
    const price = web3.utils.toWei("0.05", "ether");
    await payment.addProduct("Eggs", "Free range eggs", price, { from: seller });
    await payment.purchaseProduct(1, { from: buyer, value: price });

    const before = await loyalty.balanceOf(buyer);
    await loyalty.redeem(5, { from: buyer });
    const after = await loyalty.balanceOf(buyer);

    assert.equal(after.toNumber(), before.toNumber() - 5, "points reduced after redeem");
  });

  it("redeems a discount and stores it for the buyer", async () => {
    const { loyalty, payment } = await deployAll();
    const price = web3.utils.toWei("0.1", "ether");
    await payment.addProduct("Bundle", "Starter bundle", price, { from: seller });

    await payment.purchaseProduct(1, { from: buyer, value: price });
    await payment.purchaseProduct(1, { from: buyer, value: price });

    const before = await loyalty.balanceOf(buyer);
    await loyalty.redeemDiscount(1000, { from: buyer });
    const after = await loyalty.balanceOf(buyer);
    const discount = await loyalty.discountBpsOf(buyer);

    assert.equal(discount.toNumber(), 1000, "discount should be stored");
    assert.equal(after.toNumber(), before.toNumber() - 30, "points reduced by discount cost");
  });

  it("applies the discount on the next purchase and consumes it", async () => {
    const { loyalty, payment } = await deployAll();
    const price = web3.utils.toWei("0.1", "ether");
    await payment.addProduct("Plan", "Membership plan", price, { from: seller });

    await payment.purchaseProduct(1, { from: buyer, value: price });
    await payment.purchaseProduct(1, { from: buyer, value: price });
    await loyalty.redeemDiscount(1000, { from: buyer });

    const discountPrice = web3.utils.toBN(price).muln(90).divn(100);
    await payment.purchaseProduct(1, { from: buyer, value: discountPrice });

    const discount = await loyalty.discountBpsOf(buyer);
    assert.equal(discount.toNumber(), 0, "discount should be consumed after purchase");
  });

  it("blocks redeeming a second discount when one is active", async () => {
    const { loyalty, payment } = await deployAll();
    const price = web3.utils.toWei("0.1", "ether");
    await payment.addProduct("Plan", "Membership plan", price, { from: seller });

    await payment.purchaseProduct(1, { from: buyer, value: price });
    await payment.purchaseProduct(1, { from: buyer, value: price });
    await loyalty.redeemDiscount(1000, { from: buyer });

    try {
      await loyalty.redeemDiscount(1000, { from: buyer });
      assert.fail("should not allow a second discount");
    } catch (err) {
      assert(err.message.includes("Discount already active"), "expected discount already active revert");
    }
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
