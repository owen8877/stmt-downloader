param(
    [Parameter(Mandatory=$true)]
    [string]$name,
    [Parameter()]
    [switch]$watch
)

$bannerPath = "src\$name\banner.ts"
$inputFile = "src\$name\index.ts"
$outputFile = "dist\$name.user.js"

if (-Not (Test-Path $bannerPath)) {
    Write-Error "Banner file '$bannerPath' does not exist."
    exit 1
}
if (-Not (Test-Path $inputFile)) {
    Write-Error "Input file '$inputFile' does not exist."
    exit 1
}

$banner = Get-Content -Raw -Path $bannerPath
$iifeStart = "(function () {
'use strict';
";
$footer = "
})();";
$full_banner = $banner + $iifeStart;


$bunArgs = @(
    "build", $inputFile,
    "--outfile=$outputFile",
    "--target=browser",
    "--banner=$full_banner",
    "--footer=$footer"
)

if ($watch) {
    $bunArgs += "--watch"
}

bun @bunArgs