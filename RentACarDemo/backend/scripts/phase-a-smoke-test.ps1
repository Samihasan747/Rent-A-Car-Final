<#
.SYNOPSIS
    End-to-end smoke test for the RentACarDemo backend API.

.DESCRIPTION
    Verifies authentication, CORS, HTTP status-code mapping, the profile/account
    lifecycle and (when admin credentials are supplied) the legacy and dated
    booking lifecycles, including date-based availability.

    Exit code 0 means every executed check passed; exit code 1 means at least one
    check failed or the run could not be completed.

.PARAMETER BaseUrl
    Base URL of a running backend. Default: http://localhost:8080

.PARAMETER AdminEmail
    Email of an existing ADMIN account. When omitted, admin-only checks and the
    booking lifecycle are reported as SKIPPED (they need an admin to create the
    throw-away test car).

.PARAMETER AdminPassword
    Password for -AdminEmail. Prefer the SMOKE_ADMIN_PASSWORD environment variable
    over typing it on the command line.

.PARAMETER TimeoutSeconds
    Per-request timeout. Default: 20

.PARAMETER JarPath
    Optional path to the packaged jar. When supplied, the script starts a server on
    -ServerPort against the configured database, runs the checks and stops it.

.PARAMETER ServerPort
    Port used when -JarPath is supplied. Default: 18080

.PARAMETER DatabaseConfigPath
    Properties file used to locate MySQL for test-data cleanup.
    Default: <backend>/src/main/resources/application.properties

.EXAMPLE
    pwsh ./scripts/phase-a-smoke-test.ps1

.EXAMPLE
    $env:SMOKE_ADMIN_EMAIL = 'admin@example.com'
    $env:SMOKE_ADMIN_PASSWORD = '********'
    pwsh ./scripts/phase-a-smoke-test.ps1 -JarPath ./target/RentACarDemo-0.0.1-SNAPSHOT.jar

.NOTES
    Test configuration
    ------------------
    * Login for the test customers is always the same fixed smoke-test password
      ("SmokeTest123") and applies only to the throw-away accounts created here.
    * Test customer emails are unique per run: smoke-test-<runId>-<n>@example.com
    * With admin credentials, a dedicated car named "Smoke Test <runId>" is created
      through POST /api/admin/cars/add and is deleted again during cleanup.
    * Dated reservation checks (POST /api/bookings, date-based availability and
      cancellation) also use only that throw-away car.
    * No pre-existing user, car or booking is ever booked, renamed or deleted.

    Test data cleanup
    -----------------
    Deletes exactly:
      - bookings whose user_id belongs to this run's smoke-test users,
      - user_table rows whose email starts with smoke-test-<runId>-,
      - the car created by this run (matched by id AND name).
    Cleanup uses the MySQL client with credentials read from DatabaseConfigPath.
    Credentials are never printed. If the MySQL client is unavailable, the script
    reports the exact ids/emails that must be removed manually.

    Working directory
    -----------------
    Run the script from the backend directory; paths in the examples are relative
    to it. A short-lived scripts/.smoke-work directory holds the MySQL option file and is
    removed at the end of the run. Nothing is written to a system temp directory.
#>

[CmdletBinding()]
param(
    [string]$BaseUrl = 'http://localhost:8080',
    [string]$AdminEmail = $env:SMOKE_ADMIN_EMAIL,
    [string]$AdminPassword = $env:SMOKE_ADMIN_PASSWORD,
    [int]$TimeoutSeconds = 20,
    [string]$JarPath,
    [int]$ServerPort = 18080,
    [string]$DatabaseConfigPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $DatabaseConfigPath) {
    $DatabaseConfigPath = Join-Path $repoRoot 'src/main/resources/application.properties'
}

$runId = [guid]::NewGuid().ToString('N').Substring(0, 8)
$testPassword = 'SmokeTest123'
$workDir = Join-Path $PSScriptRoot '.smoke-work'
$createdEmails = New-Object System.Collections.Generic.List[string]
$createdCarId = $null
$results = New-Object System.Collections.Generic.List[object]
$serverProcess = $null
$baseUrlNormalized = $BaseUrl.TrimEnd('/')

function Add-Result {
    param([string]$Name, [string]$Outcome, [string]$Detail)

    $results.Add([pscustomobject]@{ Name = $Name; Outcome = $Outcome; Detail = $Detail })
    $line = '{0,-4} {1}' -f $Outcome, $Name
    if ($Detail) { $line = "$line  [$Detail]" }
    Write-Output $line
}

function Test-Check {
    param([string]$Name, [bool]$Condition, [string]$Detail)
    Add-Result -Name $Name -Outcome $(if ($Condition) { 'PASS' } else { 'FAIL' }) -Detail $Detail
}

function Add-Skip {
    param([string]$Name, [string]$Reason)
    Add-Result -Name $Name -Outcome 'SKIP' -Detail $Reason
}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        $Body = $null,
        [string]$Token = $null,
        [hashtable]$Headers = @{}
    )

    $uri = "$baseUrlNormalized$Path"
    $request = [System.Net.WebRequest]::Create($uri)
    $request.Method = $Method
    $request.Timeout = $TimeoutSeconds * 1000
    $request.AllowAutoRedirect = $false

    if ($Token) {
        [void]$request.Headers.Add('Authorization', "Bearer $Token")
    }
    foreach ($name in $Headers.Keys) {
        [void]$request.Headers.Add($name, [string]$Headers[$name])
    }

    if ($null -ne $Body) {
        $payload = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Compress -Depth 6 }
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
        $request.ContentType = 'application/json; charset=utf-8'
        $request.ContentLength = $bytes.Length
        $bodyStream = $request.GetRequestStream()
        try {
            $bodyStream.Write($bytes, 0, $bytes.Length)
        } finally {
            $bodyStream.Dispose()
        }
    }

    $response = $null
    try {
        $response = $request.GetResponse()
    } catch [System.Net.WebException] {
        $response = $_.Exception.Response
        if ($null -eq $response) { throw }
    }

    try {
        $status = [int]$response.StatusCode

        $responseStream = $response.GetResponseStream()
        try {
            $reader = New-Object System.IO.StreamReader($responseStream, [System.Text.Encoding]::UTF8)
            $text = $reader.ReadToEnd()
            $reader.Dispose()
        } finally {
            $responseStream.Dispose()
        }

        $headerValues = @{}
        foreach ($key in $response.Headers.AllKeys) {
            $headerValues[$key.ToLowerInvariant()] = $response.Headers[$key]
        }

        $json = $null
        if ($text) {
            try { $json = $text | ConvertFrom-Json } catch { }
        }

        return [pscustomobject]@{
            Status  = $status
            Body    = $text
            Json    = $json
            Headers = $headerValues
        }
    } finally {
        $response.Dispose()
    }
}

function Get-Field {
    param($Response, [string]$Name)

    if ($null -eq $Response -or $null -eq $Response.Json) { return $null }
    $property = $Response.Json.PSObject.Properties[$Name]
    if ($null -eq $property) { return $null }
    return $property.Value
}

function Get-AccountTokens {
    param([string]$Email, [string]$Password)

    $response = Invoke-Api -Method POST -Path '/auth/login' -Body @{ email = $Email; password = $Password }
    return [pscustomobject]@{
        Status = $response.Status
        Token  = (Get-Field $response 'accessToken')
    }
}

function Register-TestUser {
    param([string]$Email, [string]$Name)

    $response = Invoke-Api -Method POST -Path '/api/user/register' -Body @{
        name = $Name; email = $Email; password = $testPassword
    }
    if ($response.Status -eq 201) { $createdEmails.Add($Email) }
    return $response
}

function Read-DatabaseSettings {
    if (-not (Test-Path $DatabaseConfigPath)) { return $null }

    $properties = @{}
    foreach ($line in Get-Content $DatabaseConfigPath) {
        if ($line -match '^\s*([^#=]+?)\s*=\s*(.*?)\s*$') {
            $properties[$matches[1]] = $matches[2]
        }
    }

    $url = $properties['spring.datasource.url']
    if ($url -notmatch 'jdbc:mysql://([^:/]+):(\d+)/([^?]+)') { return $null }

    return [pscustomobject]@{
        Host     = $matches[1]
        Port     = $matches[2]
        Database = $matches[3]
        User     = $properties['spring.datasource.username']
        Password = $properties['spring.datasource.password']
    }
}

function New-MySqlOptionFile {
    param($Settings)

    if (-not (Test-Path $workDir)) {
        New-Item -ItemType Directory -Path $workDir -Force | Out-Null
    }
    $optionFile = Join-Path $workDir 'mysql.cnf'
    @"
[client]
host=$($Settings.Host)
port=$($Settings.Port)
user=$($Settings.User)
password=$($Settings.Password)
"@ | Set-Content -Path $optionFile -Encoding ASCII
    return $optionFile
}

function Invoke-MySqlQuery {
    param($Settings, [string]$Sql)

    $mysql = Get-Command mysql.exe -ErrorAction SilentlyContinue
    if (-not $mysql) { return $null }

    $optionFile = New-MySqlOptionFile -Settings $Settings
    try {
        return (& $mysql.Source "--defaults-extra-file=$optionFile" "--database=$($Settings.Database)" -N -B -e $Sql) -join "`n"
    } finally {
        Remove-Item $optionFile -Force -ErrorAction SilentlyContinue
    }
}

function Remove-TestData {
    param($Settings)

    if ($createdEmails.Count -eq 0 -and -not $createdCarId) {
        Write-Output 'No test data was created; nothing to clean up.'
        return
    }

    if (-not $Settings) {
        Write-Output 'CLEANUP WARNING: datasource settings could not be read from'
        Write-Output "                  $DatabaseConfigPath"
        Write-Output 'CLEANUP WARNING: remove these test rows manually:'
        foreach ($email in $createdEmails) { Write-Output "                  user_table.email = $email" }
        if ($createdCarId) { Write-Output "                  cars_table.car_id = $createdCarId" }
        return
    }

    if (-not (Get-Command mysql.exe -ErrorAction SilentlyContinue)) {
        Write-Output 'CLEANUP WARNING: mysql.exe was not found on PATH; remove these test rows manually:'
        foreach ($email in $createdEmails) { Write-Output "                  user_table.email = $email" }
        if ($createdCarId) { Write-Output "                  cars_table.car_id = $createdCarId" }
        return
    }

    $emailList = ($createdEmails | ForEach-Object { "'" + ($_ -replace "'", "''") + "'" }) -join ','

    if ($emailList) {
        $hasBookings = Invoke-MySqlQuery -Settings $Settings -Sql @"
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_name = 'bookings';
"@
        if ($hasBookings -and $hasBookings.Trim() -eq '1') {
            Invoke-MySqlQuery -Settings $Settings -Sql @"
DELETE FROM bookings WHERE user_id IN (SELECT user_id FROM user_table WHERE email IN ($emailList));
"@ | Out-Null
        }

        Invoke-MySqlQuery -Settings $Settings -Sql "DELETE FROM user_table WHERE email IN ($emailList);" | Out-Null
    }

    if ($createdCarId) {
        Invoke-MySqlQuery -Settings $Settings -Sql @"
DELETE FROM bookings WHERE car_id = $createdCarId;
DELETE FROM cars_table WHERE car_id = $createdCarId;
"@ | Out-Null
    }

    Write-Output ("Cleaned up {0} test user(s){1}." -f $createdEmails.Count,
        $(if ($createdCarId) { " and test car $createdCarId" } else { '' }))
}

function Start-TestServer {
    param([string]$Jar, [int]$Port)

    if (-not (Test-Path $Jar)) { throw "Jar not found: $Jar" }

    if (-not (Test-Path $workDir)) {
        New-Item -ItemType Directory -Path $workDir -Force | Out-Null
    }
    $stdout = Join-Path $workDir 'server.out.log'
    $stderr = Join-Path $workDir 'server.err.log'
    $jarFullPath = (Resolve-Path $Jar).Path

    Write-Output "Starting $jarFullPath on port $Port ..."
    $command = 'java -jar "' + $jarFullPath + '" --server.port=' + $Port +
        ' > "' + $stdout + '" 2> "' + $stderr + '"'

    # Starting through cmd.exe gives the JVM a single parent that can be killed
    # with its whole process tree (taskkill /T).
    $script:serverProcess = Start-Process -FilePath $env:ComSpec `
        -ArgumentList @('/c', $command) -PassThru -WindowStyle Hidden

    for ($attempt = 0; $attempt -lt 120; $attempt++) {
        Start-Sleep -Seconds 1
        if ($script:serverProcess.HasExited) {
            $tail = Get-Content $stderr -Tail 20 -ErrorAction SilentlyContinue
            throw "Server exited before becoming ready.`n$tail"
        }
        try {
            $probe = Invoke-Api -Method GET -Path '/api/cars'
            if ($probe.Status -eq 401) { return }
        } catch { }
    }
    throw 'Server did not become ready in time.'
}

# ---------------------------------------------------------------- preflight ---

try {
    if ($JarPath) {
        $baseUrlNormalized = "http://localhost:$ServerPort"
        Start-TestServer -Jar $JarPath -Port $ServerPort
    }

    try {
        $health = Invoke-Api -Method GET -Path '/api/cars'
        Test-Check 'Backend is reachable' ($health.Status -eq 401) "http=$($health.Status)"
        if ($health.Status -ne 401) { throw 'Backend is not reachable or is not protected as expected.' }
    } catch {
        throw "Cannot reach $baseUrlNormalized. Start the backend first or pass -JarPath. $($_.Exception.Message)"
    }

    # ------------------------------------------------------------- CORS -----

    $preflight = Invoke-Api -Method OPTIONS -Path '/api/cars' -Headers @{
        Origin                        = 'http://localhost:5173'
        'Access-Control-Request-Method'  = 'GET'
        'Access-Control-Request-Headers' = 'Authorization'
    }
    $allowedOrigin = $preflight.Headers['access-control-allow-origin']
    Test-Check 'CORS preflight allows a configured origin' `
        ($preflight.Status -eq 200 -and $allowedOrigin -eq 'http://localhost:5173') `
        "http=$($preflight.Status) origin=$allowedOrigin"

    $blockedPreflight = Invoke-Api -Method OPTIONS -Path '/api/cars' -Headers @{
        Origin                       = 'http://not-allowed.example.com'
        'Access-Control-Request-Method' = 'GET'
    }
    Test-Check 'CORS preflight rejects an unknown origin' `
        (-not $blockedPreflight.Headers.ContainsKey('access-control-allow-origin')) `
        "http=$($blockedPreflight.Status)"

    # ------------------------------------------------------- status codes ---

    $anonymous = Invoke-Api -Method GET -Path '/api/cars'
    Test-Check 'Unauthenticated request returns 401' `
        ($anonymous.Status -eq 401 -and (Get-Field $anonymous 'statusCode') -eq 401) "http=$($anonymous.Status)"

    $invalidRegister = Invoke-Api -Method POST -Path '/api/user/register' -Body @{
        name = ''; email = 'not-an-email'; password = ''
    }
    Test-Check 'Invalid registration body returns 400 with field errors' `
        ($invalidRegister.Status -eq 400 -and $null -ne (Get-Field $invalidRegister 'fieldErrors')) `
        "http=$($invalidRegister.Status)"

    $customerOneEmail = "smoke-test-$runId-1@example.com"

    $registerOne = Register-TestUser -Email $customerOneEmail -Name "Smoke Test $runId One"
    Test-Check 'Registration returns 201' ($registerOne.Status -eq 201) "http=$($registerOne.Status)"

    $duplicateRegister = Invoke-Api -Method POST -Path '/api/user/register' -Body @{
        name = 'Smoke Test Duplicate'; email = $customerOneEmail; password = $testPassword
    }
    Test-Check 'Duplicate registration returns 409' `
        ($duplicateRegister.Status -eq 409 -and (Get-Field $duplicateRegister 'statusCode') -eq 409) `
        "http=$($duplicateRegister.Status)"

    $wrongPassword = Invoke-Api -Method POST -Path '/auth/login' -Body @{
        email = $customerOneEmail; password = 'DefinitelyWrong123'
    }
    Test-Check 'Wrong password returns 401' `
        ($wrongPassword.Status -eq 401 -and (Get-Field $wrongPassword 'statusCode') -eq 401) `
        "http=$($wrongPassword.Status)"

    $loginOne = Get-AccountTokens -Email $customerOneEmail -Password $testPassword
    Test-Check 'Valid login returns a token' `
        ($loginOne.Status -eq 200 -and [bool]$loginOne.Token) "http=$($loginOne.Status)"
    if (-not $loginOne.Token) { throw 'Cannot continue without a customer token.' }

    $tokenOne = $loginOne.Token

    $cars = Invoke-Api -Method GET -Path '/api/cars' -Token $tokenOne
    $available = Invoke-Api -Method GET -Path '/api/cars/available' -Token $tokenOne
    $me = Invoke-Api -Method GET -Path '/api/user/me' -Token $tokenOne
    Test-Check 'Existing catalogue endpoints still work' `
        ($cars.Status -eq 200 -and $available.Status -eq 200 -and $me.Status -eq 200) `
        "cars=$($cars.Status) available=$($available.Status) me=$($me.Status)"

    $adminDenied = Invoke-Api -Method GET -Path '/api/admin/user/all' -Token $tokenOne
    Test-Check 'Customer is blocked from admin endpoints with 403' `
        ($adminDenied.Status -eq 403 -and (Get-Field $adminDenied 'statusCode') -eq 403) `
        "http=$($adminDenied.Status)"

    $cancelWithoutBooking = Invoke-Api -Method POST -Path '/api/user/cancel' -Token $tokenOne
    Test-Check 'Cancel without an active booking returns 409' `
        ($cancelWithoutBooking.Status -eq 409) "http=$($cancelWithoutBooking.Status)"

    # ------------------------------------------------- profile / account ----

    $updatedEmail = "smoke-test-$runId-2@example.com"
    $profileUpdate = Invoke-Api -Method PUT -Path '/api/user/me' -Token $tokenOne -Body @{
        name = "Smoke Test $runId Updated"; email = $updatedEmail
    }
    Test-Check 'Profile update works without a password' `
        ($profileUpdate.Status -eq 200 -and (Get-Field $profileUpdate 'email') -eq $updatedEmail) `
        "http=$($profileUpdate.Status)"
    # The account was renamed; track both addresses so cleanup removes the row.
    if ($profileUpdate.Status -eq 200) { $createdEmails.Add($updatedEmail) }

    $meAfterEmailChange = Invoke-Api -Method GET -Path '/api/user/me' -Token $tokenOne
    Test-Check 'Existing token survives an email change' `
        ($meAfterEmailChange.Status -eq 200 -and (Get-Field $meAfterEmailChange 'email') -eq $updatedEmail) `
        "http=$($meAfterEmailChange.Status)"

    # A second account exists so the email-conflict check below is real.
    $customerTwoEmail = "smoke-test-$runId-3@example.com"
    $registerTwo = Register-TestUser -Email $customerTwoEmail -Name "Smoke Test $runId Two"
    Test-Check 'Second test account can be registered' `
        ($registerTwo.Status -eq 201) "http=$($registerTwo.Status)"

    $crossAccountEmail = "smoke-test-$runId-4@example.com"
    $registerThree = Register-TestUser -Email $crossAccountEmail -Name "Smoke Test $runId Three"
    if ($registerThree.Status -eq 201) {
        $conflictUpdate = Invoke-Api -Method PUT -Path '/api/user/me' -Token $tokenOne -Body @{
            name = 'Smoke Test Conflict'; email = $crossAccountEmail
        }
        Test-Check 'Profile update to another account email returns 409' `
            ($conflictUpdate.Status -eq 409) "http=$($conflictUpdate.Status)"
    }

    # -------------------------------------------------- admin + bookings ----

    $hasAdminCredentials = [bool]$AdminEmail -and [bool]$AdminPassword
    if (-not $hasAdminCredentials) {
        Add-Skip 'Admin checks' 'no -AdminEmail/-AdminPassword supplied'
        Add-Skip 'Booking lifecycle' 'needs an admin to create a throw-away car'
    } else {
        $adminLogin = Get-AccountTokens -Email $AdminEmail -Password $AdminPassword
        Test-Check 'Admin login succeeds' `
            ($adminLogin.Status -eq 200 -and [bool]$adminLogin.Token) "http=$($adminLogin.Status)"

        if (-not $adminLogin.Token) {
            Add-Skip 'Admin checks' 'admin login failed'
            Add-Skip 'Booking lifecycle' 'admin login failed'
        } else {
            $adminToken = $adminLogin.Token

            $userList = Invoke-Api -Method GET -Path '/api/admin/user/all' -Token $adminToken
            Test-Check 'Admin can list users' ($userList.Status -eq 200) "http=$($userList.Status)"

            $createCar = Invoke-Api -Method POST -Path '/api/admin/cars/add' -Token $adminToken -Body @{
                name = "Smoke Test $runId"; model = 'Smoke Model'; price = 100.00
            }
            $newCarId = Get-Field $createCar 'id'
            Test-Check 'Admin can create the throw-away test car' `
                ($createCar.Status -eq 201 -and $null -ne $newCarId) "http=$($createCar.Status)"

            if ($createCar.Status -eq 201 -and $newCarId) {
                $createdCarId = [long]$newCarId
                $carPath = "/api/user/book/$createdCarId"

                $book = Invoke-Api -Method POST -Path $carPath -Token $tokenOne
                Test-Check 'Legacy booking of the test car returns 200' `
                    ($book.Status -eq 200) "http=$($book.Status)"

                $bookAgain = Invoke-Api -Method POST -Path $carPath -Token $tokenOne
                Test-Check 'Booking the same car twice returns 409' `
                    ($bookAgain.Status -eq 409) "http=$($bookAgain.Status)"

                $meBooked = Invoke-Api -Method GET -Path '/api/user/me' -Token $tokenOne
                Test-Check 'GET /me exposes the booked car' `
                    ($meBooked.Status -eq 200 -and $null -ne (Get-Field $meBooked 'bookedCar')) `
                    "http=$($meBooked.Status)"

                $cancel = Invoke-Api -Method POST -Path '/api/user/cancel' -Token $tokenOne
                Test-Check 'Cancelling the active booking returns 200' `
                    ($cancel.Status -eq 200) "http=$($cancel.Status)"

                $cancelAgain = Invoke-Api -Method POST -Path '/api/user/cancel' -Token $tokenOne
                Test-Check 'Cancelling twice returns 409' `
                    ($cancelAgain.Status -eq 409) "http=$($cancelAgain.Status)"

                # ------------------------------------- Phase B: dated bookings ---

                $startDate = (Get-Date).Date.AddDays(10).ToString('yyyy-MM-dd')
                $endDate = (Get-Date).Date.AddDays(12).ToString('yyyy-MM-dd')
                $overlapStart = (Get-Date).Date.AddDays(11).ToString('yyyy-MM-dd')
                $adjacentStart = (Get-Date).Date.AddDays(13).ToString('yyyy-MM-dd')
                $adjacentEnd = (Get-Date).Date.AddDays(14).ToString('yyyy-MM-dd')

                $availabilityPath = "/api/cars/$createdCarId/availability?startDate=$startDate&endDate=$endDate"
                $availabilityFree = Invoke-Api -Method GET -Path $availabilityPath -Token $tokenOne
                Test-Check 'Date availability reports a free car as available' `
                    ($availabilityFree.Status -eq 200 -and (Get-Field $availabilityFree 'available') -eq $true) `
                    "http=$($availabilityFree.Status)"

                $loginTwo = Get-AccountTokens -Email $customerTwoEmail -Password $testPassword
                $tokenTwo = $loginTwo.Token

                $datedBooking = Invoke-Api -Method POST -Path '/api/bookings' -Token $tokenOne -Body @{
                    carId = $createdCarId; startDate = $startDate; endDate = $endDate
                }
                $datedBookingId = Get-Field $datedBooking 'id'
                Test-Check 'Dated booking returns 201 with inclusive pricing' `
                    ($datedBooking.Status -eq 201 -and (Get-Field $datedBooking 'days') -eq 3 -and
                        (Get-Field $datedBooking 'totalPrice') -eq 300) `
                    "http=$($datedBooking.Status) days=$(Get-Field $datedBooking 'days') total=$(Get-Field $datedBooking 'totalPrice')"

                $availabilityBusy = Invoke-Api -Method GET -Path $availabilityPath -Token $tokenOne
                Test-Check 'Date availability reports the booked range as unavailable' `
                    ($availabilityBusy.Status -eq 200 -and (Get-Field $availabilityBusy 'available') -eq $false) `
                    "http=$($availabilityBusy.Status)"

                $overlappingBooking = Invoke-Api -Method POST -Path '/api/bookings' -Token $tokenTwo -Body @{
                    carId = $createdCarId; startDate = $overlapStart; endDate = $endDate
                }
                Test-Check 'Overlapping booking returns 409' `
                    ($overlappingBooking.Status -eq 409) "http=$($overlappingBooking.Status)"

                $adjacentBooking = Invoke-Api -Method POST -Path '/api/bookings' -Token $tokenTwo -Body @{
                    carId = $createdCarId; startDate = $adjacentStart; endDate = $adjacentEnd
                }
                $adjacentBookingId = Get-Field $adjacentBooking 'id'
                Test-Check 'A second, non-overlapping future booking returns 201' `
                    ($adjacentBooking.Status -eq 201) "http=$($adjacentBooking.Status)"

                $myBookings = Invoke-Api -Method GET -Path '/api/bookings/me' -Token $tokenOne
                Test-Check 'GET /api/bookings/me lists the dated booking' `
                    ($myBookings.Status -eq 200 -and $datedBookingId -and
                        $myBookings.Body -match ('"id":' + [long]$datedBookingId + '[,}]')) `
                    "http=$($myBookings.Status)"

                $adminBookings = Invoke-Api -Method GET -Path '/api/admin/bookings?status=CONFIRMED' -Token $adminToken
                Test-Check 'Admin can list confirmed bookings' `
                    ($adminBookings.Status -eq 200 -and $datedBookingId -and
                        $adminBookings.Body -match ('"id":' + [long]$datedBookingId + '[,}]')) `
                    "http=$($adminBookings.Status)"

                $customerBookings = Invoke-Api -Method GET -Path '/api/admin/bookings' -Token $tokenOne
                Test-Check 'Customer is blocked from listing all bookings' `
                    ($customerBookings.Status -eq 403) "http=$($customerBookings.Status)"

                $foreignCancel = Invoke-Api -Method POST -Path "/api/bookings/$datedBookingId/cancel" -Token $tokenTwo
                Test-Check 'Customer cannot cancel another customer''s booking' `
                    ($foreignCancel.Status -eq 404) "http=$($foreignCancel.Status)"

                $deleteCarGuarded = Invoke-Api -Method DELETE -Path "/api/admin/cars/$createdCarId" -Token $adminToken
                Test-Check 'Car with confirmed booking cannot be deleted (409)' `
                    ($deleteCarGuarded.Status -eq 409) "http=$($deleteCarGuarded.Status)"

                $ownerCancel = Invoke-Api -Method POST -Path "/api/bookings/$datedBookingId/cancel" -Token $tokenOne
                Test-Check 'Customer can cancel their future dated booking' `
                    ($ownerCancel.Status -eq 200 -and (Get-Field $ownerCancel 'status') -eq 'CANCELLED') `
                    "http=$($ownerCancel.Status)"

                $adminCancel = Invoke-Api -Method POST -Path "/api/admin/bookings/$adjacentBookingId/cancel" -Token $adminToken
                Test-Check 'Admin can cancel a confirmed booking' `
                    ($adminCancel.Status -eq 200 -and (Get-Field $adminCancel 'status') -eq 'CANCELLED') `
                    "http=$($adminCancel.Status)"

                $deleteCar = Invoke-Api -Method DELETE -Path "/api/admin/cars/$createdCarId" -Token $adminToken
                Test-Check 'Admin can delete the throw-away test car' `
                    ($deleteCar.Status -eq 204) "http=$($deleteCar.Status)"
                if ($deleteCar.Status -eq 204) { $createdCarId = $null }
            }
        }
    }

    # ---------------------------------------------- soft delete last ------

    $softDelete = Invoke-Api -Method PATCH -Path '/api/user/me' -Token $tokenOne
    Test-Check 'Account soft delete returns 204' `
        ($softDelete.Status -eq 204) "http=$($softDelete.Status)"

    $afterDelete = Invoke-Api -Method GET -Path '/api/user/me' -Token $tokenOne
    Test-Check 'Existing token is rejected after soft delete' `
        ($afterDelete.Status -eq 401) "http=$($afterDelete.Status)"

    $loginAfterDelete = Invoke-Api -Method POST -Path '/auth/login' -Body @{
        email = $updatedEmail; password = $testPassword
    }
    Test-Check 'Deleted account cannot log in' `
        ($loginAfterDelete.Status -eq 401) "http=$($loginAfterDelete.Status)"
}
finally {
    if ($script:serverProcess -and -not $script:serverProcess.HasExited) {
        & taskkill /PID $script:serverProcess.Id /T /F 2>&1 | Out-Null
        [void]$script:serverProcess.WaitForExit(15000)
        Write-Output 'Stopped the test server.'
    }

    try {
        Remove-TestData -Settings (Read-DatabaseSettings)
    } catch {
        Write-Output "CLEANUP WARNING: $($_.Exception.Message)"
    }

    # The server log files can still be held for a moment after shutdown.
    for ($attempt = 0; $attempt -lt 10 -and (Test-Path $workDir); $attempt++) {
        if ($attempt -gt 0) { Start-Sleep -Milliseconds 300 }
        Remove-Item $workDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $workDir) {
        Write-Output "CLEANUP WARNING: could not remove $workDir"
    }

    $failed = @($results | Where-Object { $_.Outcome -eq 'FAIL' })
    $skipped = @($results | Where-Object { $_.Outcome -eq 'SKIP' })
    $passed = @($results | Where-Object { $_.Outcome -eq 'PASS' })

    Write-Output ''
    Write-Output ("SUMMARY: {0} passed, {1} failed, {2} skipped" -f $passed.Count, $failed.Count, $skipped.Count)
    if ($failed.Count -gt 0) {
        Write-Output 'FAILED CHECKS:'
        foreach ($failure in $failed) { Write-Output ("  - {0} [{1}]" -f $failure.Name, $failure.Detail) }
    }
    if ($skipped.Count -gt 0) {
        Write-Output 'SKIPPED CHECKS:'
        foreach ($skip in $skipped) { Write-Output ("  - {0} [{1}]" -f $skip.Name, $skip.Detail) }
    }

    if ($failed.Count -gt 0) { exit 1 }
    exit 0
}
