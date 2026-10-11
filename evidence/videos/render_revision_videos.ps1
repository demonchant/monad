$ErrorActionPreference = 'Stop'
$culture = [System.Globalization.CultureInfo]::InvariantCulture
$ffmpeg = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.1-full_build\bin\ffmpeg.exe'
$ffprobe = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.1-full_build\bin\ffprobe.exe'
$source = Join-Path $PSScriptRoot '..\..\1.mp4'

function Render-Cut {
  param([string]$Name, [string]$Stem, [string[]]$Specs)
  $title = Join-Path $PSScriptRoot ($Name + '-title.png')
  $ending = Join-Path $PSScriptRoot ($Name + '_end.png')
  $audio = Join-Path $PSScriptRoot ($Stem + '.wav')
  $subs = Join-Path $PSScriptRoot ($Stem + '.srt')
  $out = Join-Path $PSScriptRoot ($Name + '.mp4')
  $durationText = (& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $audio).Trim()
  $duration = [double]::Parse($durationText, $culture)
  $filters = @(
    '[1:v]trim=duration=3,setpts=PTS-STARTPTS,fps=30,format=yuv420p[title]',
    '[2:v]trim=duration=3,setpts=PTS-STARTPTS,fps=30,format=yuv420p[end]'
  )
  $labels = @('[title]')
  $total = 0.0
  $i = 0
  foreach ($spec in $Specs) {
    $part = $spec.Split(',')
    $start = [double]::Parse($part[0], $culture)
    $len = [double]::Parse($part[1], $culture)
    $tag = 'clip' + $i
    if ($part.Count -gt 2 -and $part[2] -eq 'B') {
      $filters += ('[0:v]trim=start=' + $start + ':duration=' + $len + ',setpts=PTS-STARTPTS,split=2[main' + $i + '][blurInput' + $i + '];[blurInput' + $i + ']crop=440:778:1300:0,boxblur=18:8[blurred' + $i + '];[main' + $i + '][blurred' + $i + ']overlay=1300:0,scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xF5F6EE,fps=30,setsar=1,format=yuv420p[' + $tag + ']')
    } else {
      $filters += ('[0:v]trim=start=' + $start + ':duration=' + $len + ',setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xF5F6EE,fps=30,setsar=1,format=yuv420p[' + $tag + ']')
    }
    $labels += ('[' + $tag + ']')
    $total += $len
    $i++
  }
  $labels += '[end]'
  $filters += (($labels -join '') + 'concat=n=' + $labels.Count + ':v=1:a=0[outv]')
  $filters += '[3:a]adelay=3000|3000,loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=3[outa]'
  $graph = $filters -join ';'
  Write-Host ($Name + ' rendering: narration ' + [math]::Round($duration,1) + 's; footage ' + [math]::Round($total,1) + 's')
  $ffargs = @(
    '-y', '-hide_banner', '-loglevel', 'warning',
    '-i', $source,
    '-loop', '1', '-framerate', '30', '-i', $title,
    '-loop', '1', '-framerate', '30', '-i', $ending,
    '-i', $audio, '-i', $subs,
    '-filter_complex', $graph,
    '-map', '[outv]', '-map', '[outa]', '-map', '4:0', '-t', ($duration + 6).ToString('0.000', $culture),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-c:s', 'mov_text', '-movflags', '+faststart',
    '-metadata', ('title=' + $Name + ' | Order Steward'),
    '-metadata', 'comment=Screen recording from 1.mp4; revised narration describes the owner-confirmed, verified product lifecycle.',
    $out
  )
  & $ffmpeg @ffargs
  if ($LASTEXITCODE -ne 0) { throw ('FFmpeg failed while rendering ' + $Name) }
}

Render-Cut -Name 'OrderSteward_Pitch' -Stem 'pitch-revised' -Specs @('0,5','60,7,B','81,7,B','147,6,B','164,6,B','184,5,B','211,6,B','254,3.952,B')
Render-Cut -Name 'OrderSteward_Technical_Demo' -Stem 'technical-demo-revised' -Specs @('0,7','60,8,B','68,9,B','81,8,B','147,8,B','164,10,B','184,9,B','211,8,B','254,6.832,B')
