import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────
const JSONBIN_BIN_ID = "69a19979d0ea881f40deeec6";
const JSONBIN_API_KEY = "$2a$10$5Ms12r9fbKUkzrmyLlxL.uqNxc3zrKcfICnPpTDM7kLYkBLyz0mIq";
// ─────────────────────────────────────────────────────────────────────────

const GOAL_AMOUNT = 10000;
const EMOJIS = ["⚽","🏆","🎯","💪","🔥","✨","👏","🌟","🎖️","💚"];

// Milestones — cost is incremental (not cumulative) for progress bar logic
const MILESTONES = [
  { id: "ball1", amount: 3000, cost: 3000, emoji: "⚽",   label: "1 Ball"  },
  { id: "ball2", amount: 5000, cost: 2000, emoji: "⚽⚽", label: "2 Balls" },
  { id: "bibs",  amount: 6500, cost: 1500, emoji: "👕",   label: "Bibs"    },
];

async function fetchData() {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
    headers: { "X-Master-Key": JSONBIN_API_KEY }
  });
  const json = await res.json();
  return json.record;
}

async function pushData(data) {
  await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Master-Key": JSONBIN_API_KEY },
    body: JSON.stringify(data)
  });
}

function fmt(n) { return Number(n).toLocaleString("en-IN"); }

// ── WhatsApp purchase status ──────────────────────────────────────────────
function getPurchaseStatus(purchased, total) {
  const done = MILESTONES.filter(m => purchased.find(p => p.id === m.id));
  const next = MILESTONES.find(m => !purchased.find(p => p.id === m.id));
  const spentOnPurchases = done.reduce((s, m) => s + m.cost, 0);
  const available = Math.max(0, total - spentOnPurchases);

  let lines = [];
  if (done.length > 0) {
    lines.push(`✅ *Purchased:* ${done.map(m => `${m.emoji} ${m.label}`).join(", ")}`);
  }
  if (next) {
    const gap = Math.max(0, next.cost - available);
    if (gap <= 0) {
      lines.push(`🎯 Ready to buy: ${next.emoji} ${next.label}!`);
    } else {
      lines.push(`🎯 Next up: ${next.emoji} ${next.label} — ₹${fmt(gap)} more to go!`);
    }
  } else {
    lines.push(`🏆 All items purchased! Legend stuff 💚`);
  }
  return lines.join("\n");
}

// ── Pitch Background ───────────────────────────────────────────────────────
function PitchBackground() {
  return (
    <svg style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", opacity: 0.045, pointerEvents: "none", zIndex: 0 }}
      viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice">
      <rect x="30" y="30" width="340" height="640" fill="none" stroke="#aaff44" strokeWidth="3"/>
      <line x1="30" y1="350" x2="370" y2="350" stroke="#aaff44" strokeWidth="2"/>
      <circle cx="200" cy="350" r="60" fill="none" stroke="#aaff44" strokeWidth="2"/>
      <circle cx="200" cy="350" r="4" fill="#aaff44"/>
      <rect x="95" y="30" width="210" height="110" fill="none" stroke="#aaff44" strokeWidth="2"/>
      <rect x="145" y="30" width="110" height="45" fill="none" stroke="#aaff44" strokeWidth="2"/>
      <rect x="165" y="16" width="70" height="18" fill="none" stroke="#aaff44" strokeWidth="2"/>
      <path d="M 145 140 A 50 50 0 0 0 255 140" fill="none" stroke="#aaff44" strokeWidth="2"/>
      <rect x="95" y="560" width="210" height="110" fill="none" stroke="#aaff44" strokeWidth="2"/>
      <rect x="145" y="625" width="110" height="45" fill="none" stroke="#aaff44" strokeWidth="2"/>
      <rect x="165" y="666" width="70" height="18" fill="none" stroke="#aaff44" strokeWidth="2"/>
      <path d="M 145 560 A 50 50 0 0 1 255 560" fill="none" stroke="#aaff44" strokeWidth="2"/>
      <path d="M 30 50 A 20 20 0 0 1 50 30" fill="none" stroke="#aaff44" strokeWidth="2"/>
      <path d="M 350 30 A 20 20 0 0 1 370 50" fill="none" stroke="#aaff44" strokeWidth="2"/>
      <path d="M 30 650 A 20 20 0 0 0 50 670" fill="none" stroke="#aaff44" strokeWidth="2"/>
      <path d="M 370 650 A 20 20 0 0 1 350 670" fill="none" stroke="#aaff44" strokeWidth="2"/>
      {[80,150,220,290,360,430,500,570,640].map((y, i) => (
        <rect key={i} x="30" y={y} width="340" height="35" fill="#aaff44" opacity="0.3"/>
      ))}
    </svg>
  );
}

// ── Progress Track ─────────────────────────────────────────────────────────
// Logic: purchased items are "behind" — bar shows progress toward NEXT item only.
// e.g. Ball1 purchased (cost ₹3K), now bar is 0→₹2K for Ball2.
function FootballProgress({ total, purchased }) {
  const purchasedItems = MILESTONES.filter(m => purchased.find(p => p.id === m.id));
  const nextItem = MILESTONES.find(m => !purchased.find(p => p.id === m.id));

  // Progress resets per milestone using INCREMENTAL cost.
  // e.g. Ball1 costs ₹3K. Ball2 costs ₹2K extra (₹5K - ₹3K).
  // Once Ball1 is purchased, bar goes 0 → ₹2K using money raised since then.
  // "total" here is net (donations minus expenses), so it naturally reflects spending.
  const purchasedCost = purchasedItems.reduce((s, m) => s + m.cost, 0);
  const nextCost = nextItem ? nextItem.cost : GOAL_AMOUNT;
  // Money available toward next item = total raised minus what was spent on purchased items
  const available = Math.max(0, total - purchasedCost);
  const pct = Math.min(100, (available / nextCost) * 100);
  const pos = Math.min(pct, 91);
  const toGo = Math.max(0, nextCost - available);

  const milestonePos = MILESTONES.map((m) => {
    const isPurchased = !!purchased.find(p => p.id === m.id);
    const isNext = nextItem && nextItem.id === m.id;
    let dotPct;
    if (isPurchased) {
      dotPct = 0;
    } else if (!nextItem) {
      dotPct = 100;
    } else {
      // Position relative to incremental range for next item only
      dotPct = isNext ? 100 : Math.min(200, ((m.amount - (nextItem ? nextItem.amount - nextItem.cost : 0)) / nextCost) * 100);
    }
    return { ...m, dotPct, isPurchased, isNext, unlocked: total >= m.amount };
  }).filter(m => !m.isPurchased);

  return (
    <div style={{ padding: "18px 0 10px", userSelect: "none" }}>
      {/* Next item label */}
      {nextItem && (
        <div style={{ fontSize: 11, color: "#3a5a3a", marginBottom: 6, letterSpacing: 0.5 }}>
          Saving for: <span style={{ color: "#aaff44", fontWeight: 700 }}>{nextItem.emoji} {nextItem.label}</span>
          <span style={{ color: "#2e4a2e" }}> · ₹{fmt(toGo)} to go</span>
        </div>
      )}
      {!nextItem && (
        <div style={{ fontSize: 11, color: "#aaff44", marginBottom: 6, fontWeight: 700 }}>🏆 All items purchased!</div>
      )}

      <div style={{ position: "relative", height: 90 }}>
        {/* Track */}
        <div style={{
          position: "absolute", bottom: 20, left: 24, right: 66,
          height: 7, background: "#1a2e1a", borderRadius: 10,
        }}>
          {/* Fill — progress toward next item */}
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: `${pos}%`,
            background: "linear-gradient(90deg, #00c853, #aaff44)",
            borderRadius: 10,
            transition: "width 0.9s cubic-bezier(.23,1,.32,1)"
          }} />

          {/* Milestone markers */}
          {milestonePos.map((m, i) => (
            <div key={i} style={{
              position: "absolute", left: `${Math.min(m.dotPct, 97)}%`, top: "50%",
              transform: "translate(-50%, -50%)", zIndex: 3,
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: "50%",
                background: m.unlocked ? "#aaff44" : "#2e4a2e",
                border: `2px solid ${m.unlocked ? "#aaff44" : "#1a2e1a"}`,
                transition: "background 0.4s", margin: "0 auto",
              }} />
              {/* Amount label below dot */}
              <div style={{
                position: "absolute", top: 14, left: "50%",
                transform: "translateX(-50%)",
                fontSize: 8,
                color: m.unlocked ? "#aaff44" : "#2e4a2e",
                whiteSpace: "nowrap", fontWeight: 700, letterSpacing: 0.3,
              }}>₹{m.amount >= 1000 ? (m.amount/1000)+"K" : m.amount}</div>
            </div>
          ))}
        </div>

        {/* Dribbling player */}
        <div style={{
          position: "absolute", bottom: 4,
          left: `calc(${pos}% + 10px)`,
          transition: "left 0.9s cubic-bezier(.23,1,.32,1)",
          display: "flex", flexDirection: "column", alignItems: "center", zIndex: 4,
        }}>
          <div style={{ fontSize: 24, lineHeight: 1, animation: total > 0 ? "playerRun 0.5s steps(2) infinite" : "none", filter: "drop-shadow(0 2px 6px rgba(170,255,68,0.4))" }}>🏃</div>
          <div style={{ fontSize: 13, lineHeight: 1, marginTop: -2, animation: total > 0 ? "ballRoll 0.4s linear infinite" : "none" }}>⚽</div>
        </div>

        {/* Start flag */}
        <div style={{ position: "absolute", left: 4, bottom: 14, fontSize: 14 }}>🚩</div>

        {/* Goal post */}
        <div style={{ position: "absolute", right: 0, bottom: 4, width: 58, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
            <div style={{ width: 4, height: 46, background: pct >= 100 ? "#aaff44" : "#2e4a2e", borderRadius: "2px 2px 0 0", transition: "background 0.5s" }} />
            <div style={{
              width: 44, height: 36,
              border: `2px solid ${pct >= 100 ? "#aaff44" : "#2e4a2e"}`,
              borderBottom: "none", borderRadius: "3px 3px 0 0",
              background: pct >= 100 ? "rgba(170,255,68,0.15)" : "rgba(255,255,255,0.02)",
              backgroundImage: "repeating-linear-gradient(0deg,rgba(255,255,255,0.07) 0,rgba(255,255,255,0.07) 1px,transparent 1px,transparent 9px),repeating-linear-gradient(90deg,rgba(255,255,255,0.07) 0,rgba(255,255,255,0.07) 1px,transparent 1px,transparent 9px)",
              transition: "border-color 0.5s, background 0.5s",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: pct >= 100 ? 20 : 0, overflow: "hidden"
            }}>
              {pct >= 100 && <span style={{ animation: "pop 0.5s ease" }}>🥅</span>}
            </div>
            <div style={{ width: 4, height: 46, background: pct >= 100 ? "#aaff44" : "#2e4a2e", borderRadius: "2px 2px 0 0", transition: "background 0.5s" }} />
          </div>
          <div style={{ width: 52, height: 3, background: pct >= 100 ? "#aaff44" : "#1a2e1a", borderRadius: 2, transition: "background 0.5s" }} />
        </div>
      </div>

      {/* Milestone pills */}
      <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {MILESTONES.map((m) => {
          const isPurchased = !!purchased.find(p => p.id === m.id);
          const isUnlocked = total >= m.amount;
          return (
            <div key={m.id} style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 20,
              background: isPurchased ? "rgba(100,100,100,0.15)" : isUnlocked ? "rgba(170,255,68,0.15)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${isPurchased ? "#555" : isUnlocked ? "#aaff44" : "#1a2e1a"}`,
              color: isPurchased ? "#666" : isUnlocked ? "#aaff44" : "#2e4a2e",
              fontWeight: 600, transition: "all 0.4s",
              textDecoration: isPurchased ? "line-through" : "none",
            }}>{m.emoji} {m.label} {isPurchased ? "✓" : ""}</div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [donations, setDonations] = useState([]);
  const [purchased, setPurchased] = useState([]); // array of milestone ids
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("log");
  const [celebrate, setCelebrate] = useState(false);
  const [rain, setRain] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [purchaseInputs, setPurchaseInputs] = useState({});
  const [purchaseAmounts, setPurchaseAmounts] = useState({}); // milestoneId -> input value
  const [suggText, setSuggText] = useState("");
  const [suggName, setSuggName] = useState("");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const loadData = useCallback(async () => {
    try {
      const data = await fetchData();
      setDonations(data.donations || []);
      setPurchased(data.purchased || []);
      setSuggestions(data.suggestions || []);
    } catch (e) {}
    setLoading(false);
  }, []);

  const saveData = useCallback(async (newDonations, newPurchased, newSuggestions) => {
    setSaving(true);
    try {
      await pushData({ donations: newDonations, purchased: newPurchased, suggestions: newSuggestions });
    } catch (e) {
      showToast("Save failed. Try again.", "error");
    }
    setSaving(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const id = setInterval(loadData, 15000);
    return () => clearInterval(id);
  }, [loadData]);

  const total = donations.reduce((s, d) => s + d.amount, 0);

  async function togglePurchased(milestoneId, amountSpent) {
    const milestone = MILESTONES.find(m => m.id === milestoneId);
    const alreadyPurchased = purchased.find(p => p.id === milestoneId);
    const updated = alreadyPurchased
      ? purchased.filter(p => p.id !== milestoneId)
      : [...purchased, { id: milestoneId, amountSpent: parseFloat(amountSpent) || milestone.cost }];
    setPurchased(updated);
    await saveData(donations, updated, suggestions);
    if (!alreadyPurchased) {
      showToast(`${milestone.emoji} ${milestone.label} purchased for ₹${fmt(parseFloat(amountSpent) || milestone.cost)}! 🎉`);
      setRain({ emoji: milestone.emoji, count: 30 });
      setTimeout(() => setRain(null), 3500);
    } else {
      showToast(`${milestone.label} unmarked`);
    }
  }

  async function addDonation() {
    if (!name.trim()) { showToast("Enter a description ✍️", "error"); return; }
    const amt = parseFloat(amount);
    if (!amt || amt === 0) { showToast("Enter a valid amount", "error"); return; }
    const prevTotal = donations.reduce((s, d) => s + d.amount, 0);
    const now = new Date();
    const timeStr = now.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    const isExpense = amt < 0;
    const updated = [...donations, { id: Date.now(), name: name.trim(), amount: amt, time: timeStr, type: isExpense ? "expense" : "donation" }];
    setDonations(updated);
    await saveData(updated, purchased, suggestions);
    setName(""); setAmount("");
    showToast(isExpense ? `₹${fmt(Math.abs(amt))} expense logged 📤` : `₹${fmt(amt)} from ${name.trim()} added! 🎉`);
    const newTotal = prevTotal + amt;
    const justUnlocked = MILESTONES.find(m => prevTotal < m.amount && newTotal >= m.amount);
    if (justUnlocked) {
      setTimeout(() => {
        showToast(`${justUnlocked.emoji} ${justUnlocked.label} unlocked! 🎉`);
        setRain({ emoji: justUnlocked.emoji, count: 30 });
        setTimeout(() => setRain(null), 3500);
      }, 300);
    }
    if (prevTotal < GOAL_AMOUNT && newTotal >= GOAL_AMOUNT) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 4000);
    }
  }

  async function deleteDonation(id) {
    const updated = donations.filter(d => d.id !== id);
    setDonations(updated);
    await saveData(updated, purchased, suggestions);
    showToast("Entry removed");
  }

  async function addSuggestion() {
    if (!suggText.trim()) { showToast("Enter your suggestion ✍️", "error"); return; }
    const now = new Date();
    const timeStr = now.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    const updated = [...suggestions, { id: Date.now(), text: suggText.trim(), by: suggName.trim() || "Anonymous", time: timeStr, votes: 0 }];
    setSuggestions(updated);
    await saveData(donations, purchased, updated);
    setSuggText(""); setSuggName("");
    showToast("Suggestion added! 💡");
  }

  async function voteSuggestion(id) {
    const updated = suggestions.map(s => s.id === id ? { ...s, votes: (s.votes || 0) + 1 } : s);
    setSuggestions(updated);
    await saveData(donations, purchased, updated);
  }

  async function deleteSuggestion(id) {
    const updated = suggestions.filter(s => s.id !== id);
    setSuggestions(updated);
    await saveData(donations, purchased, updated);
  }

  function shareWhatsApp() {
    const topDonors = [...donations]
      .filter(d => d.amount > 0)
      .sort((a, b) => b.amount - a.amount).slice(0, 3)
      .map((d, i) => `${["🥇","🥈","🥉"][i]} ${d.name} — ₹${fmt(d.amount)}`).join("\n");

    const purchaseStatus = getPurchaseStatus(purchased, total);

    const msg =
`⚽ *Sundays' Boys* ⚽
💚 _Contribute for better ball and bibs_

💰 *Total raised: ₹${fmt(total)}*

${purchaseStatus}
${topDonors ? `\n🌟 *Top Ballers*\n${topDonors}\n` : ""}
━━━━━━━━━━━━━━━━━━━
💸 *Pay via GPay:* 7013839578 (Uma)
🔗 *Track live:* https://fund-for-footbal.vercel.app

🔥 Let's close this fast!
#SundaysBoys`;

    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  }

  function openGPay() {
    window.open("gpay://upi/pay?pa=7013839578@okicici&pn=Uma&cu=INR", "_blank");
  }

  const iS = {
    width: "100%", background: "rgba(8,13,8,0.8)", border: "1px solid #1a2e1a",
    borderRadius: 10, color: "#e8f5e8", fontFamily: "inherit",
    fontSize: 14, padding: "11px 12px",
  };

  if (loading) return (
    <div style={{ background: "#080d08", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 36, animation: "ballBounce 1s infinite" }}>⚽</div>
      <style>{`@keyframes ballBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
    </div>
  );

  return (
    <div style={{ background: "#080d08", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#e8f5e8", position: "relative", overflow: "hidden" }}>
      <PitchBackground />
      <div style={{ position: "fixed", inset: 0, zIndex: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(8,20,8,0.7) 0%, rgba(8,13,8,0.92) 70%)" }} />

      {/* Rain */}
      {rain && (
        <div style={{ position: "fixed", inset: 0, zIndex: 90, pointerEvents: "none", overflow: "hidden" }}>
          {Array.from({ length: rain.count }).map((_, i) => (
            <div key={i} style={{
              position: "absolute", left: `${Math.random() * 100}%`, top: "-40px",
              fontSize: Math.random() * 14 + 16,
              animation: `rainFall ${Math.random() * 1.5 + 1.5}s linear ${Math.random() * 1.2}s forwards`,
              opacity: 0,
            }}>{rain.emoji}</div>
          ))}
        </div>
      )}

      {/* Celebration */}
      {celebrate && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setCelebrate(false)}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 72, animation: "pop 0.5s ease" }}>🏆</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#aaff44", marginTop: 12 }}>GOAL REACHED!</div>
            <div style={{ color: "#5a7a5a", fontSize: 14, marginTop: 8 }}>Sundays' Boys showed up 💚</div>
            <div style={{ color: "#3a5a3a", fontSize: 11, marginTop: 20 }}>tap to close</div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? "#7f1d1d" : "#14532d", color: "#fff", padding: "10px 24px", borderRadius: 30, fontSize: 13, fontWeight: 600, zIndex: 999, boxShadow: "0 4px 24px rgba(0,0,0,0.5)", animation: "slideDown 0.25s ease", whiteSpace: "nowrap" }}>{toast.msg}</div>
      )}

      <div style={{ maxWidth: 430, margin: "0 auto", padding: "16px 16px 80px", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: "center", padding: "26px 0 12px" }}>
          <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 5, textTransform: "uppercase", color: "#aaff44", textShadow: "0 0 20px rgba(170,255,68,0.4)" }}>Sundays' Boys</div>
          <div style={{ fontSize: 12, color: "#3a5a3a", marginTop: 5 }}>Contribute for better ball and bibs</div>
          {saving && <div style={{ fontSize: 10, color: "#2e4a2e", letterSpacing: 1, textTransform: "uppercase", marginTop: 6 }}>syncing…</div>}
        </div>

        {/* Fund card */}
        <div style={{ background: "rgba(15,26,15,0.85)", backdropFilter: "blur(10px)", border: "1px solid #1a2e1a", borderRadius: 24, padding: "20px 20px 16px", marginBottom: 12 }}>
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#2e4a2e", marginBottom: 4 }}>Total Raised</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
              <span style={{ fontSize: 13, color: "#3a5a3a", fontWeight: 600 }}>₹</span>
              <span style={{ fontSize: 44, fontWeight: 900, color: "#aaff44", lineHeight: 1, letterSpacing: -2 }}>{fmt(total)}</span>
            </div>
          </div>

          <FootballProgress total={total} purchased={purchased} />

          {/* Purchase checkboxes */}
          <div style={{ marginTop: 12, borderTop: "1px solid #1a2e1a", paddingTop: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#2e4a2e", marginBottom: 8 }}>Mark as Purchased</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {MILESTONES.map(m => {
                const purchasedEntry = purchased.find(p => p.id === m.id);
                const isPurchased = !!purchasedEntry;
                return (
                  <div key={m.id} style={{
                    background: isPurchased ? "rgba(100,100,100,0.1)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isPurchased ? "#444" : "#1a2e1a"}`,
                    borderRadius: 10, padding: "10px 14px", transition: "all 0.2s",
                  }}>
                    {/* Top row: label + unmark */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 6,
                        background: isPurchased ? "#aaff44" : "transparent",
                        border: `2px solid ${isPurchased ? "#aaff44" : "#2a3a2a"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, flexShrink: 0, transition: "all 0.2s",
                      }}>{isPurchased ? "✓" : ""}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: isPurchased ? "#666" : "#e8f5e8", textDecoration: isPurchased ? "line-through" : "none" }}>
                          {m.emoji} {m.label}
                        </div>
                        {isPurchased && (
                          <div style={{ fontSize: 10, color: "#aaff44", marginTop: 1 }}>
                            Purchased for ₹{fmt(purchasedEntry.amountSpent)} ✓
                          </div>
                        )}
                      </div>
                      {isPurchased && (
                        <button onClick={() => togglePurchased(m.id)} style={{ background: "none", border: "1px solid #333", borderRadius: 6, color: "#666", fontSize: 10, cursor: "pointer", padding: "3px 8px" }}
                          onMouseEnter={e => e.currentTarget.style.color = "#ff5252"}
                          onMouseLeave={e => e.currentTarget.style.color = "#666"}>Undo</button>
                      )}
                    </div>
                    {/* Amount input row — only when not yet purchased */}
                    {!isPurchased && (
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <div style={{ position: "relative", flex: 1 }}>
                          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#3a5a3a", fontSize: 12, fontWeight: 700 }}>₹</span>
                          <input
                            type="number"
                            placeholder="Enter amount paid"
                            value={purchaseInputs[m.id] || ""}
                            onChange={e => setPurchaseInputs(prev => ({ ...prev, [m.id]: e.target.value }))}
                            style={{ width: "100%", background: "rgba(8,13,8,0.8)", border: "1px solid #1a2e1a", borderRadius: 8, color: "#e8f5e8", fontFamily: "inherit", fontSize: 13, padding: "8px 10px 8px 24px", boxSizing: "border-box" }}
                          />
                        </div>
                        <button
                          onClick={() => {
                            const amt = purchaseInputs[m.id];
                            if (!amt || parseFloat(amt) <= 0) { return; }
                            togglePurchased(m.id, amt);
                            setPurchaseInputs(prev => ({ ...prev, [m.id]: "" }));
                          }}
                          style={{
                            background: purchaseInputs[m.id] ? "linear-gradient(135deg, #00c853, #aaff44)" : "#1a2e1a",
                            color: purchaseInputs[m.id] ? "#000" : "#3a5a3a",
                            border: "none", borderRadius: 8, padding: "8px 12px",
                            fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
                            transition: "all 0.2s",
                          }}>✓ Mark Bought</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
            {[
              { val: donations.filter(d => d.amount > 0).length, label: "Donors" },
              { val: `₹${fmt(donations.filter(d => d.amount < 0).reduce((s, d) => s + Math.abs(d.amount), 0))}`, label: "Expenses" }
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(8,13,8,0.8)", borderRadius: 10, padding: "10px 12px", textAlign: "center", border: "1px solid #1a2e1a" }}>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{s.val}</div>
                <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#3a5a3a", marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div onClick={openGPay} style={{ background: "linear-gradient(135deg, #1a3a2a, #0f2a1a)", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", border: "1px solid #1a3a1a" }}
            onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.2)"}
            onMouseLeave={e => e.currentTarget.style.filter = "none"}>
            <div style={{ fontSize: 22 }}>💸</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Pay via GPay</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>7013839578</div>
            </div>
          </div>
          <div onClick={shareWhatsApp} style={{ background: "linear-gradient(135deg, #064e45, #0a7a6e)", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", border: "1px solid #0d6b60" }}
            onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.15)"}
            onMouseLeave={e => e.currentTarget.style.filter = "none"}>
            <div style={{ fontSize: 22 }}>💬</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Share Update</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>WhatsApp</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "rgba(15,26,15,0.85)", borderRadius: 12, padding: 4, marginBottom: 12, border: "1px solid #1a2e1a" }}>
          {[{ key: "log", label: "➕ Log Entry" }, { key: "donors", label: `📋 Ledger (${donations.length})` }, { key: "suggest", label: `💡 Ideas (${suggestions.length})` }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: "9px 6px", background: tab === t.key ? "#aaff44" : "transparent", color: tab === t.key ? "#000" : "#3a5a3a", border: "none", borderRadius: 9, fontWeight: 700, fontSize: 11, cursor: "pointer", transition: "all 0.2s" }}>{t.label}</button>
          ))}
        </div>

        {tab === "log" && (
          <div style={{ background: "rgba(15,26,15,0.85)", backdropFilter: "blur(10px)", border: "1px solid #1a2e1a", borderRadius: 20, padding: 18 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#2e4a2e", marginBottom: 12 }}>Log Income or Expense</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <input value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && document.getElementById("ai").focus()}
                placeholder="Description" maxLength={30} style={iS} />
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#3a5a3a", fontSize: 13, fontWeight: 700 }}>₹</span>
                <input id="ai" value={amount} onChange={e => setAmount(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addDonation()}
                  placeholder="-500 for expense" type="number"
                  style={{ ...iS, paddingLeft: 26 }} />
              </div>
            </div>
            <button onClick={addDonation} style={{
              width: "100%",
              background: parseFloat(amount) < 0 ? "linear-gradient(135deg, #7f1d1d, #ef4444)" : "linear-gradient(135deg, #00c853, #aaff44)",
              color: parseFloat(amount) < 0 ? "#fff" : "#000",
              border: "none", borderRadius: 12, padding: 14,
              fontWeight: 900, fontSize: 15, letterSpacing: 2, textTransform: "uppercase",
              cursor: "pointer", transition: "background 0.3s"
            }}>{parseFloat(amount) < 0 ? "📤 Log Expense" : "⚽ Add Donation"}</button>
          </div>
        )}

        {tab === "donors" && (
          <div>
            {donations.length === 0
              ? <div style={{ textAlign: "center", color: "#3a5a3a", padding: "48px 20px", background: "rgba(15,26,15,0.85)", borderRadius: 16, border: "1px solid #1a2e1a" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>⚽</div>
                  <div>No entries yet. Log a donation or expense! 🌟</div>
                </div>
              : [...donations].reverse().map((d, ri) => {
                  const oi = donations.length - 1 - ri;
                  return (
                    <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(15,26,15,0.85)", backdropFilter: "blur(8px)", border: `1px solid ${d.amount < 0 ? "#3a1a1a" : "#1a2e1a"}`, borderRadius: 12, padding: "11px 14px", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, background: d.amount < 0 ? "rgba(127,29,29,0.4)" : "#1a2e1a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, border: d.amount < 0 ? "1px solid #7f1d1d" : "none" }}>
                          {d.amount < 0 ? "📤" : EMOJIS[oi % EMOJIS.length]}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div>
                          <div style={{ fontSize: 10, color: "#3a5a3a", marginTop: 1 }}>{d.time}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: d.amount < 0 ? "#ef4444" : "#aaff44" }}>{d.amount < 0 ? "-₹" : "₹"}{fmt(Math.abs(d.amount))}</div>
                        <button onClick={() => deleteDonation(d.id)} style={{ background: "none", border: "none", color: "#2a3a2a", fontSize: 13, cursor: "pointer", padding: "3px 6px", borderRadius: 6 }}
                          onMouseEnter={e => e.currentTarget.style.color = "#ff5252"}
                          onMouseLeave={e => e.currentTarget.style.color = "#2a3a2a"}>✕</button>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        )}

        {tab === "suggest" && (
          <div>
            <div style={{ background: "rgba(15,26,15,0.85)", backdropFilter: "blur(10px)", border: "1px solid #1a2e1a", borderRadius: 20, padding: 18, marginBottom: 12 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#2e4a2e", marginBottom: 12 }}>Drop a suggestion</div>
              <textarea value={suggText} onChange={e => setSuggText(e.target.value)}
                placeholder="e.g. Nike size 5 match ball, Decathlon bibs..." maxLength={120} rows={2}
                style={{ width: "100%", background: "rgba(8,13,8,0.8)", border: "1px solid #1a2e1a", borderRadius: 10, color: "#e8f5e8", fontFamily: "inherit", fontSize: 14, padding: "11px 12px", resize: "none", outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
              <input value={suggName} onChange={e => setSuggName(e.target.value)} placeholder="Your name (optional)" maxLength={20}
                style={{ width: "100%", background: "rgba(8,13,8,0.8)", border: "1px solid #1a2e1a", borderRadius: 10, color: "#e8f5e8", fontFamily: "inherit", fontSize: 14, padding: "11px 12px", marginBottom: 10, boxSizing: "border-box" }} />
              <button onClick={addSuggestion} style={{ width: "100%", background: "linear-gradient(135deg, #1a6b3a, #aaff44)", color: "#000", border: "none", borderRadius: 12, padding: 13, fontWeight: 900, fontSize: 14, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>💡 Submit Idea</button>
            </div>
            {suggestions.length === 0
              ? <div style={{ textAlign: "center", color: "#3a5a3a", padding: "40px 20px", background: "rgba(15,26,15,0.85)", borderRadius: 16, border: "1px solid #1a2e1a" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💡</div>
                  <div>No ideas yet — be the first!</div>
                </div>
              : [...suggestions].sort((a, b) => (b.votes || 0) - (a.votes || 0)).map(s => (
                <div key={s.id} style={{ background: "rgba(15,26,15,0.85)", backdropFilter: "blur(8px)", border: "1px solid #1a2e1a", borderRadius: 14, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <button onClick={() => voteSuggestion(s.id)} style={{ background: "#1a2e1a", border: "1px solid #2a4a2a", borderRadius: 10, color: "#aaff44", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "6px 8px", minWidth: 40, textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 14 }}>👍</div>
                    <div>{s.votes || 0}</div>
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#e8f5e8", lineHeight: 1.4 }}>{s.text}</div>
                    <div style={{ fontSize: 10, color: "#3a5a3a", marginTop: 4 }}>by {s.by} · {s.time}</div>
                  </div>
                  <button onClick={() => deleteSuggestion(s.id)} style={{ background: "none", border: "none", color: "#2a3a2a", fontSize: 13, cursor: "pointer", padding: "3px 6px", borderRadius: 6, flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = "#ff5252"}
                    onMouseLeave={e => e.currentTarget.style.color = "#2a3a2a"}>✕</button>
                </div>
              ))
            }
          </div>
        )}
      </div>

      <style>{`
        @keyframes playerRun { 0%{transform:scaleX(1)} 50%{transform:scaleX(-1)} }
        @keyframes ballRoll { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes ballBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes rainFall { 0%{opacity:1;transform:translateY(0) rotate(0deg)} 100%{opacity:0.3;transform:translateY(110vh) rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideDown { from{opacity:0;transform:translate(-50%,-12px)} to{opacity:1;transform:translate(-50%,0)} }
        @keyframes pop { 0%{transform:scale(0.4);opacity:0} 70%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
        * { box-sizing: border-box; }
        input::placeholder { color: #2a3a2a; }
        textarea::placeholder { color: #2a3a2a; }
        input:focus, textarea:focus { outline: none; border-color: #aaff44 !important; }
      `}</style>
    </div>
  );
}
