const GroceryPayment = artifacts.require("GroceryPayment");
const LoyaltyRewards = artifacts.require("LoyaltyRewards");
const MembershipNFT = artifacts.require("MembershipNFT");

module.exports = async function (deployer) {
  await deployer.deploy(LoyaltyRewards);
  const loyalty = await LoyaltyRewards.deployed();

  await deployer.deploy(MembershipNFT);
  const membership = await MembershipNFT.deployed();

  await deployer.deploy(GroceryPayment, loyalty.address);
  const payment = await GroceryPayment.deployed();

  await loyalty.setPaymentContract(payment.address);
  await loyalty.setMembershipContract(membership.address);
  await membership.setLoyaltyContract(loyalty.address);

  await payment.addProduct("Organic Rice", "Premium organic jasmine rice", web3.utils.toWei("0.01", "ether"));
  await payment.addProduct("Fresh Milk", "Dairy fresh milk 1L bottle", web3.utils.toWei("0.008", "ether"));
  await payment.addProduct("Free Range Eggs", "A dozen free range eggs", web3.utils.toWei("0.006", "ether"));
  await payment.addProduct("Seasonal Vegetables", "Local farm vegetable pack", web3.utils.toWei("0.009", "ether"));
  await payment.addProduct("Tropical Fruits", "Fruit bundle for the week", web3.utils.toWei("0.012", "ether"));
};
