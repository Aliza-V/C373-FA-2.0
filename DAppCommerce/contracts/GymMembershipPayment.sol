// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ILoyaltyRewards {
    function recordPurchase(address buyer, uint256 points, uint256 xp) external;
    function discountBpsOf(address user) external view returns (uint256);
    function consumeDiscount(address user) external returns (uint256);
}

contract GymMembershipPayment {
    struct Product {
        uint256 id;
        string name;
        string description;
        uint256 priceWei;
        bool active;
    }

    address payable public seller;
    address public loyaltyContract;
    uint256 public productCount;

    mapping(uint256 => Product) private products;
    mapping(address => mapping(uint256 => bool)) private purchases;
    mapping(address => uint256) private activeMembership;

    event ProductAdded(uint256 indexed id, string name, uint256 priceWei);
    event ProductPurchased(uint256 indexed id, address indexed buyer, uint256 priceWei);
    event MembershipCanceled(address indexed buyer, uint256 indexed id);
    event LoyaltyContractUpdated(address indexed loyaltyContract);

    modifier onlySeller() {
        require(msg.sender == seller, "Only seller");
        _;
    }

    constructor(address _loyaltyContract) {
        require(_loyaltyContract != address(0), "Invalid loyalty contract");
        seller = payable(msg.sender);
        loyaltyContract = _loyaltyContract;
    }

    function updateLoyaltyContract(address _loyaltyContract) external onlySeller {
        require(_loyaltyContract != address(0), "Invalid loyalty contract");
        loyaltyContract = _loyaltyContract;
        emit LoyaltyContractUpdated(_loyaltyContract);
    }

    function addProduct(string memory _name, string memory _description, uint256 _priceWei) external onlySeller {
        require(_priceWei > 0, "Price must be > 0");
        productCount += 1;
        products[productCount] = Product({
            id: productCount,
            name: _name,
            description: _description,
            priceWei: _priceWei,
            active: true
        });
        emit ProductAdded(productCount, _name, _priceWei);
    }

    function getProduct(uint256 _id)
        external
        view
        returns (uint256 id, string memory name, string memory description, uint256 priceWei, bool active)
    {
        Product memory product = products[_id];
        return (product.id, product.name, product.description, product.priceWei, product.active);
    }

    function hasPurchased(address _buyer, uint256 _id) external view returns (bool) {
        return purchases[_buyer][_id];
    }

    function activeMembershipOf(address _buyer) external view returns (uint256) {
        return activeMembership[_buyer];
    }

    function purchaseProduct(uint256 _id) external payable {
        Product memory product = products[_id];
        require(product.id != 0, "Invalid product");
        require(product.active, "Product inactive");

        uint256 discountBps = 0;
        if (loyaltyContract != address(0)) {
            discountBps = ILoyaltyRewards(loyaltyContract).discountBpsOf(msg.sender);
        }
        uint256 finalPrice = product.priceWei;
        if (discountBps > 0) {
            finalPrice = product.priceWei - ((product.priceWei * discountBps) / 10000);
        }
        require(msg.value == finalPrice, "Incorrect ETH value");
        require(activeMembership[msg.sender] != _id, "Membership already active");

        uint256 previous = activeMembership[msg.sender];
        if (previous != 0 && previous != _id) {
            purchases[msg.sender][previous] = false;
        }

        purchases[msg.sender][_id] = true;
        activeMembership[msg.sender] = _id;
        (bool sent, ) = seller.call{value: msg.value}("");
        require(sent, "Payment failed");

        if (discountBps > 0) {
            ILoyaltyRewards(loyaltyContract).consumeDiscount(msg.sender);
        }

        uint256 points = product.priceWei / 5e15; // 0.005 ETH = 1 point
        if (points == 0) {
            points = 1;
        }
        uint256 xp = points * 10;
        ILoyaltyRewards(loyaltyContract).recordPurchase(msg.sender, points, xp);

        emit ProductPurchased(_id, msg.sender, product.priceWei);
    }

    function cancelMembership() external {
        uint256 current = activeMembership[msg.sender];
        require(current != 0, "No active membership");
        purchases[msg.sender][current] = false;
        activeMembership[msg.sender] = 0;
        emit MembershipCanceled(msg.sender, current);
    }
}
