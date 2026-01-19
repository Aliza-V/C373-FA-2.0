// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ILoyaltyRewards {
    function recordPurchase(address buyer, uint256 points, uint256 xp) external;
}

contract GroceryPayment {
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

    event ProductAdded(uint256 indexed id, string name, uint256 priceWei);
    event ProductPurchased(uint256 indexed id, address indexed buyer, uint256 priceWei);
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

    function purchaseProduct(uint256 _id) external payable {
        Product memory product = products[_id];
        require(product.id != 0, "Invalid product");
        require(product.active, "Product inactive");
        require(msg.value == product.priceWei, "Incorrect ETH value");

        purchases[msg.sender][_id] = true;
        (bool sent, ) = seller.call{value: msg.value}("");
        require(sent, "Payment failed");

        uint256 points = product.priceWei / 1e15; // 0.001 ETH = 1 point
        if (points == 0) {
            points = 1;
        }
        uint256 xp = points * 10;
        ILoyaltyRewards(loyaltyContract).recordPurchase(msg.sender, points, xp);

        emit ProductPurchased(_id, msg.sender, product.priceWei);
    }
}
