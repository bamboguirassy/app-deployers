<tr>
<td>
<table class="footer" align="center" width="570" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td class="content-cell" align="center">
{{ Illuminate\Mail\Markdown::parse($slot) }}
<p class="support">{{ __('Une question ?') }} <a href="mailto:{{ config('mail.support_address') }}">{{ config('mail.support_address') }}</a></p>
</td>
</tr>
</table>
</td>
</tr>
