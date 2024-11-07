// v-79 Cria um nome dinâmico para o cache, incluindo um identificador de versão
//cada alteração neste arquivo vai gerar uma nova versão do cache funciona tanto aqui no vscode quando no github
//entao o site e atualizado quando o usuario fecha o navegador no smartphone, no pc nen precisa fechar
// Mude esta versão manualmente a cada alteração relevante
const CACHE_VERSION = 'v1.0.4'; //subindo e baixando repositorio da nuvem
const CACHE_NAME = `meu-site-cache-${CACHE_VERSION}`;
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

// Instala e faz o cache dos arquivos da nova versão
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache atualizado com sucesso!');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
            .catch((error) => console.error('Falha ao adicionar arquivos ao cache:', error))
    );
});

// Ativa o novo Service Worker e limpa caches antigos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            )
        )
    );
    return self.clients.claim(); // Assume controle da página imediatamente
});

// Verifica e atualiza automaticamente os usuários com versões desatualizadas
self.addEventListener('fetch', (event) => {
    // Verifica se o método é GET; se não for, ignora o cache
    if (event.request.method !== 'GET') {
        return;
    }

    const requestUrl = event.request.url;

    if (requestUrl.includes('gist.githubusercontent.com')) {
        // Busca diretamente sem usar cache para o Gist
        event.respondWith(fetch(event.request));
    } else {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                if (event.request.url.startsWith('http')) {
                    return fetch(event.request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            const responseClone = networkResponse.clone();

                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseClone).catch((error) => {
                                    console.warn('Falha ao salvar no cache:', error);
                                });
                            });
                        }
                        return networkResponse;
                    }).catch((error) => {
                        console.error('Erro ao buscar recurso:', error);
                        throw error;
                    });
                }

                return fetch(event.request);
            })
        );
    }
});
