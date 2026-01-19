const DApp = {
  web3: null,
  account: null,
  contracts: {},
  addresses: {},

  async init() {
    if (window.ethereum) {
      this.web3 = new Web3(window.ethereum);
      await this.loadAddresses();
      this.bindUI();
      this.refreshUI();
    }
  },

  async loadAddresses() {
    const res = await fetch("/api/contracts");
    this.addresses = await res.json();

    const [paymentArtifact, loyaltyArtifact, membershipArtifact] = await Promise.all([
      fetch("/contracts/GroceryPayment.json").then((r) => r.json()),
      fetch("/contracts/LoyaltyRewards.json").then((r) => r.json()),
      fetch("/contracts/MembershipNFT.json").then((r) => r.json()),
    ]);

    if (this.addresses.paymentAddress) {
      this.contracts.payment = new this.web3.eth.Contract(
        paymentArtifact.abi,
        this.addresses.paymentAddress
      );
    }
    if (this.addresses.loyaltyAddress) {
      this.contracts.loyalty = new this.web3.eth.Contract(
        loyaltyArtifact.abi,
        this.addresses.loyaltyAddress
      );
    }
    if (this.addresses.membershipAddress) {
      this.contracts.membership = new this.web3.eth.Contract(
        membershipArtifact.abi,
        this.addresses.membershipAddress
      );
    }
  },

  bindUI() {
    const connectButton = document.getElementById("connectWallet");
    if (connectButton) {
      connectButton.addEventListener("click", async () => {
        await this.connectWallet();
        await this.refreshUI();
      });
    }

    const buyButton = document.getElementById("buyButton");
    if (buyButton) {
      buyButton.addEventListener("click", async () => {
        const productId = buyButton.dataset.productId;
        const priceWei = buyButton.dataset.priceWei;
        await this.purchaseProduct(productId, priceWei);
      });
    }

    const redeemButton = document.getElementById("redeemButton");
    if (redeemButton) {
      redeemButton.addEventListener("click", async () => {
        const amountInput = document.getElementById("redeemAmount");
        const amount = amountInput.value;
        await this.redeemPoints(amount);
      });
    }
  },

  async connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask is required to continue.");
      return;
    }
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    this.account = accounts[0];
    this.updateWalletDisplay();
  },

  updateWalletDisplay() {
    const walletDisplay = document.getElementById("walletAddress");
    if (walletDisplay && this.account) {
      walletDisplay.textContent = this.account;
    }
  },

  async purchaseProduct(productId, priceWei) {
    const notice = document.getElementById("purchaseNotice");
    if (!this.account) {
      await this.connectWallet();
    }
    if (!this.contracts.payment) {
      return;
    }
    notice.hidden = false;
    notice.textContent = "Activating membership...";
    try {
      await this.contracts.payment.methods.purchaseProduct(productId).send({
        from: this.account,
        value: priceWei,
      });
      notice.textContent = "Membership activated! Rewards updated.";
      await this.refreshUI();
    } catch (err) {
      notice.textContent = `Activation failed: ${err.message}`;
    }
  },

  async redeemPoints(amount) {
    const notice = document.getElementById("redeemNotice");
    if (!this.account) {
      await this.connectWallet();
    }
    if (!this.contracts.loyalty) {
      return;
    }
    notice.hidden = false;
    notice.textContent = "Redeeming points...";
    try {
      await this.contracts.loyalty.methods.redeem(amount).send({ from: this.account });
      notice.textContent = "Points redeemed successfully.";
      await this.refreshUI();
    } catch (err) {
      notice.textContent = `Redeem failed: ${err.message}`;
    }
  },

  async refreshUI() {
    if (!this.account) {
      const accounts = await this.web3.eth.getAccounts();
      this.account = accounts[0];
      this.updateWalletDisplay();
    }

    await this.updatePurchaseStatus();
    await this.updateAccountStats();
  },

  async updatePurchaseStatus() {
    const status = document.getElementById("purchaseStatus");
    const buyButton = document.getElementById("buyButton");
    if (!status || !buyButton || !this.contracts.payment) {
      return;
    }

    const productId = buyButton.dataset.productId;
    const purchased = await this.contracts.payment.methods
      .hasPurchased(this.account, productId)
      .call();
    status.textContent = purchased ? "Status: Active" : "Status: Not active";
    buyButton.disabled = purchased;
  },

  async updateAccountStats() {
    if (!this.contracts.loyalty || !this.contracts.membership) {
      return;
    }
    const pointsEl = document.getElementById("loyaltyPoints");
    const xpEl = document.getElementById("xpPoints");
    const purchasesEl = document.getElementById("purchaseCount");
    const tierEl = document.getElementById("membershipTier");
    const progressEl = document.getElementById("xpProgress");

    if (!pointsEl) {
      return;
    }

    const [points, xp, purchases, tierLabel] = await Promise.all([
      this.contracts.loyalty.methods.balanceOf(this.account).call(),
      this.contracts.loyalty.methods.xpOf(this.account).call(),
      this.contracts.loyalty.methods.purchasesOf(this.account).call(),
      this.contracts.membership.methods.tierLabel(this.account).call(),
    ]);

    pointsEl.textContent = points;
    xpEl.textContent = xp;
    purchasesEl.textContent = purchases;
    if (tierEl) {
      tierEl.textContent = tierLabel;
    }
    if (progressEl) {
      const progress = Math.min((Number(xp) / 500) * 100, 100);
      progressEl.style.width = `${progress}%`;
    }
  },
};

window.addEventListener("load", () => {
  if (typeof Web3 !== "undefined") {
    DApp.init().catch((err) => console.error(err));
  }
});
