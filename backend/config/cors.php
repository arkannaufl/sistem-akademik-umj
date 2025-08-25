<?php

return [

'paths' => ['api/*', 'login'],
'allowed_origins' => ['http://localhost:5173'], // Ganti sesuai port React/Vite kamu
'allowed_methods' => ['*'],
'allowed_origins_patterns' => [],
'allowed_headers' => ['*'],
'exposed_headers' => [],
'max_age' => 0,
'supports_credentials' => false, // CSRF tidak perlu

];
