import { ArrowDown, ArrowRight, ArrowUpRight, Check, CircleDot, ExternalLink, ShieldCheck } from 'lucide-react'
import './Landing.css'

const deskHref = `${import.meta.env.BASE_URL}?desk=1#trade`

function Brand() {
  return <a className="landing-brand" href={import.meta.env.BASE_URL} aria-label="Order Steward home">
    <span className="landing-brand-mark"><i /></span>
    <span>order<span>steward</span></span>
  </a>
}

function OrderFlowCard() {
  return <div className="flow-card" aria-label="Order workflow overview; no live trade data">
    <div className="flow-card-top"><span className="flow-label"><span className="flow-live-dot" /> ORDER LIFECYCLE</span><span className="flow-context-label">WORKFLOW OVERVIEW</span></div>
    <div className="flow-pair"><span className="flow-token">M</span><div><strong>MON / USDC</strong><small>MARKET SELECTOR</small></div><span className="flow-mainnet">MONAD <b>143</b></span></div>
    <div className="flow-separator" />
    <div className="flow-order-row"><div><span className="flow-label">ORDER INTENT</span><strong>Post-only limit</strong></div><span className="flow-state flow-reviewed"><Check size={13} /> Review step</span></div>
    <div className="flow-line"><i /><i /><i /></div>
    <div className="flow-order-row"><div><span className="flow-label">AFTER SIGNING</span><strong>Receipt → market state</strong></div><span className="flow-state flow-pending"><CircleDot size={13} /> Read back</span></div>
    <div className="flow-note"><ShieldCheck size={15} /><span>Your wallet signs each transaction. The desk reads order state from Kuru on Monad.</span></div>
    <div className="flow-watermark">WORKFLOW OVERVIEW · NO LIVE TRADE DATA</div>
  </div>
}

export default function LandingPage() {
  return <div className="landing-page">
    <header className="landing-header">
      <Brand />
      <nav className="landing-nav" aria-label="Main navigation">
        <a href="#approach">Approach</a>
        <a href="#workflow">How it works</a>
      </nav>
      <a className="landing-header-cta" href={deskHref}>Open spot desk <ArrowUpRight size={15} /></a>
    </header>

    <main>
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow"><span /> NON-CUSTODIAL SPOT ORDER DESK <i>·</i> BUILT ON MONAD</div>
          <h1>An order is more<br />than <em>“submitted.”</em></h1>
          <p className="landing-lede">Order Steward keeps a Kuru limit order’s intent, transaction receipt, and current on-chain state together—even after you reload.</p>
          <div className="landing-actions">
            <a className="landing-primary" href={deskHref}>Open the spot desk <ArrowRight size={16} /></a>
            <a className="landing-secondary" href="#workflow">See how it works <ArrowDown size={15} /></a>
          </div>
          <div className="landing-trust-line"><ShieldCheck size={15} /><span>You control the wallet. Every write asks for your signature.</span></div>
        </div>
        <div className="landing-hero-visual"><OrderFlowCard /><div className="orbit orbit-one" /><div className="orbit orbit-two" /></div>
      </section>

      <section className="landing-signal" aria-label="Product scope">
        <div><span>NETWORK</span><strong>Monad mainnet <i>·</i> chain 143</strong></div>
        <div><span>EXECUTION VENUE</span><strong>Kuru spot order book</strong></div>
        <div><span>ORDER TYPE</span><strong>Post-only limit orders</strong></div>
        <div><span>CONTROL</span><strong>Wallet-signed actions</strong></div>
      </section>

      <section className="landing-approach" id="approach">
        <div className="landing-section-heading"><div className="landing-eyebrow"><span /> THE PROBLEM</div><h2>Signing is a moment.<br /><em>Managing the order is a lifecycle.</em></h2></div>
        <p className="landing-approach-copy">A wallet confirmation alone doesn’t tell you what the market contract currently holds. Order Steward is designed to connect the order you reviewed with its receipt and later contract state, so a refresh doesn’t have to mean starting your investigation over.</p>
      </section>

      <section className="landing-capabilities" aria-label="Product capabilities">
        <article className="capability-card"><span className="capability-index">01</span><div className="capability-icon"><CircleDot size={18} /></div><h3>Review before signing</h3><p>Choose from the supported Kuru market list, inspect its book and margin balances, then review a post-only limit order before signing. MON-USDC is preferred as the initial market when available.</p><span className="capability-foot">MARKET · PRICE · SIZE · MARGIN</span></article>
        <article className="capability-card"><span className="capability-index">02</span><div className="capability-icon"><ShieldCheck size={18} /></div><h3>Check the contract state</h3><p>After submission, the desk uses the transaction receipt and a separate Kuru order read to establish the order’s current state.</p><span className="capability-foot">RECEIPT → EVENT → ORDER READ</span></article>
        <article className="capability-card"><span className="capability-index">03</span><div className="capability-icon"><ArrowDown size={18} /></div><h3>Pick up after refresh</h3><p>Order intent is tracked in this browser and reconciled against on-chain state. It is not a full wallet-wide order history.</p><span className="capability-foot">LOCAL TRACKING · CHAIN STATE WINS</span></article>
      </section>

      <section className="landing-workflow" id="workflow">
        <div className="workflow-intro"><div className="landing-eyebrow"><span /> A DIRECT PATH</div><h2>From market view<br />to verified outcome.</h2><p>One focused workflow. No bots, market orders, custody, or automatic signing.</p><a href={deskHref}>Go to the desk <ArrowRight size={15} /></a></div>
        <ol className="workflow-list">
          <li><span>01</span><div><strong>Connect on Monad</strong><p>Connect an EVM wallet and confirm it is on Monad mainnet.</p></div></li>
          <li><span>02</span><div><strong>Inspect market and margin</strong><p>Read the selected Kuru market, book, wallet balances, and Kuru margin.</p></div></li>
          <li><span>03</span><div><strong>Review and sign</strong><p>If needed, approve and deposit margin, then submit a post-only order through your wallet.</p></div></li>
          <li><span>04</span><div><strong>Reconcile and manage</strong><p>Read the order back, reload to reconcile it, and request cancellation with another wallet confirmation.</p></div></li>
        </ol>
      </section>

      <section className="landing-final-cta">
        <div><div className="landing-eyebrow"><span /> ORDER STEWARD <i>·</i> KURU × MONAD</div><h2>Keep the order.<br /><em>Keep the evidence.</em></h2><p>Open the desk to inspect the live market and connect your wallet.</p></div>
        <a className="landing-primary" href={deskHref}>Open the spot desk <ArrowRight size={16} /></a>
      </section>
      <p className="landing-disclaimer">Mainnet actions can move real assets. Deposits, orders, and cancellations require separate wallet confirmations. Limit orders may fill if market conditions reach their price. Review every transaction in your wallet.</p>
    </main>

    <footer className="landing-footer"><Brand /><span>BUILT FOR ORDER STATE YOU CAN CHECK.</span><div><a href={deskHref}>Spot desk <ExternalLink size={13} /></a><a href="https://docs.kuru.io/contracts/Contract-addresses" target="_blank" rel="noreferrer">Kuru contracts <ExternalLink size={13} /></a></div></footer>
  </div>
}
