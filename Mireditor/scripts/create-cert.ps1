# ─── Mireditor Self-Signed Code Signing Certificate ───
# Run this script ONCE as Administrator to create a self-signing certificate.
# This will:
#   1. Create a self-signed code signing certificate
#   2. Export it as .pfx (for electron-builder)
#   3. Trust it on the local machine (reduces SmartScreen warnings locally)
#
# IMPORTANT: Self-signed certificates will NOT eliminate SmartScreen warnings
# for other users. For that you need an EV Code Signing Certificate ($300-500/year).
# But this is still useful for development and personal distribution.

param(
    [string]$CertName = "Mireditor Code Signing",
    [string]$CertPassword = "mireditor2026",
    [string]$OutputPath = ".\cert"
)

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Mireditor Code Signing Certificate Setup" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Create output directory
if (!(Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

# Step 1: Create self-signed certificate
Write-Host "[1/4] Creating self-signed certificate..." -ForegroundColor Yellow
$cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject "CN=$CertName, O=Mireditor, L=Istanbul, C=TR" `
    -KeyUsage DigitalSignature `
    -FriendlyName $CertName `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -NotAfter (Get-Date).AddYears(5) `
    -KeySpec Signature `
    -KeyLength 2048 `
    -HashAlgorithm SHA256

Write-Host "  Certificate created: $($cert.Thumbprint)" -ForegroundColor Green

# Step 2: Export as PFX
Write-Host "[2/4] Exporting as PFX..." -ForegroundColor Yellow
$pfxPath = Join-Path $OutputPath "mireditor-signing.pfx"
$securePassword = ConvertTo-SecureString -String $CertPassword -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePassword | Out-Null
Write-Host "  Exported to: $pfxPath" -ForegroundColor Green

# Step 3: Add to Trusted Root (requires admin)
Write-Host "[3/4] Adding to trusted root certificates..." -ForegroundColor Yellow
try {
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "LocalMachine")
    $store.Open("ReadWrite")
    $store.Add($cert)
    $store.Close()
    Write-Host "  Added to trusted root store" -ForegroundColor Green
} catch {
    Write-Host "  WARNING: Could not add to root store (run as Administrator)" -ForegroundColor Red
    Write-Host "  Run this command manually as admin:" -ForegroundColor Yellow
    Write-Host "  certutil -addstore Root `"$pfxPath`"" -ForegroundColor White
}

# Step 4: Also add to Trusted Publishers
Write-Host "[4/4] Adding to trusted publishers..." -ForegroundColor Yellow
try {
    $store2 = New-Object System.Security.Cryptography.X509Certificates.X509Store("TrustedPublisher", "LocalMachine")
    $store2.Open("ReadWrite")
    $store2.Add($cert)
    $store2.Close()
    Write-Host "  Added to trusted publishers store" -ForegroundColor Green
} catch {
    Write-Host "  WARNING: Could not add to publishers store (run as Administrator)" -ForegroundColor Red
}

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  DONE! Certificate ready for signing." -ForegroundColor Green
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "To use with electron-builder, set these env vars:" -ForegroundColor Yellow
Write-Host ""
Write-Host '  $env:CSC_LINK = "' -NoNewline; Write-Host "$pfxPath" -NoNewline -ForegroundColor White; Write-Host '"'
Write-Host '  $env:CSC_KEY_PASSWORD = "' -NoNewline; Write-Host "$CertPassword" -NoNewline -ForegroundColor White; Write-Host '"'
Write-Host ""
Write-Host "Or add to your build script:" -ForegroundColor Yellow
Write-Host '  cross-env CSC_LINK=./cert/mireditor-signing.pfx CSC_KEY_PASSWORD=mireditor2026 electron-builder ...' -ForegroundColor White
Write-Host ""
Write-Host "Thumbprint: $($cert.Thumbprint)" -ForegroundColor Gray
Write-Host ""
