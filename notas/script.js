let db;

// Abrir ou criar o banco de dados
const request = indexedDB.open('notasDB', 1);

request.onupgradeneeded = function (event) {
    db = event.target.result;
    db.createObjectStore('notas', { keyPath: 'id', autoIncrement: true });
};

// Quando o banco de dados estiver aberto com sucesso
request.onsuccess = function (event) {
    db = event.target.result;
    // Removido: carregarNotas(); // Não carrega notas ao abrir
};

//função para exportar notas
document.getElementById('exportarNotas').onclick = function () {
    const transaction = db.transaction(['notas'], 'readonly');
    const objectStore = transaction.objectStore('notas');
    const request = objectStore.getAll();

    request.onsuccess = async function (event) {
        const notas = event.target.result;

        // Itera sobre as notas para converter as imagens em base64
        for (const nota of notas) {
            if (nota.imagem) {
                // Converte o ArrayBuffer da imagem em base64
                nota.imagem = await converterImagemParaBase64(nota.imagem);
            }
        }

        const notasJSON = JSON.stringify(notas, null, 2); // Formata as notas como JSON
        const blob = new Blob([notasJSON], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'notas.json';
        a.click();

        URL.revokeObjectURL(url); // Libera a URL
    };

    request.onerror = function (event) {
        console.error("Erro ao exportar notas:", event);
    };
};

// Função auxiliar para converter ArrayBuffer de imagem para base64
function converterImagemParaBase64(arrayBuffer) {
    return new Promise((resolve) => {
        const blob = new Blob([arrayBuffer]);
        const reader = new FileReader();
        reader.onloadend = function () {
            resolve(reader.result);
        };
        reader.readAsDataURL(blob); // Converte o Blob para base64
    });
}

// Função para abrir importar notas
document.getElementById('abrirImportar').onclick = function () {
    document.getElementById('inputImportar').click();
};

document.getElementById('inputImportar').addEventListener('change', function (event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = async function (e) {
        try {
            const notas = JSON.parse(e.target.result); // Tenta converter o conteúdo do arquivo em JSON
            const transaction = db.transaction(['notas'], 'readwrite'); // Inicia a transação
            const objectStore = transaction.objectStore('notas');

            // Cria um array para armazenar as promessas de adição
            const promises = notas.map(async (nota) => {
                // Converte a imagem de base64 para ArrayBuffer, se existir
                if (nota.imagem) {
                    nota.imagem = await converterBase64ParaArrayBuffer(nota.imagem);
                }
                return objectStore.add(nota); // Adiciona cada nota ao banco de dados
            });

            // Aguarda todas as promessas serem resolvidas
            await Promise.all(promises);
            alert('Notas importadas com sucesso!'); // Exibe o alerta após a adição
            carregarNotas(); // Chama a função para recarregar as notas
        } catch (error) {
            alert('Erro ao importar notas: ' + error.message); // Alerta em caso de erro de JSON
        }
    };

    reader.readAsText(file); // Lê o arquivo como texto
});



// Função auxiliar para converter base64 em ArrayBuffer
function converterBase64ParaArrayBuffer(base64) {
    return new Promise((resolve) => {
        const byteCharacters = atob(base64.split(',')[1]); // Remove o prefixo 'data:image/png;base64,' ou similar
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        resolve(byteArray.buffer); // Retorna o ArrayBuffer
    });
}

// Excluir todas as notas
document.getElementById('excluirTodasNotas').onclick = () => {
    const transaction = db.transaction(['notas'], 'readwrite');
    const objectStore = transaction.objectStore('notas');

    // Refatoração: Adicionei uma verificação para garantir que a ação seja confirmada
    if (confirm('Tem certeza que deseja excluir todas as notas?')) {
        objectStore.clear().onsuccess = () => {
            alert('Todas as notas foram excluídas com sucesso!');
            carregarNotas();
        };
    }
};


// Função para pesquisar notas

// Função para normalizar texto removendo acentos
function normalizarTexto(texto) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
document.getElementById('pesquisar').oninput = function () {
    const termo = normalizarTexto(this.value);
    const lista = document.getElementById('resultado');
    lista.innerHTML = ''; // Limpa a lista antes de carregar

    if (termo === '') {
        // Se a barra de pesquisa estiver vazia, não faz nada e sai da função
        return;
    }

    const transaction = db.transaction(['notas'], 'readonly');
    const objectStore = transaction.objectStore('notas');
    const request = objectStore.getAll(); // Pega todas as notas

    request.onsuccess = function (event) {
        const notas = event.target.result;
        const termosBusca = termo.split(' '); // Divide o termo em palavras

        notas.forEach(nota => {
            // Verifica se todas as palavras do termo de busca estão no título
            const tituloNormalizado = normalizarTexto(nota.titulo);
            const todasPresentes = termosBusca.every(t => tituloNormalizado.includes(t));

            if (todasPresentes) {
                criarCard(nota); // Cria um card para cada nota que atende ao critério
            }
        });
    };
};

// Carrega todas as notas ao abrir
function carregarNotas() {
    const lista = document.getElementById('resultado');
    lista.innerHTML = ''; // Limpa a lista antes de carregar

    const transaction = db.transaction(['notas'], 'readonly');
    const objectStore = transaction.objectStore('notas');
    const request = objectStore.getAll(); // Pega todas as notas

    request.onsuccess = function (event) {
        const notas = event.target.result;

        //  // Ordena as notas por data em ordem decrescente, se a data existir
        //  notas.sort((a, b) => {
        //     return new Date(b.data) - new Date(a.data);
        // });

        // Ordena as notas com base na seleção do dropdown
        const ordenacao = document.getElementById('ordenarNotas').value;
        if (ordenacao === 'dataRecente') {
            notas.sort((a, b) => new Date(b.data) - new Date(a.data)); // Data mais recente
        } else if (ordenacao === 'dataAntiga') {
            notas.sort((a, b) => new Date(a.data) - new Date(b.data)); // Data mais antiga
        } else if (ordenacao === 'alfabetica') {
            notas.sort((a, b) => a.titulo.localeCompare(b.titulo)); // Ordem alfabética
        }

        notas.forEach(nota => {
            criarCard(nota); // Cria um card para cada nota
        });
    };
}

// Adiciona o evento para atualizar a lista quando a seleção mudar
document.getElementById('ordenarNotas').addEventListener('change', carregarNotas);


//funçao para criar o card da nota
function criarCard(nota) {
    const lista = document.getElementById('resultado');

    const card = document.createElement('div');
    card.className = 'card';

    // Cria uma div para conter o título e a imagem
    const titleContainer = document.createElement('div');
    titleContainer.style.display = 'flex';
    titleContainer.style.alignItems = 'center';

    // Exibir imagem se existir
    let img;
    if (nota.imagem) {
        img = document.createElement('img');
        img.src = URL.createObjectURL(new Blob([nota.imagem]));
        img.alt = 'Nota Imagem';
        img.style.borderRadius = '3.5px';
        img.style.width = '50px'; // Ajusta a largura da imagem
        img.style.height = 'auto'; // Mantém a proporção
        img.style.marginRight = '10px'; // Espaçamento entre a imagem e o título
        titleContainer.appendChild(img);
    }

    // Título da nota
    const cardTitulo = document.createElement('strong');
    cardTitulo.textContent = nota.titulo;
    titleContainer.appendChild(cardTitulo);

    card.appendChild(titleContainer); // Adiciona o título ao card

    // Cria uma div para os botões
    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginTop = '10px'; // Espaçamento acima dos botões

    // Botão de Editar
    const btnEditar = document.createElement('button');
    btnEditar.textContent = 'Editar';
    btnEditar.className = 'btn btn-success'; // Classe Bootstrap para botão verde
    btnEditar.style.borderRadius = '8px';
    btnEditar.onclick = function (e) {
        e.stopPropagation(); // Impede que o clique propague para o card

        // Recolhe o card atual
        const card = e.target.closest('.card'); // Obtém o card mais próximo
        if (card) {
            card.classList.remove('expanded'); // Remove a classe 'expanded'
            card.querySelector('iframe').style.display = 'none'; // Esconde o conteúdo
            const existingImage = card.querySelector('.body-image');
            if (existingImage) {
                existingImage.remove(); // Remove a imagem do corpo ao colapsar
            }
        }

        // Preenche os campos de edição
        document.getElementById('titulo').value = nota.titulo;
        document.getElementById('nota').value = nota.texto;
        currentEditingId = nota.id; // Armazenar o ID da nota a ser editada
        document.getElementById('nota').focus(); // Foca na caixa de edição do título
    };
    buttonContainer.appendChild(btnEditar);

    // Botão de Excluir
    const btnExcluir = document.createElement('button');
    btnExcluir.textContent = 'Excluir';
    btnExcluir.className = 'btn btn-danger'; // Classe Bootstrap para botão vermelho
    btnExcluir.style.borderRadius = '8px';
    btnExcluir.onclick = function (e) {
        e.stopPropagation(); // Impede que o clique propague para o card
        excluirNota(nota.id); // Chama a função para excluir
    };
    buttonContainer.appendChild(btnExcluir);

    card.appendChild(buttonContainer); // Adiciona os botões ao card

    // Iframe para o conteúdo da nota
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%'; // Mantém a largura em 100%
    iframe.style.border = 'none';
    iframe.style.display = 'none'; // Inicialmente oculto
    iframe.style.height = '90vh'; // Define a altura para 90% da altura da janela
    iframe.style.marginTop = '10px'; // Espaçamento acima do iframe

    // Adiciona o iframe ao DOM antes de acessar o documento
    card.appendChild(iframe);

    // Define o conteúdo HTML do iframe após adicioná-lo ao DOM
    iframe.onload = function () {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();

        // Definir o estilo baseado no tema
        const tema = document.body.classList.contains('dark') ? 'dark' : 'light';
        const estilo = `
            <style>
                body {
                    background-color: ${tema === 'dark' ? '#222' : '#fff'};
                    color: ${tema === 'dark' ? '#fff' : '#000'};
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 10px;
                }
            </style>
        `;

        doc.write(estilo + nota.texto);
        doc.close();
    };

    // Clique para expandir ou recolher o conteúdo
    card.onclick = function () {
        // Recolhe qualquer card expandido
        const expandedCard = document.querySelector('.card.expanded');
        if (expandedCard && expandedCard !== card) {
            expandedCard.classList.remove('expanded'); // Remove a classe 'expanded'
            expandedCard.querySelector('iframe').style.display = 'none'; // Esconde o conteúdo
            const existingImage = expandedCard.querySelector('.body-image');
            if (existingImage) {
                existingImage.remove(); // Remove a imagem do corpo ao colapsar
            }
        }

        // Expande ou recolhe o card clicado
        const isExpanded = card.classList.toggle('expanded'); // Alterna a classe 'expanded'
        if (isExpanded) {
            card.style.height = 'auto'; // Expande para mostrar conteúdo
            iframe.style.display = 'block'; // Mostra o conteúdo

            // Adiciona a imagem ao corpo do card se existir e ainda não foi adicionada
            if (img && !card.querySelector('.body-image')) {
                const bodyImage = document.createElement('img');
                bodyImage.src = img.src; // Usa a mesma imagem
                bodyImage.alt = 'Nota Imagem';
                bodyImage.style.width = '100%'; // Ajusta o tamanho da imagem no corpo
                bodyImage.style.marginBottom = '10px'; // Espaçamento abaixo da imagem
                bodyImage.className = 'body-image'; // Classe para identificação
                card.insertBefore(bodyImage, iframe); // Insere a imagem antes do iframe
            }
        } else {
            card.style.height = 'auto'; // Reseta a altura
            iframe.style.display = 'none'; // Esconde o conteúdo

            // Remove a imagem do corpo ao colapsar
            const existingImage = card.querySelector('.body-image');
            if (existingImage) {
                existingImage.remove();
            }
        }
    };

    lista.appendChild(card);
}

// Variável global para armazenar o ID da nota em edição
let currentEditingId = null;

// Função para excluir uma nota
function excluirNota(id) {
    const transaction = db.transaction(['notas'], 'readwrite');
    const objectStore = transaction.objectStore('notas');
    objectStore.delete(id);
    carregarNotas(); // Atualiza a lista após excluir
}

// Função para salvar uma nova nota ou atualizar uma existente
document.getElementById('salvar').onclick = function () {
    const tituloTexto = document.getElementById('titulo').value.trim();
    const notaTexto = document.getElementById('nota').value;
    const imagemInput = document.getElementById('imagem').files[0]; // Captura o arquivo da imagem

    if (tituloTexto && notaTexto) {
        const transaction = db.transaction(['notas'], 'readonly');
        const objectStore = transaction.objectStore('notas');

        const request = objectStore.getAll(); // Pega todas as notas

        request.onsuccess = async function (event) {
            const notas = event.target.result;

            // Verifica se o título já existe e não é o título da nota que está sendo editada
            const tituloExistente = notas.some(nota =>
                nota.titulo.toLowerCase() === tituloTexto.toLowerCase() &&
                nota.id !== currentEditingId // Não considera a nota que está sendo editada
            );

            if (tituloExistente) {
                alert('Uma nota com esse título já existe!');
                return; // Impede a adição de uma nova nota com título duplicado
            }

            // Converte a imagem em um Blob, se existir
            let imagemBlob;
            if (imagemInput) {
                imagemBlob = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(imagemInput);
                });
            }

            // Transação para adicionar ou atualizar a nota
            const transactionWrite = db.transaction(['notas'], 'readwrite');
            const objectStoreWrite = transactionWrite.objectStore('notas');

            if (currentEditingId) {
                // Atualiza a nota existente
                const notaExistente = notas.find(nota => nota.id === currentEditingId);
                objectStoreWrite.put({
                    id: currentEditingId,
                    titulo: tituloTexto,
                    texto: notaTexto,
                    imagem: imagemBlob,
                    data: notaExistente.data // Mantém a data anterior
                });
                currentEditingId = null; // Limpa o ID após editar
            } else {
                // Adiciona uma nova nota com a data atual
                objectStoreWrite.add({
                    titulo: tituloTexto,
                    texto: notaTexto,
                    imagem: imagemBlob,
                    data: new Date().toISOString() // Define a data atual
                });
            }

            document.getElementById('titulo').value = '';
            document.getElementById('nota').value = '';
            document.getElementById('imagem').value = ''; // Limpa o campo da imagem
            carregarNotas(); // Carregar notas após salvar
        };
    } else {
        alert("Por favor, preencha o título e a nota.");
    }
};


document.addEventListener('click', function (event) {
    // Verifica se algum card está expandido
    const expandedCard = document.querySelector('.card.expanded');
    if (expandedCard && !expandedCard.contains(event.target)) {
        // Se o clique foi fora do card expandido, recolhe-o
        expandedCard.classList.remove('expanded');
        expandedCard.querySelector('iframe').style.display = 'none'; // Esconde o conteúdo
        const existingImage = expandedCard.querySelector('.body-image');
        if (existingImage) {
            existingImage.remove(); // Remove a imagem do corpo ao colapsar
        }
    }
});
//funçao para mudar o tema para claro ou escuro
document.getElementById('toggleTema').onclick = function () {
    document.body.classList.toggle('dark'); // Alterna a classe 'dark'
};

//tema persistente apos recarregar pagina
// Carregar a preferência do tema ao iniciar
if (localStorage.getItem('tema') === 'dark') {
    document.body.classList.add('dark');
}

// Alternar tema e salvar a preferência
document.getElementById('toggleTema').onclick = function () {
    document.body.classList.toggle('dark');

    // Alterna o ícone
    const temaIcon = document.getElementById('temaIcon');
    if (document.body.classList.contains('dark')) {
        temaIcon.textContent = '🌙'; // Ícone da lua para tema escuro
        localStorage.setItem('tema', 'dark');
    } else {
        temaIcon.textContent = '🌞'; // Ícone do sol para tema claro
        localStorage.setItem('tema', 'light');
    }
};

// Carregar a preferência do tema ao iniciar
if (localStorage.getItem('tema') === 'dark') {
    document.body.classList.add('dark');
    document.getElementById('temaIcon').textContent = '🌙'; // Define o ícone inicial
}

//service worker para funcionar offline otimizado para atualizar automaticamente com timestamp
// Registra o service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
        .then(function (registration) {
            console.log('Service Worker registrado com sucesso:', registration.scope);
            
            // Detecta atualização do service worker
            registration.onupdatefound = function () {
                const newWorker = registration.installing;

                newWorker.onstatechange = function () {
                    if (newWorker.state === 'activated') {
                        console.log('Novo Service Worker ativado. Atualizando cache.');
                        // Somente recarrega a página quando o novo SW controla a página
                        if (navigator.serviceWorker.controller) {
                            window.location.reload();
                        }
                    }
                };
            };
        }).catch(function (error) {
            console.log('Falha ao registrar o Service Worker:', error);
        });
}
//fim service worker para funcionar offline otimizado para atualizar automaticamente com timestamp

// manter a sessão dos campos de texto para nao perder ao navegar para outras abas -->

// Função para carregar o valor salvo no sessionStorage quando a página é carregada
window.addEventListener('load', function () {
    // Verifica se há algo salvo no sessionStorage com a chave 'campoTexto'
    const valorSalvo = sessionStorage.getItem('titulo');
    if (valorSalvo) {
        // Se houver valor, define o campo de texto com o valor salvo
        document.getElementById('titulo').value = valorSalvo;
    }
});
// Função para carregar o valor salvo no sessionStorage quando a página é carregada
window.addEventListener('load', function () {
    // Verifica se há algo salvo no sessionStorage com a chave 'campoTexto'
    const valorSalvo = sessionStorage.getItem('nota');
    if (valorSalvo) {
        // Se houver valor, define o campo de texto com o valor salvo
        document.getElementById('nota').value = valorSalvo;
    }
});

// Função para salvar o valor do campo de texto no sessionStorage sempre que o valor mudar
document.getElementById('titulo').addEventListener('input', function () {
    // Obtém o valor do campo de texto
    const valorAtual = this.value;
    // Salva o valor no sessionStorage com a chave 'campoTexto'
    sessionStorage.setItem('titulo', valorAtual);
});
// Função para salvar o valor do campo de texto no sessionStorage sempre que o valor mudar
document.getElementById('nota').addEventListener('input', function () {
    // Obtém o valor do campo de texto
    const valorAtual = this.value;
    // Salva o valor no sessionStorage com a chave 'campoTexto'
    sessionStorage.setItem('nota', valorAtual);
});
// Função para limpar o sessionStorage e resetar os campos
function limparSessionStorage() {
    // Limpa todos os dados do sessionStorage
    //sessionStorage.clear();

    // Reseta os campos manualmente
    document.getElementById('titulo').value = '';
    document.getElementById('nota').value = '';
}
