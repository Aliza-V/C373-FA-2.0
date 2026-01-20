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

  it("upgrades membership after three purchases", async () => {
    const { membership, payment } = await deployAll();
    const price = web3.utils.toWei("0.01", "ether");
    await payment.addProduct("Fruits", "Tropical fruits", price, { from: seller });

    await payment.purchaseProduct(1, { from: buyer, value: price });
    await payment.purchaseProduct(1, { from: buyer, value: price });
    await payment.purchaseProduct(1, { from: buyer, value: price });

    const tier = await membership.tierOf(buyer);
    assert.equal(tier.toNumber(), 2, "buyer should reach Gold tier");
  });
});
