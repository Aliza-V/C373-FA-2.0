const GymMembershipPayment = artifacts.require("GymMembershipPayment");
const LoyaltyRewards = artifacts.require("LoyaltyRewards");
const MembershipNFT = artifacts.require("MembershipNFT");

contract("MembershipNFT", (accounts) => {
  const [seller, buyer] = accounts;

  async function deployAll() {
    const loyalty = await LoyaltyRewards.new({ from: seller });
    const membership = await MembershipNFT.new({ from: seller });
    const payment = await GymMembershipPayment.new(loyalty.address, { from: seller });

    await loyalty.setPaymentContract(payment.address, { from: seller });
    await loyalty.setMembershipContract(membership.address, { from: seller });
    await membership.setLoyaltyContract(loyalty.address, { from: seller });

    return { loyalty, membership, payment };
  }

  async function expectRevert(promise, reason) {
    try {
      await promise;
      assert.fail("Expected revert was not received");
    } catch (err) {
      const message = err.message || "";
      assert(message.includes("revert"), "Expected revert");
      if (reason) {
        assert(message.includes(reason), `Expected reason: ${reason}`);
      }
    }
  }

  it("starts with no membership tier", async () => {
    const { membership } = await deployAll();
    const tier = await membership.tierOf(buyer);
    assert.equal(tier.toNumber(), 0, "initial tier should be None");
  });

  it("blocks non-loyalty contract updates", async () => {
    const { membership } = await deployAll();
    await expectRevert(
      membership.updateMembership(buyer, 200, 3, { from: buyer }),
      "Only loyalty contract"
    );
  });

  it("does not upgrade before three purchases", async () => {
    const { membership, payment } = await deployAll();
    const price = web3.utils.toWei("0.05", "ether");
    await payment.addProduct("Fruits", "Tropical fruits", price, { from: seller });
    await payment.addProduct("Veggies", "Fresh veggies", price, { from: seller });

    await payment.purchaseProduct(1, { from: buyer, value: price });
    await payment.purchaseProduct(2, { from: buyer, value: price });

    const tier = await membership.tierOf(buyer);
    assert.equal(tier.toNumber(), 0, "tier should stay None with <3 purchases");
  });

  it("upgrades membership after three purchases", async () => {
    const { membership, payment } = await deployAll();
    const price = web3.utils.toWei("0.05", "ether");
    await payment.addProduct("Fruits", "Tropical fruits", price, { from: seller });
    await payment.addProduct("Veggies", "Fresh veggies", price, { from: seller });
    await payment.addProduct("Protein", "Protein pack", price, { from: seller });

    await payment.purchaseProduct(1, { from: buyer, value: price });
    await payment.purchaseProduct(2, { from: buyer, value: price });
    await payment.purchaseProduct(3, { from: buyer, value: price });

    const tier = await membership.tierOf(buyer);
    assert.equal(tier.toNumber(), 2, "buyer should reach Gold tier");
  });

  it("reaches platinum after five purchases", async () => {
    const { membership, payment } = await deployAll();
    const price = web3.utils.toWei("0.05", "ether");
    await payment.addProduct("Daily", "Day pass", price, { from: seller });
    await payment.addProduct("Weekly", "Week pass", price, { from: seller });
    await payment.addProduct("Monthly", "Month pass", price, { from: seller });
    await payment.addProduct("Quarterly", "Quarter pass", price, { from: seller });
    await payment.addProduct("Yearly", "Year pass", price, { from: seller });

    await payment.purchaseProduct(1, { from: buyer, value: price });
    await payment.purchaseProduct(2, { from: buyer, value: price });
    await payment.purchaseProduct(3, { from: buyer, value: price });
    await payment.purchaseProduct(4, { from: buyer, value: price });
    await payment.purchaseProduct(5, { from: buyer, value: price });

    const tier = await membership.tierOf(buyer);
    assert.equal(tier.toNumber(), 3, "buyer should reach Platinum tier");
  });
});
