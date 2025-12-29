<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Allow all origins during development
    'allowed_origins' => ['*'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,
];
// Sources
// cors config created using Claude (Sonnet 4.5)
// https://claude.ai/share/e78dc531-7d4d-45f5-8a4b-7eba06775ded
