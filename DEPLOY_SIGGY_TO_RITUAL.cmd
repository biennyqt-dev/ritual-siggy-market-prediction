@echo off
setlocal

cd /d "%~dp0"

echo.
echo SIGGY Ritual Testnet Deployment
echo --------------------------------
echo This helper will ask for your testnet private key without saving it to Git.
echo The key is used only for this terminal session.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$secure = Read-Host 'Paste testnet PRIVATE_KEY' -AsSecureString; " ^
  "$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure); " ^
  "try { " ^
  "  $env:PRIVATE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr); " ^
  "  if (-not $env:RITUAL_RPC_URL) { $env:RITUAL_RPC_URL = 'https://rpc.ritualfoundation.org' } " ^
  "  node scripts/verify-chain.mjs; " ^
  "  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } " ^
  "  node scripts/deploy.mjs; " ^
  "  exit $LASTEXITCODE " ^
  "} finally { " ^
  "  if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) } " ^
  "  Remove-Item Env:PRIVATE_KEY -ErrorAction SilentlyContinue " ^
  "}"

if errorlevel 1 (
  echo.
  echo Deployment failed. Check the message above.
  exit /b 1
)

echo.
echo Deployment command finished.
echo Copy SIGGY_RITUAL_CONTRACT_ADDRESS and SIGGY_RITUAL_CONTRACT_DEPLOYMENT_BLOCK into your local/Vercel environment.
exit /b 0
