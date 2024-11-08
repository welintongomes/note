// Versão do cache e nome dinâmico
const CACHE_VERSION = 'v1.0.3'; 
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

    './formatar/formatar.html',
    './formatar/formatar.css',
    './formatar/formatar.js',
    './formatar/f-192x192.png',

    './quiz/quiz.html',
    './quiz/quiz.css',
    './quiz/quiz.js',
    './quiz/acertou.mp3',
    './quiz/conclusao.mp3',
    './quiz/errou.mp3',
    './quiz/fracasso.mp3',
    './quiz/timeout.mp3',
    './quiz/q-192x192.png'
];

// Instala e cacheia os arquivos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache atualizado com sucesso!');
                return Promise.all(
                    urlsToCache.map((url) => {
                        return fetch(url)
                            .then((response) => {
                                if (response.ok) {
                                    console.log(`Recurso encontrado: ${url}`);
                                    return cache.put(url, response.clone());
                                } else {
                                    console.error(`Falha ao obter o arquivo: ${url}`);
                                }
                            })
                            .catch((error) => {
                                console.error(`Erro ao buscar arquivo ${url}:`, error);
                            });
                    })
                );
            })
            .then(() => self.skipWaiting())
            .catch((error) => console.error('Erro ao tentar abrir cache:', error))
    );
});



// Ativa o Service Worker e limpa caches antigos
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
    return self.clients.claim();
});

// Intercepta as requisições de rede
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // Ignora requisições que não sejam GET (exemplo: POST, PUT, DELETE)
    if (event.request.method !== 'GET') {
        return;
    }

    // Se a requisição for para o Gist (ou outros sites específicos), busque diretamente da rede
    if (requestUrl.hostname.includes('gist.githubusercontent.com')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Verifica se o recurso está no cache primeiro
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Se encontrado no cache, retorna a resposta cacheada
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Caso não tenha no cache, tenta buscar na rede
                if (event.request.url.startsWith('http')) {
                    return fetch(event.request)
                        .then((networkResponse) => {
                            // Se a resposta for bem-sucedida, cacheia o novo recurso
                            if (networkResponse && networkResponse.status === 200) {
                                const responseClone = networkResponse.clone();

                                caches.open(CACHE_NAME).then((cache) => {
                                    cache.put(event.request, responseClone).catch((error) => {
                                        console.warn('Falha ao salvar no cache:', error);
                                    });
                                });
                            }
                            return networkResponse || new Response('Falha na resposta da rede', {
                                status: 500,
                                statusText: 'Erro na rede',
                            }); // Caso o fetch falhe, cria uma resposta de erro
                        })
                        .catch((error) => {
                            // Se a rede falhar, retorna uma resposta alternativa (offline)
                            console.error('Erro ao buscar recurso:', error);
                            return caches.match('/offline.html') || new Response('Página não encontrada', {
                                status: 404,
                                statusText: 'Página não encontrada',
                            }); // Garantir que sempre retornará uma resposta válida
                        });
                }

                // Caso o recurso não seja HTTP (exemplo: requisições para recursos locais)
                return fetch(event.request);
            })
    );
});


