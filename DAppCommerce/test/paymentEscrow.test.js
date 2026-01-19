const GroceryPayment = artifacts.require("GroceryPayment");
const LoyaltyRewards = artifacts.require("LoyaltyRewards");
const MembershipNFT = artifacts.require("MembershipNFT");

contract("GroceryPayment", (accounts) => {
  const [seller, buyer] = accounts;

  async function deployAll() {
    const loyalty = await LoyaltyRewards.new({ from: seller });
    const membership = await MembershipNFT.new({ from: seller });
    const payment = await GroceryPayment.new(loyalty.address, { from: seller });

    await loyalty.setPaymentContract(payment.address, { from: seller });
    await loyalty.setMembershipContract(membership.address, { from: seller });
    await membership.setLoyaltyContract(loyalty.address, { from: seller });

    return { loyalty, membership, payment };
  }

  it("adds a product and reads it back", async () => {
    const { payment } = await deployAll();
    const price = web3.utils.toWei("0.01", "ether");
    await payment.addProduct("Organic Rice", "Premium organic jasmine rice", price, { from: seller });

    const product = await payment.getProduct(1);
    assert.equal(product[0].toNumber(), 1, "product id should be 1");
    assert.equal(product[1], "Organic Rice", "product name");
    assert.equal(product[3].toString(), price, "product price");
  });

  it("processes payment and issues rewards", async () => {
    const { payment, loyalty } = await deployAll();
    const price = web3.utils.toWei("0.01", "ether");
    await payment.addProduct("Fresh Milk", "Dairy fresh milk", price, { from: seller });

    const sellerBefore = web3.utils.toBN(await web3.eth.getBalance(seller));
    await payment.purchaseProduct(1, { from: buyer, value: price });
    const sellerAfter = web3.utils.toBN(await web3.eth.getBalance(seller));

    assert.equal(sellerAfter.sub(sellerBefore).toString(), price, "seller receives ETH");

    const points = await loyalty.balanceOf(buyer);
    const xp = await loyalty.xpOf(buyer);
    assert(points.toNumber() > 0, "points issued");
    assert(xp.toNumber() > 0, "xp issued");
  });
});
