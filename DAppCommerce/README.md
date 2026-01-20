# FlexChain Fitness dApp

## Integrated Feature Design

The gym membership blockchain dApp uses a single signup flow to trigger three smart contract features in sequence:

Payment Automation -> Loyalty Rewards & XP -> NFT Membership Tiers

### Smart Contract Interaction Logic

1. **GymMembershipPayment** (payment contract) confirms the membership payment and transfers ETH to the gym.
2. **LoyaltyRewards** is triggered by the payment contract to issue points and XP.
3. **MembershipNFT** upgrades the membership tier when XP and payment thresholds are met.

This enforces fairness:
- No payment -> No points
- No points -> No XP
- No XP -> No membership upgrades

## User Flow (End-to-End)

1. User browses membership plans
2. User selects a plan
3. User proceeds to checkout
4. User pays using MetaMask
5. Payment contract confirms membership activation
6. Loyalty points and XP are awarded automatically
7. Membership progress updates
8. User views tier, points, and rewards in the account dashboard

## User Stories (Academic-Friendly)

1. As a user, I want to choose a gym membership plan and proceed to payment so that I can join using my MetaMask wallet.
2. As a user, I want my payment to be processed automatically on the blockchain so that I can trust the transaction without relying on a third party.
3. As a user, I want to earn loyalty points and experience points (XP) upon payment confirmation so that I can redeem rewards and progress through membership tiers.
4. As a user, I want to earn points only after payment is successfully confirmed so that rewards are fairly issued and cannot be manipulated.
5. As a user, I want to access my membership dashboard to view my current tier, XP progress, and unlocked rewards.
6. As a user, I want to unlock higher membership tiers as I gain more XP so that I can receive better rewards and exclusive benefits.
7. As a user, I want to receive updates in my account after payments so that I am informed about payment status, points earned, and membership progress.

## Frontend Pages (3-Page Prototype)

- **Plan Listing** (`/`)
  - Displays gym membership plans with details and prices.
- **Plan Detail & Checkout** (`/product/:id`)
  - Shows plan details and triggers MetaMask payment.
- **Membership / Account** (`/account`)
  - Shows wallet address, loyalty points, XP progress bar, tier, and rewards.
- **About Us** (`/about`)
  - Explains business goals and blockchain value.

## Contract Map

- `contracts/GymMembershipPayment.sol` - Payment automation, plans, membership activation.
- `contracts/LoyaltyRewards.sol` - Points + XP issuance, redemption.
- `contracts/MembershipNFT.sol` - Tier upgrade logic based on XP + payments.

## Local Run (Ganache)

1. `truffle migrate --reset --network development`
2. `node src/app.js`
3. Open http://localhost:3000
