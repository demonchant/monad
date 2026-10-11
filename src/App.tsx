import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ArrowDownLeft, ArrowDownUp, ArrowUpRight, ArrowUpRightFromSquare, CircleAlert, CircleCheck,
  Clock3, ExternalLink, LoaderCircle, LockKeyhole, Menu, Plus, RefreshCw, ShieldCheck, Wallet, X,
  ChevronDown,
} from 'lucide-react'
import {
  decodeEventLog, formatUnits, getAddress, isAddress, isHash, parseUnits, type Address, type Hash,
  type WalletClient,
} from 'viem'
import {
  erc20Abi, explorerAddress, explorerTx, fetchBook, fetchMarkets, fetchMarketParams,
  assertMonadRpc, KURU_MON_USDC_MARKET, marginAbi, makeWalletClient, MONAD_CHAIN_ID, orderBookAbi, publicClient, readMarginAddress,
  ZERO_ADDRESS, decimalPlaces, type Book, type Market, type MarketParams,
} from './lib/kuru'
import { loadOrders, readOrder, reconcileOrders, saveOrders, type OrderStatus, type TrackedOrder } from './lib/orders'
import LandingPage from './Landing'
import './App.css'

type Toast = { kind: 'success' | 'error' | 'info'; message: string; hash?: Hash; approvalHash?: Hash }
type BalanceState = { walletBase: bigint; walletQuote: bigint; marginBase: bigint; marginQuote: bigint; native: bigint }
type PendingPlace = {
  hash: Hash; market: Address; pair: string; account: Address; side: 'buy' | 'sell'; priceRaw: string; sizeRaw: string
  priceDecimals: number; sizeDecimals: number; priceLabel: string; sizeLabel: string; createdAt: number
}
const PENDING_PREFIX = 'order-steward:pending:143:'
const emptyBalances: BalanceState = { walletBase: 0n, walletQuote: 0n, marginBase: 0n, marginQuote: 0n, native: 0n }
function isPendingPlace(value: unknown): value is PendingPlace {
  if (!value || typeof value !== 'object') return false
  const pending = value as Partial<PendingPlace>
  return typeof pending.hash === 'string' && isHash(pending.hash) && typeof pending.market === 'string' && isAddress(pending.market) &&
    typeof pending.account === 'string' && isAddress(pending.account) && typeof pending.pair === 'string' &&
    (pending.side === 'buy' || pending.side === 'sell') && /^\d+$/.test(pending.priceRaw ?? '') && /^\d+$/.test(pending.sizeRaw ?? '') &&
    Number.isSafeInteger(pending.priceDecimals) && Number.isSafeInteger(pending.sizeDecimals) && typeof pending.priceLabel === 'string' &&
    typeof pending.sizeLabel === 'string' && Number.isSafeInteger(pending.createdAt)
}

function fmt(value: bigint | undefined, decimals: number, places = 5) {
  if (value === undefined) return '—'
  const n = Number(formatUnits(value, decimals))
  return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: places }) : '—'
}
function fmtNum(value: number | string | null | undefined, places = 5) {
  if (value === null || value === undefined || value === '') return '—'
  const n = Number(value)
  return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: places }) : '—'
}
function timeAgo(timestamp: number, now: number) {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000))
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}
function marketPair(market: Market) { return `${market.baseSymbol} / ${market.quoteSymbol}` }
function parseTransactionEvent(receipt: { logs: readonly { address: string; data: Hash; topics: readonly Hash[] }[] }, market: Address, account: Address) {
  const created: { id: string; size: string; price: string; isBuy: boolean }[] = []
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== market.toLowerCase()) continue
    try {
      const topics = [...log.topics] as [Hash, ...Hash[]]
      const event = decodeEventLog({ abi: orderBookAbi, data: log.data, topics, strict: false })
      if (event.eventName !== 'OrderCreated') continue
      const args = event.args as unknown as { orderId: number; owner: Address; size: bigint; price: number; isBuy: boolean }
      if (args.owner.toLowerCase() === account.toLowerCase()) created.push({ id: String(args.orderId), size: args.size.toString(), price: String(args.price), isBuy: args.isBuy })
    } catch { /* An unrelated log or different ABI event is not evidence. */ }
  }
  return created
}
function statusLabel(status: OrderStatus) {
  switch (status) {
    case 'open': return 'Open'
    case 'partial': return 'Partially filled'
    case 'filled': return 'Filled'
    case 'cancelled': return 'Cancelled'
    case 'partial-cancelled': return 'Cancelled · part-filled'
    case 'closed-unknown': return 'Closed · reason unconfirmed'
    case 'pending': return 'Cancel pending'
    default: return 'Could not verify'
  }
}
function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={`status-pill status-${status}`}><i />{statusLabel(status)}</span>
}

function TradingDesk() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [marketsState, setMarketsState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [marketError, setMarketError] = useState('')
  const [marketProgress, setMarketProgress] = useState({ scanned: 0, found: 0 })
  const [selectedMarketAddress, setSelectedMarketAddress] = useState('')
  const [marketMenuOpen, setMarketMenuOpen] = useState(false)
  const [marketQuery, setMarketQuery] = useState('')
  const [marketListLimit, setMarketListLimit] = useState(80)
  const [marketParamsState, setMarketParamsState] = useState<MarketParams | null>(null)
  const [paramsMarketAddress, setParamsMarketAddress] = useState('')
  const [paramsError, setParamsError] = useState('')
  const [paramsErrorAddress, setParamsErrorAddress] = useState('')
  const [bookData, setBookData] = useState<Book | null>(null)
  const [bookMarketAddress, setBookMarketAddress] = useState('')
  const [bookStatusAddress, setBookStatusAddress] = useState('')
  const [bookState, setBookState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [bookError, setBookError] = useState('')
  const [bookUpdated, setBookUpdated] = useState(0)
  const [account, setAccount] = useState<Address | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [rpcState, setRpcState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [rpcError, setRpcError] = useState('')
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null)
  const [walletBusy, setWalletBusy] = useState(false)
  const [marginAddress, setMarginAddress] = useState<Address | null>(null)
  const [marginAddressError, setMarginAddressError] = useState('')
  const [balances, setBalances] = useState<BalanceState>(emptyBalances)
  const [balanceScope, setBalanceScope] = useState('')
  const [balanceState, setBalanceState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [balanceError, setBalanceError] = useState('')
  const [balanceErrorScope, setBalanceErrorScope] = useState('')
  const [balanceUpdated, setBalanceUpdated] = useState(0)
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [priceInput, setPriceInput] = useState('')
  const [sizeInput, setSizeInput] = useState('')
  const [orders, setOrders] = useState<TrackedOrder[]>([])
  const [ordersState, setOrdersState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [ordersError, setOrdersError] = useState('')
  const [orderFilter, setOrderFilter] = useState<'open' | 'all'>('open')
  const [storageReady, setStorageReady] = useState(false)
  const [storageError, setStorageError] = useState('')
  const [actionBusy, setActionBusy] = useState('')
  const [pendingPlace, setPendingPlace] = useState<PendingPlace | null>(null)
  const [pendingCheck, setPendingCheck] = useState<'loading' | 'ready' | 'pending' | 'market'>('loading')
  const [clockNow, setClockNow] = useState(() => Date.now())
  const [toast, setToast] = useState<Toast | null>(null)
  const [depositTarget, setDepositTarget] = useState<'base' | 'quote' | null>(null)
  const [depositInput, setDepositInput] = useState('')
  const [depositStage, setDepositStage] = useState('')
  const [depositApprovalHash, setDepositApprovalHash] = useState<Hash | null>(null)
  const [depositTxHash, setDepositTxHash] = useState<Hash | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const toastTimer = useRef<number | undefined>(undefined)
  const marketRequest = useRef<AbortController | null>(null)

  const selectedMarket = useMemo(() => markets.find((m) => m.address.toLowerCase() === selectedMarketAddress.toLowerCase()) ?? null, [markets, selectedMarketAddress])
  const matchingMarkets = useMemo(() => {
    const query = marketQuery.trim().toLowerCase()
    if (!query) return markets
    return markets.filter((market) => `${marketPair(market)} ${market.baseName} ${market.quoteName} ${market.address} ${market.baseAddress} ${market.quoteAddress}`.toLowerCase().includes(query))
  }, [markets, marketQuery])
  const shownMarkets = matchingMarkets.slice(0, marketListLimit)
  const marketAddress = selectedMarket?.address
  const marketParams = paramsMarketAddress === selectedMarketAddress ? marketParamsState : null
  const book = bookMarketAddress === selectedMarketAddress ? bookData : null
  const currentBookState = bookStatusAddress === selectedMarketAddress ? bookState : 'loading'
  const currentBookError = currentBookState === 'error' ? bookError : ''
  const currentParamsError = paramsErrorAddress === selectedMarketAddress ? paramsError : ''
  const visibleBookUpdated = book ? bookUpdated : 0
  const connected = !!account
  const onMonad = chainId === MONAD_CHAIN_ID
  const selectedBalanceScope = account && selectedMarket ? `${account.toLowerCase()}:${selectedMarket.address.toLowerCase()}` : ''
  const balanceReadReady = !!selectedBalanceScope && balanceScope === selectedBalanceScope && balanceState === 'ready'

  const loadMarkets = useCallback(async () => {
    marketRequest.current?.abort()
    const controller = new AbortController()
    marketRequest.current = controller
    setMarketsState('loading')
    setMarketError('')
    setMarketProgress({ scanned: 0, found: 0 })
    try {
      const next = await fetchMarkets(controller.signal, (scanned, found) => setMarketProgress({ scanned, found }))
      if (controller.signal.aborted) return
      setMarkets(next)
      setMarketsState('ready')
      setMarketError('')
      setSelectedMarketAddress((current) => next.some((market) => market.address.toLowerCase() === current.toLowerCase()) ? current :
        (next.find((market) => market.address.toLowerCase() === KURU_MON_USDC_MARKET.toLowerCase()) ?? next.find((market) => market.baseSymbol === 'MON' && market.quoteSymbol === 'USDC') ?? next[0])?.address ?? '')
    } catch (error) {
      if (controller.signal.aborted) return
      setMarketsState('error')
      setMarketError(error instanceof Error ? error.message : 'Kuru market directory could not be read.')
    }
  }, [])
  const currentBalances = balanceScope === selectedBalanceScope && selectedBalanceScope ? balances : emptyBalances
  const currentBalanceError = balanceErrorScope === selectedBalanceScope ? balanceError : ''
  const bookAge = bookUpdated ? clockNow - bookUpdated : Number.POSITIVE_INFINITY
  const bookFresh = !!book && currentBookState === 'ready' && bookAge < 15_000
  const bestBid = book?.bids?.length ? Math.max(...book.bids.map(([price]) => price)) : null
  const bestAsk = book?.asks?.length ? Math.min(...book.asks.map(([price]) => price)) : null
  const priceDecimals = marketParams ? decimalPlaces(marketParams.pricePrecision) : 0
  const sizeDecimals = marketParams ? decimalPlaces(marketParams.sizePrecision) : 0
  const inputPriceRaw = useMemo(() => { if (!priceInput || !marketParams) return null; try { return parseUnits(priceInput, priceDecimals) } catch { return null } }, [priceInput, marketParams, priceDecimals])
  const inputSizeRaw = useMemo(() => { if (!sizeInput || !marketParams) return null; try { return parseUnits(sizeInput, sizeDecimals) } catch { return null } }, [sizeInput, marketParams, sizeDecimals])
  const bestAskRaw = useMemo(() => { if (bestAsk === null) return null; try { return parseUnits(String(bestAsk), priceDecimals) } catch { return null } }, [bestAsk, priceDecimals])
  const bestBidRaw = useMemo(() => { if (bestBid === null) return null; try { return parseUnits(String(bestBid), priceDecimals) } catch { return null } }, [bestBid, priceDecimals])
  const marketable = side === 'buy' ? bestAsk !== null && (bestAskRaw === null || (inputPriceRaw !== null && inputPriceRaw >= bestAskRaw)) : bestBid !== null && (bestBidRaw === null || (inputPriceRaw !== null && inputPriceRaw <= bestBidRaw))
  const wrongMarketParams = !!(selectedMarket && marketParams && (selectedMarket.baseAddress.toLowerCase() !== marketParams.baseAddress.toLowerCase() || selectedMarket.quoteAddress.toLowerCase() !== marketParams.quoteAddress.toLowerCase() || selectedMarket.baseDecimals !== marketParams.baseDecimals || selectedMarket.quoteDecimals !== marketParams.quoteDecimals))
  let estimateRaw: bigint | null = null
  let estimateToken: 'base' | 'quote' | null = null
  if (marketParams && inputPriceRaw !== null && inputSizeRaw !== null && inputPriceRaw > 0n && inputSizeRaw > 0n) {
    if (side === 'buy') {
      const numerator = inputPriceRaw * inputSizeRaw * (10n ** BigInt(marketParams.quoteDecimals))
      const scale = marketParams.pricePrecision * marketParams.sizePrecision
      estimateRaw = (numerator * (10_000n + marketParams.makerFeeBps) + scale * 10_000n - 1n) / (scale * 10_000n)
      estimateToken = 'quote'
    } else { estimateRaw = inputSizeRaw; estimateToken = 'base' }
  }
  const availableMargin = estimateToken === 'base' ? currentBalances.marginBase : currentBalances.marginQuote
  const marginSufficient = estimateRaw === null || estimateRaw <= availableMargin
  const validInputs = !!(marketParams && inputPriceRaw && inputSizeRaw && inputPriceRaw > 0n && inputPriceRaw <= 0xffff_ffffn && inputSizeRaw > 0n && inputSizeRaw >= marketParams.minSize && inputSizeRaw <= marketParams.maxSize && inputPriceRaw % BigInt(marketParams.tickSize) === 0n)
  const unverifiedCurrentOrder = !!(account && selectedMarket && orders.some((order) => order.account.toLowerCase() === account.toLowerCase() && order.market.toLowerCase() === selectedMarket.address.toLowerCase() && order.status === 'unverified'))
  const canTrade = !!(account && onMonad && rpcState === 'ready' && walletClient && storageReady && marginAddress && selectedMarket && marketParams && balanceReadReady && !wrongMarketParams && !currentParamsError && bookFresh && validInputs && !marketable && marginSufficient && !actionBusy && pendingCheck === 'ready' && !pendingPlace && !unverifiedCurrentOrder)

  const setNotice = useCallback((next: Toast) => {
    setToast(next)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), next.kind === 'error' ? 8_000 : 5_000)
  }, [])

  const checkRpc = useCallback(async (force = true) => {
    if (force) { setRpcState('loading'); setRpcError('') }
    try { await assertMonadRpc(); setRpcState('ready') }
    catch (error) { setRpcState('error'); setRpcError(error instanceof Error ? error.message : 'Configured RPC could not verify Monad mainnet.') }
  }, [])

  useEffect(() => {
    try { const key = 'order-steward:storage-check'; localStorage.setItem(key, '1'); localStorage.removeItem(key); setStorageReady(true) }
    catch { setStorageError('This browser blocks local storage. Order tracking cannot survive reload, so order placement is disabled.') }
    return () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    void checkRpc()
    const timer = window.setInterval(() => void checkRpc(false), 30_000)
    return () => window.clearInterval(timer)
  }, [checkRpc])

  useEffect(() => {
    void loadMarkets()
    return () => marketRequest.current?.abort()
  }, [loadMarkets])

  useEffect(() => {
    let active = true
    if (rpcState !== 'ready' || !marketAddress) return
    fetchMarketParams(marketAddress).then((params) => { if (active) { setMarketParamsState(params); setParamsMarketAddress(marketAddress); setParamsError(''); setParamsErrorAddress('') } })
      .catch((error: unknown) => { if (active) { setParamsError(error instanceof Error ? error.message : 'Market parameters could not be read from Monad.'); setParamsErrorAddress(marketAddress) } })
    return () => { active = false }
  }, [marketAddress, rpcState])

  const refreshBook = useCallback(async () => {
    if (!marketAddress) return
    try { const current = await fetchBook(marketAddress); setBookData(current); setBookMarketAddress(marketAddress); setBookStatusAddress(marketAddress); setBookUpdated(Date.now()); setBookState('ready'); setBookError('') }
    catch (error) { setBookStatusAddress(marketAddress); setBookState('error'); setBookError(error instanceof Error ? error.message : 'The live order book could not be read.') }
  }, [marketAddress])
  useEffect(() => {
    if (!marketAddress) return
    void refreshBook()
    const timer = window.setInterval(() => void refreshBook(), 5_000)
    return () => window.clearInterval(timer)
  }, [refreshBook, marketAddress])

  useEffect(() => {
    let active = true
    if (rpcState !== 'ready') return
    readMarginAddress().then((address) => { if (active) { setMarginAddress(address); setMarginAddressError('') } })
      .catch((error: unknown) => { if (active) setMarginAddressError(error instanceof Error ? error.message : 'Kuru margin account could not be verified.') })
    return () => { active = false }
  }, [rpcState])

  const updateAccount = useCallback((nextAccount: string | null, nextChain?: number | null) => {
    if (!nextAccount || !isAddress(nextAccount)) {
      setAccount(null); setChainId(nextChain ?? null); setWalletClient(null); setBalances(emptyBalances); setBalanceScope(''); setBalanceErrorScope(''); setBalanceState('idle'); setOrders([]); setOrdersState('idle'); setDepositTarget(null); setPendingPlace(null); setPendingCheck('loading'); return
    }
    setAccount(getAddress(nextAccount)); setOrders(loadOrders(getAddress(nextAccount))); setPendingPlace(null); setPendingCheck('loading'); if (nextChain !== undefined) setChainId(nextChain)
    if (window.ethereum) setWalletClient(makeWalletClient(window.ethereum))
  }, [])
  useEffect(() => {
    const provider = window.ethereum
    if (!provider?.on) return
    const onAccounts = (value: unknown) => {
      const list = Array.isArray(value) ? value : []
      void provider.request({ method: 'eth_chainId' }).then((id) => updateAccount(typeof list[0] === 'string' ? list[0] : null, Number(id))).catch(() => updateAccount(null))
    }
    const onChain = (value: unknown) => { const id = typeof value === 'string' ? Number(value) : null; setChainId(id); if (id !== MONAD_CHAIN_ID) { setBalances(emptyBalances); setBalanceScope(''); setBalanceErrorScope(''); setBalanceState('idle'); setDepositTarget(null) } }
    provider.on('accountsChanged', onAccounts); provider.on('chainChanged', onChain)
    return () => { provider.removeListener?.('accountsChanged', onAccounts); provider.removeListener?.('chainChanged', onChain) }
  }, [updateAccount])

  const connectWallet = async () => {
    if (!window.ethereum) { setNotice({ kind: 'error', message: 'No injected wallet found. Install a compatible EVM wallet, then reload.' }); return }
    setWalletBusy(true)
    try {
      const client = makeWalletClient(window.ethereum); const addresses = await client.requestAddresses(); const chain = await client.getChainId()
      if (!addresses.length) throw new Error('The wallet did not return an account.')
      setWalletClient(client); setAccount(addresses[0]); setOrders(loadOrders(addresses[0])); setPendingPlace(null); setPendingCheck('loading'); setChainId(chain)
      setNotice({ kind: 'success', message: `Connected ${addresses[0].slice(0, 6)}…${addresses[0].slice(-4)}.` })
    } catch (error) { setNotice({ kind: 'error', message: error instanceof Error ? error.message : 'Wallet connection was rejected.' }) }
    finally { setWalletBusy(false) }
  }
  const switchNetwork = async () => {
    if (!window.ethereum) return
    setWalletBusy(true)
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x8f' }] }); setChainId(MONAD_CHAIN_ID)
    } catch (error) {
      if ((error as { code?: number })?.code === 4902) {
        try { await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0x8f', chainName: 'Monad', nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 }, rpcUrls: [import.meta.env.VITE_MONAD_RPC_URL || 'https://rpc.monad.xyz'], blockExplorerUrls: ['https://monadscan.com'] }] }); setChainId(MONAD_CHAIN_ID) }
        catch (addError) { setNotice({ kind: 'error', message: addError instanceof Error ? addError.message : 'Adding Monad was rejected.' }) }
      } else setNotice({ kind: 'error', message: error instanceof Error ? error.message : 'Network switch was rejected.' })
    } finally { setWalletBusy(false) }
  }

  const refreshBalances = useCallback(async () => {
    if (!account || !onMonad || rpcState !== 'ready' || !marketAddress || !marketParams || !marginAddress) return
    setBalanceState('loading'); setBalanceError(''); setBalanceErrorScope('')
    try {
      const [walletBase, walletQuote, marginBase, marginQuote, native] = await Promise.all([
        marketParams.baseAddress === ZERO_ADDRESS ? publicClient.getBalance({ address: account }) : publicClient.readContract({ address: marketParams.baseAddress, abi: erc20Abi, functionName: 'balanceOf', args: [account] }),
        marketParams.quoteAddress === ZERO_ADDRESS ? publicClient.getBalance({ address: account }) : publicClient.readContract({ address: marketParams.quoteAddress, abi: erc20Abi, functionName: 'balanceOf', args: [account] }),
        publicClient.readContract({ address: marginAddress, abi: marginAbi, functionName: 'getBalance', args: [account, marketParams.baseAddress] }),
        publicClient.readContract({ address: marginAddress, abi: marginAbi, functionName: 'getBalance', args: [account, marketParams.quoteAddress] }),
        publicClient.getBalance({ address: account }),
      ])
      setBalances({ walletBase, walletQuote, marginBase, marginQuote, native }); setBalanceScope(`${account.toLowerCase()}:${marketAddress.toLowerCase()}`); setBalanceUpdated(Date.now()); setBalanceState('ready')
    } catch (error) { setBalanceState('error'); setBalanceError(error instanceof Error ? error.message : 'Wallet and margin balances could not be read.'); setBalanceErrorScope(`${account.toLowerCase()}:${marketAddress.toLowerCase()}`) }
  }, [account, onMonad, rpcState, marketAddress, marketParams, marginAddress])
  useEffect(() => { void refreshBalances() }, [refreshBalances])

  const refreshOrders = useCallback(async () => {
    if (!account || !onMonad) return
    if (rpcState !== 'ready') { setOrdersState('error'); setOrdersError(rpcError || 'Waiting to verify Monad RPC.'); return }
    setOrdersState('loading'); setOrdersError('')
    try { const reconciled = await reconcileOrders(loadOrders(account)); saveOrders(account, reconciled); setOrders(reconciled); setOrdersState('ready') }
    catch (error) { setOrdersState('error'); setOrdersError(error instanceof Error ? error.message : 'Tracked orders could not be reconciled.') }
  }, [account, onMonad, rpcState, rpcError])
  useEffect(() => {
    if (!account || !onMonad) { setOrdersState('idle'); return }
    void refreshOrders()
    const timer = window.setInterval(() => void refreshOrders(), 30_000)
    return () => window.clearInterval(timer)
  }, [account, onMonad, refreshOrders])

  const addOrders = useCallback((next: TrackedOrder[], notice?: Toast) => {
    const orderAccount = next[0]?.account
    if (!orderAccount) return
    const merged = [...next, ...loadOrders(orderAccount).filter((old) => !next.some((item) => item.key === old.key))].sort((a, b) => b.createdAt - a.createdAt)
    try { saveOrders(orderAccount, merged); setStorageReady(true); setStorageError('') }
    catch { setStorageReady(false); setStorageError('Order was mined, but this browser could not save its tracking record. Copy the receipt before leaving this page.') }
    if (account?.toLowerCase() === orderAccount.toLowerCase()) setOrders(merged)
    if (notice) setNotice(notice)
  }, [account, setNotice])

  const recoverPending = useCallback(async () => {
    if (!account || !onMonad || !marketAddress || !storageReady || rpcState !== 'ready') return
    const key = `${PENDING_PREFIX}${account.toLowerCase()}`
    let pending: PendingPlace | null
    try {
      const raw = localStorage.getItem(key)
      const saved: unknown = raw === null ? null : JSON.parse(raw)
      if (raw !== null && (!isPendingPlace(saved) || saved.account.toLowerCase() !== account.toLowerCase())) {
        setPendingPlace(null); setPendingCheck('pending'); setNotice({ kind: 'error', message: 'Saved order recovery data is unreadable. Trading stays locked until you verify the wallet transaction history.' }); return
      }
      pending = saved === null ? null : saved as PendingPlace
    } catch { setPendingCheck('pending'); setNotice({ kind: 'error', message: 'Saved order recovery data could not be read. Trading stays locked until you verify the wallet transaction history.' }); return }
    if (!pending) { setPendingPlace(null); setPendingCheck('ready'); return }
    setPendingPlace(pending)
    if (pending.market.toLowerCase() !== marketAddress.toLowerCase()) { setPendingCheck('market'); return }
    setPendingCheck('pending')
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: pending.hash })
      if (receipt.status !== 'success') { localStorage.removeItem(key); setPendingPlace(null); setPendingCheck('ready'); setNotice({ kind: 'error', message: 'The saved order transaction reverted. No order was recorded.', hash: pending.hash }); return }
      const found = parseTransactionEvent(receipt, pending.market, account)
      if (!found.length) { setPendingPlace(pending); setPendingCheck('pending'); setNotice({ kind: 'info', message: 'Transaction mined, but no matching Kuru order event was found. Order remains unverified.', hash: pending.hash }); return }
      const recovered: TrackedOrder[] = []
      for (const event of found) {
        const state = await readOrder(pending.market, event.id, account)
        const verified = state.owned && state.price === Number(event.price) && state.isBuy === event.isBuy && state.remaining <= BigInt(event.size)
        recovered.push({ key: `${pending.market.toLowerCase()}:${event.id}`, chainId: MONAD_CHAIN_ID, account, market: pending.market, pair: pending.pair,
          orderId: event.id, side: event.isBuy ? 'buy' : 'sell', priceRaw: event.price, initialSizeRaw: event.size, remainingSizeRaw: state.remaining.toString(),
          priceDecimals: pending.priceDecimals, sizeDecimals: pending.sizeDecimals, sizeLabel: pending.sizeLabel, priceLabel: pending.priceLabel,
          createdAt: pending.createdAt, createdBlock: Number(receipt.blockNumber), transactionHash: pending.hash,
          status: !verified ? 'unverified' : state.remaining === 0n ? 'closed-unknown' : state.remaining < BigInt(event.size) ? 'partial' : 'open', lastScannedBlock: Number(receipt.blockNumber), historyComplete: true, observedAt: Date.now() })
      }
      localStorage.removeItem(key); setPendingPlace(null); setPendingCheck('ready')
      addOrders(recovered, { kind: 'success', message: `Recovered ${recovered.length} mined Kuru order${recovered.length === 1 ? '' : 's'} from the saved receipt.`, hash: pending.hash })
    } catch { setPendingPlace(pending); setPendingCheck('pending') }
  }, [account, onMonad, marketAddress, storageReady, rpcState, addOrders, setNotice])
  useEffect(() => { void recoverPending() }, [recoverPending])

  const currentAsset = depositTarget === 'base' ? {
    address: marketParams?.baseAddress, symbol: selectedMarket?.baseSymbol ?? 'base token', decimals: marketParams?.baseDecimals, wallet: currentBalances.walletBase, margin: currentBalances.marginBase,
  } : {
    address: marketParams?.quoteAddress, symbol: selectedMarket?.quoteSymbol ?? 'quote token', decimals: marketParams?.quoteDecimals, wallet: currentBalances.walletQuote, margin: currentBalances.marginQuote,
  }
  const approvalStepActive = depositStage.toLowerCase().includes('approval')
  const depositStepActive = actionBusy === 'deposit' && currentAsset.address !== ZERO_ADDRESS && !approvalStepActive

  const openDeposit = (target: 'base' | 'quote') => { setDepositTarget(target); setDepositInput(''); setDepositStage(''); setDepositApprovalHash(null); setDepositTxHash(null) }
  const closeDeposit = () => { setDepositTarget(null); setDepositStage(''); setDepositApprovalHash(null); setDepositTxHash(null) }

  const handleDeposit = async (event: FormEvent) => {
    event.preventDefault()
    if (!account || !walletClient || rpcState !== 'ready' || !marginAddress || !balanceReadReady || !currentAsset.address || currentAsset.decimals === undefined) return
    let amount: bigint
    try { amount = parseUnits(depositInput, currentAsset.decimals) } catch { setDepositStage('Enter a positive amount with no more decimal places than the token supports.'); return }
    if (amount <= 0n) { setDepositStage('Enter an amount greater than zero.'); return }
    if (currentAsset.wallet !== undefined && amount > currentAsset.wallet) { setDepositStage('The amount exceeds the wallet token balance.'); return }
    setActionBusy('deposit'); setDepositStage('Checking token approval…')
    let approvalHash: Hash | undefined
    let depositHash: Hash | undefined
    setDepositApprovalHash(null); setDepositTxHash(null)
    try {
      if (currentAsset.address !== ZERO_ADDRESS) {
        const allowance = await publicClient.readContract({ address: currentAsset.address, abi: erc20Abi, functionName: 'allowance', args: [account, marginAddress] })
        if (allowance < amount) {
          setDepositStage('Approve exact amount in wallet…')
          const { request } = await publicClient.simulateContract({ address: currentAsset.address, abi: erc20Abi, functionName: 'approve', args: [marginAddress, amount], account })
          const approveHash = await walletClient.writeContract(request)
          approvalHash = approveHash
          setDepositApprovalHash(approveHash)
          setDepositStage(`Waiting for approval ${approveHash.slice(0, 10)}…`)
          const approval = await publicClient.waitForTransactionReceipt({ hash: approveHash })
          if (approval.status !== 'success') throw new Error('Token approval reverted. The margin deposit was not attempted.')
          const updatedAllowance = await publicClient.readContract({ address: currentAsset.address, abi: erc20Abi, functionName: 'allowance', args: [account, marginAddress] })
          if (updatedAllowance < amount) throw new Error('Approval receipt mined, but allowance read-back is below the deposit amount.')
        }
      }
      setDepositStage('Review the margin deposit in your wallet…')
      const { request } = await publicClient.simulateContract({ address: marginAddress, abi: marginAbi, functionName: 'deposit', args: [account, currentAsset.address, amount], account,
        ...(currentAsset.address === ZERO_ADDRESS ? { value: amount } : {}) })
      const hash = await walletClient.writeContract(request)
      depositHash = hash; setDepositTxHash(hash)
      setNotice({ kind: 'info', message: 'Margin deposit submitted. Waiting for receipt and balance read-back.', hash })
      setDepositStage(`Waiting for deposit ${hash.slice(0, 10)}…`)
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      if (receipt.status !== 'success') throw new Error('Deposit transaction reverted.')
      const updatedMargin = await publicClient.readContract({ address: marginAddress, abi: marginAbi, functionName: 'getBalance', args: [account, currentAsset.address] })
      const before = currentAsset.margin ?? 0n
      if (updatedMargin <= before) throw new Error('Deposit receipt mined, but Kuru margin balance did not increase on read-back.')
      setDepositTarget(null); setDepositInput(''); setDepositStage('')
      setNotice({ kind: 'success', message: `${fmt(updatedMargin - before, currentAsset.decimals)} ${currentAsset.symbol} deposit verified in Kuru margin.`, hash, approvalHash })
      await refreshBalances()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Deposit did not complete.'
      setDepositStage(message); setNotice({ kind: 'error', message, hash: depositHash, approvalHash })
    } finally { setActionBusy('') }
  }

  const submitOrder = async (event: FormEvent) => {
    event.preventDefault()
    if (!canTrade || !account || !walletClient || rpcState !== 'ready' || !selectedMarket || !marketParams || !inputPriceRaw || !inputSizeRaw) return
    if (!bookFresh) { setNotice({ kind: 'error', message: 'A fresh Kuru book read is required before placing a post-only order.' }); return }
    if (marketable) { setNotice({ kind: 'error', message: 'This price would take current liquidity. Choose a price that rests on the book.' }); return }
    setActionBusy('place')
    let submittedPending: PendingPlace | null = null
    try {
      const functionName = side === 'buy' ? 'addBuyOrder' : 'addSellOrder'
      const args = [Number(inputPriceRaw), inputSizeRaw, true] as const
      setNotice({ kind: 'info', message: 'Check the Kuru order details in your wallet and approve only if they match.' })
      const simulation = await publicClient.simulateContract({ address: selectedMarket.address, abi: orderBookAbi, functionName, args, account })
      const hash = await walletClient.writeContract(simulation.request)
      const pending: PendingPlace = { hash, market: selectedMarket.address, pair: marketPair(selectedMarket), account, side,
        priceRaw: inputPriceRaw.toString(), sizeRaw: inputSizeRaw.toString(), priceDecimals, sizeDecimals, priceLabel: priceInput, sizeLabel: sizeInput, createdAt: Date.now() }
      submittedPending = pending
      setPendingPlace(pending)
      if (storageReady) localStorage.setItem(`${PENDING_PREFIX}${account.toLowerCase()}`, JSON.stringify(pending))
      setNotice({ kind: 'info', message: 'Transaction submitted. Waiting for Monad receipt…', hash })
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      if (receipt.status !== 'success') {
        if (storageReady) localStorage.removeItem(`${PENDING_PREFIX}${account.toLowerCase()}`)
        submittedPending = null; setPendingPlace(null); throw new Error('Kuru order transaction reverted. No order was created.')
      }
      const events = parseTransactionEvent(receipt, selectedMarket.address, account)
      if (!events.length) { setNotice({ kind: 'error', message: 'Transaction mined, but no matching Kuru OrderCreated event was found. Order remains unverified.', hash }); return }
      const created: TrackedOrder[] = []
      for (const ev of events) {
        const actual = await readOrder(selectedMarket.address, ev.id, account)
        const verified = actual.owned && String(actual.price) === ev.price && actual.isBuy === ev.isBuy && actual.remaining <= BigInt(ev.size)
        created.push({ key: `${selectedMarket.address.toLowerCase()}:${ev.id}`, chainId: MONAD_CHAIN_ID, account, market: selectedMarket.address, pair: marketPair(selectedMarket),
          orderId: ev.id, side: ev.isBuy ? 'buy' : 'sell', priceRaw: ev.price, initialSizeRaw: ev.size, remainingSizeRaw: actual.remaining.toString(),
          priceDecimals, sizeDecimals, priceLabel: priceInput, sizeLabel: sizeInput, createdAt: Date.now(), createdBlock: Number(receipt.blockNumber), transactionHash: hash,
          status: !verified ? 'unverified' : actual.remaining === 0n ? 'closed-unknown' : actual.remaining < BigInt(ev.size) ? 'partial' : 'open', lastScannedBlock: Number(receipt.blockNumber), historyComplete: true, observedAt: Date.now() })
      }
      if (storageReady) localStorage.removeItem(`${PENDING_PREFIX}${account.toLowerCase()}`)
      setPendingPlace(null)
      const verifiedAll = created.every((order) => order.status !== 'unverified')
      addOrders(created, { kind: verifiedAll ? 'success' : 'error', message: verifiedAll ? `Kuru order ${created[0].orderId} receipt and current contract state verified.` : 'Order receipt was mined, but the on-chain owner/price/side/size check did not pass.', hash })
      setPriceInput(''); setSizeInput(''); await refreshBalances()
    } catch (error) {
      const e = error as { name?: string; message?: string; cause?: { shortMessage?: string } }
      const rejected = e.name === 'UserRejectedRequestError' || /user rejected|rejected the request/i.test(e.message ?? '')
      if (submittedPending) {
        setPendingPlace(submittedPending)
        try { if (storageReady) localStorage.setItem(`${PENDING_PREFIX}${submittedPending.account.toLowerCase()}`, JSON.stringify(submittedPending)) } catch { /* Preserve the in-memory transaction hash for this session. */ }
        setNotice({ kind: 'error', message: 'Transaction was submitted, but confirmation or read-back failed. Its saved hash is available for receipt recovery.', hash: submittedPending.hash })
      } else {
        setNotice({ kind: 'error', message: rejected ? 'Signature rejected in wallet. No order was submitted.' : e.cause?.shortMessage || e.message || 'Order transaction failed.' })
      }
    } finally { setActionBusy('') }
  }

  const cancelOrder = async (order: TrackedOrder) => {
    if (!account || account.toLowerCase() !== order.account.toLowerCase() || order.pendingCancelHash || !storageReady || !walletClient || !onMonad || rpcState !== 'ready' || actionBusy) return
    setActionBusy(`cancel:${order.key}`)
    let submittedCancelHash: Hash | null = null
    try {
      const fresh = await readOrder(order.market, order.orderId, account)
      if (!fresh.owned) throw new Error('On-chain owner does not match this wallet; cancellation is disabled.')
      if (fresh.remaining === 0n) { await refreshOrders(); setNotice({ kind: 'info', message: 'This order is already closed. Its on-chain state was refreshed.' }); return }
      const hadPartialFill = fresh.remaining < BigInt(order.initialSizeRaw)
      const id = Number(order.orderId)
      if (!Number.isSafeInteger(id) || id < 0 || BigInt(id) !== BigInt(order.orderId)) throw new Error('Stored Kuru order ID is outside the safe uint40 range.')
      const { request } = await publicClient.simulateContract({ address: order.market, abi: orderBookAbi, functionName: 'batchCancelOrders', args: [[id]], account })
      setNotice({ kind: 'info', message: `Review cancellation for ${order.pair} order ${order.orderId} in your wallet.` })
      const hash = await walletClient.writeContract(request)
      submittedCancelHash = hash
      addOrders([{ ...order, status: 'pending', cancelTransactionHash: hash, pendingCancelHash: hash, lastError: 'Cancellation submitted; waiting for receipt confirmation.' }])
      setNotice({ kind: 'info', message: 'Cancellation submitted. Waiting for Monad receipt…', hash })
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      if (receipt.status !== 'success') throw new Error('Cancellation transaction reverted.')
      let matchingCancel = false
      let matchingTrade = false
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== order.market.toLowerCase()) continue
        try {
          const topics = [...log.topics] as [Hash, ...Hash[]]
          const ev = decodeEventLog({ abi: orderBookAbi, data: log.data, topics, strict: false })
          if (ev.eventName === 'OrdersCanceled') {
            const args = ev.args as unknown as { orderId: readonly number[]; owner: Address }
            if (args.owner.toLowerCase() === account.toLowerCase() && args.orderId.some((id) => String(id) === order.orderId)) matchingCancel = true
          } else if (ev.eventName === 'Trade') {
            const args = ev.args as unknown as { orderId: number; makerAddress: Address; filledSize: bigint }
            if (String(args.orderId) === order.orderId && args.makerAddress.toLowerCase() === account.toLowerCase() && args.filledSize > 0n) matchingTrade = true
          }
        } catch { /* unrelated log */ }
      }
      const after = await readOrder(order.market, order.orderId, account)
      const verified = matchingCancel && after.owned && after.remaining === 0n
      const updated: TrackedOrder = { ...order, status: verified ? hadPartialFill || matchingTrade ? 'partial-cancelled' : 'cancelled' : after.owned && after.remaining > 0n ? 'open' : 'closed-unknown', cancelTransactionHash: hash, pendingCancelHash: undefined,
        remainingSizeRaw: after.remaining.toString(), lastScannedBlock: Number(receipt.blockNumber), observedAt: Date.now(), lastError: verified ? undefined : 'Receipt or post-cancel read-back did not prove cancellation.' }
      addOrders([updated], verified ? { kind: 'success', message: `Order ${order.orderId} cancellation verified on-chain.`, hash }
        : { kind: 'error', message: 'Cancellation mined, but the event and zero-size postcondition were not both confirmed.', hash })
      await refreshBalances()
    } catch (error) {
      const e = error as { name?: string; message?: string; cause?: { shortMessage?: string } }
      const rejected = e.name === 'UserRejectedRequestError' || /user rejected|rejected the request/i.test(e.message ?? '')
      setNotice({ kind: 'error', message: rejected ? 'Cancellation signature rejected in wallet. No cancellation was submitted.' : e.cause?.shortMessage || e.message || 'Cancellation failed.', hash: submittedCancelHash ?? undefined })
      if (submittedCancelHash && account) {
        const saved = loadOrders(account).some((savedOrder) => savedOrder.key === order.key && savedOrder.pendingCancelHash === submittedCancelHash)
        if (!saved) addOrders([{ ...order, status: 'pending', cancelTransactionHash: submittedCancelHash, pendingCancelHash: submittedCancelHash, lastError: 'Cancellation was submitted; confirmation is still required.' }])
        else await refreshOrders()
      } else await refreshOrders()
    } finally { setActionBusy('') }
  }

  const refreshEverything = async () => { setRefreshing(true); await Promise.allSettled([loadMarkets(), refreshBook(), refreshBalances(), refreshOrders()]); setRefreshing(false) }
  const useBookPrice = () => { const price = side === 'buy' ? bestBid : bestAsk; if (price) setPriceInput(String(price)) }
  const setMaxSize = () => {
    if (!marketParams || !inputPriceRaw || inputPriceRaw <= 0n) return
    const available = side === 'buy' ? currentBalances.marginQuote : currentBalances.marginBase
    if (available <= 0n) return
    let raw = side === 'sell' ? available : available * marketParams.pricePrecision * marketParams.sizePrecision * 10_000n /
      (inputPriceRaw * (10n ** BigInt(marketParams.quoteDecimals)) * (10_000n + marketParams.makerFeeBps))
    raw = raw / marketParams.sizePrecision * marketParams.sizePrecision
    if (raw > marketParams.maxSize) raw = marketParams.maxSize
    if (raw > 0n) setSizeInput(formatUnits(raw, sizeDecimals))
  }
  const fieldError = useMemo(() => {
    if (!priceInput && !sizeInput) return ''
    if (!priceInput || !sizeInput) return 'Enter both a limit price and an order size.'
    if (inputPriceRaw === null || inputSizeRaw === null) return 'Use values within the market precision shown below.'
    if (inputPriceRaw <= 0n || inputSizeRaw <= 0n) return 'Price and size must be greater than zero.'
    if (marketParams && (inputSizeRaw < marketParams.minSize || inputSizeRaw > marketParams.maxSize)) return `Order size must be between ${fmt(marketParams.minSize, sizeDecimals)} and ${fmt(marketParams.maxSize, sizeDecimals)} ${selectedMarket?.baseSymbol}.`
    if (marketParams && inputPriceRaw % BigInt(marketParams.tickSize) !== 0n) return 'Price does not align with the Kuru market tick.'
    if (marketable) return side === 'buy' ? 'That price would take the current ask. Post-only orders must rest below it.' : 'That price would take the current bid. Post-only orders must rest above it.'
    if (!bookFresh) return 'Refresh the book; post-only checks require a recent Kuru book read.'
    if (estimateRaw !== null && !marginSufficient) return `Insufficient Kuru margin. Add ${estimateToken === 'base' ? selectedMarket?.baseSymbol : selectedMarket?.quoteSymbol} before placing.`
    return ''
  }, [priceInput, sizeInput, inputPriceRaw, inputSizeRaw, marketParams, sizeDecimals, selectedMarket, marketable, side, bookFresh, estimateRaw, marginSufficient, estimateToken])
  const ordersForAccount = account ? orders.filter((order) => order.account.toLowerCase() === account.toLowerCase()) : []
  const openCount = ordersForAccount.filter((order) => order.status === 'open' || order.status === 'partial').length
  const visibleOrders = ordersForAccount.filter((order) => orderFilter === 'all' || order.status === 'open' || order.status === 'partial' || order.status === 'pending' || order.status === 'unverified')

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href={import.meta.env.BASE_URL} aria-label="Order Steward home"><span className="brand-mark"><span /></span><span className="brand-name">order<span>steward</span></span></a>
      <nav className={`top-nav ${mobileMenu ? 'nav-open' : ''}`} aria-label="Primary navigation">
        <a className="nav-link active" href="#trade" onClick={() => setMobileMenu(false)}>Spot desk</a>
        <a className="nav-link" href="#orders" onClick={() => { setOrderFilter('all'); setMobileMenu(false) }}>Order ledger</a>
        <a className="nav-link" href="#how-it-works" onClick={() => setMobileMenu(false)}>How it works</a>
      </nav>
      <div className="top-actions">
        <div className="network-chip"><span className={`network-dot ${(connected && !onMonad) || rpcState === 'error' ? 'is-warn' : rpcState === 'ready' ? 'is-live' : ''}`} /><span>{connected && !onMonad ? 'Wrong network' : rpcState === 'error' ? 'RPC unavailable' : rpcState === 'loading' ? 'Checking RPC' : 'Monad'}</span><span className="chain-number">{connected ? chainId ?? '—' : '143'}</span></div>
        {connected ? <button className="wallet-button connected" type="button" onClick={() => setNotice({ kind: 'info', message: `Connected wallet: ${account}` })}><span className="wallet-indicator" />{account.slice(0, 6)}…{account.slice(-4)}<ChevronDown size={14} /></button>
          : <button className="wallet-button" type="button" onClick={() => void connectWallet()} disabled={walletBusy}>{walletBusy ? <LoaderCircle size={15} className="spin" /> : <Wallet size={15} />}{walletBusy ? 'Connecting' : 'Connect wallet'}</button>}
        <button className="mobile-menu-button" type="button" aria-label={mobileMenu ? 'Close menu' : 'Open menu'} onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X /> : <Menu />}</button>
      </div>
    </header>

    <main id="top" className="page-wrap">
      <section className="intro-row"><div>
        <div className="eyebrow"><span className="eyebrow-line" />NON-CUSTODIAL ORDER MANAGEMENT <span className="eyebrow-dot">·</span> KURU × MONAD</div>
        <h1>Trade with <em>follow-through.</em></h1><p className="intro-copy">One place for the order, its on-chain state, and what happened next.</p>
      </div><div className="intro-side"><div className="product-index">FIELD NOTE <span>№ 014</span></div><div className="intro-side-copy">Every order is read back<br />from the market contract.</div></div></section>

      <div className="workbench" id="trade">
        <section className="trade-column panel" aria-labelledby="trade-title">
          <div className="panel-heading"><div><div className="section-kicker">01 <span>/</span> MARKET</div><h2 id="trade-title">Order desk</h2></div>
            <button className="icon-button" onClick={() => void refreshEverything()} type="button" disabled={refreshing} aria-label="Refresh market, balances, and orders" title="Refresh market, balances, and orders"><RefreshCw size={16} className={refreshing ? 'spin' : ''} /></button></div>

          <div className="market-select-wrap"><button type="button" className="market-select" aria-haspopup="listbox" aria-controls="market-directory-options" aria-expanded={marketMenuOpen} onClick={() => setMarketMenuOpen(!marketMenuOpen)} disabled={marketsState !== 'ready' || !markets.length || !!actionBusy}>
            <span className="pair-token pair-primary">{selectedMarket?.baseSymbol.slice(0, 1) ?? 'M'}</span><span className="pair-token pair-secondary">{selectedMarket?.quoteSymbol.slice(0, 1) ?? 'U'}</span>
            <span className="pair-text"><strong>{selectedMarket ? marketPair(selectedMarket) : marketsState === 'loading' ? 'Loading markets…' : marketsState === 'error' ? 'Market feed unavailable' : 'No Kuru markets found'}</strong><small>SPOT · POST-ONLY LIMITS</small></span><ChevronDown size={17} className={marketMenuOpen ? 'rotate' : ''} />
          </button>{marketMenuOpen && <div className="market-menu" aria-label="Kuru markets">
            <label className="market-search-label" htmlFor="market-search">Search markets</label>
            <input id="market-search" className="market-search" type="search" value={marketQuery} placeholder="Pair, token, or address" autoComplete="off" onChange={(event) => { setMarketQuery(event.target.value); setMarketListLimit(80) }} />
            <div id="market-directory-options" className="market-results" role="listbox" aria-label="Kuru spot markets">
              {shownMarkets.map((market) => <button key={market.address} role="option" aria-selected={market.address.toLowerCase() === selectedMarketAddress.toLowerCase()} type="button" onClick={() => { setSelectedMarketAddress(market.address); setPriceInput(''); setSizeInput(''); setMarketMenuOpen(false); setMarketQuery(''); setMarketListLimit(80) }}><span>{marketPair(market)}<small>{market.baseName} / {market.quoteName}</small></span><small>{market.address.slice(0, 6)}…{market.address.slice(-4)}</small></button>)}
              {!matchingMarkets.length && <p className="market-no-results">No listed markets match that search.</p>}
            </div>
            {matchingMarkets.length > shownMarkets.length && <button className="market-show-more" type="button" onClick={() => setMarketListLimit((limit) => limit + 80)}>Show more markets ({matchingMarkets.length - shownMarkets.length} remaining)</button>}
            <div className="market-directory-meta">{marketsState === 'loading' ? `Discovering markets · ${marketProgress.scanned.toLocaleString()} checked · ${marketProgress.found.toLocaleString()} listed` : `${markets.length.toLocaleString()} listed markets · Kuru directory`}</div>
          </div>}</div>
          {marketsState === 'loading' && <div className="market-load-status" role="status"><LoaderCircle size={13} className="spin" />Discovering Kuru markets · {marketProgress.scanned.toLocaleString()} checked · {marketProgress.found.toLocaleString()} listed</div>}

          <div className="market-data-row">
            <div className="quote-box"><span className="data-label">BEST BID</span><strong className="bid-value">{bestBid === null ? '—' : fmtNum(bestBid, 8)}</strong><small>{book?.bids.length ? `${book.bids.length} levels` : 'No bid depth'}</small></div>
            <div className="spread-box"><span className="data-label">SPREAD</span><strong>{bestBid !== null && bestAsk !== null ? fmtNum(bestAsk - bestBid, 8) : '—'}</strong><small>{bestBid && bestAsk ? `${fmtNum(((bestAsk - bestBid) / ((bestAsk + bestBid) / 2)) * 10_000, 1)} bps` : 'Waiting for book'}</small></div>
            <div className="quote-box quote-right"><span className="data-label">BEST ASK</span><strong className="ask-value">{bestAsk === null ? '—' : fmtNum(bestAsk, 8)}</strong><small>{book?.asks.length ? `${book.asks.length} levels` : 'No ask depth'}</small></div>
          </div>
          <div className="source-line"><span className={`source-dot ${currentBookState === 'ready' && bookFresh ? 'source-good' : currentBookState === 'error' ? 'source-bad' : ''}`} />
            <span>{currentBookState === 'loading' ? 'Reading Kuru book…' : currentBookState === 'error' ? currentBookError : book?.bids.length && book.asks.length ? `Kuru book · block ${book.syncBlock}` : book ? 'Kuru book · one-sided or empty depth' : 'Kuru book · waiting for selected market'}</span><span className="source-time">{visibleBookUpdated ? timeAgo(visibleBookUpdated, clockNow) : '—'}</span></div>
          {marketsState === 'error' && <div className="inline-error" role="alert"><CircleAlert size={15} />{marketError}<button onClick={() => void loadMarkets()} type="button">Retry</button></div>}
          {currentParamsError && <div className="inline-error" role="alert"><CircleAlert size={15} />{currentParamsError}</div>}
          {wrongMarketParams && <div className="inline-error" role="alert"><CircleAlert size={15} />Market API token addresses or decimals do not match the on-chain parameters. Trading is disabled.</div>}
          {currentBookState === 'error' && <div className="inline-error" role="alert"><CircleAlert size={15} />{currentBookError} Order placement is disabled until a current book read succeeds.</div>}

          <div className="book-strip"><div className="book-header"><span>PRICE <small>({selectedMarket?.quoteSymbol ?? 'QUOTE'})</small></span><span>SIZE <small>({selectedMarket?.baseSymbol ?? 'BASE'})</small></span><span>DEPTH</span></div>
            <div className="book-levels">
              {book?.asks.slice(0, 4).sort((a, b) => a[0] - b[0]).map(([price, size]) => <div className="book-level ask-level" key={`a${price}`}><span className="book-depth-bar ask-depth" style={{ width: `${Math.max(12, Math.min(100, size / Math.max(...book.asks.slice(0, 4).map((i) => i[1]), 1) * 100))}%` }} /><span className="book-price">{fmtNum(price, 8)}</span><span>{fmtNum(size, 5)}</span><span className="depth-value">{fmtNum(price * size, 2)}</span></div>)}
              {!book?.asks.length && <div className="book-empty">No asks returned by the live Kuru book.</div>}
              {book?.bids.slice(0, 4).sort((a, b) => b[0] - a[0]).map(([price, size]) => <div className="book-level bid-level" key={`b${price}`}><span className="book-depth-bar bid-depth" style={{ width: `${Math.max(12, Math.min(100, size / Math.max(...book.bids.slice(0, 4).map((i) => i[1]), 1) * 100))}%` }} /><span className="book-price">{fmtNum(price, 8)}</span><span>{fmtNum(size, 5)}</span><span className="depth-value">{fmtNum(price * size, 2)}</span></div>)}
              {!book?.bids.length && <div className="book-empty">No bids returned by the live Kuru book.</div>}
            </div><div className="book-foot"><span>LIVE SOURCE <b>KURU API</b></span><span>{visibleBookUpdated ? new Date(visibleBookUpdated).toLocaleTimeString() : 'Waiting for first read'}</span></div>
          </div>

          <form className="order-form" onSubmit={(event) => void submitOrder(event)}>
            <div className="form-heading"><div><div className="section-kicker">02 <span>/</span> ORDER INTENT</div><h3>Place an order</h3></div><span className="maker-badge"><ShieldCheck size={13} /> POST-ONLY</span></div>
            <div className="side-switch" role="group" aria-label="Order side"><button type="button" className={side === 'buy' ? 'side-buy selected' : 'side-buy'} onClick={() => setSide('buy')} aria-pressed={side === 'buy'} disabled={!marketParams || !!actionBusy}>Buy {selectedMarket?.baseSymbol ?? 'base'}</button><button type="button" className={side === 'sell' ? 'side-sell selected' : 'side-sell'} onClick={() => setSide('sell')} aria-pressed={side === 'sell'} disabled={!marketParams || !!actionBusy}>Sell {selectedMarket?.baseSymbol ?? 'base'}</button></div>
            <label className="input-label" htmlFor="limit-price">Limit price <span>{selectedMarket?.quoteSymbol ?? 'quote'} per {selectedMarket?.baseSymbol ?? 'base'}</span></label>
            <div className="number-field"><input id="limit-price" name="limitPrice" inputMode="decimal" autoComplete="off" placeholder="0.00" value={priceInput} onChange={(event) => setPriceInput(event.target.value)} aria-describedby="price-help" disabled={!marketParams || !!actionBusy} /><span>{selectedMarket?.quoteSymbol ?? 'QUOTE'}</span><button type="button" className="text-action" onClick={useBookPrice} disabled={!marketParams || !!actionBusy || (side === 'buy' ? !bestBid : !bestAsk)} title="Use the best price on your side of the current book">Book price</button></div>
            <div id="price-help" className="field-help">Tick {marketParams ? fmt(BigInt(marketParams.tickSize), priceDecimals, priceDecimals) : '—'} {selectedMarket?.quoteSymbol ?? 'quote'} · {priceDecimals} decimals</div>
            <label className="input-label size-label" htmlFor="order-size">Order size <span>Available in Kuru margin</span></label>
            <div className="number-field"><input id="order-size" name="orderSize" inputMode="decimal" autoComplete="off" placeholder="0.00" value={sizeInput} onChange={(event) => setSizeInput(event.target.value)} aria-describedby="size-help" disabled={!marketParams || !!actionBusy} /><span>{selectedMarket?.baseSymbol ?? 'BASE'}</span><button type="button" className="text-action" onClick={setMaxSize} disabled={!marketParams || !!actionBusy || !inputPriceRaw}>MAX</button></div>
            <div id="size-help" className="field-help">Min {marketParams ? fmt(marketParams.minSize, sizeDecimals) : '—'} · Max {marketParams ? fmt(marketParams.maxSize, sizeDecimals) : '—'}</div>
            <div className="order-summary"><div><span>Est. notional / margin</span><strong>{estimateRaw !== null ? `${fmt(estimateRaw, estimateToken === 'quote' ? marketParams?.quoteDecimals ?? 0 : marketParams?.baseDecimals ?? 0)} ${estimateToken === 'quote' ? selectedMarket?.quoteSymbol : selectedMarket?.baseSymbol}` : '—'}</strong></div>
              <div><span>Required margin source</span><strong>{side === 'buy' ? `${selectedMarket?.quoteSymbol ?? 'quote'} margin` : `${selectedMarket?.baseSymbol ?? 'base'} margin`}</strong></div><div className="summary-rule"><span>Order type</span><strong><LockKeyhole size={12} /> Post-only limit</strong></div></div>
            {fieldError && (priceInput || sizeInput) && <div className="form-warning" role="status"><CircleAlert size={15} /><span>{fieldError}</span></div>}
            {!connected && <div className="form-note"><Wallet size={15} />Connect a wallet to read Kuru margin and prepare an order.</div>}
            {connected && !onMonad && <div className="form-note note-warn"><CircleAlert size={15} />Wallet is on chain {chainId ?? 'unknown'}. Switch to Monad before any Kuru action.<button type="button" onClick={() => void switchNetwork()} disabled={walletBusy}>Switch network</button></div>}
            {rpcState !== 'ready' && <div className="form-note note-warn"><CircleAlert size={15} />{rpcState === 'loading' ? 'Checking the configured RPC is Monad mainnet…' : rpcError || 'Monad RPC is unavailable. Kuru actions are disabled until chain 143 is verified.'}{rpcState === 'error' && <button type="button" onClick={() => void checkRpc()}>Retry RPC</button>}</div>}
            {connected && onMonad && !marginAddress && rpcState === 'ready' && <div className="form-note note-warn"><CircleAlert size={15} />{marginAddressError || 'Verifying Kuru margin contract…'}{marginAddressError && <button type="button" onClick={() => void checkRpc()}>Retry</button>}</div>}
            {connected && onMonad && selectedMarket && !balanceReadReady && <div className="form-note note-warn"><CircleAlert size={15} />{currentBalanceError ? `Current market balances could not be read. ${currentBalanceError}` : 'Waiting for wallet and Kuru margin balances for this market.'}<button type="button" onClick={() => void refreshBalances()} disabled={balanceState === 'loading'}>Refresh</button></div>}
            {!storageReady && <div className="form-note note-warn"><CircleAlert size={15} />{storageError || 'Checking local order storage…'}</div>}
            {pendingPlace && <div className="form-note note-warn" role="status"><Clock3 size={15} />Order transaction for {pendingPlace.pair} is awaiting recovery. <a href={explorerTx(pendingPlace.hash)} target="_blank" rel="noreferrer">Open receipt <ExternalLink size={12} /></a> {pendingPlace.market.toLowerCase() === selectedMarketAddress.toLowerCase() ? <button type="button" onClick={() => void recoverPending()}>Check receipt</button> : markets.some((item) => item.address.toLowerCase() === pendingPlace.market.toLowerCase()) ? <button type="button" onClick={() => { setSelectedMarketAddress(pendingPlace.market); setPriceInput(''); setSizeInput('') }}>Open {pendingPlace.pair}</button> : <span>Select {pendingPlace.pair} in the market list to check its receipt.</span>}</div>}
            {pendingCheck === 'pending' && !pendingPlace && connected && <div className="form-note note-warn" role="alert"><CircleAlert size={15} />Saved order recovery data is unreadable. Do not place a replacement order until you verify recent wallet transactions. <a href={explorerAddress(account)} target="_blank" rel="noreferrer">Review wallet activity <ExternalLink size={12} /></a></div>}
            {unverifiedCurrentOrder && <div className="form-note note-warn" role="status"><CircleAlert size={15} />A tracked {selectedMarket?.baseSymbol}/{selectedMarket?.quoteSymbol} order has not been verified. Retry its on-chain read in <a href="#orders">your order ledger</a> before placing another.</div>}
            <button className={`submit-order ${side === 'sell' ? 'submit-sell' : ''}`} type="submit" disabled={!canTrade}>{actionBusy === 'place' ? <><LoaderCircle size={16} className="spin" /> Waiting for order…</> : <>{side === 'buy' ? 'Review buy order' : 'Review sell order'}<ArrowUpRight size={16} /></>}</button>
            <p className="form-disclaimer">Your wallet signs directly. Order Steward never holds funds or keys. Post-only orders can be rejected if the book changes before mining.</p>
          </form>
        </section>

        <aside className="account-column">
          <section className="panel account-panel" aria-labelledby="account-title">
            <div className="panel-heading compact-heading"><div><div className="section-kicker">03 <span>/</span> ACCOUNT</div><h2 id="account-title">Balances</h2></div><button className="icon-button" type="button" onClick={() => void refreshBalances()} disabled={balanceState === 'loading'} aria-label="Refresh balances"><RefreshCw size={15} className={balanceState === 'loading' ? 'spin' : ''} /></button></div>
            <div className="account-ident"><div className="account-avatar">{account ? account.slice(2, 4).toUpperCase() : <Wallet size={17} />}</div><div className="account-address"><span>{account ? `${account.slice(0, 8)}…${account.slice(-6)}` : 'Wallet not connected'}</span><small>{account ? 'CONNECTED ACCOUNT' : 'CONNECT TO READ BALANCES'}</small></div>{account && <a className="external-link" href={explorerAddress(account)} target="_blank" rel="noreferrer" aria-label="View wallet on Monadscan"><ExternalLink size={14} /></a>}</div>
            {connected && onMonad && selectedMarket && marketParams ? <>
              <div className="balance-caption"><span>ASSET</span><span>IN WALLET</span><span>IN KURU MARGIN</span></div>
              <div className="balance-row"><span className="asset-name"><i className="asset-mon">{selectedMarket.baseSymbol.slice(0, 1)}</i><strong>{selectedMarket.baseSymbol}</strong></span><span>{fmt(currentBalances.walletBase, marketParams.baseDecimals, 4)}</span><span className="margin-value">{fmt(currentBalances.marginBase, marketParams.baseDecimals, 4)}</span></div>
              <div className="balance-row"><span className="asset-name"><i className="asset-usdc">{selectedMarket.quoteSymbol.slice(0, 1)}</i><strong>{selectedMarket.quoteSymbol}</strong></span><span>{fmt(currentBalances.walletQuote, marketParams.quoteDecimals, 2)}</span><span className="margin-value">{fmt(currentBalances.marginQuote, marketParams.quoteDecimals, 2)}</span></div>
              <div className="gas-balance"><span>Network gas</span><strong>{fmt(currentBalances.native, 18, 5)} MON</strong></div>
              <div className="balance-actions"><button type="button" className="deposit-button" onClick={() => openDeposit('quote')} disabled={!marginAddress || !balanceReadReady || rpcState !== 'ready'}><Plus size={15} />Add quote margin</button><button type="button" className="subtle-button" onClick={() => openDeposit('base')} disabled={!marginAddress || !balanceReadReady || rpcState !== 'ready'}><ArrowDownLeft size={14} />Add base</button></div>
              <div className="balance-source">{currentBalanceError ? <span className="error-text" title={currentBalanceError}>Read failed · retry</span> : !balanceReadReady ? 'Reading wallet + margin contracts…' : `On-chain read${balanceUpdated ? ` · ${timeAgo(balanceUpdated, clockNow)}` : ''}`}</div>
              {currentBalanceError && <button className="link-retry" type="button" onClick={() => void refreshBalances()}>{currentBalanceError} Retry</button>}
            </> : <div className="balance-empty">{!connected ? <><p>Connect a wallet to read real balances.</p><button type="button" className="connect-inline" onClick={() => void connectWallet()} disabled={walletBusy}>Connect wallet <ArrowUpRight size={14} /></button></> : !onMonad ? <><p>Balances are hidden while the wallet is on the wrong network.</p><button type="button" className="connect-inline" onClick={() => void switchNetwork()}>Switch to Monad <ArrowUpRight size={14} /></button></> : <p>{balanceState === 'loading' ? 'Reading account balances…' : marginAddressError || 'Select a market to load token balances.'}</p>}</div>}
          </section>

          <section className="panel order-panel" id="orders" aria-labelledby="orders-title">
            <div className="panel-heading compact-heading"><div><div className="section-kicker">04 <span>/</span> LIFECYCLE</div><h2 id="orders-title">Your orders <span className="count-bubble">{orderFilter === 'open' ? openCount : ordersForAccount.length}</span></h2></div><button className="icon-button" type="button" onClick={() => void refreshOrders()} disabled={ordersState === 'loading' || !connected || !onMonad} aria-label="Reconcile orders from chain"><RefreshCw size={15} className={ordersState === 'loading' ? 'spin' : ''} /></button></div>
            <div className="order-tabs" role="tablist" aria-label="Order filter"><button role="tab" aria-selected={orderFilter === 'open'} className={orderFilter === 'open' ? 'active' : ''} type="button" onClick={() => setOrderFilter('open')}>Open <span>{openCount}</span></button><button role="tab" aria-selected={orderFilter === 'all'} className={orderFilter === 'all' ? 'active' : ''} type="button" onClick={() => setOrderFilter('all')}>All tracked <span>{ordersForAccount.length}</span></button></div>
            {!connected || !onMonad ? <div className="orders-empty"><div className="empty-icon"><ArrowDownUp size={17} /></div><p>{!connected ? 'Connect your wallet to load locally tracked orders.' : 'Switch to Monad to reconcile order state.'}</p></div>
              : ordersState === 'loading' && !ordersForAccount.length ? <div className="orders-empty"><LoaderCircle size={18} className="spin" /><p>Reading local intents against Kuru…</p></div>
              : ordersError ? <div className="orders-empty error-empty"><CircleAlert size={18} /><p>{ordersError}</p><button type="button" onClick={() => void refreshOrders()}>Retry</button></div>
              : visibleOrders.length === 0 ? <div className="orders-empty"><div className="empty-icon"><ArrowDownUp size={17} /></div><p>{orderFilter === 'open' ? 'No open orders tracked in this browser.' : 'No order intents saved for this account.'}</p><span>Orders created in another app are not automatically discovered.</span></div>
              : <div className="order-list">{visibleOrders.map((order) => <article className="order-card" key={order.key}>
                <div className="order-card-top"><div className={`order-side-icon ${order.side}`} aria-hidden="true">{order.side === 'buy' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}</div><div className="order-headline"><strong className={order.side}>{order.side.toUpperCase()} <span>{order.pair}</span></strong><StatusPill status={order.status} /></div><button className="order-more" type="button" onClick={() => setNotice({ kind: 'info', message: `Order ${order.orderId} · ${order.market} · created ${new Date(order.createdAt).toLocaleString()}`, hash: order.transactionHash })} aria-label={`Show order ${order.orderId} details`}><ExternalLink size={14} /></button></div>
                <div className="order-metrics"><div><small>LIMIT</small><strong>{order.priceLabel}</strong></div><div><small>ORIGINAL SIZE</small><strong>{order.sizeLabel} {order.pair.split(' / ')[0]}</strong></div><div><small>REMAINING</small><strong>{fmt(BigInt(order.remainingSizeRaw), order.sizeDecimals, 5)}</strong></div></div>
                {order.lastError && <div className="order-inline-warning"><CircleAlert size={13} />{order.lastError}</div>}
                {order.status === 'closed-unknown' && !order.historyComplete && <div className="order-inline-warning"><CircleAlert size={13} />Activity history is incomplete; closure reason is unknown.</div>}
                <div className="order-card-foot"><span>{new Date(order.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} · #{order.orderId}</span><div><a href={explorerTx(order.transactionHash)} target="_blank" rel="noreferrer">Order receipt <ArrowUpRightFromSquare size={12} /></a>{order.cancelTransactionHash && <a href={explorerTx(order.cancelTransactionHash)} target="_blank" rel="noreferrer">Cancel tx <ArrowUpRightFromSquare size={12} /></a>}</div></div>
                {(order.status === 'open' || order.status === 'partial') && <button className="cancel-order" type="button" onClick={() => void cancelOrder(order)} disabled={!!actionBusy || !storageReady || !account || account.toLowerCase() !== order.account.toLowerCase() || !onMonad || rpcState !== 'ready' || !walletClient}>{actionBusy === `cancel:${order.key}` ? <><LoaderCircle size={14} className="spin" /> Awaiting chain state…</> : 'Cancel order'}</button>}
                {order.status === 'pending' && <button className="cancel-order retry-order" type="button" onClick={() => void refreshOrders()} disabled={ordersState === 'loading'}>Check cancellation receipt</button>}
                {order.status === 'unverified' && <button className="cancel-order retry-order" type="button" onClick={() => void refreshOrders()}>Retry on-chain read</button>}
              </article>)}</div>}
            <div className="orders-footnote"><ShieldCheck size={13} /><span>Current size and owner are re-read from Kuru. Local tracking is device-specific.</span></div>
          </section>
        </aside>
      </div>

      <section className="proof-strip" id="how-it-works" aria-label="Order verification steps"><div className="proof-intro"><div className="section-kicker">THE CHECK</div><h2>Intent in. <em>Evidence out.</em></h2></div><div className="proof-step"><span>01</span><strong>You review</strong><small>Price, size, market and margin</small></div><ArrowDownUp className="proof-arrow" size={17} /><div className="proof-step"><span>02</span><strong>Wallet signs</strong><small>Direct call to Kuru's market</small></div><ArrowDownUp className="proof-arrow" size={17} /><div className="proof-step"><span>03</span><strong>Chain confirms</strong><small>Receipt event + order read-back</small></div></section>
      <footer className="footer"><span>ORDER STEWARD <b>·</b> OPEN ORDER, CLEAR RECEIPT.</span><div><a href="https://github.com/Kuru-Labs/kuru-sdk" target="_blank" rel="noreferrer">Kuru integration <ExternalLink size={12} /></a><a href="https://monadscan.com" target="_blank" rel="noreferrer">Monadscan <ExternalLink size={12} /></a></div><span className="footer-status"><i /> NO CUSTODY · NO AUTO-EXECUTION</span></footer>
    </main>

    {toast && <div className={`toast toast-${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>{toast.kind === 'success' ? <CircleCheck size={17} /> : toast.kind === 'error' ? <CircleAlert size={17} /> : <Clock3 size={17} />}<span>{toast.message}{toast.hash && <a href={explorerTx(toast.hash)} target="_blank" rel="noreferrer">View transaction <ExternalLink size={12} /></a>}{toast.approvalHash && <a href={explorerTx(toast.approvalHash)} target="_blank" rel="noreferrer">View approval <ExternalLink size={12} /></a>}</span><button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification"><X size={15} /></button></div>}

    {depositTarget && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !actionBusy) closeDeposit() }}>
      <section className="deposit-modal" role="dialog" aria-modal="true" aria-labelledby="deposit-title">
        <div className="modal-top"><div><div className="section-kicker">KURU MARGIN</div><h2 id="deposit-title">Add {currentAsset.symbol}</h2></div><button className="icon-button" type="button" onClick={() => { if (!actionBusy) closeDeposit() }} aria-label="Close deposit dialog" disabled={!!actionBusy}><X size={17} /></button></div>
        <p className="modal-copy">Move tokens from your connected wallet into your own Kuru trading balance. This is a real Monad transaction.</p>
        <div className="deposit-balance"><span>Wallet balance</span><strong>{currentAsset.decimals === undefined ? '—' : fmt(currentAsset.wallet, currentAsset.decimals, 5)} {currentAsset.symbol}</strong></div><div className="deposit-balance"><span>Current Kuru margin</span><strong>{currentAsset.decimals === undefined ? '—' : fmt(currentAsset.margin, currentAsset.decimals, 5)} {currentAsset.symbol}</strong></div>
        <form onSubmit={(event) => void handleDeposit(event)}><label className="input-label" htmlFor="deposit-amount">Deposit amount <span>{currentAsset.decimals ?? '—'} token decimals</span></label>
          <div className="number-field"><input id="deposit-amount" name="depositAmount" inputMode="decimal" autoComplete="off" placeholder="0.00" value={depositInput} onChange={(event) => setDepositInput(event.target.value)} disabled={!!actionBusy || !balanceReadReady || rpcState !== 'ready'} /><span>{currentAsset.symbol}</span><button type="button" className="text-action" onClick={() => { if (currentAsset.decimals !== undefined) setDepositInput(formatUnits(currentAsset.wallet, currentAsset.decimals)) }} disabled={!balanceReadReady || rpcState !== 'ready'}>MAX</button></div>
          <div className="deposit-steps"><span className={!actionBusy || approvalStepActive || currentAsset.address === ZERO_ADDRESS ? 'step-current' : 'step-done'}><i>{approvalStepActive || (currentAsset.address === ZERO_ADDRESS && !!actionBusy) ? '1' : '✓'}</i>{currentAsset.address === ZERO_ADDRESS ? 'Deposit MON' : 'Approve exact amount'}</span>{currentAsset.address !== ZERO_ADDRESS && <span className={depositStepActive ? 'step-current' : ''}><i>2</i>Deposit to margin</span>}</div>
          {depositStage && <div className={/revert|exceed|reject|did not|below/i.test(depositStage) ? 'deposit-stage stage-error' : 'deposit-stage'} role="status">{actionBusy ? <LoaderCircle size={14} className="spin" /> : <CircleAlert size={14} />}{depositStage}</div>}
          {(depositApprovalHash || depositTxHash) && <div className="deposit-receipts">{depositApprovalHash && <a href={explorerTx(depositApprovalHash)} target="_blank" rel="noreferrer">Approval transaction <ExternalLink size={12} /></a>}{depositTxHash && <a href={explorerTx(depositTxHash)} target="_blank" rel="noreferrer">Deposit transaction <ExternalLink size={12} /></a>}</div>}
          <button className="submit-order deposit-submit" type="submit" disabled={!!actionBusy || !depositInput || !onMonad || rpcState !== 'ready' || !balanceReadReady || !currentAsset.address || !marginAddress}>{actionBusy === 'deposit' ? <><LoaderCircle size={16} className="spin" />Processing wallet steps…</> : <>Review deposit <ArrowUpRight size={16} /></>}</button>
        </form><p className="form-disclaimer">If approval is needed, it is for this exact amount. Approval and deposit require separate wallet confirmations. Closing the dialog does not cancel a submitted transaction.</p>
      </section>
    </div>}
  </div>
}

function App() {
  const deskRequested = new URLSearchParams(window.location.search).get('desk') === '1'
  return deskRequested ? <TradingDesk /> : <LandingPage />
}

export default App
