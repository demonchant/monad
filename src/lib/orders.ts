import { getAddress, isAddress, isHash, type Address, type Hash } from 'viem'
import { orderBookAbi, publicClient } from './kuru'

export type OrderStatus = 'open' | 'partial' | 'filled' | 'cancelled' | 'partial-cancelled' | 'closed-unknown' | 'unverified' | 'pending'

export type TrackedOrder = {
  key: string
  chainId: number
  account: Address
  market: Address
  pair: string
  orderId: string
  side: 'buy' | 'sell'
  priceRaw: string
  initialSizeRaw: string
  remainingSizeRaw: string
  priceDecimals: number
  sizeDecimals: number
  sizeLabel: string
  priceLabel: string
  createdAt: number
  createdBlock: number
  transactionHash: Hash
  cancelTransactionHash?: Hash
  pendingCancelHash?: Hash
  status: OrderStatus
  lastScannedBlock: number
  historyComplete?: boolean
  observedAt?: number
  lastError?: string
}

const statuses: OrderStatus[] = ['open', 'partial', 'filled', 'cancelled', 'partial-cancelled', 'closed-unknown', 'unverified', 'pending']
const decimalInteger = (value: unknown) => typeof value === 'string' && /^\d+$/.test(value)
const naturalNumber = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

function isTrackedOrder(item: unknown): item is TrackedOrder {
  if (!item || typeof item !== 'object') return false
  const row = item as Partial<TrackedOrder>
  return row.chainId === 143 && typeof row.account === 'string' && isAddress(row.account) && typeof row.market === 'string' && isAddress(row.market) &&
    typeof row.key === 'string' && typeof row.pair === 'string' && decimalInteger(row.orderId) && (row.side === 'buy' || row.side === 'sell') &&
    decimalInteger(row.priceRaw) && decimalInteger(row.initialSizeRaw) && decimalInteger(row.remainingSizeRaw) &&
    typeof row.priceDecimals === 'number' && naturalNumber(row.priceDecimals) && row.priceDecimals <= 36 && typeof row.sizeDecimals === 'number' && naturalNumber(row.sizeDecimals) && row.sizeDecimals <= 36 &&
    typeof row.priceLabel === 'string' && typeof row.sizeLabel === 'string' && naturalNumber(row.createdAt) && naturalNumber(row.createdBlock) &&
    typeof row.transactionHash === 'string' && isHash(row.transactionHash) && statuses.includes(row.status as OrderStatus) && naturalNumber(row.lastScannedBlock) &&
    (row.cancelTransactionHash === undefined || (typeof row.cancelTransactionHash === 'string' && isHash(row.cancelTransactionHash))) &&
    (row.pendingCancelHash === undefined || (typeof row.pendingCancelHash === 'string' && isHash(row.pendingCancelHash))) &&
    (row.historyComplete === undefined || typeof row.historyComplete === 'boolean') && (row.observedAt === undefined || naturalNumber(row.observedAt)) &&
    (row.lastError === undefined || typeof row.lastError === 'string')
}

const storeKey = (account: string) => `order-steward:orders:${143}:${account.toLowerCase()}`

export function loadOrders(account: string): TrackedOrder[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storeKey(account)) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is TrackedOrder => isTrackedOrder(item) && item.account.toLowerCase() === account.toLowerCase())
  } catch { return [] }
}

export function saveOrders(account: string, orders: TrackedOrder[]) {
  localStorage.setItem(storeKey(account), JSON.stringify(orders))
}

export async function readOrder(market: Address, orderId: string, account: Address) {
  const id = Number(orderId)
  if (!Number.isSafeInteger(id) || id < 0 || BigInt(id) !== BigInt(orderId)) throw new Error('Stored Kuru order ID is outside the safe uint40 range.')
  const order = await publicClient.readContract({ address: market, abi: orderBookAbi, functionName: 's_orders', args: [id] })
  return { owner: getAddress(order[0]), remaining: order[1], price: order[5], isBuy: order[7], owned: getAddress(order[0]) === getAddress(account) }
}

type Activity = { filled: Set<string>; cancelled: Set<string> }

async function readActivity(market: Address, orders: TrackedOrder[], latestBlock: bigint): Promise<{ activity: Activity; scannedTo: number; complete: boolean }> {
  const cursors = orders.map((order) => order.lastScannedBlock || order.createdBlock)
  const oldest = Math.min(...cursors)
  const current = Number(latestBlock)
  const historyLimit = 25_000
  const start = Math.max(oldest + 1, current - historyLimit)
  const complete = start === oldest + 1
  const filled = new Set<string>()
  const cancelled = new Set<string>()
  const ids = new Set(orders.map((order) => order.orderId))
  const account = orders[0]?.account.toLowerCase()
  const chunk = 2_000

  for (let from = BigInt(start); from <= latestBlock; from += BigInt(chunk)) {
    const to = from + BigInt(chunk - 1) > latestBlock ? latestBlock : from + BigInt(chunk - 1)
    const [trades, cancels] = await Promise.all([
      publicClient.getLogs({ address: market, event: orderBookAbi[7], fromBlock: from, toBlock: to }),
      publicClient.getLogs({ address: market, event: orderBookAbi[6], fromBlock: from, toBlock: to }),
    ])
    for (const log of trades) {
      const id = log.args.orderId?.toString()
      if (id && ids.has(id) && log.args.makerAddress?.toLowerCase() === account && log.args.filledSize && log.args.filledSize > 0n) filled.add(id)
    }
    for (const log of cancels) {
      if (log.args.owner?.toLowerCase() !== account) continue
      for (const id of log.args.orderId ?? []) if (ids.has(id.toString())) cancelled.add(id.toString())
    }
  }
  return { activity: { filled, cancelled }, scannedTo: current, complete }
}

export async function reconcileOrders(orders: TrackedOrder[]): Promise<TrackedOrder[]> {
  if (!orders.length) return []
  const latestBlock = await publicClient.getBlockNumber()
  const byMarket = new Map<string, TrackedOrder[]>()
  for (const order of orders) {
    const key = order.market.toLowerCase()
    byMarket.set(key, [...(byMarket.get(key) ?? []), order])
  }

  const reconciled: TrackedOrder[] = []
  for (const [marketKey, marketOrders] of byMarket) {
    let activity: Activity = { filled: new Set(), cancelled: new Set() }
    let scannedTo = Math.min(...marketOrders.map((order) => order.lastScannedBlock || order.createdBlock))
    let historyComplete = false
    try {
      const result = await readActivity(getAddress(marketKey), marketOrders, latestBlock)
      activity = result.activity
      scannedTo = result.scannedTo
      historyComplete = result.complete
    } catch {
      // Do not advance the cursor on a provider failure: retry the missing logs next time.
    }
    for (const order of marketOrders) {
      try {
        const state = await readOrder(order.market, order.orderId, order.account)
        if (order.pendingCancelHash) {
          try {
            const receipt = await publicClient.getTransactionReceipt({ hash: order.pendingCancelHash })
            if (receipt.status === 'reverted') {
              const revertedStatus: OrderStatus = !state.owned ? 'unverified' : state.remaining > 0n && state.remaining < BigInt(order.initialSizeRaw) ? 'partial' : state.remaining > 0n ? 'open' : 'closed-unknown'
              reconciled.push({ ...order, status: revertedStatus, cancelTransactionHash: order.pendingCancelHash, pendingCancelHash: undefined, remainingSizeRaw: state.remaining.toString(), lastScannedBlock: scannedTo || order.lastScannedBlock,
                historyComplete, observedAt: Date.now(), lastError: 'Cancellation transaction reverted; current order state was read again.' })
              continue
            }
          } catch {
            reconciled.push({ ...order, status: 'pending', remainingSizeRaw: state.remaining.toString(), observedAt: Date.now(), lastError: 'Cancellation receipt is not available yet. The order stays locked against a duplicate cancel.' })
            continue
          }
        }
        let status: OrderStatus
        if (!state.owned) status = 'unverified'
        else if (state.remaining > 0n && state.remaining < BigInt(order.initialSizeRaw)) status = 'partial'
        else if (state.remaining > 0n) status = 'open'
        else if (activity.cancelled.has(order.orderId) && activity.filled.has(order.orderId)) status = 'partial-cancelled'
        else if (activity.cancelled.has(order.orderId)) status = 'cancelled'
        else if (activity.filled.has(order.orderId)) status = 'filled'
        else status = 'closed-unknown'
        reconciled.push({ ...order, status, cancelTransactionHash: order.pendingCancelHash ?? order.cancelTransactionHash, pendingCancelHash: undefined, remainingSizeRaw: state.remaining.toString(), lastScannedBlock: scannedTo || order.lastScannedBlock,
          historyComplete, observedAt: Date.now(), lastError: undefined })
      } catch (error) {
        reconciled.push({ ...order, status: 'unverified', observedAt: Date.now(), lastError: error instanceof Error ? error.message : 'Order read failed.' })
      }
    }
  }
  return reconciled.sort((a, b) => b.createdAt - a.createdAt)
}
