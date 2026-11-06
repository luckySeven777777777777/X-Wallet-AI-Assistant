import { Bot } from "grammy";
import OpenAI from "openai";

const required = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_GROUP_ID", "OPENAI_API_KEY"];
for (const name of required) {
  if (!process.env[name]) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const GROUP_ID = String(process.env.TELEGRAM_GROUP_ID);
const MODEL = process.env.OPENAI_MODEL || "gpt-5.5";
const COOLDOWN_MS = Number(process.env.USER_COOLDOWN_SECONDS || 20) * 1000;
const MAX_HISTORY = 12;

// In-memory conversation context. It resets when the Railway service restarts.
const histories = new Map();
const lastReplyAt = new Map();

const cryptoTerms = [
  "crypto", "cryptocurrency", "bitcoin", "btc", "ethereum", "eth",
  "blockchain", "stablecoin", "usdt", "defi", "web3", "wallet",
  "token", "nft", "mining", "smart contract", "gas fee", "exchange",
  "private key", "seed phrase", "cold wallet", "hot wallet"
];

const ROLE_PROMPTS = [
  "Bitcoin basics educator",
  "Ethereum and smart-contract educator",
  "Blockchain technology explainer",
  "Crypto beginner-friendly guide",
  "Stablecoin educator",
  "DeFi concepts explainer",
  "Wallet security educator",
  "Web3 concepts explainer",
  "NFT technology explainer",
  "Crypto market terminology educator",
  "Risk-awareness educator",
  "Trading concepts educator (education only)",
  "Crypto scam-awareness educator",
  "Layer-2 technology explainer",
  "Discussion moderator"
];

function isCryptoRelated(text = "") {
  const lower = text.toLowerCase();
  return cryptoTerms.some(term => lower.includes(term));
}

function chooseRole(text = "") {
  const lower = text.toLowerCase();
  if (lower.includes("bitcoin") || lower.includes("btc")) return ROLE_PROMPTS[0];
  if (lower.includes("ethereum") || lower.includes(" eth")) return ROLE_PROMPTS[1];
  if (lower.includes("wallet") || lower.includes("seed phrase") || lower.includes("private key")) return ROLE_PROMPTS[6];
  if (lower.includes("stablecoin") || lower.includes("usdt")) return ROLE_PROMPTS[4];
  if (lower.includes("defi")) return ROLE_PROMPTS[5];
  if (lower.includes("scam") || lower.includes("fraud")) return ROLE_PROMPTS[12];
  if (lower.includes("risk") || lower.includes("trading") || lower.includes("price")) return ROLE_PROMPTS[10];
  return ROLE_PROMPTS[Math.floor(Math.random() * ROLE_PROMPTS.length)];
}

function getHistory(chatId) {
  if (!histories.has(chatId)) histories.set(chatId, []);
  return histories.get(chatId);
}

bot.command("start", async ctx => {
  await ctx.reply(
    "Hi! I'm the group's AI Crypto Education Assistant. I can explain Bitcoin, Ethereum, blockchain, wallets, stablecoins, and common crypto terminology. I don't provide personalized investment advice."
  );
});

bot.command("help", async ctx => {
  await ctx.reply(
    "Ask a question about crypto, Bitcoin, Ethereum, blockchain, wallets, or DeFi. I reply to relevant questions in this group. Messages sent here may be processed by an AI service."
  );
});

bot.on("message:text", async ctx => {
  const msg = ctx.message;
  const chatId = String(ctx.chat.id);

  if (chatId !== GROUP_ID) return;
  if (msg.from?.is_bot) return;

  const text = (msg.text || "").trim();
  if (!text || text.startsWith("/")) return;

  // Only respond to crypto-related messages to avoid replying to every conversation.
  if (!isCryptoRelated(text)) return;

  const userId = String(msg.from?.id || "unknown");
  const cooldownKey = `${chatId}:${userId}`;
  const now = Date.now();
  const previous = lastReplyAt.get(cooldownKey) || 0;
  if (now - previous < COOLDOWN_MS) return;

  lastReplyAt.set(cooldownKey, now);

  try {
    const history = getHistory(chatId);
    const role = chooseRole(text);
    const recentContext = history.slice(-MAX_HISTORY);

    const input = [
      ...recentContext.map(item => ({
        role: item.role,
        content: item.content
      })),
      {
        role: "user",
        content: `Group member message: ${text}`
      }
    ];

    const response = await openai.responses.create({
      model: MODEL,
      instructions: [
        "You are a clearly disclosed AI assistant in a Telegram group.",
        `For this answer, use the perspective of a ${role}.`,
        "Reply in natural, concise American English unless the user writes in another language; then reply in that language.",
        "Be friendly, factual, and educational. Explain crypto concepts without hype.",
        "Do not give personalized financial, trading, or investment recommendations.",
        "Do not promise profits, predict guaranteed prices, or encourage buying or selling tokens.",
        "Never ask for passwords, verification codes, private keys, seed phrases, or wallet recovery phrases.",
        "If asked for current prices or breaking news, say you may not have live market data and suggest checking a reputable current source.",
        "Keep the answer to roughly 2-5 short sentences. Identify yourself as AI if relevant."
      ].join(" "),
      input
    });

    const answer = (response.output_text || "").trim();
    if (!answer) return;

    history.push(
      { role: "user", content: text },
      { role: "assistant", content: answer }
    );
    while (history.length > MAX_HISTORY * 2) history.shift();

    await ctx.reply(`🤖 AI Crypto Assistant · ${role}\n\n${answer}`, {
      reply_parameters: { message_id: msg.message_id }
    });
  } catch (error) {
    console.error("AI reply error:", error?.message || error);
    // Avoid exposing API details or secrets in the group.
  }
});

bot.catch(err => {
  console.error("Telegram bot error:", err?.error?.message || err);
});

async function main() {
  const me = await bot.api.getMe();
  console.log(`Starting @${me.username} in polling mode`);
  console.log(`Allowed group: ${GROUP_ID}`);
  await bot.start({
    onStart: () => console.log("Telegram AI assistant is running.")
  });
}

main().catch(error => {
  console.error("Startup failed:", error);
  process.exit(1);
});

process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());
