$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
$items = @(
    @{ Name='muscle'; Source='C:\Users\Admin\Desktop\一秒八刀新关卡素材\铁笼内角色待机动画\肌肉黄衣服悟空.mp4' },
    @{ Name='godzilla'; Source='C:\Users\Admin\Desktop\一秒八刀新关卡素材\铁笼内角色待机动画\哥斯拉待机.mp4' }
)
$target = Join-Path $PSScriptRoot 'raw-idle'
New-Item -ItemType Directory -Path $target -Force | Out-Null
foreach ($item in $items) {
    $player = [System.Windows.Media.MediaPlayer]::new()
    try {
        $player.Open([Uri]::new($item.Source))
        $player.Play()
        for ($n = 0; $n -lt 100 -and $player.NaturalVideoWidth -eq 0; $n++) {
            Start-Sleep -Milliseconds 100
            [System.Windows.Threading.Dispatcher]::CurrentDispatcher.Invoke([Action]{}, [System.Windows.Threading.DispatcherPriority]::Background)
        }
        if ($player.NaturalVideoWidth -eq 0) { throw "Cannot decode $($item.Source)" }
        $player.Pause()
        for ($frame = 0; $frame -lt 8; $frame++) {
            $player.Position = [TimeSpan]::FromMilliseconds(400 + $frame * 180)
            $player.Play()
            Start-Sleep -Milliseconds 120
            $player.Pause()
            $visual = [System.Windows.Media.DrawingVisual]::new()
            $dc = $visual.RenderOpen()
            $drawing = [System.Windows.Media.VideoDrawing]::new()
            $drawing.Player = $player
            $drawing.Rect = [System.Windows.Rect]::new(0, 0, $player.NaturalVideoWidth, $player.NaturalVideoHeight)
            $dc.DrawDrawing($drawing)
            $dc.Close()
            $bitmap = [System.Windows.Media.Imaging.RenderTargetBitmap]::new($player.NaturalVideoWidth, $player.NaturalVideoHeight, 96, 96, [System.Windows.Media.PixelFormats]::Pbgra32)
            $bitmap.Render($visual)
            $encoder = [System.Windows.Media.Imaging.PngBitmapEncoder]::new()
            $encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($bitmap))
            $output = Join-Path $target ('{0}-{1}.png' -f $item.Name,$frame)
            $stream = [System.IO.File]::Create($output)
            try { $encoder.Save($stream) } finally { $stream.Dispose() }
        }
    } finally { $player.Close() }
}
