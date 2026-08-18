<?php

namespace App\Listeners;

use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\DB;

class ClearPendingInvitationsOnLogin
{
    public function handle(Login $event): void
    {
        DB::table('application_user')
            ->where('user_id', $event->user->id)
            ->where('invitation_pending', true)
            ->update(['invitation_pending' => false]);
    }
}
