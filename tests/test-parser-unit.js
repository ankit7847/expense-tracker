const rawMultiText = `
Smart Expense Receipt
Store Name: SuperMart
Date: 27-03-2026
Receipt ID: SM123456
"EF Groceries
Rice(Skg)iie oni nC Rang)
Milkmen Ee Ra
Egesi(12 pos) fen liil e EE¥O0)
Subtotal (Groceries): T560
Sf FooddBeverages
Sandwich sie CEE DE EE lRO)
Cold Drink cialis Sait Sebi ois Sa NL ()
Subtotal (Food): 130
shampooy. ind Ee RO)
Soap)(Packiof@)i=c- mente ER BS Eo0)
Subtotal (Personal Care): 270
8 Household tems
Detergent ........cosds ooo R990)
Cleaning liquide BEE EEE EE R81 50)
Subtotal (Household): 7370
Totalltems 100d ope 0 gr 80 0 ARA330)
Total Amount.2 5 VEEL © sac al of EUSIRHBID)
GST (5%): 266.50
Grand Total: $1396.50
[] Payment Method: UPI
Thank You for Shopping! (©)
`;

function mapToCategory(text) {
  const t = text.toLowerCase();
  if (/grocery|groceries|food|beverage|snack|dining|restaurant|meal|bakery|fruit|veg|eat|kitchen/i.test(t)) return "Food";
  if (/personal\s*care|pharmacy|health|medical|drug|shampoo|soap|cosmetic|care/i.test(t)) return "Health";
  if (/household|detergent|clean|home|hardware|cleaning/i.test(t)) return "Other";
  if (/apparel|clothing|cloth|fashion|shopping|merchandise|retail/i.test(t)) return "Shopping";
  if (/transport|fuel|petrol|diesel|cab|taxi|uber/i.test(t)) return "Transport";
  if (/bill|utility|electric|water|gas|wifi/i.test(t)) return "Bills";
  return "Other";
}

function parseReceipt(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Merchant Extraction
  let merchant = 'Store Receipt';
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    let line = lines[i];
    if (/^\+?[\d\s-]{7,}$/.test(line)) continue;
    if (/\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}/.test(line)) continue;
    if (/invoice|tax invoice|cash bill|welcome/i.test(line)) continue;
    if (line.length >= 3 && /[a-zA-Z]/.test(line)) {
      let cleaned = line.replace(/^(store\s*name|shop\s*name|merchant\s*name|store|shop|merchant|vendor)[\s:]+/i, '').trim();
      cleaned = cleaned.replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
      if (cleaned.length >= 3 && !/smart expense receipt/i.test(cleaned)) {
        merchant = cleaned;
        break;
      }
    }
  }

  // 2. Amount Extraction (Tiered Bottom-Up)
  const tier1Regex = /(?:grand\s*total|final\s*total|total\s*payable|amount\s*payable|net\s*payable|amount\s*paid|balance\s*due)[\s:]*([^\d]*)([\d,]+(?:\.\d{1,2})?)/i;
  const tier2Regex = /(?:total\s*amount|total\s*amt|net\s*amount|net\s*total|bill\s*total|total\s*\([^)]+\)|total\s*\(rs\.?\)|total\s*\(inr\))[\s:]*([^\d]*)([\d,]+(?:\.\d{1,2})?)/i;
  const excludeRegex = /(?:subtotal|sub\s*total|items|item|qty|quantity|count|pcs|tax|gst|cgst|sgst|discount|change|tendered|savings)/i;

  let amount = 0;

  // Search Tier 1 from bottom up
  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i].match(tier1Regex);
    if (match) {
      const val = parseFloat(match[2].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) { amount = val; break; }
    }
  }

  // Search Tier 2 if not found
  if (!amount) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const match = lines[i].match(tier2Regex);
      if (match) {
        const val = parseFloat(match[2].replace(/,/g, ''));
        if (!isNaN(val) && val > 0) { amount = val; break; }
      }
    }
  }

  // Search Tier 3 (clean total line) if not found
  if (!amount) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (/\btotal\b/i.test(line) && !excludeRegex.test(line)) {
        const numMatches = line.match(/(?:[\d,]+(?:\.\d{1,2})?)/g);
        if (numMatches) {
          const lastVal = parseFloat(numMatches[numMatches.length - 1].replace(/,/g, ''));
          if (!isNaN(lastVal) && lastVal > 0) { amount = lastVal; break; }
        }
      }
    }
  }

  // 3. Multi-Category Breakdown Detection
  const breakdown = [];
  const subtotalRegex = /subtotal\s*(?:\(([^)]+)\)|:\s*([a-zA-Z\s]+))?[:\s]*([^\d]*)([\d,]+(?:\.\d{1,2})?)/i;

  for (const line of lines) {
    const match = line.match(subtotalRegex);
    if (match) {
      const name = (match[1] || match[2] || 'Section').trim();
      let rawVal = match[4].replace(/,/g, '');
      let num = parseFloat(rawVal);
      // Clean leading OCR artifact (e.g. 7370 where 7 is a misread Rupee symbol or bullet)
      if (rawVal.startsWith('7') && rawVal.length >= 4 && num > amount) {
        const alt = parseFloat(rawVal.substring(1));
        if (!isNaN(alt)) num = alt;
      }
      if (!isNaN(num) && num > 0) {
        const cat = mapToCategory(name);
        breakdown.push({ name, category: cat, amount: num });
      }
    }
  }

  // 4. Date Extraction
  let date = '';
  for (const line of lines) {
    const dmy = line.match(/\b(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})\b/);
    if (dmy) {
      let day = dmy[1].padStart(2, '0');
      let month = dmy[2].padStart(2, '0');
      let year = dmy[3];
      if (year.length === 2) year = '20' + year;
      if (Number(month) > 12 && Number(day) <= 12) {
        const t = day; day = month; month = t;
      }
      date = `${year}-${month}-${day}`;
      break;
    }
  }

  // 5. Category Selection
  let category = 'Food';
  if (breakdown.length > 0) {
    const catSums = {};
    for (const item of breakdown) {
      catSums[item.category] = (catSums[item.category] || 0) + item.amount;
    }
    let topCat = 'Food';
    let topSum = 0;
    for (const [c, s] of Object.entries(catSums)) {
      if (s > topSum) { topSum = s; topCat = c; }
    }
    category = topCat;
  }

  // 6. Note: Summary including category breakdown
  let note = merchant;
  if (breakdown.length > 1) {
    const parts = breakdown.map(b => `${b.name}: ₹${b.amount}`);
    note = `${merchant} (${parts.join(', ')})`;
  } else {
    note = `${merchant} (${category})`;
  }

  return { merchant, amount, date, category, note, breakdown };
}

const res = parseReceipt(rawMultiText);
console.log('Multi-receipt Parsed result:\n', JSON.stringify(res, null, 2));

const spiceGardenText = `
SPICE GARDEN RESTAURANT
Road No. 12, Banjara Hills
Hyderabad, Telangana 500034
Ph: 040-2345 6789
GSTIN: 36ABCDE1234F1Z5
Bill No : SG-20457
Date : 10/10/2026 08:42 PM
ITEM QTY AMOUNT
Chicken Biryani 2 560.00
Paneer Butter Masa 1 240.00
Butter Naan 3 135.00
Masala Papad 2 60.00
Fresh Lime Soda 2 120.00
Sub Total 1,115.00
GST (5%) 55.75
TOTAL (Rs.) 1,170.75
Paid via UPI
Thank you! Visit again
`;

const spiceRes = parseReceipt(spiceGardenText);
console.log('\nSpice Garden Parsed result:\n', JSON.stringify(spiceRes, null, 2));
