"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const TAX_CATEGORIES = [
  { value: "cogs", label: "Cost of Goods Sold", emoji: "📦", description: "Cards, lot comps, inventory", color: "#f87171" },
  { value: "shipping", label: "Shipping & Postage", emoji: "🚚", description: "Postage, labels, carriers", color: "#fb923c" },
  { value: "platform_fees", label: "Platform Fees", emoji: "💻", description: "Whatnot fees, marketplace fees", color: "#fbbf24" },
  { value: "software", label: "Software & Subscriptions", emoji: "📱", description: "Apps, tools, subscriptions", color: "#a78bfa" },
  { value: "vehicle", label: "Vehicle & Gas", emoji: "⛽", description: "Gas, mileage, vehicle expenses", color: "#38bdf8" },
  { value: "meals", label: "Meals & Entertainment", emoji: "🍽️", description: "Business meals (50% deductible)", color: "#4ade80" },
  { value: "home_office", label: "Home Office", emoji: "🏠", description: "Home office deduction", color: "#f472b6" },
  { value: "advertising", label: "Advertising & Marketing", emoji: "📢", description: "Promotions, ads, marketing", color: "#c084fc" },
  { value: "supplies", label: "Supplies & Materials", emoji: "🛒", description: "Packaging, office supplies", color: "#67e8f9" },
  { value: "professional", label: "Professional Services", emoji: "📋", description: "Accountant, legal, consulting", color: "#86efac" },
  { value: "bank_fees", label: "Bank & Payment Fees", emoji: "🏦", description: "PayPal, Venmo, bank fees", color: "#fcd34d" },
  { value: "equipment", label: "Equipment & Tools", emoji: "🔧", description: "Printers, tools, hardware", color: "#f9a8d4" },
  { value: "other", label: "Other Business Expenses", emoji: "🎁", description: "Miscellaneous business expenses", color: "#aaa" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 3 }, (_, i) => CURRENT_YEAR - i);
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function FinancialsPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [breaks, setBreaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [view, setView] = useState<"overview" | "expenses" | "add">("overview");

  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [expDescription, setExpDescription] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("supplies");
  const [expMerchant, setExpMerchant] = useState("");
  const [expNotes, setExpNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanResult, setScanResult] = useState<boolean>(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<number, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [expRes, brkRes] = await Promise.all([
      supabase.from("business_expenses").select("*").order("date", { ascending: false }),
      supabase.from("Breaks").select("date, revenue, net_profit, valley_take, imc_take, total_supply_cost, coupon_total, promotion_total, chaser_cost").order("date", { ascending: true }),
    ]);
    if (expRes.data) setExpenses(expRes.data);
    if (brkRes.data) setBreaks(brkRes.data);
    setLoading(false);
  }

  function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setScanResult(false);
    const reader = new FileReader();
    reader.onload = ev => setReceiptPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function scanReceipt() {
    if (!receiptFile || !receiptPreview) return;
    setScanning(true);
    try {
      const base64 = receiptPreview.split(",")[1];
      const mediaType = receiptFile.type || "image/jpeg";

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64 }
              },
              {
                type: "text",
                text: `Analyze this receipt image and extract the following information. Respond ONLY with a valid JSON object, no markdown, no explanation:
{
  "merchant": "store or vendor name",
  "date": "YYYY-MM-DD format if visible, otherwise null",
  "amount": numeric total amount as a number,
  "description": "brief description of what was purchased",
  "category": "one of: cogs, shipping, platform_fees, software, vehicle, meals, home_office, advertising, supplies, professional, bank_fees, equipment, other",
  "notes": "any relevant details like items purchased"
}

Category guide:
- cogs: cards, inventory, lot comp purchases
- shipping: postage, shipping labels, carrier fees
- platform_fees: marketplace or platform fees
- software: apps, subscriptions, digital tools
- vehicle: gas, fuel, car-related
- meals: restaurants, food for business
- home_office: office-related home expenses
- advertising: marketing, promotions
- supplies: packaging, office supplies, materials
- professional: accounting, legal services
- bank_fees: payment processing, bank charges
- equipment: hardware, tools, printers
- other: anything else business-related`
              }
            ]
          }]
        })
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setScanResult(true);

      if (parsed.merchant) setExpMerchant(parsed.merchant);
      if (parsed.date) setExpDate(parsed.date);
      if (parsed.amount) setExpAmount(String(parsed.amount));
      if (parsed.description) setExpDescription(parsed.description);
      if (parsed.category) setExpCategory(parsed.category);
      if (parsed.notes) setExpNotes(parsed.notes);
    } catch (err) {
      console.error("Scan error:", err);
      alert("Could not scan receipt. Please fill in manually.");
    }
    setScanning(false);
  }

  async function saveExpense() {
    if (!expDescription || !expAmount || !expDate) return alert("Please fill in date, description and amount.");
    setSaving(true);

    let receiptUrl = null;
    if (receiptFile) {
      const ext = receiptFile.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(path, receiptFile);
      if (!uploadError) receiptUrl = path;
    }

    await supabase.from("business_expenses").insert({
      date: expDate,
      description: expDescription,
      amount: parseFloat(expAmount),
      category: expCategory,
      merchant: expMerchant || null,
      receipt_url: receiptUrl,
      notes: expNotes || null,
    });

    await loadData();
    setSaving(false);
    setView("expenses");
    resetForm();
  }

  function resetForm() {
    setExpDate(new Date().toISOString().split("T")[0]);
    setExpDescription(""); setExpAmount(""); setExpCategory("supplies");
    setExpMerchant(""); setExpNotes(""); setReceiptFile(null);
    setReceiptPreview(null); setScanResult(false);
  }

  async function deleteExpense(id: number) {
    setDeletingId(id);
    const exp = expenses.find(e => e.id === id);
    if (exp?.receipt_url) {
      await supabase.storage.from("receipts").remove([exp.receipt_url]);
    }
    await supabase.from("business_expenses").delete().eq("id", id);
    setDeletingId(null); setConfirmId(null);
    await loadData();
  }

  async function getSignedUrl(id: number, path: string) {
    if (signedUrls[id]) { setViewingReceipt(signedUrls[id]); return; }
    const { data } = await supabase.storage.from("receipts").createSignedUrl(path, 3600);
    if (data?.signedUrl) {
      setSignedUrls(prev => ({ ...prev, [id]: data.signedUrl }));
      setViewingReceipt(data.signedUrl);
    }
  }

  // --- Calculations ---
  const yearBreaks = breaks.filter(b => b.date?.startsWith(String(selectedYear)));
  const yearExpenses = expenses.filter(e => e.date?.startsWith(String(selectedYear)));

  const grossRevenue = yearBreaks.reduce((s, b) => s + parseFloat(b.revenue || "0"), 0);
  const whatnotFees = grossRevenue * 0.112;
  const valleyIncome = yearBreaks.reduce((s, b) => s + parseFloat(b.valley_take || "0"), 0);
  const bobaPayouts = yearBreaks.reduce((s, b) => s + parseFloat(b.imc_take || "0"), 0);
  const breakSupplies = yearBreaks.reduce((s, b) => s + parseFloat(b.total_supply_cost || "0"), 0);
  const breakCoupons = yearBreaks.reduce((s, b) => s + parseFloat(b.coupon_total || "0"), 0);
  const breakPromos = yearBreaks.reduce((s, b) => s + parseFloat(b.promotion_total || "0"), 0);
  const breakChasers = yearBreaks.reduce((s, b) => s + parseFloat(b.chaser_cost || "0"), 0);
  const manualExpensesTotal = yearExpenses.reduce((s, e) => s + parseFloat(e.amount || "0"), 0);
  const totalDeductible = breakSupplies + breakCoupons + breakPromos + breakChasers + whatnotFees + manualExpensesTotal;
  const taxableIncome = valleyIncome;
  const estimatedSETax = Math.max(0, taxableIncome * 0.9235 * 0.153);
  const estimatedIncomeTax = Math.max(0, taxableIncome * 0.22);
  const totalEstimatedTax = estimatedSETax + estimatedIncomeTax;
  const setAsidePerBreak = yearBreaks.length > 0 ? totalEstimatedTax / yearBreaks.length : 0;

  const months = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, "0");
    const key = `${selectedYear}-${month}`;
    const mBreaks = yearBreaks.filter(b => b.date?.startsWith(key));
    const mExpenses = yearExpenses.filter(e => e.date?.startsWith(key));
    const revenue = mBreaks.reduce((s, b) => s + parseFloat(b.revenue || "0"), 0);
    const fees = revenue * 0.112;
    const supplies = mBreaks.reduce((s, b) => s + parseFloat(b.total_supply_cost || "0"), 0);
    const coupons = mBreaks.reduce((s, b) => s + parseFloat(b.coupon_total || "0"), 0);
    const promos = mBreaks.reduce((s, b) => s + parseFloat(b.promotion_total || "0"), 0);
    const chasers = mBreaks.reduce((s, b) => s + parseFloat(b.chaser_cost || "0"), 0);
    const manual = mExpenses.reduce((s, e) => s + parseFloat(e.amount || "0"), 0);
    const valley = mBreaks.reduce((s, b) => s + parseFloat(b.valley_take || "0"), 0);
    const profit = mBreaks.reduce((s, b) => s + parseFloat(b.net_profit || "0"), 0);
    return { key, month: i, revenue, fees, supplies, coupons, promos, chasers, manual, valley, profit, breakCount: mBreaks.length };
  });

  const categoryTotals: Record<string, number> = {};
  for (const e of yearExpenses) {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + parseFloat(e.amount || "0");
  }

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", width: "100%", boxSizing: "border-box" as const },
    content: { padding: "24px 16px", maxWidth: 1200, margin: "0 auto", width: "100%", boxSizing: "border-box" as const },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    input: { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#e5e5e5", outline: "none", boxSizing: "border-box" as const },
    label: { fontSize: 12, color: "#666", marginBottom: 5, display: "block" },
    submitBtn: { background: "linear-gradient(135deg,#7c3aed,#db2877)", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" },
    statCard: { background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" },
  };

  const mobileStyles = `
    .fin-years { display: flex; gap: 8px; }
    .fin-grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 16px; }
    .fin-grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 16px; }
    .fin-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .fin-pnl-row { display: grid; grid-template-columns: 70px repeat(8,1fr); gap: 6px; align-items: center; padding: 10px 0; border-bottom: 1px solid #161616; font-size: 12px; }
    .fin-pnl-header { display: grid; grid-template-columns: 70px repeat(8,1fr); gap: 6px; padding: 8px 0; border-bottom: 1px solid #1e1e1e; }
    .fin-add-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .fin-schedule-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (max-width: 768px) {
      .fin-grid-4 { grid-template-columns: 1fr 1fr; }
      .fin-grid-3 { grid-template-columns: 1fr 1fr; }
      .fin-grid-2 { grid-template-columns: 1fr; }
      .fin-pnl-row { grid-template-columns: 50px repeat(4,1fr); font-size: 11px; }
      .fin-pnl-header { grid-template-columns: 50px repeat(4,1fr); }
      .fin-pnl-hide { display: none; }
      .fin-add-grid { grid-template-columns: 1fr; }
      .fin-schedule-grid { grid-template-columns: 1fr; }
    }
  `;

  // RECEIPT VIEWER
  if (viewingReceipt) return (
    <div style={s.shell}>
      <div style={s.content}>
        <button onClick={() => setViewingReceipt(null)} style={{ fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 16px", cursor: "pointer", marginBottom: 20 }}>← Back</button>
        <div style={{ textAlign: "center" }}>
          <img src={viewingReceipt} alt="Receipt" style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 10, border: "1px solid #1e1e1e" }} />
        </div>
      </div>
    </div>
  );

  // ADD EXPENSE VIEW
  if (view === "add") return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Add expense</h1>
          <button onClick={() => { setView("expenses"); resetForm(); }} style={{ fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>← Back</button>
        </div>

        {/* Receipt upload */}
        <div style={s.section}>
          <div style={s.sectionTitle}>📸 Receipt (optional)</div>
          <p style={{ fontSize: 12, color: "#555", marginBottom: 14 }}>Upload a photo and Claude will auto-detect the merchant, amount, date and category</p>
          {!receiptPreview ? (
            <label style={{ display: "block", border: "1px dashed #333", borderRadius: 8, padding: 28, textAlign: "center", cursor: "pointer", background: "#0f0f0f" }}>
              <input ref={fileInputRef} type="file" accept="image/*"  onChange={handleReceiptChange} style={{ display: "none" }} />
              <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
              <div style={{ fontSize: 14, color: "#888", marginBottom: 4 }}>Tap to take a photo or upload receipt</div>
              <div style={{ fontSize: 11, color: "#444" }}>JPG, PNG, HEIC supported</div>
            </label>
          ) : (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <img src={receiptPreview} alt="Receipt preview" style={{ width: 100, height: 140, objectFit: "cover", borderRadius: 8, border: "1px solid #1e1e1e", flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
                <div style={{ fontSize: 13, color: "#aaa" }}>{receiptFile?.name}</div>
                {scanResult ? (
                  <div style={{ background: "#0d1a0d", border: "1px solid #4ade8033", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 600 }}>✓ Receipt scanned — fields auto-filled below</div>
                  </div>
                ) : (
                  <button onClick={scanReceipt} disabled={scanning} style={{ ...s.submitBtn, padding: "10px 20px", fontSize: 13, width: "fit-content" }}>
                    {scanning ? "🔍 Scanning..." : "✨ Scan with AI"}
                  </button>
                )}
                <button onClick={() => { setReceiptFile(null); setReceiptPreview(null); setScanResult(false); }} style={{ fontSize: 12, background: "none", border: "1px solid #333", color: "#555", borderRadius: 6, padding: "5px 10px", cursor: "pointer", width: "fit-content" }}>
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Expense details */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Expense details</div>
          <div className="fin-add-grid">
            <div>
              <label style={s.label}>Date</label>
              <input style={s.input} type="date" value={expDate} onChange={e => setExpDate(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Amount ($)</label>
              <input style={s.input} type="number" min={0} step="0.01" placeholder="0.00" value={expAmount} onChange={e => setExpAmount(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={s.label}>Merchant / Vendor</label>
            <input style={s.input} placeholder="e.g. Amazon, USPS, Home Depot" value={expMerchant} onChange={e => setExpMerchant(e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={s.label}>Description</label>
            <input style={s.input} placeholder="e.g. Bubble mailers, shipping supplies" value={expDescription} onChange={e => setExpDescription(e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={s.label}>Tax category</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
              {TAX_CATEGORIES.map(cat => (
                <div key={cat.value} onClick={() => setExpCategory(cat.value)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, cursor: "pointer", border: `1px solid ${expCategory === cat.value ? cat.color : "#1e1e1e"}`, background: expCategory === cat.value ? cat.color + "11" : "#0f0f0f" }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{cat.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: expCategory === cat.value ? cat.color : "#aaa" }}>{cat.label}</div>
                    <div style={{ fontSize: 10, color: "#555", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cat.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label style={s.label}>Notes (optional)</label>
            <input style={s.input} placeholder="Any additional details" value={expNotes} onChange={e => setExpNotes(e.target.value)} />
          </div>
        </div>

        <button style={{ ...s.submitBtn, width: "100%" }} onClick={saveExpense} disabled={saving}>
          {saving ? "Saving..." : "Save expense"}
        </button>
      </div>
    </div>
  );

  // EXPENSES LIST VIEW
  if (view === "expenses") return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Expenses</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>{yearExpenses.length} manual expenses in {selectedYear}</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setView("overview")} style={{ fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>← Overview</button>
            <button onClick={() => setView("add")} style={s.submitBtn}>+ Add expense</button>
          </div>
        </div>

        {/* Category summary */}
        {Object.keys(categoryTotals).length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>By category</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {TAX_CATEGORIES.filter(cat => categoryTotals[cat.value] > 0)
                .sort((a, b) => (categoryTotals[b.value] || 0) - (categoryTotals[a.value] || 0))
                .map(cat => {
                  const total = categoryTotals[cat.value] || 0;
                  const pct = manualExpensesTotal > 0 ? (total / manualExpensesTotal) * 100 : 0;
                  return (
                    <div key={cat.value} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{cat.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, color: "#aaa" }}>{cat.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: cat.color }}>${total.toFixed(2)}</span>
                        </div>
                        <div style={{ height: 4, background: "#1e1e1e", borderRadius: 2 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: cat.color, borderRadius: 2 }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Expense list */}
        <div style={s.section}>
          <div style={s.sectionTitle}>All expenses — {selectedYear}</div>
          {yearExpenses.length === 0 ? (
            <p style={{ color: "#555", fontSize: 13 }}>No manual expenses for {selectedYear} yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {yearExpenses.map((exp) => {
                const cat = TAX_CATEGORIES.find(c => c.value === exp.category);
                return (
                  <div key={exp.id} style={{ background: "#0f0f0f", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 14 }}>{cat?.emoji}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#e5e5e5" }}>{exp.description}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {exp.merchant && <span style={{ fontSize: 11, color: "#555" }}>{exp.merchant}</span>}
                          <span style={{ fontSize: 11, color: "#555" }}>{exp.date}</span>
                          <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 20, background: (cat?.color || "#333") + "22", color: cat?.color || "#aaa" }}>{cat?.label}</span>
                        </div>
                        {exp.notes && <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{exp.notes}</div>}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#f87171", marginBottom: 6 }}>-${parseFloat(exp.amount).toFixed(2)}</div>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          {exp.receipt_url && (
                            <button onClick={() => getSignedUrl(exp.id, exp.receipt_url)} style={{ fontSize: 11, background: "none", border: "1px solid #333", color: "#38bdf8", borderRadius: 5, padding: "3px 8px", cursor: "pointer" }}>📷</button>
                          )}
                          {confirmId === exp.id ? (
                            <>
                              <button onClick={() => deleteExpense(exp.id)} disabled={deletingId === exp.id} style={{ fontSize: 11, background: "#7f1d1d", border: "none", color: "#fca5a5", borderRadius: 5, padding: "3px 8px", cursor: "pointer" }}>
                                {deletingId === exp.id ? "..." : "Confirm"}
                              </button>
                              <button onClick={() => setConfirmId(null)} style={{ fontSize: 11, background: "#1a1a1a", border: "none", color: "#555", borderRadius: 5, padding: "3px 8px", cursor: "pointer" }}>Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => setConfirmId(exp.id)} style={{ fontSize: 11, background: "none", border: "1px solid #333", color: "#555", borderRadius: 5, padding: "3px 8px", cursor: "pointer" }}>Delete</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // OVERVIEW
  return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={s.content}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Financials & Tax</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>P&L, tax estimates, and expense tracking</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div className="fin-years">
              {YEARS.map(y => (
                <button key={y} onClick={() => setSelectedYear(y)} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${selectedYear === y ? "#fb923c" : "#222"}`, background: selectedYear === y ? "#fb923c22" : "#111", color: selectedYear === y ? "#fb923c" : "#555" }}>{y}</button>
              ))}
            </div>
            <button onClick={() => setView("expenses")} style={{ fontSize: 13, background: "#1e1e1e", border: "1px solid #333", color: "#aaa", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>📋 Expenses</button>
            <button onClick={() => setView("add")} style={{ ...s.submitBtn, padding: "8px 16px", fontSize: 13 }}>+ Add expense</button>
          </div>
        </div>

        {loading ? <p style={{ color: "#555" }}>Loading...</p> : <>

          {/* Annual summary */}
          <div className="fin-grid-4">
            <div style={s.statCard}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Gross revenue</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#4ade80" }}>${grossRevenue.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{yearBreaks.length} breaks</div>
            </div>
            <div style={s.statCard}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Valley income</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#a78bfa" }}>${valleyIncome.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>Your taxable income</div>
            </div>
            <div style={s.statCard}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total deductible</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#f87171" }}>${totalDeductible.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>All business expenses</div>
            </div>
            <div style={s.statCard}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Est. tax owed</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#fbbf24" }}>${totalEstimatedTax.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>SE + income tax est.</div>
            </div>
          </div>

          {/* Tax estimate */}
          <div style={{ ...s.section, borderColor: "#fbbf2433" }}>
            <div style={s.sectionTitle}>🧮 Tax estimate — {selectedYear}</div>
            <div className="fin-grid-3">
              <div style={{ background: "#0f0f0f", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>SELF-EMPLOYMENT TAX (15.3%)</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fbbf24" }}>${estimatedSETax.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>On ${(taxableIncome * 0.9235).toFixed(2)} net SE income</div>
              </div>
              <div style={{ background: "#0f0f0f", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>INCOME TAX EST. (22% bracket)</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fbbf24" }}>${estimatedIncomeTax.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>On ${taxableIncome.toFixed(2)} Valley income</div>
              </div>
              <div style={{ background: "#1a1400", border: "1px solid #fbbf2433", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#fbbf24", marginBottom: 6 }}>SET ASIDE PER BREAK</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fbbf24" }}>${setAsidePerBreak.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>To cover your tax bill</div>
              </div>
            </div>
            <div style={{ background: "#0f0f0f", borderRadius: 8, padding: 12, fontSize: 12, color: "#555", marginTop: 4 }}>
              ⚠️ Estimates only. Consult a tax professional for accurate figures.
            </div>
          </div>

          {/* Deductible breakdown */}
          <div style={s.section}>
            <div style={s.sectionTitle}>📋 Deductible expenses — {selectedYear}</div>
            {[
              { label: "Whatnot platform fees (11.2%)", amount: whatnotFees, note: "Auto-calculated from revenue" },
              { label: "Shipping & packaging supplies", amount: breakSupplies, note: "From break logs" },
              { label: "Coupon spend", amount: breakCoupons, note: "From break logs" },
              { label: "Promotion spend", amount: breakPromos, note: "From break logs" },
              { label: "Chaser card costs (COGS)", amount: breakChasers, note: "From break logs" },
              { label: "Manual expenses", amount: manualExpensesTotal, note: `${yearExpenses.length} logged expenses` },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #161616" }}>
                <div>
                  <div style={{ fontSize: 13, color: "#aaa" }}>{row.label}</div>
                  <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{row.note}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#f87171" }}>-${row.amount.toFixed(2)}</div>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#e5e5e5" }}>Total deductible</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#f87171" }}>-${totalDeductible.toFixed(2)}</span>
            </div>
          </div>

          {/* Monthly P&L */}
          <div style={s.section}>
            <div style={s.sectionTitle}>📅 Monthly P&L — {selectedYear}</div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 500 }}>
                <div className="fin-pnl-header">
                  <div style={{ fontSize: 10, color: "#444", fontWeight: 600, textTransform: "uppercase" as const }}>Month</div>
                  <div style={{ fontSize: 10, color: "#444", fontWeight: 600, textTransform: "uppercase" as const }}>Breaks</div>
                  <div style={{ fontSize: 10, color: "#4ade80", fontWeight: 600, textTransform: "uppercase" as const }}>Revenue</div>
                  <div className="fin-pnl-hide" style={{ fontSize: 10, color: "#f87171", fontWeight: 600, textTransform: "uppercase" as const }}>Fees</div>
                  <div className="fin-pnl-hide" style={{ fontSize: 10, color: "#f87171", fontWeight: 600, textTransform: "uppercase" as const }}>Supplies</div>
                  <div className="fin-pnl-hide" style={{ fontSize: 10, color: "#f87171", fontWeight: 600, textTransform: "uppercase" as const }}>Other exp.</div>
                  <div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 600, textTransform: "uppercase" as const }}>Profit</div>
                  <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 600, textTransform: "uppercase" as const }}>Valley</div>
                  <div style={{ fontSize: 10, color: "#fb923c", fontWeight: 600, textTransform: "uppercase" as const }}>BOBA</div>
                </div>
                {months.map((m, i) => {
                  if (m.breakCount === 0 && m.manual === 0) return null;
                  const boba = yearBreaks.filter(b => b.date?.startsWith(m.key)).reduce((s, b) => s + parseFloat(b.imc_take || "0"), 0);
                  return (
                    <div key={i} className="fin-pnl-row">
                      <div style={{ fontWeight: 600, color: "#e5e5e5" }}>{MONTH_NAMES[m.month]}</div>
                      <div style={{ color: "#555" }}>{m.breakCount}</div>
                      <div style={{ color: "#4ade80", fontWeight: 600 }}>${m.revenue.toFixed(0)}</div>
                      <div className="fin-pnl-hide" style={{ color: "#f87171" }}>-${m.fees.toFixed(0)}</div>
                      <div className="fin-pnl-hide" style={{ color: "#f87171" }}>-${(m.supplies + m.coupons + m.promos + m.chasers).toFixed(0)}</div>
                      <div className="fin-pnl-hide" style={{ color: "#f87171" }}>-${m.manual.toFixed(0)}</div>
                      <div style={{ color: m.profit >= 0 ? "#a78bfa" : "#f87171", fontWeight: 600 }}>${m.profit.toFixed(0)}</div>
                      <div style={{ color: "#38bdf8" }}>${m.valley.toFixed(0)}</div>
                      <div style={{ color: "#fb923c" }}>${boba.toFixed(0)}</div>
                    </div>
                  );
                })}
                {/* Totals */}
                <div className="fin-pnl-row" style={{ borderTop: "1px solid #333", borderBottom: "none", fontWeight: 700 }}>
                  <div style={{ color: "#aaa", fontSize: 11 }}>TOTAL</div>
                  <div style={{ color: "#aaa" }}>{yearBreaks.length}</div>
                  <div style={{ color: "#4ade80" }}>${grossRevenue.toFixed(0)}</div>
                  <div className="fin-pnl-hide" style={{ color: "#f87171" }}>-${whatnotFees.toFixed(0)}</div>
                  <div className="fin-pnl-hide" style={{ color: "#f87171" }}>-${(breakSupplies + breakCoupons + breakPromos + breakChasers).toFixed(0)}</div>
                  <div className="fin-pnl-hide" style={{ color: "#f87171" }}>-${manualExpensesTotal.toFixed(0)}</div>
                  <div style={{ color: "#a78bfa" }}>${yearBreaks.reduce((s, b) => s + parseFloat(b.net_profit || "0"), 0).toFixed(0)}</div>
                  <div style={{ color: "#38bdf8" }}>${valleyIncome.toFixed(0)}</div>
                  <div style={{ color: "#fb923c" }}>${bobaPayouts.toFixed(0)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule C */}
          <div style={{ ...s.section, borderColor: "#a78bfa33" }}>
            <div style={s.sectionTitle}>📝 Schedule C helper — {selectedYear}</div>
            <p style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>Key numbers for your self-employment tax return (Form 1040, Schedule C)</p>
            <div className="fin-schedule-grid">
              {[
                { line: "Line 1", label: "Gross receipts / sales", value: grossRevenue, color: "#4ade80" },
                { line: "Line 2", label: "Returns & allowances (coupons)", value: breakCoupons, color: "#f87171" },
                { line: "Line 4", label: "Cost of goods sold (chasers)", value: breakChasers, color: "#f87171" },
                { line: "Line 17", label: "Legal & professional services", value: categoryTotals["professional"] || 0, color: "#f87171" },
                { line: "Line 18", label: "Office expense", value: categoryTotals["supplies"] || 0, color: "#f87171" },
                { line: "Line 22", label: "Supplies (shipping & packaging)", value: breakSupplies, color: "#f87171" },
                { line: "Line 27a", label: "Other expenses (platform fees, software)", value: (categoryTotals["platform_fees"] || 0) + (categoryTotals["software"] || 0) + whatnotFees, color: "#f87171" },
                { line: "Net profit (Line 31)", label: "Your Valley take", value: valleyIncome, color: "#a78bfa" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#0f0f0f", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#444", marginBottom: 2 }}>{item.line}</div>
                    <div style={{ fontSize: 13, color: "#aaa" }}>{item.label}</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: item.color }}>${item.value.toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#0f0f0f", borderRadius: 8, padding: 12, fontSize: 12, color: "#555", marginTop: 12 }}>
              ⚠️ Guide only — consult a CPA before filing.
            </div>
          </div>

        </>}
      </div>
    </div>
  );
}