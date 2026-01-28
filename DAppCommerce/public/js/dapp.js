const DApp = {
  web3: null,
  account: null,
  contracts: {},
  addresses: {},
  sessionEmail: null,
  sessionProfile: null,
  sessionWallet: null,

  async init() {
    this.bindUI();
    await this.updateSessionStatus();

    if (window.ethereum) {
      this.web3 = new Web3(window.ethereum);
      await this.loadAddresses();
      await this.refreshUI();
    } else {
      this.updateConnectButton();
    }
  },

  async loadAddresses() {
    if (!this.web3) {
      return;
    }
    const res = await fetch("/api/contracts");
    this.addresses = await res.json();

    const [paymentArtifact, loyaltyArtifact, membershipArtifact] = await Promise.all([
      fetch("/contracts/GymMembershipPayment.json").then((r) => r.json()),
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

    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
      registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.registerAccount();
      });
    }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.loginAccount();
      });
    }

    const linkWalletButton = document.getElementById("linkWallet");
    if (linkWalletButton) {
      linkWalletButton.addEventListener("click", async () => {
        await this.connectWallet();
        await this.linkWallet();
      });
    }

    const logoutButton = document.getElementById("logoutUser");
    if (logoutButton) {
      logoutButton.addEventListener("click", async () => {
        await this.logoutUser();
      });
    }

    const cancelButton = document.getElementById("cancelMembership");
    if (cancelButton) {
      cancelButton.addEventListener("click", async () => {
        await this.cancelMembership();
      });
    }
  },

  async connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask is required to continue.");
      return;
    }
    if (!this.web3) {
      this.web3 = new Web3(window.ethereum);
      await this.loadAddresses();
    }
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    this.account = accounts[0];
    this.updateWalletDisplay();
  },

  updateWalletDisplay() {
    const walletDisplay = document.getElementById("walletAddress");
    if (walletDisplay) {
      walletDisplay.textContent = this.account || this.sessionWallet || "Not connected";
    }
    this.updateConnectButton();
  },

  updateConnectButton() {
    const connectButton = document.getElementById("connectWallet");
    if (!connectButton) {
      return;
    }
    if (!window.ethereum) {
      connectButton.textContent = "MetaMask not found";
      connectButton.disabled = true;
      return;
    }
    if (this.account) {
      connectButton.textContent = "Connected";
      connectButton.disabled = true;
      connectButton.classList.add("connected");
    } else {
      connectButton.textContent = "Connect Wallet";
      connectButton.disabled = false;
      connectButton.classList.remove("connected");
    }
  },

  async updateSessionStatus() {
    const sessionDisplay = document.getElementById("sessionEmail");
    const logoutButton = document.getElementById("logoutUser");
    const linkWalletButton = document.getElementById("linkWallet");
    const profileName = document.getElementById("profileName");
    const profileParticulars = document.getElementById("profileParticulars");
    const profileEmail = document.getElementById("profileEmail");
    const profileWallet = document.getElementById("profileWallet");

    try {
      const res = await fetch("/api/session");
      const data = await res.json();
      this.sessionEmail = data.email || null;
      this.sessionProfile = data.profile || null;
      this.sessionWallet = data.profile?.wallet || null;
    } catch (err) {
      this.sessionEmail = null;
      this.sessionProfile = null;
      this.sessionWallet = null;
    }

    if (sessionDisplay) {
      sessionDisplay.textContent = this.sessionEmail || "Not logged in";
    }
    if (logoutButton) {
      logoutButton.hidden = !this.sessionEmail;
    }
    if (linkWalletButton) {
      linkWalletButton.hidden = !this.sessionEmail;
    }
    if (profileName) {
      profileName.textContent = this.sessionProfile?.name || "-";
    }
    if (profileParticulars) {
      profileParticulars.textContent = this.sessionProfile?.particulars || "-";
    }
    if (profileEmail) {
      profileEmail.textContent = this.sessionEmail || "-";
    }
    if (profileWallet) {
      profileWallet.textContent = this.sessionWallet || "Not linked";
    }

    this.updateWalletDisplay();
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
    await this.updateSessionStatus();

    if (!this.web3) {
      return;
    }

    if (!this.account) {
      const accounts = await this.web3.eth.getAccounts();
      this.account = accounts[0] || null;
      this.updateWalletDisplay();
    } else {
      this.updateConnectButton();
    }

    await this.updatePurchaseStatus();
    await this.updateAccountStats();
    await this.updateActiveMembership();
  },

  async updatePurchaseStatus() {
    const status = document.getElementById("purchaseStatus");
    const buyButton = document.getElementById("buyButton");
    const targetAddress = this.account || this.sessionWallet;
    if (!status || !buyButton || !this.contracts.payment || !targetAddress) {
      return;
    }

    const productId = buyButton.dataset.productId;
    const activeId = await this.contracts.payment.methods
      .activeMembershipOf(targetAddress)
      .call();
    const isActive = Number(activeId) === Number(productId);
    status.textContent = isActive ? "Status: Active" : "Status: Not active";
    buyButton.disabled = isActive;
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

    const targetAddress = this.account || this.sessionWallet;
    if (!targetAddress) {
      return;
    }

    const [points, xp, purchases, tierLabel] = await Promise.all([
      this.contracts.loyalty.methods.balanceOf(targetAddress).call(),
      this.contracts.loyalty.methods.xpOf(targetAddress).call(),
      this.contracts.loyalty.methods.purchasesOf(targetAddress).call(),
      this.contracts.membership.methods.tierLabel(targetAddress).call(),
    ]);

    pointsEl.textContent = points;
    xpEl.textContent = xp;
    purchasesEl.textContent = purchases;
    if (tierEl) {
      tierEl.textContent = tierLabel;
    }
    this.updateTierBenefits(tierLabel);
    if (progressEl) {
      const progress = Math.min((Number(xp) / 500) * 100, 100);
      progressEl.style.width = `${progress}%`;
    }
  },

  updateTierBenefits(tierLabel) {
    const cards = document.querySelectorAll(".benefit-card");
    if (!cards.length) {
      return;
    }

    cards.forEach((card) => {
      const isActive = card.dataset.tier === tierLabel;
      card.classList.toggle("active", isActive);
    });
  },

  async registerAccount() {
    const notice = document.getElementById("authNotice");
    const nameInput = document.getElementById("registerName");
    const emailInput = document.getElementById("registerEmail");
    const passwordInput = document.getElementById("registerPassword");
    const particularsInput = document.getElementById("registerParticulars");

    const name = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";
    const particulars = particularsInput ? particularsInput.value.trim() : "";

    if (!name || !email || !password) {
      if (notice) {
        notice.hidden = false;
        notice.textContent = "Please fill in name, email, and password.";
      }
      return;
    }

    if (notice) {
      notice.hidden = false;
      notice.textContent = "Creating account...";
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, particulars }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }
      if (notice) {
        notice.textContent = "Registration complete. You are now logged in.";
      }
      await this.updateSessionStatus();
      window.location.href = "/account";
    } catch (err) {
      if (notice) {
        notice.textContent = `Registration failed: ${err.message}`;
      }
    }
  },

  async loginAccount() {
    const notice = document.getElementById("authNotice");
    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    if (!email || !password) {
      if (notice) {
        notice.hidden = false;
        notice.textContent = "Please enter your email and password.";
      }
      return;
    }

    if (notice) {
      notice.hidden = false;
      notice.textContent = "Logging in...";
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }
      if (notice) {
        notice.textContent = "Login successful. Connect MetaMask to pay or redeem rewards.";
      }
      await this.updateSessionStatus();
      window.location.href = "/account";
    } catch (err) {
      if (notice) {
        notice.textContent = `Login failed: ${err.message}`;
      }
    }
  },

  async logoutUser() {
    const notice = document.getElementById("authNotice");
    if (notice) {
      notice.hidden = false;
      notice.textContent = "Logging out...";
    }

    try {
      await fetch("/api/logout", { method: "POST" });
      if (notice) {
        notice.textContent = "Logged out.";
      }
    } catch (err) {
      if (notice) {
        notice.textContent = "Logout failed.";
      }
    }

    await this.updateSessionStatus();
  },

  async linkWallet() {
    const notice = document.getElementById("authNotice");
    if (!this.sessionEmail) {
      if (notice) {
        notice.hidden = false;
        notice.textContent = "Please log in before linking a wallet.";
      }
      return;
    }
    if (!this.account) {
      return;
    }

    if (notice) {
      notice.hidden = false;
      notice.textContent = "Linking wallet...";
    }

    try {
      const res = await fetch("/api/link-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: this.account }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Linking failed");
      }
      if (notice) {
        notice.textContent = "Wallet linked to your account.";
      }
      await this.updateSessionStatus();
    } catch (err) {
      if (notice) {
        notice.textContent = `Wallet link failed: ${err.message}`;
      }
    }
  },

  async updateActiveMembership() {
    const nameEl = document.getElementById("activePlanName");
    const statusEl = document.getElementById("activePlanStatus");
    const cancelButton = document.getElementById("cancelMembership");
    if (!nameEl || !statusEl || !cancelButton) {
      return;
    }

    const targetAddress = this.account || this.sessionWallet;
    if (!this.contracts.payment || !targetAddress) {
      nameEl.textContent = "None";
      statusEl.textContent = "Inactive";
      cancelButton.disabled = true;
      cancelButton.dataset.activeId = "";
      return;
    }

    const activeId = await this.contracts.payment.methods
      .activeMembershipOf(targetAddress)
      .call();

    if (Number(activeId) === 0) {
      nameEl.textContent = "None";
      statusEl.textContent = "Inactive";
      cancelButton.disabled = true;
      cancelButton.dataset.activeId = "";
      return;
    }

    const product = await this.contracts.payment.methods.getProduct(activeId).call();
    nameEl.textContent = product[1];
    statusEl.textContent = "Active";
    cancelButton.disabled = false;
    cancelButton.dataset.activeId = activeId;
  },

  async cancelMembership() {
    const notice = document.getElementById("cancelNotice");
    if (!this.account) {
      await this.connectWallet();
    }
    if (!this.contracts.payment || !this.account) {
      return;
    }

    if (notice) {
      notice.hidden = false;
      notice.textContent = "Canceling membership...";
    }

    try {
      await this.contracts.payment.methods.cancelMembership().send({ from: this.account });
      if (notice) {
        notice.textContent = "Membership canceled.";
      }
      await this.refreshUI();
    } catch (err) {
      if (notice) {
        notice.textContent = `Cancel failed: ${err.message}`;
      }
    }
  },
};

window.addEventListener("load", () => {
  if (typeof Web3 !== "undefined") {
    DApp.init().catch((err) => console.error(err));
  } else {
    DApp.bindUI();
    DApp.updateSessionStatus().catch((err) => console.error(err));
  }
});
