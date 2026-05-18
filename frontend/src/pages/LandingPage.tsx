import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { UiBadge, UiButton, UiCard } from "../components/ui";
import { ChevronDown, Share2, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import BrandLogo from "../components/BrandLogo";
import TradingVideoBackdrop from "../components/TradingVideoBackdrop";

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<string | null>("What is MegaCandle?");
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [contact, setContact] = useState({ name: "", email: "", message: "" });
  const [contactStatus, setContactStatus] = useState<"idle" | "success" | "error">("idle");
  const faqs = [
    {
      q: "What is MegaCandle?",
      a: "MegaCandle is a smart trading platform with journaling, analytics, and guided learning.",
    },
    {
      q: "How does the MT5 sync work?",
      a: "You can connect supported account integrations and automatically import trade history for analytics and review.",
    },
    {
      q: "What do the AI reports tell me?",
      a: "AI summaries highlight recurring mistakes, high-performing setups, and actionable recommendations to improve outcomes.",
    },
    {
      q: "Can I share my performance?",
      a: "Yes. You can share selected stats and progress snapshots while keeping private data protected.",
    },
  ];
  const heroChart = [18, 24, 21, 29, 26, 33, 31, 38, 35, 42];
  const plans = useMemo(() => {
    if (billing === "yearly") {
      return [
        ["Free", "$0", "year", "Up to 15 trades per month"],
        ["Pro", "$149", "year", "Billed yearly (save 25%). Unlimited trades + analytics"],
        ["Elite", "$239", "year", "Billed yearly (save 28%). Pro + AI + priority support"],
      ] as const;
    }
    return [
      ["Free", "$0", "month", "Up to 15 trades per month"],
      ["Pro", "$16.99", "month", "Monthly billing. Unlimited trades + analytics"],
      ["Elite", "$27.99", "month", "Monthly billing. Pro + AI + priority support"],
    ] as const;
  }, [billing]);

  const submitContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.name.trim() || !contact.email.trim() || !contact.message.trim()) {
      setContactStatus("error");
      return;
    }
    setContactStatus("success");
    setContact({ name: "", email: "", message: "" });
  };

  return (
    <div className="app-grid-bg relative min-h-screen overflow-x-hidden text-slate-900 dark:text-white">
      <TradingVideoBackdrop />
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-lg dark:border-slate-500/20 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <BrandLogo compact />
          <div className="hidden items-center gap-6 md:flex">
            <a className="text-sm text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" href="#features">
              Features
            </a>
            <a className="text-sm text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" href="#platform">
              Platform
            </a>
            <a className="text-sm text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" href="#pricing">
              Pricing
            </a>
            <a className="text-sm text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" href="#faq">FAQ</a>
            <a className="text-sm text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" href="#contact">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle className="ml-1" />
            <UiButton href="/login" className="px-6">
              Get Started
            </UiButton>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-6">
        <section className="mx-auto grid max-w-6xl gap-8 py-16 lg:grid-cols-2 lg:items-center">
          <div className="text-center lg:text-left">
            <UiBadge className="border-blue-300/30 bg-blue-500/12 text-blue-700 dark:text-blue-200">
              The smart trading platform that works for you
            </UiBadge>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-slate-900 dark:text-white md:text-6xl">
              Track trades. <span className="text-blue-600 dark:text-blue-300">Analyze PnL.</span>
              <br />
              Master markets.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-slate-700 dark:text-slate-200 lg:mx-0">
              Built for serious traders who want live market awareness, actionable analytics, and secure
              account access with Google + device-aware sessions.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
              <UiButton href="/login" className="px-7 py-3">
                Get Started
              </UiButton>
              <UiButton href="#pricing" variant="ghost" className="px-6 py-3">
                See Pricing
              </UiButton>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-500/15 via-white/70 to-white/80 p-6 shadow-2xl shadow-blue-200/40 dark:border-slate-500/20 dark:from-blue-500/20 dark:via-slate-900/70 dark:to-slate-900/90 dark:shadow-blue-900/20"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.3),transparent_45%)]" />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 gap-3"
            >
              {[
                { label: "Today PnL", value: "$0.00", accent: "text-slate-700 dark:text-slate-200" },
                { label: "Win Rate", value: "—", accent: "text-blue-600 dark:text-blue-300" },
                { label: "Profit Factor", value: "—", accent: "text-slate-700 dark:text-slate-200" },
                { label: "Best Symbol", value: "—", accent: "text-slate-700 dark:text-slate-200" },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  whileHover={{ scale: 1.02 }}
                  className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-slate-950/50"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                  <p className={`mt-1 text-lg font-bold ${stat.accent}`}>{stat.value}</p>
                </motion.div>
              ))}
            </motion.div>
            <p className="mt-3 text-center text-xs text-slate-600 dark:text-white/55">
              Live MT5 sync · chart · SL/TP · journal
            </p>
            <UiCard className="mt-4 bg-white/55 p-4 dark:bg-slate-950/45">
              <div className="h-24 w-full rounded bg-gradient-to-r from-blue-500/18 via-cyan-400/10 to-transparent p-2">
                <div className="flex h-full items-end gap-1.5">
                  {heroChart.map((v, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ height: 6, opacity: 0.5 }}
                      animate={{ height: v, opacity: 1 }}
                      transition={{ duration: 0.5, delay: idx * 0.05 }}
                      className="w-full rounded-t bg-gradient-to-t from-cyan-500/75 to-blue-400/95"
                    />
                  ))}
                </div>
              </div>
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mt-2 text-xs text-slate-600 dark:text-white/60"
              >
                Live chart style preview
              </motion.p>
            </UiCard>
          </motion.div>
        </section>

        <section id="features" className="mx-auto max-w-6xl py-8">
          <h2 className="text-center text-3xl font-semibold text-slate-900 dark:text-white md:text-5xl">Everything You Need for Modern Trading</h2>
          <p className="mt-3 text-center text-slate-700 dark:text-slate-200">
            From the moment you place a trade to the lessons you take from it.
          </p>
        </section>

        <section className="mx-auto max-w-6xl py-4 grid gap-4 md:grid-cols-2">
          {[
            ["Watchlist & symbols", "Curate symbols, notes, and context so every session starts with a clear plan."],
            ["Smart Trade Ideas", "Get setup suggestions based on live volatility and direction bias."],
            ["Trading Academy", "Learn core concepts, execution, and risk control step by step."],
            ["Live Market", "Trade with charts, instant execution, and position management on MegaCandle Markets."],
          ].map(([feature, description], idx) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.06 }}
              className="rounded-xl border border-slate-200 bg-white/65 p-6 hover:bg-white/85 dark:border-slate-500/25 dark:bg-slate-900/50 dark:hover:bg-slate-900/75"
            >
              <div className="font-semibold">{feature}</div>
              <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">{description}</div>
            </motion.div>
          ))}
        </section>

        <section id="trading-education" className="mx-auto max-w-6xl py-10">
          <h2 className="text-center text-3xl font-semibold text-slate-900 dark:text-white md:text-5xl">
            Learn Real Trading, Step by Step
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-center text-slate-700 dark:text-slate-200">
            MegaCandle teaches practical trading: market structure, risk management, execution discipline, and post-trade review.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["Market Structure", "Understand trend, range, breakout, and liquidity zones before entering any trade."],
              ["Risk Management", "Use position sizing, stop-loss discipline, and daily loss limits to protect capital."],
              ["Trading Psychology", "Build consistency through routine, journaling, and process-driven decisions."],
            ].map(([title, desc]) => (
              <UiCard key={title} className="p-5">
                <div className="text-lg font-semibold text-slate-900 dark:text-white">{title}</div>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{desc}</p>
              </UiCard>
            ))}
          </div>
        </section>

        <section id="market-information" className="mx-auto max-w-6xl py-8">
          <UiCard className="p-6">
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">What You Can Track Daily</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                "Watchlist symbols and volatility context",
                "Session-based volatility and timing windows",
                "Setup quality and strategy-level performance",
                "Win rate, profit factor, expectancy, and drawdown",
                "Behavioral mistakes and recurring execution errors",
                "Actionable plan for next trading session",
              ].map((item) => (
                <div key={item} className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 dark:border-slate-500/25 dark:bg-slate-900/45 dark:text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </UiCard>
        </section>

        <section id="platform" className="mx-auto max-w-6xl py-10">
          <UiCard className="grid gap-6 p-6 md:grid-cols-2">
            <div>
              <UiBadge className="mb-4">Platform</UiBadge>
              <h3 className="text-3xl font-bold">Trade Together, Grow Together</h3>
              <p className="mt-3 text-slate-700 dark:text-slate-300">
                Connect with thousands of traders, share ideas, and learn from high-quality trade journals.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-800 dark:text-slate-200">
                <li className="inline-flex items-center gap-2"><Users size={14} /> Leaderboard &amp; insights</li>
                <li className="inline-flex items-center gap-2"><Share2 size={14} /> Leaderboard & share cards</li>
                <li className="inline-flex items-center gap-2"><Zap size={14} /> Real-time reactions</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-500/25 bg-slate-950/50 p-4 overflow-hidden dark:bg-slate-950/50">
              <div className="text-sm text-slate-700 dark:text-slate-300">Leaderboard preview</div>
              <div className="mt-3 rounded-xl border border-slate-500/25 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-4">
                <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                  <span className="uppercase tracking-[0.14em]">Top performers</span>
                  <span className="text-slate-500 dark:text-slate-400">This week</span>
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    ["Azi", "+$717.83", "58%"],
                    ["A", "+$3088.96", "61%"],
                    ["D", "+$634.30", "57%"],
                  ].map(([name, pnl, win]) => (
                    <div key={name} className="flex items-center justify-between rounded-xl border border-slate-500/20 bg-slate-950/60 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500/60 to-cyan-400/40" />
                        <div>
                          <div className="text-sm font-semibold text-slate-100">{name}</div>
                          <div className="text-[11px] text-slate-300 dark:text-slate-400">Win rate {win}</div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-emerald-300">{pnl}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </UiCard>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl py-14">
          <h2 className="text-center text-4xl font-semibold">Plans for Every Trader</h2>
          <div className="mx-auto mt-4 flex max-w-xs rounded-xl border border-slate-300 bg-white/80 p-1 text-sm dark:border-slate-700 dark:bg-slate-900/60">
            <button
              className={`flex-1 rounded-lg px-3 py-2 ${billing === "yearly" ? "bg-blue-500 text-white" : "text-slate-700 dark:text-slate-300"}`}
              onClick={() => setBilling("yearly")}
            >
              Yearly
            </button>
            <button
              className={`flex-1 rounded-lg px-3 py-2 ${billing === "monthly" ? "bg-blue-500 text-white" : "text-slate-700 dark:text-slate-300"}`}
              onClick={() => setBilling("monthly")}
            >
              Monthly
            </button>
          </div>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            {plans.map(([name, price, cycle, desc]) => (
              <UiCard
                key={name}
                className={`rounded-xl border p-6 ${
                  name === "Pro"
                    ? "border-blue-400/40 bg-blue-500/10"
                    : "border-slate-200 bg-white/70 dark:border-slate-500/20 dark:bg-slate-900/40"
                }`}
              >
                <div className="text-sm text-slate-700 dark:text-slate-300">{name}</div>
                <div className="mt-2 text-4xl font-bold">
                  {price}
                  <span className="text-base text-slate-500 dark:text-slate-400"> /{cycle}</span>
                </div>
                <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">{desc}</div>
                <UiButton href={`/app/membership?plan=${name.toLowerCase()}&billing=${billing}`} className="mt-5">
                  Get Started
                </UiButton>
              </UiCard>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl py-8">
          <h2 className="text-center text-3xl font-semibold">How It Works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["1. Capture", "Log each trade with setup, notes, and screenshots."],
              ["2. Analyze", "Review stats, session performance, and behavior patterns."],
              ["3. Improve", "Apply insights and track consistency over time."],
            ].map(([title, desc]) => (
              <UiCard key={title} className="p-5">
                <div className="text-lg font-semibold">{title}</div>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{desc}</p>
              </UiCard>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-6xl py-8">
          <h2 className="text-center text-4xl font-semibold">Frequently Asked Questions</h2>
          <div className="mx-auto mt-8 max-w-4xl space-y-3">
            {faqs.map((item) => {
              const open = openFaq === item.q;
              return (
                <UiCard key={item.q} className="p-4">
                  <button
                    className="flex w-full items-center justify-between text-left"
                    onClick={() => setOpenFaq(open ? null : item.q)}
                  >
                    <span className="font-semibold">{item.q}</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open ? <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{item.a}</p> : null}
                </UiCard>
              );
            })}
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-6xl py-10">
          <UiCard className="grid gap-6 p-6 md:grid-cols-2">
            <div>
              <UiBadge className="mb-4">Get in Touch</UiBadge>
              <h3 className="text-4xl font-bold">Let's Start a Conversation</h3>
              <p className="mt-3 text-slate-700 dark:text-slate-300">Questions about MegaCandle? We'll help you get set up fast.</p>
              <div className="mt-4 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                <p>
                  Phone: <a className="font-semibold hover:underline" href="tel:+918446114469">8446114469</a>
                </p>
                <p>
                  WhatsApp: <a className="font-semibold hover:underline" href="https://wa.me/918446114469" target="_blank" rel="noreferrer">8446114469</a>
                </p>
              </div>
            </div>
            <form className="space-y-3" onSubmit={submitContact}>
              <input
                value={contact.name}
                onChange={(e) => setContact((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 placeholder:text-slate-500 dark:border-slate-400/20 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-400"
                placeholder="Name"
              />
              <input
                value={contact.email}
                onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 placeholder:text-slate-500 dark:border-slate-400/20 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-400"
                placeholder="Email"
              />
              <textarea
                value={contact.message}
                onChange={(e) => setContact((prev) => ({ ...prev, message: e.target.value }))}
                className="h-24 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 placeholder:text-slate-500 dark:border-slate-400/20 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-400"
                placeholder="Message"
              />
              <UiButton className="w-full" type="submit">Send Message</UiButton>
              {contactStatus === "success" ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-300">Message received successfully. We will contact you on your provided details.</p>
              ) : null}
              {contactStatus === "error" ? (
                <p className="text-xs text-rose-600 dark:text-rose-300">Please fill all fields before sending.</p>
              ) : null}
            </form>
          </UiCard>
        </section>

        <section className="mx-auto max-w-6xl py-10">
          <UiCard className="relative overflow-hidden p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.22),transparent_45%)]" />
            <div className="relative flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-3xl font-bold">Stop guessing. Start trading smarter.</div>
                <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  Journal trades, track edge, and improve faster with clean analytics. It’s free to start.
                </div>
              </div>
              <UiButton href="/login" className="px-7 py-3">Get Started for Free</UiButton>
            </div>
          </UiCard>
        </section>

        <footer className="mx-auto mb-6 mt-8 w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-700/60 bg-[#020712]/95 text-slate-200 shadow-2xl shadow-blue-900/20">
          <div className="grid gap-8 px-6 py-8 md:grid-cols-4 md:px-8">
            <div>
              <BrandLogo compact />
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Your trading journal with MT5 sync, backtesting, AI reports, and tools built for traders who care about getting better.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-200">Platform</h4>
              <div className="mt-4 space-y-2 text-sm text-slate-400">
                <a href="#features" className="block transition hover:text-white">Features</a>
                <a href="#how-it-works" className="block transition hover:text-white">How It Works</a>
                <a href="#platform" className="block transition hover:text-white">Platform</a>
                <a href="#pricing" className="block transition hover:text-white">Pricing</a>
                <a href="#faq" className="block transition hover:text-white">FAQ</a>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-200">Company</h4>
              <div className="mt-4 space-y-2 text-sm text-slate-400">
                <a href="#contact" className="block transition hover:text-white">About Us</a>
                <a href="#contact" className="block transition hover:text-white">Careers</a>
                <a href="#contact" className="block transition hover:text-white">Blog</a>
                <a href="#contact" className="block transition hover:text-white">Contact</a>
                <Link to="/privacy" className="block transition hover:text-white">Privacy Policy</Link>
                <Link to="/terms" className="block transition hover:text-white">Terms &amp; Conditions</Link>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-200">Get Started</h4>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Join thousands of traders who are already mastering the markets.
              </p>
              <UiButton href="/login" className="mt-5 rounded-xl px-5 py-2.5">
                Start Journaling
              </UiButton>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-6 py-4 text-xs text-slate-500 md:px-8">
            <span>© 2026 MegaCandle. All rights reserved.</span>
            <span>Built for Traders, by Traders.</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

