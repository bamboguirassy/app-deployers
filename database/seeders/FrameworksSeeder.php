<?php

namespace Database\Seeders;

use App\Models\Framework;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class FrameworksSeeder extends Seeder
{
    private const CDN = 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons';

    public const FRAMEWORKS = [
        // Backend
        ['name' => 'Laravel', 'category' => 'backend', 'logo' => self::CDN.'/laravel/laravel-original.svg'],
        ['name' => 'Symfony', 'category' => 'backend', 'logo' => self::CDN.'/symfony/symfony-original.svg'],
        ['name' => 'Node.js', 'category' => 'backend', 'logo' => self::CDN.'/nodejs/nodejs-plain.svg'],
        ['name' => 'Express', 'category' => 'backend', 'logo' => self::CDN.'/express/express-original.svg'],
        ['name' => 'NestJS', 'category' => 'backend', 'logo' => self::CDN.'/nestjs/nestjs-original.svg'],
        ['name' => 'Django', 'category' => 'backend', 'logo' => self::CDN.'/django/django-plain.svg'],
        ['name' => 'Flask', 'category' => 'backend', 'logo' => self::CDN.'/flask/flask-original.svg'],
        ['name' => 'Ruby on Rails', 'category' => 'backend', 'logo' => self::CDN.'/rails/rails-plain.svg'],
        ['name' => 'Spring Boot', 'category' => 'backend', 'logo' => self::CDN.'/spring/spring-original.svg'],
        ['name' => '.NET', 'category' => 'backend', 'logo' => self::CDN.'/dotnetcore/dotnetcore-original.svg'],
        ['name' => 'Go', 'category' => 'backend', 'logo' => self::CDN.'/go/go-original.svg'],

        // Frontend
        ['name' => 'React', 'category' => 'frontend', 'logo' => self::CDN.'/react/react-original.svg'],
        ['name' => 'Vue.js', 'category' => 'frontend', 'logo' => self::CDN.'/vuejs/vuejs-original.svg'],
        ['name' => 'Angular', 'category' => 'frontend', 'logo' => self::CDN.'/angularjs/angularjs-original.svg'],
        ['name' => 'Svelte', 'category' => 'frontend', 'logo' => self::CDN.'/svelte/svelte-original.svg'],

        // Fullstack / meta-frameworks
        ['name' => 'Next.js', 'category' => 'fullstack', 'logo' => self::CDN.'/nextjs/nextjs-original.svg'],
        ['name' => 'Nuxt', 'category' => 'fullstack', 'logo' => self::CDN.'/nuxtjs/nuxtjs-original.svg'],
        ['name' => 'Remix', 'category' => 'fullstack', 'logo' => self::CDN.'/remix/remix-original.svg'],

        // Statique / CMS
        ['name' => 'Application HTML', 'category' => 'static', 'logo' => self::CDN.'/html5/html5-original.svg'],
        ['name' => 'WordPress', 'category' => 'cms', 'logo' => self::CDN.'/wordpress/wordpress-plain.svg'],

        // Mobile
        ['name' => 'React Native', 'category' => 'mobile', 'logo' => self::CDN.'/react/react-original.svg'],
        ['name' => 'Flutter', 'category' => 'mobile', 'logo' => self::CDN.'/flutter/flutter-original.svg'],

        // Autre
        ['name' => 'Docker', 'category' => 'other', 'logo' => self::CDN.'/docker/docker-original.svg'],
        ['name' => 'Autre / personnalisé', 'category' => 'other', 'logo' => self::CDN.'/bash/bash-original.svg'],
    ];

    public function run(): void
    {
        foreach (self::FRAMEWORKS as $index => $framework) {
            Framework::updateOrCreate(
                ['slug' => Str::slug($framework['name'])],
                [
                    'name' => $framework['name'],
                    'category' => $framework['category'],
                    'logo_url' => $framework['logo'],
                    'order' => $index,
                ],
            );
        }
    }
}
