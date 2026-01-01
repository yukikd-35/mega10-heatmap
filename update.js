// update.js
// Finnhubからメガ10銘柄のデータを取って data/latest.json を更新する．
// APIキーは環境変数 FINNHUB_KEY から読む（コードに直書きしない）．

const fs = require("fs");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const API_KEY = process.env.FINNHUB_KEY;

if (!API_KEY) {
  console.error("環境変数 FINNHUB_KEY が設定されていない．");
  process.exit(1);
}

// メガ10銘柄（日本語名・セクタつき）
const TICKERS = [
  { symbol:"NVDA",  nameJP:"エヌビディア",             company:"NVIDIA",             sector:"半導体・電子テクノロジー" },
  { symbol:"MSFT",  nameJP:"マイクロソフト",           company:"Microsoft",          sector:"テクノロジーサービス" },
  { symbol:"AMZN",  nameJP:"アマゾン・ドット・コム",   company:"Amazon.com",         sector:"小売・インターネット" },
  { symbol:"GOOGL", nameJP:"アルファベット（クラスA）",company:"Alphabet Class A",   sector:"テクノロジーサービス" },
  { symbol:"AVGO",  nameJP:"ブロードコム",             company:"Broadcom",           sector:"半導体・電子テクノロジー" },
  { symbol:"META",  nameJP:"メタ・プラットフォームズ", company:"Meta Platforms",    sector:"コミュニケーションサービス" },
  { symbol:"TSLA",  nameJP:"テスラ",                   company:"Tesla",              sector:"自動車・耐久消費財" },
  { symbol:"LLY",   nameJP:"イーライリリー",           company:"Eli Lilly and Co.",  sector:"ヘルスケア" },
  { symbol:"V",     nameJP:"ビザ",                     company:"Visa",               sector:"金融" },
  { symbol:"MA",    nameJP:"マスターカード",           company:"Mastercard",         sector:"金融" },
];

async function fetchOne(t){
  const qs = `symbol=${encodeURIComponent(t.symbol)}&token=${encodeURIComponent(API_KEY)}`;

  const [quoteRes, profRes] = await Promise.all([
    fetch(`https://finnhub.io/api/v1/quote?${qs}`),
    fetch(`https://finnhub.io/api/v1/stock/profile2?${qs}`)
  ]);

  if (!quoteRes.ok) throw new Error(`quote error for ${t.symbol}`);
  if (!profRes.ok)  throw new Error(`profile2 error for ${t.symbol}`);

  const quote = await quoteRes.json();
  const prof  = await profRes.json();

  return {
    symbol: t.symbol,
    nameJP: t.nameJP,
    company: t.company,
    sector: t.sector,
    changePct: typeof quote.dp === "number" ? quote.dp : null,                // 騰落率%
    marketCapB: typeof prof.marketCapitalization === "number" ? prof.marketCapitalization : null  // 時価総額（十億ドル）
  };
}

(async () => {
  try {
    const items = [];

    for (const t of TICKERS){
      const info = await fetchOne(t);
      items.push(info);
      // API制限に優しくするなら少し待つ
      await new Promise(r => setTimeout(r, 300));
    }

    if (!fs.existsSync("data")){
      fs.mkdirSync("data");
    }

    const out = {
      updated: new Date().toISOString(),
      items
    };

    fs.writeFileSync("data/latest.json", JSON.stringify(out, null, 2), "utf8");
    console.log("data/latest.json を更新した．");
  } catch (err){
    console.error("更新中にエラー：", err);
    process.exit(1);
  }
})();
