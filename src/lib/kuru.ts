import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  getAddress,
  http,
  type Address,
  type EIP1193Provider,
  type WalletClient,
} from 'viem'

export const MONAD_CHAIN_ID = 143
export const MONAD_EXPLORER = 'https://monadscan.com'
export const KURU_ROUTER: Address = '0xd651346d7c789536ebf06dc72ae3c8502cd695cc'
export const KURU_MON_USDC_MARKET: Address = '0x065c9d28e428a0db40191a54d33d5b7c71a9c394'
export const KURU_API = 'https://api.kuru.io'
export const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000'

export const monad = defineChain({
  id: MONAD_CHAIN_ID,
  name: 'Monad',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_MONAD_RPC_URL || 'https://rpc.monad.xyz'] },
  },
  blockExplorers: { default: { name: 'Monadscan', url: MONAD_EXPLORER } },
})

export const publicClient = createPublicClient({ chain: monad, transport: http() })

export async function assertMonadRpc() {
  const chainId = await publicClient.getChainId()
  if (chainId !== MONAD_CHAIN_ID) throw new Error(`Configured RPC returned chain ID ${chainId}; Monad mainnet (143) is required.`)
}

export const routerAbi = [
  { type: 'function', name: 'marginAccountAddress', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
] as const

export const erc20Abi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
] as const

export const marginAbi = [
  { type: 'function', name: 'getBalance', stateMutability: 'view', inputs: [{ name: '_user', type: 'address' }, { name: '_token', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'deposit', stateMutability: 'payable', inputs: [{ name: '_user', type: 'address' }, { name: '_token', type: 'address' }, { name: '_amount', type: 'uint256' }], outputs: [] },
] as const

// These entries are copied from Kuru Labs' published OrderBook ABI. Keep the
// selectors/events narrow and review them against that source when upgrading.
export const orderBookAbi = [
  { type: 'function', name: 'getMarketParams', stateMutability: 'view', inputs: [], outputs: [
    { type: 'uint32' }, { type: 'uint96' }, { type: 'address' }, { type: 'uint256' }, { type: 'address' },
    { type: 'uint256' }, { type: 'uint32' }, { type: 'uint96' }, { type: 'uint96' }, { type: 'uint256' }, { type: 'uint256' },
  ] },
  { type: 'function', name: 's_orders', stateMutability: 'view', inputs: [{ name: '', type: 'uint40' }], outputs: [
    { name: 'ownerAddress', type: 'address' }, { name: 'size', type: 'uint96' }, { name: 'prev', type: 'uint40' },
    { name: 'next', type: 'uint40' }, { name: 'flippedId', type: 'uint40' }, { name: 'price', type: 'uint32' },
    { name: 'flippedPrice', type: 'uint32' }, { name: 'isBuy', type: 'bool' },
  ] },
  { type: 'function', name: 'addBuyOrder', stateMutability: 'nonpayable', inputs: [{ name: '_price', type: 'uint32' }, { name: 'size', type: 'uint96' }, { name: '_postOnly', type: 'bool' }], outputs: [] },
  { type: 'function', name: 'addSellOrder', stateMutability: 'nonpayable', inputs: [{ name: '_price', type: 'uint32' }, { name: 'size', type: 'uint96' }, { name: '_postOnly', type: 'bool' }], outputs: [] },
  { type: 'function', name: 'batchCancelOrders', stateMutability: 'nonpayable', inputs: [{ name: '_orderIds', type: 'uint40[]' }], outputs: [] },
  { type: 'event', name: 'OrderCreated', anonymous: false, inputs: [
    { indexed: false, name: 'orderId', type: 'uint40' }, { indexed: false, name: 'owner', type: 'address' },
    { indexed: false, name: 'size', type: 'uint96' }, { indexed: false, name: 'price', type: 'uint32' }, { indexed: false, name: 'isBuy', type: 'bool' },
  ] },
  { type: 'event', name: 'OrdersCanceled', anonymous: false, inputs: [
    { indexed: false, name: 'orderId', type: 'uint40[]' }, { indexed: false, name: 'owner', type: 'address' },
  ] },
  { type: 'event', name: 'Trade', anonymous: false, inputs: [
    { indexed: false, name: 'orderId', type: 'uint40' }, { indexed: false, name: 'makerAddress', type: 'address' },
    { indexed: false, name: 'isBuy', type: 'bool' }, { indexed: false, name: 'price', type: 'uint256' },
    { indexed: false, name: 'updatedSize', type: 'uint96' }, { indexed: false, name: 'takerAddress', type: 'address' },
    { indexed: false, name: 'txOrigin', type: 'address' }, { indexed: false, name: 'filledSize', type: 'uint96' },
  ] },
] as const

export type Market = {
  address: Address
  baseAddress: Address
  quoteAddress: Address
  baseSymbol: string
  quoteSymbol: string
  baseDecimals: number
  quoteDecimals: number
  lastPrice: string | null
  volume24h: string | null
}

export type MarketParams = {
  pricePrecision: bigint
  sizePrecision: bigint
  baseAddress: Address
  baseDecimals: number
  quoteAddress: Address
  quoteDecimals: number
  tickSize: number
  minSize: bigint
  maxSize: bigint
  makerFeeBps: bigint
}

export type Book = { bids: [number, number][]; asks: [number, number][]; timestamp: number; syncBlock: string }

type RawToken = { address?: string; ticker?: string; decimal?: number; symbol?: string; decimals?: number }
type RawMarket = {
  market?: string; baseasset?: string; quoteasset?: string; baseassetaddress?: string; quoteassetaddress?: string
  basetoken?: RawToken; quotetoken?: RawToken; lastPrice?: number | string | null; volume24h?: number | string | null
}

function safeAddress(value: unknown, label: string): Address {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error(`Kuru returned an invalid ${label} address.`)
  return getAddress(value)
}

export async function fetchMarkets(signal?: AbortSignal): Promise<Market[]> {
  const tokens = [
    { symbol: 'MON', address: ZERO_ADDRESS },
    { symbol: 'WMON', address: '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701' },
    { symbol: 'USDC', address: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603' },
  ]
  const pairs = tokens.flatMap((a, i) => tokens.slice(i + 1).flatMap((b) => [
    { baseToken: a.address, quoteToken: b.address }, { baseToken: b.address, quoteToken: a.address },
  ]))
  const response = await fetch(`${KURU_API}/api/v1/markets/filtered`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pairs }), signal,
  })
  if (!response.ok) throw new Error(`Kuru market directory returned HTTP ${response.status}.`)
  const body: unknown = await response.json()
  if (!body || typeof body !== 'object' || !Array.isArray((body as { data?: unknown }).data)) throw new Error('Kuru market directory returned an unexpected response.')
  const rows = (body as { data: RawMarket[] }).data
  return rows.flatMap((row) => {
    try {
      if (!row.market) return []
      const base = row.basetoken
      const quote = row.quotetoken
      const baseAddress = safeAddress(base?.address || row.baseasset || row.baseassetaddress, 'base token')
      const quoteAddress = safeAddress(quote?.address || row.quoteasset || row.quoteassetaddress, 'quote token')
      const address = safeAddress(row.market, 'market')
      const baseSymbol = base?.ticker || base?.symbol || (baseAddress === ZERO_ADDRESS ? 'MON' : 'TOKEN')
      const quoteSymbol = quote?.ticker || quote?.symbol || 'TOKEN'
      const baseDecimals = Number(base?.decimal ?? base?.decimals ?? (baseAddress === ZERO_ADDRESS ? 18 : NaN))
      const quoteDecimals = Number(quote?.decimal ?? quote?.decimals ?? NaN)
      if (!Number.isInteger(baseDecimals) || !Number.isInteger(quoteDecimals) || baseDecimals < 0 || quoteDecimals < 0 || baseDecimals > 36 || quoteDecimals > 36) return []
      return [{ address, baseAddress, quoteAddress, baseSymbol, quoteSymbol, baseDecimals, quoteDecimals,
        lastPrice: row.lastPrice == null ? null : String(row.lastPrice), volume24h: row.volume24h == null ? null : String(row.volume24h) }]
    } catch { return [] }
  })
}

export async function fetchBook(market: Address, signal?: AbortSignal): Promise<Book> {
  const response = await fetch(`${KURU_API}/api/v2/orders/market/${market.toLowerCase()}/l2book`, { signal })
  if (!response.ok) throw new Error(`Kuru order book returned HTTP ${response.status}.`)
  const body: unknown = await response.json()
  if (!body || typeof body !== 'object') throw new Error('Kuru order book returned an unexpected response.')
  const root = body as { success?: boolean; data?: { bids?: unknown; asks?: unknown; syncBlock?: unknown }; timestamp?: unknown }
  if (!root.success || !root.data || !Array.isArray(root.data.bids) || !Array.isArray(root.data.asks)) throw new Error('Kuru order book response is incomplete.')
  const levels = (values: unknown[]) => values.flatMap((row) => {
    if (!Array.isArray(row) || row.length < 2) return []
    const p = Number(row[0]); const s = Number(row[1])
    return Number.isFinite(p) && Number.isFinite(s) && p > 0 && s >= 0 ? [[p, s] as [number, number]] : []
  })
  return { bids: levels(root.data.bids), asks: levels(root.data.asks), timestamp: Number(root.timestamp) || Date.now(), syncBlock: String(root.data.syncBlock ?? 'unknown') }
}

export async function fetchMarketParams(market: Address): Promise<MarketParams> {
  await assertMonadRpc()
  const code = await publicClient.getCode({ address: market })
  if (!code || code === '0x') throw new Error('The selected Kuru market has no contract code on Monad mainnet.')
  const values = await publicClient.readContract({ address: market, abi: orderBookAbi, functionName: 'getMarketParams' })
  const [pricePrecision, sizePrecision, baseAddress, baseDecimals, quoteAddress, quoteDecimals, tickSize, minSize, maxSize, , makerFeeBps] = values
  const params: MarketParams = {
    pricePrecision: BigInt(pricePrecision), sizePrecision, baseAddress: getAddress(baseAddress), baseDecimals: Number(baseDecimals),
    quoteAddress: getAddress(quoteAddress), quoteDecimals: Number(quoteDecimals), tickSize: Number(tickSize), minSize, maxSize, makerFeeBps,
  }
  if (params.baseDecimals > 36 || params.quoteDecimals > 36 || params.pricePrecision <= 0n || params.sizePrecision <= 0n || params.tickSize <= 0) throw new Error('Kuru market parameters failed validation.')
  return params
}

export async function readMarginAddress(): Promise<Address> {
  await assertMonadRpc()
  const routerCode = await publicClient.getCode({ address: KURU_ROUTER })
  if (!routerCode || routerCode === '0x') throw new Error('Kuru router is not deployed at the configured mainnet address.')
  const address = await publicClient.readContract({ address: KURU_ROUTER, abi: routerAbi, functionName: 'marginAccountAddress' })
  if (address === ZERO_ADDRESS) throw new Error('Kuru router returned an empty margin-account address.')
  const marginCode = await publicClient.getCode({ address })
  if (!marginCode || marginCode === '0x') throw new Error('Kuru margin account has no contract code on Monad mainnet.')
  return address
}

export function makeWalletClient(provider: EIP1193Provider): WalletClient {
  return createWalletClient({ chain: monad, transport: custom(provider) })
}

export function shortAddress(address?: string) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '—'
}

export function decimalPlaces(precision: bigint): number {
  const text = precision.toString()
  if (!/^10*$/.test(text)) throw new Error('Kuru precision is not a power of ten.')
  return text.length - 1
}

export function explorerTx(hash: string) { return `${MONAD_EXPLORER}/tx/${hash}` }
export function explorerAddress(address: string) { return `${MONAD_EXPLORER}/address/${address}` }

declare global {
  interface Window { ethereum?: EIP1193Provider & { on?: (event: string, fn: (...args: unknown[]) => void) => void; removeListener?: (event: string, fn: (...args: unknown[]) => void) => void } }
}
