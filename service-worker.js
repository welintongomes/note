const CACHE_NAME = `meu-site-cache-${new Date().getTime()}`; // Nome dinâmico de cache
const urlsToCache = [
    './',
    './index.html',
    './notas/icon-192x192.png',
    './notas/icon-512x512.png',
    './notas/style.css',
    './notas/script.js',

    './outros/bootstrap.bundle.min.js',
    './outros/bootstrap.min.css',
    './outros/manifest.json',
    './outros/crypto-js.min.js',

    // Arquivos na subpasta formatar
    './formatar/formatar.html',
    './formatar/formatar.css',
    './formatar/formatar.js',
    './formatar/f-192x192.png',

    // Arquivos na subpasta quiz
    './quiz/quiz.html',
    './quiz/quiz.css',
    './quiz/quiz.js',
    './quiz/acertou.mp3',
    './quiz/conclusao.mp3',
    './quiz/errou.mp3',
    './quiz/fracasso.mp3',
    './quiz/timeout.mp3',
    './quiz/q-192x192.png',
];

// Instala o service worker e faz o cache dos arquivos
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Cache inicializado com os arquivos');
                return cache.addAll(urlsToCache);
            })
    );
});

// Ativa o service worker e limpa caches antigos, se necessário
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Limpando cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Estrategia de fetch que busca atualização na rede e fallback para cache
self.addEventListener('fetch', function(event) {
    // Filtra apenas as requisições com 'http' ou 'https' no início
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                if (response) {
                    return response; // Retorna do cache se disponível
                }
                return fetch(event.request)
                    .then(function(fetchResponse) {
                        return caches.open(CACHE_NAME).then(function(cache) {
                            // Apenas cacheia as respostas 'http' ou 'https' para evitar erros
                            if (event.request.url.startsWith('http')) {
                                cache.put(event.request, fetchResponse.clone());
                            }
                            return fetchResponse;
                        });
                    });
            })
    );
});

