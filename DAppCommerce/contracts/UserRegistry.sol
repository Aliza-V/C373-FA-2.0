// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract UserRegistry {
    struct User {
        string name;
        string particulars;
        bytes32 passwordHash;
        address wallet;
        bool exists;
    }

    address public owner;
    mapping(bytes32 => User) private users;

    event UserRegistered(bytes32 indexed emailHash, string name);
    event UserUpdated(bytes32 indexed emailHash, string name, string particulars);
    event WalletLinked(bytes32 indexed emailHash, address wallet);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function register(
        bytes32 emailHash,
        string memory name,
        string memory particulars,
        bytes32 passwordHash
    ) external onlyOwner {
        require(emailHash != bytes32(0), "Invalid email");
        require(passwordHash != bytes32(0), "Invalid password");
        require(!users[emailHash].exists, "Email already registered");
        users[emailHash] = User({
            name: name,
            particulars: particulars,
            passwordHash: passwordHash,
            wallet: address(0),
            exists: true
        });
        emit UserRegistered(emailHash, name);
    }

    function verifyLogin(bytes32 emailHash, bytes32 passwordHash) external view returns (bool) {
        User storage user = users[emailHash];
        return user.exists && user.passwordHash == passwordHash;
    }

    function getProfile(bytes32 emailHash)
        external
        view
        returns (string memory name, string memory particulars, address wallet)
    {
        User storage user = users[emailHash];
        require(user.exists, "User not found");
        return (user.name, user.particulars, user.wallet);
    }

    function setWallet(bytes32 emailHash, address wallet) external onlyOwner {
        User storage user = users[emailHash];
        require(user.exists, "User not found");
        user.wallet = wallet;
        emit WalletLinked(emailHash, wallet);
    }

    function updateProfile(bytes32 emailHash, string memory name, string memory particulars) external onlyOwner {
        User storage user = users[emailHash];
        require(user.exists, "User not found");
        user.name = name;
        user.particulars = particulars;
        emit UserUpdated(emailHash, name, particulars);
    }

    function userExists(bytes32 emailHash) external view returns (bool) {
        return users[emailHash].exists;
    }
}
