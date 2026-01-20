const GymMembershipPayment = artifacts.require("GymMembershipPayment");
const LoyaltyRewards = artifacts.require("LoyaltyRewards");
const MembershipNFT = artifacts.require("MembershipNFT");

module.exports = async function (deployer) {
  await deployer.deploy(LoyaltyRewards);
  const loyalty = await LoyaltyRewards.deployed();

  await deployer.deploy(MembershipNFT);
  const membership = await MembershipNFT.deployed();

  await deployer.deploy(GymMembershipPayment, loyalty.address);
  const payment = await GymMembershipPayment.deployed();

  await loyalty.setPaymentContract(payment.address);
  await loyalty.setMembershipContract(membership.address);
  await membership.setLoyaltyContract(loyalty.address);

  await payment.addProduct(
    "Daily Pass",
    "24-hour gym access with standard equipment and locker use.",
    web3.utils.toWei("0.002", "ether")
  );
  await payment.addProduct(
    "Weekly Pass",
    "7-day access plus 1 guest pass and basic group classes.",
    web3.utils.toWei("0.006", "ether")
  );
  await payment.addProduct(
    "Monthly Membership",
    "30-day access, unlimited classes, and monthly progress check-in.",
    web3.utils.toWei("0.02", "ether")
  );
  await payment.addProduct(
    "Yearly Membership",
    "365-day access with premium support and priority booking.",
    web3.utils.toWei("0.18", "ether")
  );
};
