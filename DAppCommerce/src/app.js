const path = require("path");
const express = require("express");
const { Web3 } = require("web3");

const GroceryPaymentArtifact = require("../build/GroceryPayment.json");
const LoyaltyRewardsArtifact = require("../build/LoyaltyRewards.json");
const MembershipNFTArtifact = require("../build/MembershipNFT.json");

const app = express();
const web3 = new Web3("http://127.0.0.1:7545");
const PORT = process.env.PORT || 3000;
const SERVER_URL = `http://localhost:${PORT}`;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/contracts", express.static(path.join(__dirname, "..", "build")));

let contracts = {};
let defaultAccount = null;
let networkId = null;

async function loadContracts() {
  networkId = await web3.eth.net.getId();
  const accounts = await web3.eth.getAccounts();
  defaultAccount = accounts[0];

  const paymentAddress = GroceryPaymentArtifact.networks?.[networkId]?.address;
  const loyaltyAddress = LoyaltyRewardsArtifact.networks?.[networkId]?.address;
  const membershipAddress = MembershipNFTArtifact.networks?.[networkId]?.address;

  if (!paymentAddress || !loyaltyAddress || !membershipAddress) {
    throw new Error("Contracts are not migrated to the current network");
  }

  contracts = {
    payment: new web3.eth.Contract(GroceryPaymentArtifact.abi, paymentAddress),
    loyalty: new web3.eth.Contract(LoyaltyRewardsArtifact.abi, loyaltyAddress),
    membership: new web3.eth.Contract(MembershipNFTArtifact.abi, membershipAddress),
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
      priceWei: product[3],
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
      priceWei: data[3],
      active: data[4],
    };
  } catch (err) {
    console.error("Failed to load product", err.message);
  }

  res.render("product", { account: defaultAccount, product, serverUrl: SERVER_URL });
});

app.get("/account", (req, res) => {
  res.render("account", { account: defaultAccount, serverUrl: SERVER_URL });
});

app.get("/about", (req, res) => {
  res.render("about", { serverUrl: SERVER_URL });
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
  });
});

app.listen(PORT, () => console.log(`Server running on ${SERVER_URL}`));

module.exports = app;

