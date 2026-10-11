$ErrorActionPreference = 'Stop'
$ffmpegCommand = Get-Command ffmpeg -ErrorAction SilentlyContinue
if ($ffmpegCommand) {
  $ffmpeg = $ffmpegCommand.Source
} else {
  $ffmpeg = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.1-full_build\bin\ffmpeg.exe'
}
$frames = Join-Path $PSScriptRoot 'promo-frames'
python (Join-Path $PSScriptRoot 'render_promo_motion.py')
if ($LASTEXITCODE -ne 0) { throw 'Promo motion graphics generation failed.' }

$ffargs = @(
  '-y', '-hide_banner', '-loglevel', 'warning',
  '-framerate', '24', '-i', (Join-Path $frames 'frame%05d.png'),
  '-i', (Join-Path $PSScriptRoot 'promo-revised.wav'),
  '-i', (Join-Path $PSScriptRoot 'promo-revised.srt'),
  '-map', '0:v:0', '-map', '1:a:0', '-map', '2:0', '-t', '30',
  '-af', 'apad=pad_dur=3.719,afade=t=out:st=25.3:d=0.9',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-c:s', 'mov_text', '-movflags', '+faststart',
  '-metadata', 'title=Order Steward 30-second motion promo',
  '-metadata', 'comment=Animated product graphics, Order Steward screen capture, owner-confirmed end-to-end workflow.',
  (Join-Path $PSScriptRoot 'OrderSteward_30_Second_Promo.mp4')
)
& $ffmpeg @ffargs
if ($LASTEXITCODE -ne 0) { throw 'Promo MP4 encoding failed.' }
$resolvedFrames = (Resolve-Path $frames).Path
$resolvedVideos = (Resolve-Path $PSScriptRoot).Path
if ($resolvedFrames.StartsWith($resolvedVideos, [System.StringComparison]::OrdinalIgnoreCase) -and (Split-Path $resolvedFrames -Leaf) -eq 'promo-frames') {
  Remove-Item -LiteralPath $resolvedFrames -Recurse -Force
}
