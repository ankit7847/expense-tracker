/**
 * Gemini Service
 * Role: Encapsulates all interactions with the Google Gemini API (Vision for receipt scanning
 * and Chat for financial analysis). Provides graceful fallback handling when an API key is not set.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Supported categories for expenses
export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Rent',
  'Shopping',
  'Bills',
  'Health',
  'Entertainment',
  'Other'
];

// Fallback model list in order of preference
const GEMINI_MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'];

/**
 * Checks if a valid Gemini API key is configured.
 * @returns {boolean}
 */
export function isApiKeyConfigured() {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() && key !== 'your_gemini_api_key_here');
}

/**
 * Cleans and converts an amount into a positive float.
 * Handles strings with commas, currency symbols (₹, $, Rs), etc.
 * @param {any} raw
 * @returns {number}
 */
export function cleanAmount(raw) {
  if (typeof raw === 'number' && !isNaN(raw) && raw > 0) {
    return parseFloat(raw.toFixed(2));
  }
  if (typeof raw === 'string') {
    // Remove all characters except digits and decimal point
    const cleaned = raw.replace(/,/g, '').replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0) {
      return parseFloat(num.toFixed(2));
    }
  }
  return 0;
}

/**
 * Normalizes any date string into standard 'YYYY-MM-DD' format.
 * @param {string} rawDate
 * @returns {string}
 */
export function normalizeDate(rawDate) {
  if (!rawDate || typeof rawDate !== 'string') return '';
  const trimmed = rawDate.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // MM/DD/YYYY if format indicated
  const mdyMatch = trimmed.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})$/);
  if (mdyMatch) {
    const year = mdyMatch[1];
    const month = mdyMatch[2].padStart(2, '0');
    const day = mdyMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // General Date parsing (e.g. "11 Oct 2026", "October 11, 2026")
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return '';
}

/**
 * Normalizes category string to one of the 8 allowed categories.
 * @param {string} rawCat
 * @returns {string}
 */
export function normalizeCategory(rawCat) {
  if (!rawCat || typeof rawCat !== 'string') return 'Other';
  const trimmed = rawCat.trim();
  if (EXPENSE_CATEGORIES.includes(trimmed)) return trimmed;

  const lower = trimmed.toLowerCase();
  if (lower.includes('food') || lower.includes('grocer') || lower.includes('restaur') || lower.includes('cafe') || lower.includes('eat') || lower.includes('supermarket') || lower.includes('bakery')) return 'Food';
  if (lower.includes('transport') || lower.includes('fuel') || lower.includes('petrol') || lower.includes('diesel') || lower.includes('uber') || lower.includes('ola') || lower.includes('cab') || lower.includes('metro') || lower.includes('auto') || lower.includes('transit') || lower.includes('parking')) return 'Transport';
  if (lower.includes('rent') || lower.includes('lease') || lower.includes('housing') || lower.includes('maintenance')) return 'Rent';
  if (lower.includes('shop') || lower.includes('cloth') || lower.includes('electr') || lower.includes('amazon') || lower.includes('flipkart') || lower.includes('mall') || lower.includes('retail')) return 'Shopping';
  if (lower.includes('bill') || lower.includes('util') || lower.includes('power') || lower.includes('water') || lower.includes('gas') || lower.includes('electric') || lower.includes('internet') || lower.includes('wifi') || lower.includes('phone') || lower.includes('recharge')) return 'Bills';
  if (lower.includes('health') || lower.includes('medic') || lower.includes('pharma') || lower.includes('doctor') || lower.includes('hospital') || lower.includes('clinic') || lower.includes('chemist')) return 'Health';
  if (lower.includes('entertain') || lower.includes('movie') || lower.includes('cinema') || lower.includes('game') || lower.includes('show') || lower.includes('outing') || lower.includes('theatre')) return 'Entertainment';

  return 'Other';
}

/**
 * Extracts receipt information using Gemini Vision with multi-model fallback.
 * @param {Object} params
 * @param {string} params.base64Data - Clean base64 image data
 * @param {string} params.mimeType - Image MIME type
 * @returns {Promise<Object>} { merchant, amount, date, category, note }
 */
export async function parseReceiptImage({ base64Data, mimeType }) {
  if (!base64Data) {
    throw new Error('Image data is missing');
  }

  if (!isApiKeyConfigured()) {
    const err = new Error('GEMINI_API_KEY is not configured in .env. Please configure your key to use Gemini Vision OCR.');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const prompt = `You are a high-precision receipt scanner and financial OCR extractor.
Read this receipt image carefully and extract the core transaction information.
Support single-item and multi-category/multi-department receipts (e.g., supermarket receipts containing Groceries, Personal Care, Household, Food).

EXTRACTION INSTRUCTIONS:
1. "merchant": The store, restaurant, vendor, or merchant name (e.g. "SuperMart"). Do NOT include labels like "Store Name:". Default to "Store Receipt" if unreadable.
2. "amount": The FINAL GRAND TOTAL amount paid (look for "Grand Total", "Total Amount", "Final Total", "Amount Paid"). Do NOT use a category subtotal, item subtotal, tax amount, or number of items. Return a positive number (strip ₹, $, commas).
3. "date": The transaction date in YYYY-MM-DD format. Look for formats like DD-MM-YYYY, DD/MM/YYYY, or "27-03-2026".
4. "category": The primary/dominant expense category. Must be STRICTLY one of:
   - "Food" (restaurants, supermarkets, groceries, cafes, dining, beverages)
   - "Transport" (fuel, petrol, taxi, cab, uber, metro, transit)
   - "Rent" (rent, housing, maintenance)
   - "Shopping" (apparel, general retail, electronics)
   - "Bills" (utilities, electricity, mobile, water, internet)
   - "Health" (pharmacy, personal care, medicine, doctor)
   - "Entertainment" (movies, games, events)
   - "Other" (household items, cleaning supplies, miscellaneous)
5. "breakdown": If the receipt has multiple categories, departments, or sections (e.g. Groceries ₹560, Food & Beverages ₹130, Personal Care ₹270, Household Items ₹370), extract an array of objects:
   [
     { "name": "Section Name", "category": "One of 8 categories above", "amount": 123.45 }
   ]
   If it is a single-category receipt, return an empty array [].
6. "note": A concise summary of items or categories purchased (e.g. "Groceries: ₹560, Household: ₹370, Personal Care: ₹270, Food: ₹130").

Return ONLY a single valid JSON object in this format:
{
  "merchant": "Vendor Name",
  "amount": 1396.50,
  "date": "YYYY-MM-DD",
  "category": "Food",
  "note": "Description or breakdown summary",
  "breakdown": []
}`;

  let lastError = null;

  // Try available models
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: mimeType || 'image/jpeg'
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();

      // Clean possible markdown fences
      const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      // Validate & clean fields
      const merchant = typeof parsed.merchant === 'string' && parsed.merchant.trim()
        ? parsed.merchant.replace(/^(store\s*name|shop\s*name|merchant\s*name|store|shop|merchant|vendor)[\s:]+/i, '').trim()
        : 'Store Receipt';

      const amount = cleanAmount(parsed.amount);
      const category = normalizeCategory(parsed.category);
      const date = normalizeDate(parsed.date);
      const note = typeof parsed.note === 'string' ? parsed.note.trim() : '';

      // Clean breakdown items if present
      const breakdown = Array.isArray(parsed.breakdown)
        ? parsed.breakdown.map(item => ({
            name: typeof item.name === 'string' ? item.name.trim() : 'Section',
            category: normalizeCategory(item.category),
            amount: cleanAmount(item.amount)
          })).filter(item => item.amount > 0)
        : [];

      return {
        merchant,
        amount,
        date,
        category,
        note,
        breakdown,
        engine: `Gemini Vision (${modelName})`
      };
    } catch (err) {
      console.warn(`Model ${modelName} failed:`, err.message);
      lastError = err;
      // Continue to next model if available
    }
  }

  throw new Error('Receipt scanning failed with Gemini API: ' + (lastError?.message || 'Unknown error'));
}

/**
 * Handles conversational queries about spending using Gemini Chat.
 * @param {Object} params
 * @param {string} params.message - Current user question
 * @param {Array} params.history - Previous chat history
 * @param {Object} params.compactSummary - Precomputed summary
 * @param {Array} params.transactions - Relevant transactions
 * @returns {Promise<string>}
 */
export async function generateChatResponse({ message, history = [], compactSummary, transactions = [] }) {
  if (!message || typeof message !== 'string') {
    throw new Error('Message is required');
  }

  if (!isApiKeyConfigured()) {
    return simulateChatResponse({ message, compactSummary, transactions });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const systemPrompt = `You are a helpful personal finance assistant. Answer ONLY using the provided transaction data. Use ₹. If the data is not enough, say so. Do not invent numbers. Keep answers short.`;

  const contextPrompt = `
FINANCIAL DATA CONTEXT:
Precomputed Summary:
${JSON.stringify(compactSummary || {}, null, 2)}

Transactions (${transactions.length} total):
${transactions.slice(0, 50).map(t => `- [${t.date}] ${t.type.toUpperCase()}: ₹${t.amount} (${t.category}) ${t.note ? '- ' + t.note : ''}`).join('\n')}

USER QUESTION:
${message}
`;

  const formattedHistory = [];
  for (const h of history.slice(-6)) {
    if (h.role === 'user') {
      formattedHistory.push({ role: 'user', parts: [{ text: h.content }] });
    } else if (h.role === 'assistant' || h.role === 'model') {
      formattedHistory.push({ role: 'model', parts: [{ text: h.content }] });
    }
  }

  let lastError = null;
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 500
        }
      });

      const chat = model.startChat({ history: formattedHistory });
      const result = await chat.sendMessage(contextPrompt);
      const reply = result.response.text();
      if (reply) return reply.trim();
    } catch (err) {
      console.warn(`Chat model ${modelName} failed:`, err.message);
      lastError = err;
    }
  }

  // If live chat failed, fallback to local analyzer
  console.warn('Falling back to local financial calculation due to error:', lastError?.message);
  return simulateChatResponse({ message, compactSummary, transactions });
}

/**
 * Fallback deterministic calculation for chat queries when API key is missing.
 */
function simulateChatResponse({ message, compactSummary, transactions }) {
  const lower = message.toLowerCase();
  const totalExpenses = compactSummary?.currentMonth?.totalExpense || 0;
  const totalIncome = compactSummary?.currentMonth?.totalIncome || 0;
  const balance = compactSummary?.currentMonth?.balance || 0;
  const categories = compactSummary?.currentMonth?.expenseByCategory || {};

  if (!transactions || transactions.length === 0) {
    return 'You do not have any transactions recorded yet. Add some income or expenses first so I can analyze your spending!';
  }

  const fmt = (val) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);

  // Food spending
  if (lower.includes('food')) {
    const foodSpend = categories['Food'] || 0;
    return `You spent ₹${fmt(foodSpend)} on Food this month.`;
  }

  // Biggest expense
  if (lower.includes('biggest') || lower.includes('highest') || lower.includes('largest')) {
    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length === 0) {
      return 'You have no expense transactions recorded yet.';
    }
    const maxExp = expenses.reduce((max, t) => (Number(t.amount) > Number(max.amount) ? t : max), expenses[0]);
    return `Your biggest expense was ₹${fmt(maxExp.amount)} for ${maxExp.category} (${maxExp.note || 'No note'}) on ${maxExp.date}.`;
  }

  // Compare with last month
  if (lower.includes('more than last month') || lower.includes('compare') || lower.includes('last month')) {
    const lastMonthExpense = compactSummary?.lastMonth?.totalExpense || 0;
    if (lastMonthExpense === 0 && totalExpenses === 0) {
      return 'There are no expenses recorded for this month or last month to compare.';
    }
    const diff = totalExpenses - lastMonthExpense;
    if (diff > 0) {
      return `Yes, you spent ₹${fmt(diff)} more this month (₹${fmt(totalExpenses)}) compared to last month (₹${fmt(lastMonthExpense)}).`;
    } else if (diff < 0) {
      return `No, you spent ₹${fmt(Math.abs(diff))} less this month (₹${fmt(totalExpenses)}) compared to last month (₹${fmt(lastMonthExpense)}). Great job!`;
    } else {
      return `Your expenses this month (₹${fmt(totalExpenses)}) are identical to last month.`;
    }
  }

  // Tips to save
  if (lower.includes('tip') || lower.includes('save') || lower.includes('advice')) {
    const entries = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    if (entries.length > 0) {
      const topCat = entries[0];
      return `Your highest spending area is ${topCat[0]} at ₹${fmt(topCat[1])}. Consider setting a weekly budget for ${topCat[0]} to cut unnecessary costs.`;
    }
    return `Track daily expenses consistently and aim to save at least 20% of your income before spending on non-essentials.`;
  }

  // Default summary
  return `This month, your income is ₹${fmt(totalIncome)}, expenses are ₹${fmt(totalExpenses)}, leaving a net balance of ₹${fmt(balance)}.`;
}
