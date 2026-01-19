// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MembershipNFT {
    address public loyaltyContract;

    mapping(address => uint8) private tiers;

    event MembershipUpgraded(address indexed user, uint8 newTier);
    event LoyaltyContractUpdated(address indexed loyaltyContract);

    modifier onlyLoyalty() {
        require(msg.sender == loyaltyContract, "Only loyalty contract");
        _;
    }

    function setLoyaltyContract(address _loyaltyContract) external {
        require(loyaltyContract == address(0) || msg.sender == loyaltyContract, "Unauthorized");
        require(_loyaltyContract != address(0), "Invalid loyalty contract");
        loyaltyContract = _loyaltyContract;
        emit LoyaltyContractUpdated(_loyaltyContract);
    }

    function updateMembership(address user, uint256 xp, uint256 purchases) external onlyLoyalty {
        uint8 currentTier = tiers[user];
        uint8 newTier = _calculateTier(xp, purchases);
        if (newTier > currentTier) {
            tiers[user] = newTier;
            emit MembershipUpgraded(user, newTier);
        }
    }

    function tierOf(address user) external view returns (uint8) {
        return tiers[user];
    }

    function isMember(address user) external view returns (bool) {
        return tiers[user] > 0;
    }

    function tierLabel(address user) external view returns (string memory) {
        uint8 tier = tiers[user];
        if (tier == 1) return "Silver";
        if (tier == 2) return "Gold";
        if (tier == 3) return "Platinum";
        return "None";
    }

    function _calculateTier(uint256 xp, uint256 purchases) internal pure returns (uint8) {
        if (purchases < 3) {
            return 0;
        }
        if (xp >= 500) {
            return 3;
        }
        if (xp >= 250) {
            return 2;
        }
        if (xp >= 100) {
            return 1;
        }
        return 0;
    }
}
