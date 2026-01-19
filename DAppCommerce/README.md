# FreshChain Grocery dApp

## Integrated Feature Design

The grocery blockchain dApp uses a single purchase flow to trigger three smart contract features in sequence:

Payment Automation -> Loyalty Rewards & XP -> NFT Membership Tiers

### Smart Contract Interaction Logic

1. **GroceryPayment** confirms the purchase and transfers ETH to the seller.
2. **LoyaltyRewards** is triggered by the payment contract to issue points and XP.
3. **MembershipNFT** upgrades the membership tier when XP and purchase thresholds are met.

This enforces fairness:
- No purchase -> No points
- No points -> No XP
- No XP -> No membership upgrades

## User Flow (End-to-End)

1. User browses grocery products
2. User adds products to cart
3. User proceeds to checkout
4. User pays using MetaMask
5. Payment contract confirms purchase
6. Loyalty points and XP are awarded automatically
7. Membership progress updates
8. User views tier, points, and rewards in the account dashboard

## User Stories (Academic-Friendly)

1. As a user, I want to add grocery items to my cart and proceed to payment so that I can purchase items securely using my MetaMask wallet.
2. As a user, I want my payment to be processed automatically on the blockchain so that I can trust the transaction without relying on a third party.
3. As a user, I want to earn loyalty points and experience points (XP) upon purchase confirmation so that I can redeem rewards and progress through membership tiers.
4. As a user, I want to earn points only after payment is successfully confirmed so that rewards are fairly issued and cannot be manipulated.
5. As a user, I want to access my membership dashboard to view my current tier, XP progress, and unlocked rewards.
6. As a user, I want to unlock higher membership tiers as I gain more XP so that I can receive better rewards and exclusive benefits.
7. As a user, I want to receive updates in my account after purchases so that I am informed about payment status, points earned, and membership progress.

## Frontend Pages (3-Page Prototype)

- **Product Listing** (`/`)
  - Displays grocery products with images, prices, and details.
- **Product Detail & Checkout** (`/product/:id`)
  - Shows product details and triggers MetaMask payment.
- **Membership / Account** (`/account`)
  - Shows wallet address, loyalty points, XP progress bar, tier, and rewards.
- **About Us** (`/about`)
  - Explains business goals and blockchain value.

## Contract Map

- `contracts/GroceryPayment.sol` - Payment automation, products, purchase confirmation.
- `contracts/LoyaltyRewards.sol` - Points + XP issuance, redemption.
- `contracts/MembershipNFT.sol` - Tier upgrade logic based on XP + purchases.

## Local Run (Ganache)

1. `truffle migrate --reset --network development`
2. `node src/app.js`
3. Open http://localhost:3000
