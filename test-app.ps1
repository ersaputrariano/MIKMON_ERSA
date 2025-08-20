# Script PowerShell untuk Test Aplikasi MikroTik Monitoring
Write-Host "🔧 Testing MikroTik Monitoring App..." -ForegroundColor Cyan

# Test 1: Cek apakah server berjalan
Write-Host "`n📡 Testing Server Status..." -ForegroundColor Yellow
$backendStatus = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
$frontendStatus = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue

if ($backendStatus) {
    Write-Host "✅ Backend Server (Port 3001): RUNNING" -ForegroundColor Green
} else {
    Write-Host "❌ Backend Server (Port 3001): NOT RUNNING" -ForegroundColor Red
}

if ($frontendStatus) {
    Write-Host "✅ Frontend Server (Port 5173): RUNNING" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend Server (Port 5173): NOT RUNNING" -ForegroundColor Red
}

# Test 2: Test Login API
Write-Host "`n🔐 Testing Login API..." -ForegroundColor Yellow
try {
    $loginData = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    
    if ($response.token) {
        Write-Host "✅ Login API: SUCCESS" -ForegroundColor Green
        Write-Host "   Token: $($response.token.Substring(0, 50))..." -ForegroundColor Gray
        Write-Host "   Message: $($response.message)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Login API: No token received" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Login API: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Test Dashboard Access
Write-Host "`n🌐 Testing Dashboard Access..." -ForegroundColor Yellow
try {
    $dashboardResponse = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing
    if ($dashboardResponse.StatusCode -eq 200) {
        Write-Host "✅ Dashboard Access: SUCCESS" -ForegroundColor Green
        Write-Host "   Status Code: $($dashboardResponse.StatusCode)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ Dashboard Access: Status $($dashboardResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Dashboard Access: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Instructions
Write-Host "`n📋 Instructions:" -ForegroundColor Cyan
Write-Host "1. Buka browser dan akses: http://localhost:5173" -ForegroundColor White
Write-Host "2. Login dengan:" -ForegroundColor White
Write-Host "   Username: admin" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host "3. Jika masih putih, buka file test-login.html" -ForegroundColor White

Write-Host "`n🎯 Test selesai!" -ForegroundColor Green
