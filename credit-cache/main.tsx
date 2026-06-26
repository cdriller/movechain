// npm install express
// npm install @types/express --save-dev
import express from "express";

const balances = new Map<string, bigint>();
balances.set("0xabc...", 100n);
balances.get("0xabc...");   // 100n
balances.has("0xabc...");   // true

const getBalance = (address: string): bigint => {
    return balances.get(address) ?? 0n;
}

const app = express();
app.use(express.json());    // -> server understands JSON

app.listen(3000, () => {
    console.log("server runs on port 3000");
});

// GET
app.get("/balances/:address", (req, res) => {
    const address = req.params.address;
    const balance = balances.get(address) ?? 0n;
    res.json({balance: balance.toString()});
});

// POST
app.post("/trip/start", async (req, res) => {
    const { rider, price } = req.body;
    const current = balances.has(rider) ?? 0n;
    balances.set(rider, current - BigInt(price));
    res.json({ success: true });
});