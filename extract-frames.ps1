param(
  [string]$InputVideo = "Video.Notepad.mp4",
  [string[]]$InputVideos = @(),
  [string]$OutputDir = "frames",
  [int]$Width = 1920,
  [int]$Quality = 88
)

$ErrorActionPreference = "Stop"

function Resolve-FFmpeg {
  $cmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  $wingetPath = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin\ffmpeg.exe"
  if (Test-Path $wingetPath) {
    return $wingetPath
  }

  throw "FFmpeg not found. Install it with: winget install -e --id Gyan.FFmpeg"
}

if ($InputVideos.Count -eq 0) {
  $InputVideos = @($InputVideo)
}

foreach ($video in $InputVideos) {
  if (-not (Test-Path $video)) {
    throw "Input video not found: $video"
  }
}

$ffmpeg = Resolve-FFmpeg

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
Remove-Item (Join-Path $OutputDir "*.webp") -ErrorAction SilentlyContinue

$vf = "scale=${Width}:-1:flags=lanczos,format=yuv420p"
$nextFrameNumber = 1
$segments = @()

foreach ($video in $InputVideos) {
  $tempDir = Join-Path $env:TEMP ("spokes-frames-" + [guid]::NewGuid().ToString())
  New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

  try {
    $tempPattern = Join-Path $tempDir "frame_%04d.webp"
    & $ffmpeg -y -i $video -vf $vf -c:v libwebp -lossless 0 -q:v $Quality -compression_level 6 -preset picture -an $tempPattern

    $tempFrames = Get-ChildItem $tempDir -Filter "frame_*.webp" | Sort-Object Name
    $segmentStart = $nextFrameNumber

    foreach ($frame in $tempFrames) {
      $targetName = ("frame_{0:D4}.webp" -f $nextFrameNumber)
      Copy-Item $frame.FullName (Join-Path $OutputDir $targetName)
      $nextFrameNumber += 1
    }

    $segmentEnd = $nextFrameNumber - 1
    $segments += [ordered]@{
      sourceVideo = (Resolve-Path $video).Path
      frameCount = $tempFrames.Count
      startFrame = $segmentStart
      endFrame = $segmentEnd
    }
  } finally {
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}

$count = $nextFrameNumber - 1
$manifestPath = Join-Path $OutputDir "manifest.json"
$manifest = [ordered]@{
  frameCount = $count
  generatedAt = (Get-Date).ToString("o")
  pattern = "frame_%04d.webp"
  sources = $segments
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -Path $manifestPath -Encoding UTF8

Write-Output "Extracted $count total frames from $($InputVideos.Count) video(s) to $OutputDir"
Write-Output "Wrote manifest to $manifestPath"
