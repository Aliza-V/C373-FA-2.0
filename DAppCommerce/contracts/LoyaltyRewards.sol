// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IMembershipNFT {
    function updateMembership(address user, uint256 xp, uint256 purchases) external;
}

contract LoyaltyRewards {
    address public owner;
    address public paymentContract;
    address public membershipContract;

    mapping(address => uint256) private points;
    mapping(address => uint256) private xpTotal;
    mapping(address => uint256) private purchaseCount;

    event RewardsRecorded(address indexed user, uint256 points, uint256 xp, uint256 purchases);
    event Redeemed(address indexed user, uint256 amount);
    event PaymentContractUpdated(address indexed paymentContract);
    event MembershipContractUpdated(address indexed membershipContract);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyPayment() {
        require(msg.sender == paymentContract, "Only payment contract");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setPaymentContract(address _paymentContract) external onlyOwner {
        require(_paymentContract != address(0), "Invalid payment contract");
        paymentContract = _paymentContract;
        emit PaymentContractUpdated(_paymentContract);
    }

    function setMembershipContract(address _membershipContract) external onlyOwner {
        require(_membershipContract != address(0), "Invalid membership contract");
        membershipContract = _membershipContract;
        emit MembershipContractUpdated(_membershipContract);
    }

    function recordPurchase(address buyer, uint256 rewardPoints, uint256 rewardXp) external onlyPayment {
        points[buyer] += rewardPoints;
        xpTotal[buyer] += rewardXp;
        purchaseCount[buyer] += 1;

        if (membershipContract != address(0)) {
            IMembershipNFT(membershipContract).updateMembership(buyer, xpTotal[buyer], purchaseCount[buyer]);
        }

        emit RewardsRecorded(buyer, rewardPoints, rewardXp, purchaseCount[buyer]);
    }

    function redeem(uint256 amount) external {
        require(amount > 0, "Amount must be positive");
        require(points[msg.sender] >= amount, "Not enough points");
        points[msg.sender] -= amount;
        emit Redeemed(msg.sender, amount);
    }

    function balanceOf(address user) external view returns (uint256) {
        return points[user];
    }

    function xpOf(address user) external view returns (uint256) {
        return xpTotal[user];
    }

    function purchasesOf(address user) external view returns (uint256) {
        return purchaseCount[user];
    }
}
