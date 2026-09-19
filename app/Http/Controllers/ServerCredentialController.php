<?php

namespace App\Http\Controllers;

use App\Models\Server;
use App\Models\ServerCredential;
use App\Models\Workspace;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ServerCredentialController extends Controller
{
    public function store(Request $request, Workspace $workspace, Server $server): RedirectResponse
    {
        $this->authorize('manageServers', $workspace);
        abort_unless($server->belongsToWorkspace($workspace), 404);

        $data = $this->validated($request);

        $server->credentials()->create($data);

        return back()->with('status', 'Compte ajouté.');
    }

    public function update(Request $request, Workspace $workspace, Server $server, ServerCredential $serverCredential): RedirectResponse
    {
        $this->authorize('manageServers', $workspace);
        abort_unless($server->belongsToWorkspace($workspace) && $serverCredential->server_id === $server->id, 404);

        $data = $this->validated($request, $serverCredential);

        $serverCredential->update($data);

        return back()->with('status', 'Compte mis à jour.');
    }

    public function destroy(Workspace $workspace, Server $server, ServerCredential $serverCredential): RedirectResponse
    {
        $this->authorize('manageServers', $workspace);
        abort_unless($server->belongsToWorkspace($workspace) && $serverCredential->server_id === $server->id, 404);

        if ($server->targetEnvironments()->where(function ($query) use ($serverCredential) {
            $query->where('ftp_credential_id', $serverCredential->id)
                ->orWhere('sftp_credential_id', $serverCredential->id);
        })->exists()) {
            return back()->with('error', 'Ce compte est utilisé par au moins un environnement et ne peut pas être supprimé.');
        }

        $serverCredential->delete();

        return back()->with('status', 'Compte supprimé.');
    }

    private function validated(Request $request, ?ServerCredential $credential = null): array
    {
        $type = $request->input('type', $credential?->type);

        $data = $request->validate([
            'type' => ['required', 'in:ftp,sftp'],
            'label' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255'],
            'password' => ['nullable', 'string'],
            'private_key' => ['nullable', 'string'],
            'passphrase' => ['nullable', 'string'],
        ]);

        // FTP classique n'a pas de notion de clé SSH (voir FtpTransport) —
        // ne jamais en stocker une pour ne pas laisser croire qu'elle sert.
        if ($data['type'] === 'ftp') {
            $data['private_key'] = null;
            $data['passphrase'] = null;

            if (($data['password'] ?? '') === '' && ! $credential) {
                throw ValidationException::withMessages(['password' => 'Le mot de passe est requis pour un compte FTP.']);
            }
            if (($data['password'] ?? '') === '') {
                unset($data['password']);
            }

            return $data;
        }

        // sftp : mot de passe ou clé, comme pour le SSH principal d'un Server.
        $hasPassword = ($data['password'] ?? '') !== '';
        $hasKey = ($data['private_key'] ?? '') !== '';

        if (! $credential && ! $hasPassword && ! $hasKey) {
            throw ValidationException::withMessages(['password' => 'Un mot de passe ou une clé privée est requis pour un compte SFTP.']);
        }

        if (! $hasPassword) {
            unset($data['password']);
        }
        if (! $hasKey) {
            unset($data['private_key']);
            unset($data['passphrase']);
        }

        return $data;
    }
}
