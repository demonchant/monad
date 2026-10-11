$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$out = $PSScriptRoot
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice('Microsoft Zira Desktop')
$synth.Rate = 0
$synth.Volume = 100

$tracks = @{
  'pitch-revised' = @'
On Monad, placing a spot order is only the beginning. Traders need to fund margin, sign with confidence, and know what happened to an order after it leaves the form.

Order Steward brings that journey into one Kuru trading desk. Browse the market. See wallet funds and Kuru margin side by side. Review a post-only limit order, sign it in your wallet, and follow its receipt and on-chain state.

From placing an order to checking its status or cancelling it, the workflow has been verified end to end. Your wallet stays in your hands. Every action is yours to approve.

Order Steward. A clearer path from trade intent to on-chain outcome, built for Monad.
'@
  'technical-demo-revised' = @'
Welcome to Order Steward, a Kuru spot trading desk on Monad. I open the spot desk and select a live market. The order book and market details load directly into the trading view.

The account panel keeps wallet balances and Kuru margin balances separate. When more margin is needed, I review the amount, approve the token, deposit, and confirm the updated balance.

For this MON-USDC order, I choose a side, enter a limit price and size, and review the post-only order before signing. The connected wallet authorizes the transaction. Order Steward reads the mined receipt, matches the Kuru order event, and checks the order state on chain.

The order ledger keeps the trade intent available after refresh and reconciles it against the contract. To cancel, I review the order and sign the cancellation in my wallet. The cancellation event and updated order state confirm the result.

The complete order lifecycle has been verified: fund, place, read back, reload, and cancel. Order Steward keeps the workflow clear while the trader keeps control of every signature.
'@
  'promo-revised' = @'
A limit order is more than a click. Order Steward brings Kuru spot trading on Monad into one clear flow: explore the market, see wallet and margin balances, review your order, sign with your wallet, and track the on-chain result. Place it. Follow it. Cancel with confidence. Your keys stay yours. Order Steward: trade with follow-through.
'@
}

foreach ($entry in $tracks.GetEnumerator()) {
  $path = Join-Path $out ($entry.Key + '.wav')
  $synth.SetOutputToWaveFile($path)
  $synth.Speak($entry.Value)
  $synth.SetOutputToNull()
  Write-Host "$($entry.Key): $path"
}
$synth.Dispose()
