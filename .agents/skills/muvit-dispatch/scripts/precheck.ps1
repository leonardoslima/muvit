param(
    [Parameter(Mandatory = $true)][string]$Workspace,
    [string]$OrcaCommand = 'orca'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Get-CandidateCount {
    param([object]$Response)
    if ($Response.ok -ne $true -or $null -eq $Response.result.issues -or $Response.result.meta.partial -ne $false -or $Response.result.truncated -ne $false -or $Response.result.meta.hasMore -ne $false) {
        throw 'Resposta incompleta ou invalida do Linear.'
    }
    return @($Response.result.issues | Where-Object {
        $_.team.key -eq 'MUV' -and
        $_.state.type -in @('triage', 'backlog', 'unstarted') -and
        -not [string]::IsNullOrWhiteSpace($_.assignee.id) -and
        @($_.labels | Where-Object { $_.name -eq 'agent_ready' }).Count -gt 0 -and
        @($_.labels | Where-Object { $_.name -in @('agent_in_progress', 'agent_blocked', 'agent_review') }).Count -eq 0
    }).Count
}

try {
    # me e resolvido pela conexao autenticada do Orca, sem nome ou ID pessoal fixo.
    $raw = & $OrcaCommand linear list-issues --team MUV --label agent_ready --assignee me --workspace $Workspace --json
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao consultar os cards do usuario autenticado.' }
    $response = ($raw -join [Environment]::NewLine) | ConvertFrom-Json
    $count = Get-CandidateCount -Response $response
    if ($count -gt 0) { Write-Output "Cards candidatos do usuario autenticado: $count"; exit 0 }
    Write-Output 'Nenhum card aberto com agent_ready atribuido ao usuario autenticado.'
    exit 1
} catch {
    [Console]::Error.WriteLine('Falha no pre-check: ' + $_.Exception.Message)
    exit 2
}
