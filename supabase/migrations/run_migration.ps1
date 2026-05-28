$sql = @"
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications ADD CONSTRAINT applications_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'waitlisted'));
"@

# Manually build JSON to avoid ConvertTo-Json unicode escaping issues
$escapedSql = $sql.Replace("\", "\\").Replace('"', '\"').Replace("`r`n", "\n").Replace("`n", "\n")
$json = '{' + "`"query`":`"$escapedSql`"" + '}'

$bodyFile = Join-Path $env:TEMP "supabase_sql_body.json"
[System.IO.File]::WriteAllText($bodyFile, $json, [System.Text.Encoding]::UTF8)

Write-Host "Sending SQL migration to Supabase..."
$response = curl.exe -s -X POST "https://api.supabase.com/v1/projects/YOUR_PROJECT_REF/sql" -H "Authorization: Bearer YOUR_SUPABASE_PAT" -H "Content-Type: application/json" -d "@$bodyFile" 2>&1

if ($response -eq "") {
    Write-Host "Migration successful (empty response = success)"
} else {
    Write-Host "Response: $response"
}

Remove-Item $bodyFile -Force
