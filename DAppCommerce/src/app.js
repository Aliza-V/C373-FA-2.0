const path = require("path");
const express = require("express");
const { Web3 } = require("web3");

const GymMembershipPaymentArtifact = require("../build/GymMembershipPayment.json");
const LoyaltyRewardsArtifact = require("../build/LoyaltyRewards.json");
const MembershipNFTArtifact = require("../build/MembershipNFT.json");
const UserRegistryArtifact = require("../build/UserRegistry.json");

const app = express();
const web3 = new Web3("http://127.0.0.1:7545");
const PORT = process.env.PORT || 3000;
const SERVER_URL = `http://localhost:${PORT}`;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/contracts", express.static(path.join(__dirname, "..", "build")));

let contracts = {};
let defaultAccount = null;
let networkId = null;

function normalizeEmail(email) {
  return email ? email.trim().toLowerCase() : "";
}

function hashValue(value) {
  return web3.utils.keccak256(value);
}

function addGasBuffer(gasEstimate) {
  if (typeof gasEstimate === "bigint") {
    return gasEstimate + 50000n;
  }
  return Number(gasEstimate) + 50000;
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) {
    return {};
  }
  return cookieHeader.split(";").reduce((acc, part) => {
    const [key, ...valueParts] = part.split("=");
    if (!key) {
      return acc;
    }
    acc[key.trim()] = decodeURIComponent(valueParts.join("=").trim());
    return acc;
  }, {});
}

function getSessionEmail(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies.userEmail || null;
}

function setSessionEmail(res, email) {
  res.cookie("userEmail", email, { httpOnly: true, sameSite: "lax", path: "/" });
}

function clearSessionEmail(res) {
  res.cookie("userEmail", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

async function loadContracts() {
  networkId = Number(await web3.eth.net.getId());
  const accounts = await web3.eth.getAccounts();
  defaultAccount = accounts[0];

  const paymentAddress = GymMembershipPaymentArtifact.networks?.[networkId]?.address;
  const loyaltyAddress = LoyaltyRewardsArtifact.networks?.[networkId]?.address;
  const membershipAddress = MembershipNFTArtifact.networks?.[networkId]?.address;
  const userRegistryAddress = UserRegistryArtifact.networks?.[networkId]?.address;

  if (!paymentAddress || !loyaltyAddress || !membershipAddress || !userRegistryAddress) {
    throw new Error("Contracts are not migrated to the current network");
  }

  contracts = {
    payment: new web3.eth.Contract(GymMembershipPaymentArtifact.abi, paymentAddress),
    loyalty: new web3.eth.Contract(LoyaltyRewardsArtifact.abi, loyaltyAddress),
    membership: new web3.eth.Contract(MembershipNFTArtifact.abi, membershipAddress),
    users: new web3.eth.Contract(UserRegistryArtifact.abi, userRegistryAddress),
  };
}

async function fetchProducts() {
  const items = [];
  if (!contracts.payment) {
    return items;
  }

  const count = Number(await contracts.payment.methods.productCount().call());
  for (let i = 1; i <= count; i += 1) {
    const product = await contracts.payment.methods.getProduct(i).call();
    items.push({
      id: Number(product[0]),
      name: product[1],
      description: product[2],
      priceWei: product[3].toString(),
      active: product[4],
    });
  }

  return items;
}

loadContracts().catch((err) => {
  console.error("Failed to load contracts:", err.message);
});

app.get("/", async (req, res) => {
  const products = await fetchProducts().catch(() => []);
  res.render("index", { account: defaultAccount, products, serverUrl: SERVER_URL });
});

app.get("/product/:id", async (req, res) => {
  const productId = Number(req.params.id);
  let product = null;

  try {
    const data = await contracts.payment.methods.getProduct(productId).call();
    product = {
      id: Number(data[0]),
      name: data[1],
      description: data[2],
      priceWei: data[3].toString(),
      active: data[4],
    };
  } catch (err) {
    console.error("Failed to load product", err.message);
  }

  res.render("product", { account: defaultAccount, product, serverUrl: SERVER_URL });
});

app.get("/account", (req, res) => {
  res.render("account", { account: defaultAccount, serverUrl: SERVER_URL, activePage: "account" });
});

app.get("/profile", (req, res) => {
  res.render("account", { account: defaultAccount, serverUrl: SERVER_URL, activePage: "profile" });
});

app.get("/about", (req, res) => {
  res.render("about", { serverUrl: SERVER_URL });
});

app.get("/rewards", (req, res) => {
  res.render("rewards", { account: defaultAccount, serverUrl: SERVER_URL });
});

app.get("/login", (req, res) => {
  res.render("login", { serverUrl: SERVER_URL });
});

app.get("/register", (req, res) => {
  res.render("register", { serverUrl: SERVER_URL });
});

app.get("/api/products", async (req, res) => {
  try {
    const products = await fetchProducts();
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: "Unable to load products" });
  }
});

app.get("/api/contracts", (req, res) => {
  res.json({
    networkId,
    paymentAddress: contracts.payment?.options.address || null,
    loyaltyAddress: contracts.loyalty?.options.address || null,
    membershipAddress: contracts.membership?.options.address || null,
    userRegistryAddress: contracts.users?.options.address || null,
  });
});

app.get("/api/session", async (req, res) => {
  const email = getSessionEmail(req);
  if (!email || !contracts.users) {
    return res.json({ email: null, profile: null });
  }

  try {
    const emailHash = hashValue(normalizeEmail(email));
    const profile = await contracts.users.methods.getProfile(emailHash).call();
    return res.json({
      email,
      profile: {
        name: profile[0],
        particulars: profile[1],
        wallet: profile[2],
      },
    });
  } catch (err) {
    return res.json({ email, profile: null });
  }
});

app.post("/api/register", async (req, res) => {
  const { email, password, name, particulars } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password || !name) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }

  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  if (!contracts.users) {
    return res.status(500).json({ error: "User registry not available" });
  }
  if (!defaultAccount) {
    return res.status(500).json({ error: "Server wallet not ready" });
  }

  const emailHash = hashValue(normalizedEmail);
  const passwordHash = hashValue(password);

  try {
    const exists = await contracts.users.methods.userExists(emailHash).call();
    if (exists) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const registerCall = contracts.users.methods.register(
      emailHash,
      name.trim(),
      (particulars || "").trim(),
      passwordHash
    );
    const gasEstimate = await registerCall.estimateGas({ from: defaultAccount });
    await registerCall.send({ from: defaultAccount, gas: addGasBuffer(gasEstimate) });

    setSessionEmail(res, normalizedEmail);
    return res.json({
      ok: true,
      email: normalizedEmail,
      name: name.trim(),
      particulars: (particulars || "").trim(),
    });
  } catch (err) {
    return res.status(409).json({ error: err.message || "Registration failed" });
  }
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (!contracts.users) {
    return res.status(500).json({ error: "User registry not available" });
  }

  const emailHash = hashValue(normalizedEmail);
  const passwordHash = hashValue(password);

  contracts.users.methods
    .verifyLogin(emailHash, passwordHash)
    .call()
    .then((ok) => {
      if (!ok) {
        throw new Error("Invalid email or password");
      }
      setSessionEmail(res, normalizedEmail);
      return contracts.users.methods.getProfile(emailHash).call();
    })
    .then((profile) => {
      res.json({
        ok: true,
        email: normalizedEmail,
        profile: {
          name: profile[0],
          particulars: profile[1],
          wallet: profile[2],
        },
      });
    })
    .catch((err) => {
      res.status(401).json({ error: err.message || "Login failed" });
    });
});

app.post("/api/link-wallet", async (req, res) => {
  const email = getSessionEmail(req);
  const { address } = req.body;

  if (!email) {
    return res.status(401).json({ error: "Login required" });
  }

  if (!address || !web3.utils.isAddress(address)) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  if (!contracts.users) {
    return res.status(500).json({ error: "User registry not available" });
  }
  if (!defaultAccount) {
    return res.status(500).json({ error: "Server wallet not ready" });
  }

  const emailHash = hashValue(normalizeEmail(email));

  try {
    const linkCall = contracts.users.methods.setWallet(emailHash, address);
    const gasEstimate = await linkCall.estimateGas({ from: defaultAccount });
    await linkCall.send({ from: defaultAccount, gas: addGasBuffer(gasEstimate) });
    return res.json({ ok: true, address });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unable to link wallet" });
  }
});

app.post("/api/logout", (req, res) => {
  clearSessionEmail(res);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Server running on ${SERVER_URL}`));

module.exports = app;

