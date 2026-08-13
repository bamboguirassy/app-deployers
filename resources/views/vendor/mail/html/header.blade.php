@props(['url', 'level' => 'info'])
<tr>
<td class="accent-bar accent-{{ $level }}"></td>
</tr>
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block; text-decoration: none;">
<img src="{{ asset('logos/logo.svg') }}" class="logo" alt="{{ trim($slot) }}">
<span class="brand-name">{{ $slot }}</span>
</a>
</td>
</tr>
