let db;
let score = 0;
let globalScore = 0; // Score global
let scores = {}; // Scores por categoria
let questions = [];
let currentQuestion = null;
let usedQuestions = []; // Array para rastrear perguntas já usadas
let categorias = []; // Array para armazenar categorias
let currentCategory = ""; // Armazena a categoria atual
let tempo; // Para armazenar o tempo limite
let timer; // Para gerenciar o temporizador
let shouldPenalize = false;

//gera uma cor aleatória com um intervalo para a cor nao ser muito clara nen muito escura
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color;

    do {
        color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
    } while (!isContrastedColor(color));

    return color;
}

function isContrastedColor(color) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    // Calcula a luminância
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);

    // Ajuste os limites para evitar cores muito claras e muito escuras
    return luminance > 80 && luminance < 200; // Ajuste os limites conforme necessário
}


const request = indexedDB.open("quizDB", 1);

request.onupgradeneeded = function (event) {
    db = event.target.result;
    db.createObjectStore("questions", { keyPath: "id", autoIncrement: true });
    db.createObjectStore("score", { keyPath: "id" });
};

request.onsuccess = function (event) {
    db = event.target.result;
    loadQuestions();
    loadScore();
    loadGlobalScore(); // Carrega o score global
    loadCategorias(); // Carrega as categorias no início
};

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    document.getElementById(tabName).style.display = 'block';
}
//funçao adicionar perguntas ao quiz
function addQuestion() {
    const pergunta = document.getElementById("pergunta").value;
    const respostas = Array.from(document.querySelectorAll('.resposta')).map(input => input.value);
    const respostaCorreta = document.getElementById("resposta-correta").value.toUpperCase();
    const categoria = document.getElementById("categoria").value; // Esta é a categoria da nova pergunta
    const descricaoRespostas = Array.from(document.querySelectorAll('.descricao')).map(input => input.value);

    // Verifica se todos os campos estão preenchidos corretamente
    if (pergunta && respostas.every(r => r) && ["A", "B", "C", "D"].includes(respostaCorreta) && categoria && descricaoRespostas.length === 4) {
        const transaction = db.transaction(["questions"], "readwrite");
        const store = transaction.objectStore("questions");

        store.add({
            pergunta,
            respostas,
            respostaCorreta,
            categoria,
            descricaoRespostas
        });

        // Adiciona a categoria ao array e ao dropdown de categorias se não existir
        if (!categorias.includes(categoria)) {
            categorias.push(categoria);

            // Atualiza o dropdown de categorias para filtragem
            const categoriaSelect = document.getElementById("categoria-select");
            const option = document.createElement("option");
            option.value = categoria;
            option.textContent = categoria;
            categoriaSelect.appendChild(option);

            // Também atualiza o dropdown de categorias para o quiz se necessário
            const categoriaQuizSelect = document.getElementById("categoria-quiz");
            const quizOption = document.createElement("option");
            quizOption.value = categoria;
            quizOption.textContent = categoria;
            categoriaQuizSelect.appendChild(quizOption);
        }

        clearInputFields();
        loadQuestions();
        updateDatalist(); // Atualiza o datalist após adicionar a pergunta
    } else {
        alertaErro();
        showModalMessage("Preencha todos os campos corretamente!");
    }
}

function populateQuizCategoryDropdown() {
    const categoriaSelect = document.getElementById("categoria-quiz");
    categoriaSelect.innerHTML = '<option value="all">Todas as perguntas</option>'; // Define "Todas" como primeira opção

    categorias.forEach(categoria => {
        const option = document.createElement("option");
        option.value = categoria;
        option.textContent = categoria;
        categoriaSelect.appendChild(option);
    });
}

//iniciar quiz
function startQuiz() {
    currentCategory = document.getElementById("categoria-quiz").value;
    if (!currentCategory) {
        alertaTempo();
        showModalMessage("Selecione uma categoria para começar.", 'alert');
        return;
    }

    // Carrega o score da categoria antes de começar
    loadScoreForCategory(currentCategory);

    // Obtenha o modo de jogo selecionado
    const modoJogo = document.getElementById("modo-jogo").value; // Mudamos para o novo controle deslizante

    // Define o tempo baseado no modo de jogo
    switch (modoJogo) {
        case "1": // Casual
            tempo = null; // Sem limite de tempo
            break;
        case "2": // Hard
            tempo = 10; // 10 segundos
            break;
        case "3": // Impossível
            tempo = 5; // 5 segundos
            break;
        default:
            tempo = null; // Segurança: se algo der errado
            break;
    }

    usedQuestions = [];
    document.getElementById("quiz").style.display = 'block';
    loadNextQuestion(questions.filter(q => q.categoria === currentCategory));
    loadGlobalScore(); // Carrega o score global antes de começar
}

//fim funçao adicionar perguntas ao quiz
function clearInputFields() {
    document.getElementById("pergunta").value = '';
    document.querySelectorAll('.resposta').forEach(input => input.value = '');
    document.getElementById("resposta-correta").value = '';
    document.getElementById("categoria").value = '';
}

function loadQuestions() {
    const transaction = db.transaction(["questions"], "readonly");
    const store = transaction.objectStore("questions");
    const request = store.getAll();

    request.onsuccess = function (event) {
        questions = event.target.result;
        usedQuestions = []; // Reinicia o array de perguntas usadas
        const lista = document.getElementById("lista-perguntas");
        lista.innerHTML = '';

        questions.forEach(question => {
            const li = document.createElement("li");
            li.className = "list-group-item";

            // Exibe a pergunta usando <pre> para preservar formatação
            const questionText = document.createElement("pre");
            questionText.className = "question-text";
            questionText.textContent = question.pergunta; // Mostra a pergunta formatada

            // Exibe as respostas
            const respostasText = document.createElement("div");
            respostasText.className = "respostas-text";
            question.respostas.forEach((resposta, index) => {
                const respostaItem = document.createElement("pre"); // Usando <pre> para cada resposta
                respostaItem.textContent = `Resposta ${String.fromCharCode(65 + index)}: ${resposta}`; // A, B, C, D
                respostasText.appendChild(respostaItem);
            });

            // Botões de edição e exclusão
            const buttonContainer = document.createElement("div");
            buttonContainer.className = "button-group";
            buttonContainer.style.marginLeft = "10px";

            const editButton = document.createElement("button");
            editButton.textContent = "Editar";
            editButton.className = "btn btn-warning btn-sm";
            editButton.onclick = () => {
                //cria uma funçao de focar no campo de ediçao ao clicar no botão de editar
                // Seleciona a seção de perguntas e o botão de detalhes
                const toggleButton = document.getElementById("toggleButton");
                const secPerguntas = document.getElementById("secPerguntas");

                // Simula o clique no botão "Criar Novas Perguntas" para expandir a seção
                if (secPerguntas.style.display === "none") {
                    toggleButton.click(); // Expande a seção
                }

                // Agora que a seção está expandida, foca no textarea
                setTimeout(() => {
                    const perguntaTextarea = document.getElementById("pergunta");
                    perguntaTextarea.focus();

                    // Seleciona todo o texto
                    perguntaTextarea.select();
                }, 100); // Um pequeno delay para garantir que a seção esteja visível
                // Chama a função editQuestion se necessário
                editQuestion(question.id);
            };

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Excluir";
            deleteButton.className = "btn btn-danger btn-sm";
            deleteButton.onclick = () => deleteQuestion(question.id);

            buttonContainer.appendChild(editButton);
            buttonContainer.appendChild(deleteButton);

            li.appendChild(questionText);
            li.appendChild(respostasText);
            li.appendChild(buttonContainer);
            lista.appendChild(li);
        });
    };
}

function editQuestion(id) {
    const question = questions.find(q => q.id === id);
    if (question) {
        document.getElementById("pergunta").value = question.pergunta;
        const respostaInputs = document.querySelectorAll('.resposta');
        respostaInputs.forEach((input, index) => {
            input.value = question.respostas[index];
        });
        document.getElementById("resposta-correta").value = question.respostaCorreta;
        document.getElementById("categoria").value = question.categoria;

        // Preenche os campos de descrição
        const descricaoInputs = document.querySelectorAll('.descricao'); // Se você tiver um seletor para as descrições
        descricaoInputs.forEach((input, index) => {
            input.value = question.descricaoRespostas[index];
        });

        // Atualiza o botão de adicionar para editar
        const addButton = document.getElementById("add-button");
        addButton.textContent = "Salvar Edição";
        addButton.onclick = () => saveEdit(id);
    }
}

function saveEdit(id) {
    const pergunta = document.getElementById("pergunta").value;
    const respostas = Array.from(document.querySelectorAll('.resposta')).map(input => input.value);
    const respostaCorreta = document.getElementById("resposta-correta").value.toUpperCase();
    const categoria = document.getElementById("categoria").value;
    const descricaoRespostas = Array.from(document.querySelectorAll('.descricao')).map(input => input.value);

    // Verifica se todos os campos estão preenchidos corretamente
    if (pergunta && respostas.every(r => r) && ["A", "B", "C", "D"].includes(respostaCorreta) && categoria && descricaoRespostas.length === 4) {
        const transaction = db.transaction(["questions"], "readwrite");
        const store = transaction.objectStore("questions");

        // Aqui a pergunta é salva com formatação preservada
        store.put({
            id,
            pergunta: pergunta, // Mantém a formatação
            respostas,
            respostaCorreta,
            categoria,
            descricaoRespostas
        });

        clearInputFields();
        loadQuestions();

        const addButton = document.getElementById("add-button");
        addButton.textContent = "Adicionar Pergunta";
        addButton.onclick = addQuestion;
    } else {
        alertaErro();
        showModalMessage("Preencha todos os campos corretamente!");
    }
}
//deletar perguntas
function deleteQuestion(id) {
    showConfirmationModal(
        "Você tem certeza que deseja excluir esta pergunta?", // Mensagem
        function () {
            // Ação de confirmação
            const transaction = db.transaction(["questions"], "readwrite");
            const store = transaction.objectStore("questions");
            store.delete(id);
            loadQuestions(); // Recarrega as perguntas
        },
        function () {
            console.log("Exclusão de pergunta cancelada pelo usuário."); // Ação de cancelamento
        }
    );
}
//fim deletar perguntas

//deletar todas as perguntas com confirmação
function deleteAllQuestions() {
    // Exibe o modal de confirmação com a mensagem e callbacks
    showConfirmationModal(
        "Você tem certeza que deseja excluir todas as perguntas?", // Mensagem do modal
        function () { // Callback de confirmação
            const transaction = db.transaction(["questions"], "readwrite");
            const store = transaction.objectStore("questions");

            store.clear().onsuccess = function () {
                loadQuestions(); // Recarrega a lista de perguntas
                loadCategorias(); // Atualiza as categorias
                alertaSucesso();
                showModalMessage("Todas as perguntas foram excluídas.", 'alert');
            };
        },
        function () { // Callback de cancelamento (opcional)
            console.log("Ação de exclusão de todas as perguntas foi cancelada.");
        }
    );
}
//fim deletar todas as perguntas com confirmação

function loadCategorias() {
    const transaction = db.transaction(["questions"], "readonly");
    const store = transaction.objectStore("questions");
    const request = store.getAll();

    request.onsuccess = function (event) {
        const todasAsPerguntas = event.target.result;
        categorias = []; // Limpa o array de categorias

        todasAsPerguntas.forEach(question => {
            if (!categorias.includes(question.categoria)) {
                categorias.push(question.categoria);
            }
        });

        updateDatalist(); // Atualiza o datalist com as categorias
        populateCategoryDropdown(); // Adiciona categorias ao dropdown das perguntas
        populateQuizCategoryDropdown(); // Preenche o dropdown do quiz
    };
}



function populateCategoryDropdown() {
    const categoriaSelect = document.getElementById("categoria-select");
    categoriaSelect.innerHTML = '<option value="">Todas, ou selecione alguma Categoria</option>'; // Texto alterado

    categorias.forEach(categoria => {
        const option = document.createElement("option");
        option.value = categoria;
        option.textContent = categoria;
        categoriaSelect.appendChild(option);
    });

    // Limpa a lista de perguntas quando o dropdown é populado
    const lista = document.getElementById("lista-perguntas");
    lista.innerHTML = ''; // Garante que a lista comece vazia
}

function filterQuestionsByCategory() {
    const selectedCategory = document.getElementById("categoria-select").value;

    if (selectedCategory) {
        const filteredQuestions = questions.filter(q => q.categoria === selectedCategory);
        loadFilteredQuestions(filteredQuestions);
    } else {
        loadQuestions(); // Se nenhuma categoria for selecionada, carrega todas as perguntas
    }
}
// Função de busca
// Função para normalizar texto removendo acentos e convertendo para minúsculas
function normalizarTexto(texto) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Função de busca aprimorada
function searchQuestions() {
    const searchTerm = normalizarTexto(document.getElementById("search-bar").value);
    const selectedCategory = document.getElementById("categoria-select").value;
    const searchTerms = searchTerm.split(" "); // Divide o termo de busca em palavras

    // Filtra as perguntas com base na categoria selecionada e nos termos de busca
    const filteredQuestions = questions.filter(question => {
        if (selectedCategory && question.categoria !== selectedCategory) return false; // Filtra pela categoria

        // Normaliza o texto da pergunta e das respostas
        const questionText = normalizarTexto(question.pergunta);
        const respostasText = question.respostas.map(resp => normalizarTexto(resp)).join(" ");
        const descricaoText = question.descricaoRespostas.map(desc => normalizarTexto(desc)).join(" ");

        // Verifica se todos os termos de busca estão na pergunta ou nas respostas
        return searchTerms.every(term =>
            questionText.includes(term) ||
            respostasText.includes(term) ||
            descricaoText.includes(term)
        );
    });

    // Carrega as perguntas filtradas
    loadFilteredQuestions(filteredQuestions);
}


// fim Função de busca
function loadFilteredQuestions(filteredQuestions) {//=========================================================
    const lista = document.getElementById("lista-perguntas");
    lista.innerHTML = ''; // Limpa a lista a cada nova seleção

    if (filteredQuestions.length === 0) {
        const noQuestionsMessage = document.createElement("li");
        noQuestionsMessage.className = "list-group-item";
        noQuestionsMessage.textContent = "Nenhuma pergunta encontrada para esta categoria.";
        lista.appendChild(noQuestionsMessage);
        return; // Saia da função se não houver perguntas
    }

    filteredQuestions.forEach(question => {
        const li = document.createElement("li");
        li.className = "list-group-item";

        const buttonContainer = document.createElement("div");
        buttonContainer.className = "button-group";

        const editButton = document.createElement("button");
        editButton.textContent = "Editar";
        editButton.className = "btn btn-warning btn-sm"; editButton.onclick = () => {
            // Seleciona a seção de perguntas e o botão de detalhes
            const toggleButton = document.getElementById("toggleButton");
            const secPerguntas = document.getElementById("secPerguntas");

            // Simula o clique no botão "Criar Novas Perguntas" para expandir a seção
            if (secPerguntas.style.display === "none") {
                toggleButton.click(); // Expande a seção
            }

            // Foca no textarea após um pequeno delay
            setTimeout(() => {
                const perguntaTextarea = document.getElementById("pergunta");
                perguntaTextarea.focus();

                // Seleciona todo o texto
                perguntaTextarea.select();
            }, 100); // Um pequeno delay para garantir que a seção esteja visível
            // Chama a função editQuestion se necessário
            editQuestion(question.id);
        };
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Excluir";
        deleteButton.className = "btn btn-danger btn-sm";
        deleteButton.onclick = () => deleteQuestion(question.id);

        buttonContainer.appendChild(editButton);
        buttonContainer.appendChild(deleteButton);

        // Cria um elemento para a pergunta, mostrando apenas a primeira linha
        const questionText = document.createElement("pre");
        questionText.className = "question-text";

        // Divide o texto em linhas
        const lines = question.pergunta.split('\n');
        questionText.textContent = lines[0]; // Mostra apenas a primeira linha

        // Cria um elemento para o restante do texto, incluindo respostas e descrições
        const detailsContainer = document.createElement("div");
        detailsContainer.className = "details-container";
        detailsContainer.style.display = "none"; // Oculta inicialmente

        // Adiciona o restante do texto
        const hiddenText = document.createElement("pre");
        hiddenText.className = "hidden-text";
        hiddenText.textContent = lines.slice(1).join('\n'); // O restante do texto
        detailsContainer.appendChild(hiddenText);

        // Adiciona as respostas
        const respostasText = document.createElement("pre");
        respostasText.textContent = `Respostas: ${question.respostas.join(", ")}`; // Formato das respostas
        detailsContainer.appendChild(respostasText);

        // Adiciona a descrição
        const descricaoText = document.createElement("pre");
        descricaoText.textContent = `Descrições: ${question.descricaoRespostas.join(", ")}`; // Formato das descrições
        detailsContainer.appendChild(descricaoText);

        // Adiciona um botão para mostrar/ocultar detalhes
        const toggleDetailsButton = document.createElement("button");
        toggleDetailsButton.textContent = "Mostrar Detalhes";
        toggleDetailsButton.className = "btn btn-info btn-sm";

        toggleDetailsButton.onclick = () => {
            if (detailsContainer.style.display === "none") {
                // Exibe o modal de penalização e, ao confirmar, mostra os detalhes
                showConfirmationModal(
                    "Você será penalizado em 1 ponto. Deseja continuar?", // Mensagem do modal
                    function () {
                        // Ação ao confirmar: penaliza e mostra os detalhes
                        scores[currentCategory] = (scores[currentCategory] || 0) - 1; // Penaliza o score da categoria
                        globalScore--; // Penaliza o score global

                        // Atualiza a interface
                        document.getElementById("score").textContent = scores[currentCategory]; // Atualiza o score da categoria
                        document.getElementById("global-score").textContent = globalScore; // Atualiza o score global

                        // Salva os scores atualizados
                        saveScore(); // Salva o score da categoria
                        saveGlobalScore(); // Salva o score global

                        // Mostra os detalhes
                        detailsContainer.style.display = "block";
                        toggleDetailsButton.textContent = "Ocultar Detalhes"; // Muda o texto do botão
                    },
                    function () {
                        // Ação ao cancelar
                        console.log("Usuário cancelou a penalização.");
                    }
                );
            } else {
                // Oculta os detalhes sem pedir confirmação
                detailsContainer.style.display = "none";
                toggleDetailsButton.textContent = "Mostrar Detalhes"; // Restaura o texto do botão
            }
        };

        // Adiciona o texto e o container de detalhes ao contêiner
        li.appendChild(questionText);
        li.appendChild(detailsContainer); // Adiciona o container de detalhes
        buttonContainer.appendChild(toggleDetailsButton);
        li.appendChild(buttonContainer);

        lista.appendChild(li);

    });
}
function saveGlobalScore() {
    const transaction = db.transaction(["score"], "readwrite");
    const store = transaction.objectStore("score");

    store.put({ id: 1, globalScore: globalScore, scores: scores }); // Salva o score global
}


function updateGlobalScore() {
    globalScore = Object.values(scores).reduce((acc, score) => acc + score, 0);
    document.getElementById("global-score").textContent = globalScore; // Atualiza o score global na interface
    saveGlobalScore(); // Salva o score global atualizado
}
function loadGlobalScore() {
    const transaction = db.transaction(["score"], "readonly");
    const store = transaction.objectStore("score");
    const request = store.get(1);

    request.onsuccess = function (event) {
        if (event.target.result) {
            globalScore = event.target.result.globalScore || 0; // Carrega o score global
            document.getElementById("global-score").textContent = globalScore; // Atualiza a interface
        } else {
            globalScore = 0; // Inicializa se não houver score
        }
    };
}


function updateDatalist() {
    const datalist = document.getElementById("categorias-list");
    datalist.innerHTML = ''; // Limpa o datalist existente

    categorias.forEach(categoria => {
        const option = document.createElement("option");
        option.value = categoria;
        datalist.appendChild(option);
    });
}
// relacionado ao score 
function loadScoreForCategory(categoria) {
    const transaction = db.transaction(["score"], "readonly");
    const store = transaction.objectStore("score");
    const request = store.get(1);

    request.onsuccess = function (event) {
        if (event.target.result) {
            scores = event.target.result.scores || {}; // Carrega todos os scores
            // Inicializa o score da categoria, se ainda não existir
            if (scores[categoria] === undefined) {
                scores[categoria] = 0; // Inicializa como 0
            }
            const currentCategoryScore = scores[categoria]; // Obtem o score da categoria atual
            document.getElementById("score").textContent = currentCategoryScore; // Atualiza o score na interface
        }
    };
}


function loadScore() {
    const transaction = db.transaction(["score"], "readonly");
    const store = transaction.objectStore("score");
    const request = store.get(1);

    request.onsuccess = function (event) {
        if (event.target.result) {
            scores = event.target.result.scores || {}; // Carrega scores por categoria
            const currentCategoryScore = scores[currentCategory] || 0; // Obtem o score da categoria atual
            document.getElementById("score").textContent = currentCategoryScore;
        }
    };
}

function saveScore() {
    const transaction = db.transaction(["score"], "readwrite");
    const store = transaction.objectStore("score");

    scores[currentCategory] = scores[currentCategory] || 0; // Inicializa se não existir
    store.put({ id: 1, scores: scores });
}
//resetar todo o score con confirmação

function resetScore() {
    // Exibe o modal de confirmação com a mensagem e callbacks
    showConfirmationModal(
        "Você tem certeza que deseja resetar o score?", // Mensagem de confirmação
        function () { // Callback de confirmação
            score = 0; // Reseta o score da categoria atual
            globalScore = 0; // Reseta o score global
            scores = {}; // Reseta os scores de todas as categorias

            // Atualiza a interface
            document.getElementById("score").textContent = score;
            document.getElementById("global-score").textContent = globalScore;

            // Salva o score resetado em IndexedDB
            saveScore();
            saveGlobalScore(); // Função para salvar o globalScore se necessário

            console.log("Score e globalScore foram resetados.");
        },
        function () { // Callback de cancelamento (opcional)
            console.log("Ação de reset de score foi cancelada.");
        }
    );
}

// Função para embaralhar os botões (array com as perguntas)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

async function loadNextQuestion(perguntasFiltradas) {
    const selectedCategory = document.getElementById("categoria-quiz").value;
    let perguntasDisponiveis = selectedCategory === "all" ? questions : perguntasFiltradas;

    if (usedQuestions.length === perguntasDisponiveis.length) {
        alertaConclusao();
        await showModalMessage("Você concluiu esta categoria! Para jogar novamente, inicie o quiz.", 'alert');
        usedQuestions = [];
        document.getElementById("quiz").style.display = 'none';
        return;
    }

    let availableQuestions = perguntasDisponiveis.filter((_, index) => !usedQuestions.includes(index));
    if (availableQuestions.length === 0) {
        await showModalMessage("Você concluiu esta categoria! Para jogar novamente, inicie o quiz.");
        document.getElementById("quiz").style.display = 'none';
        return;
    }

    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    currentQuestion = availableQuestions[randomIndex];
    usedQuestions.push(perguntasDisponiveis.indexOf(currentQuestion));
    // Exibe a pergunta e as opções na tela

    // HTML para a pergunta responsiva
    const perguntaHTML = `
<html>
<head>
    <style>
        body { 
            font-size: calc(18px + 1vw); /* Tamanho do texto responsivo */
            padding: 10px; 
            margin: 0; 
            box-sizing: border-box; 
            overflow-wrap: break-word;
            display: flex;
            flex-direction: column; /* Alinha os itens na coluna */
            gap: 4px; /* Espaçamento entre itens */
        }
        p { 
            margin: 0; 
            text-align: center; /* Centraliza o texto */
            display: block; /* Faz o parágrafo ocupar a largura total */
        }
        /* Estilo para o conteúdo <pre> */
        pre {
            font-family: monospace;
            font-size: calc(16px + 0.5vw);
            padding: 8px;
            border-radius: 4px;
            text-align: left;
            overflow-x: auto; /* Rolagem horizontal para conteúdo longo */
            white-space: pre; /* Impede quebra automática de linha */
            max-width: 100%; /* Mantém o <pre> dentro da largura do modal */
            box-sizing: border-box;
            width: 100%; /* Para garantir que ocupe a largura total */
        }
    </style>
</head>
<body>
    <p>${currentQuestion.pergunta}</p>
</body>
</html>
`;


    // Configura o iframe da pergunta
    const iframePergunta = document.getElementById("iframe-pergunta");
    iframePergunta.style.width = "100%";
    iframePergunta.srcdoc = perguntaHTML;

    // Ajusta a altura do iframe da pergunta automaticamente
    iframePergunta.onload = function () {
        iframePergunta.style.height = iframePergunta.contentWindow.document.body.scrollHeight + 'px';
    };


    // Limpa e embaralha as respostas antes de exibir
    const opcoesDiv = document.getElementById("opcoes");
    opcoesDiv.innerHTML = '';

    // Embaralha as respostas
    const respostasComIndices = currentQuestion.respostas.map((resposta, index) => ({ resposta, index }));
    shuffleArray(respostasComIndices);

 
    // Cria um iframe para cada resposta com estilo responsivo
    respostasComIndices.forEach(({ resposta, index }) => {
        const respostaIframe = document.createElement("iframe");
        respostaIframe.style.width = "100%";
        respostaIframe.style.border = "none";
        respostaIframe.style.borderRadius = "4px";

        const respostaHTML = `
        <html>
        <head>
            <style>
                body { 
                    font-size: calc(14px + 0.8vw); /* Tamanho do texto responsivo */
                    padding: 0;
                    margin: 0;
                    box-sizing: border-box;
                    overflow-wrap: break-word;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                button {
                    font-size: calc(16px + 1vw);
                    border-radius: 4px;
                    background-color: ${getRandomColor()}; 
                    color: white; 
                    padding: 15px; /* Aumentado de 10px para 15px */
                    border: none; 
                    cursor: pointer; 
                    width: 100%;
                    box-sizing: border-box;
                    margin-bottom: 15px; /* Espaço entre botões */
                }

                /* Estilo responsivo para <pre> com rolagem horizontal forçada */
                pre {
                    font-family: monospace;
                    font-size: calc(12px + 0.5vw);
                    padding: 8px;
                    border-radius: 4px;
                    text-align: left;
                    overflow-x: auto; /* Rolagem horizontal para conteúdo longo */
                    white-space: pre; /* Impede quebra automática de linha */
                    max-width: 100%;
                    box-sizing: border-box;
                }
            </style>
        </head>
        <body>
            <button onclick="parent.checkAnswer(${index})">${resposta}</button>
        </body>
        </html>
    `;

        respostaIframe.srcdoc = respostaHTML;

        // Ajusta a altura do iframe da resposta automaticamente
        respostaIframe.onload = function () {
            respostaIframe.style.height = respostaIframe.contentWindow.document.body.scrollHeight + 'px';
        };

        opcoesDiv.appendChild(respostaIframe);
    });
    // Chame as funções para exibir a pergunta e iniciar a leitura
    readQuestionAndAnswers();
    if (tempo) {
        startTimer(tempo);
    } else {
        document.getElementById("next-question-button").disabled = false;
    }


}
//vozes idiomas
// Seletores dos elementos dropdown
const idiomaSelect = document.getElementById("idioma");
const vozSelect = document.getElementById("voz");
let vozesDisponiveis = [];

// Função para carregar e listar todas as vozes no menu de vozes
function carregarVozes() {
    vozesDisponiveis = speechSynthesis.getVoices();

    // Verifica se as vozes foram carregadas; caso contrário, tenta novamente
    if (vozesDisponiveis.length === 0) {
        setTimeout(carregarVozes, 100);
        return;
    }

    // Limpa o menu de idiomas
    idiomaSelect.innerHTML = '';

    // Filtra idiomas únicos com base na primeira parte do código, ex.: "en", "es"
    const idiomasUnicos = [...new Set(vozesDisponiveis.map(voz => voz.lang.split("-")[0]))];
    
    // Adiciona opções ao menu de idiomas
    idiomasUnicos.forEach(idioma => {
        const option = document.createElement("option");
        option.value = idioma;
        option.textContent = idioma;
        idiomaSelect.appendChild(option);
    });

    // Exibe todas as vozes inicialmente
    atualizarVozes();
}

// Função para atualizar as vozes com base no idioma selecionado
function atualizarVozes() {
    const idiomaSelecionado = idiomaSelect.value; // Exemplo: "en" para inglês
    
    // Limpa o menu de vozes
    vozSelect.innerHTML = '';

    // Filtra e adiciona as vozes no dropdown de acordo com o idioma selecionado
    vozesDisponiveis
        .filter(voz => voz.lang.startsWith(idiomaSelecionado)) // Mostra variantes do idioma selecionado
        .forEach((voz) => {
            const option = document.createElement("option");
            option.value = voz.name;
            option.textContent = `${voz.name} (${voz.lang})`;
            vozSelect.appendChild(option);
        });
}

// Atualiza as vozes quando a lista mudar
speechSynthesis.onvoiceschanged = carregarVozes;

// Chama `atualizarVozes` sempre que o idioma é alterado
idiomaSelect.addEventListener("change", atualizarVozes);

// Carrega todas as vozes no início
carregarVozes();

//fim //vozes idiomas

// Função para sintetizar 
// Função para limpar tags HTML, caracteres especiais (&lt;...&gt;) e conteúdo dentro das tags
function cleanText(text) {
    // Cria um elemento temporário para manipular o HTML
    //funçao exelente que pega o conteudo para poder manipular antes de ler
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;

    // Remove qualquer conteúdo entre &lt; e &gt;
    tempDiv.innerHTML = tempDiv.innerHTML.replace(/&lt;[^&]*&gt;/g, '');

    // Remove qualquer conteúdo dentro das tags HTML como <h1>texto</h1>
    tempDiv.innerHTML = tempDiv.innerHTML.replace(/<[^>]*>[^<]*<\/[^>]*>/g, '');

    // Extrai apenas o texto visível do elemento
    return tempDiv.textContent || tempDiv.innerText || '';
}
// Função para sintetizar a fala
function speakText(text, callback) {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);

        utterance.lang = idiomaSelect.value;
        const vozSelecionada = vozesDisponiveis.find(voz => voz.name === vozSelect.value);
        if (vozSelecionada) utterance.voice = vozSelecionada;

        utterance.onend = callback; // Chama a função de callback quando a fala termina
        speechSynthesis.speak(utterance);
    } else {
        console.log("API de síntese de voz não é suportada neste navegador.");
    }
}

// Função para ler a pergunta e as respostas em sequência
function readQuestionAndAnswers() {
    const lerPergunta = document.getElementById("lerPerguntaCheckbox").checked;
    const lerRespostas = document.getElementById("lerRespostasCheckbox").checked;

    if (lerPergunta) {
        // Lê a pergunta primeiro, e só depois verifica se deve ler as respostas
        const textoPergunta = cleanText(currentQuestion.pergunta);
        speakText(textoPergunta, () => {
            if (lerRespostas) {
                const respostas = currentQuestion.respostas.map(cleanText);
                readAnswersSequentially(respostas, 0);
            }
        });
    } else if (lerRespostas) {
        // Se só ler respostas estiver selecionado
        const respostas = currentQuestion.respostas.map(cleanText);
        readAnswersSequentially(respostas, 0);
    }
}

// Função para ler as respostas uma por uma
function readAnswersSequentially(respostas, index) {
    if (index < respostas.length) {
        speakText(respostas[index], () => readAnswersSequentially(respostas, index + 1));
    }
}

// // Função para ler apenas a pergunta
// function readQuestion() {
//     // Interrompe qualquer leitura em andamento
//     speechSynthesis.cancel();
//     const textoLimpo = cleanText(currentQuestion.pergunta);
//     speakText(textoLimpo);

//     // Inicia a leitura das respostas após um pequeno atraso
//     setTimeout(readAnswers, 1000); // 1 segundo de atraso entre a leitura da pergunta e das respostas
// }//fim Função para ler apenas a pergunta

// // Função para ler todas as respostas em sequência
// function readAnswers() {
//     const respostas = currentQuestion.respostas.map(cleanText); // Limpa o texto de cada resposta

//     respostas.forEach((resposta, index) => {
//         setTimeout(() => {
//             speakText(resposta);
//         }, index * 2000); // Atraso de 2 segundos entre cada resposta para evitar sobreposição
//     });
// }

//fim Função para sintetizar

//funçao de timer de tempo --------------------------------------------------------------------------------
function startTimer(tempoLimite) {
    document.getElementById("timer").textContent = `Tempo restante: ${tempoLimite} segundos`; // Exibe o tempo restante
    clearInterval(timer); // Limpa qualquer temporizador anterior

    timer = setInterval(async () => {
        if (tempoLimite > 0) {
            tempoLimite--;
            document.getElementById("timer").textContent = `Tempo restante: ${tempoLimite} segundos`;
        } else {
            clearInterval(timer);
            document.getElementById("timer").textContent = "Tempo esgotado!";
            alertaTempo();
            await showModalMessage("Tempo esgotado!", 'error', 'error'); // Aguarda o fechamento do modal
            console.log("Tempo esgotado! Chamada para handleTimeOut...");
            handleTimeOut(); // Certifique-se de que esta função é chamada após o modal ser fechado
        }
    }, 1000);
}

function handleTimeOut() {
    const modoJogo = document.getElementById("modo-jogo").value;
    console.log(`Modo de jogo: ${modoJogo}`);
    console.log(`Score antes da penalidade: ${scores[currentCategory]}`);

    // Aplica penalidade de acordo com o modo de jogo numérico
    if (modoJogo === "2") { // Difícil
        scores[currentCategory] -= 1;
        console.log("Penalidade aplicada: -1 ponto (Difícil)");
    } else if (modoJogo === "3") { // Impossível
        scores[currentCategory] -= 2;
        console.log("Penalidade aplicada: -2 pontos (Impossível)");
    } else {
        console.warn(`Modo de jogo não aplica penalidade: ${modoJogo}`);
    }
    // Atualiza o score global e exibe o valor atualizado na interface
    updateGlobalScore(); // Atualiza o score global após penalidade por tempo
    document.getElementById("score").textContent = scores[currentCategory];
    console.log(`Score atualizado após penalidade: ${scores[currentCategory]}`);
    // Salva o score e carrega a próxima pergunta
    saveScore(); // Salva o score
    loadNextQuestion(questions.filter(q => q.categoria === currentCategory)); // Carrega a próxima pergunta
}
//fim funçao de timer de tempo ----------------------------------------------------------------------------

async function checkAnswer(selectedIndex) {
    const options = ["A", "B", "C", "D"];
    const selectedAnswer = options[selectedIndex];
    const respostaCorreta = currentQuestion.respostaCorreta;
    const descricao = currentQuestion.descricaoRespostas[selectedIndex];

    clearInterval(timer);
    document.getElementById("timer").textContent = "";

    if (selectedAnswer === respostaCorreta) {
        scores[currentCategory] = (scores[currentCategory] || 0) + 1; // Incrementa o score da categoria
        alertaSucesso();
        await showModalMessage(`Correto! A resposta é: ${currentQuestion.respostas[selectedIndex]}\nDescrição: ${descricao}`, 'success');
    } else {
        alertaErro();
        await showModalMessage(`Errado! A resposta correta é: ${currentQuestion.respostas[["A", "B", "C", "D"].indexOf(respostaCorreta)]}\nDescrição: ${currentQuestion.descricaoRespostas[["A", "B", "C", "D"].indexOf(respostaCorreta)]}`, 'error');

        const modoJogo = document.getElementById("modo-jogo").value;
        switch (modoJogo) {
            case "hard":
                scores[currentCategory] = (scores[currentCategory] || 0) - 1; // Decrementa o score
                globalScore--; // Penaliza o score global
                break;
            case "impossivel":
                scores[currentCategory] = (scores[currentCategory] || 0) - 2; // Decrementa o score
                globalScore -= 2; // Penaliza o score global
                break;
        }
    }

    // Não atualize o score global aqui
    document.getElementById("score").textContent = scores[currentCategory];
    saveScore(); // Salva o score da categoria
    updateGlobalScore(); // Atualiza o score global na interface e no armazenamento
    loadNextQuestion(questions.filter(q => q.categoria === currentCategory));
}

//modal com confirmação
function nextQuestion() {
    showConfirmationModal(
        "Você será penalizado em 1 ponto ao avançar para a próxima pergunta. Deseja continuar?",
        function () {
            // Ação de confirmação
            score--;
            scores[currentCategory] = (scores[currentCategory] || 0) - 1; // Penaliza o score da categoria
            globalScore--; // Penaliza o score global

            // Atualiza a interface
            document.getElementById("score").textContent = score;
            document.getElementById("global-score").textContent = globalScore;

            // Salva os scores atualizados
            saveScore();
            saveGlobalScore();

            // Carrega a próxima pergunta
            loadNextQuestion(questions.filter(q => q.categoria === currentCategory));
        },
        function () {
            console.log("Usuário cancelou a penalização."); // Ação de cancelamento
        }
    );
}

//modal reutilizavel generico
// Função de modal de confirmação genérica
function showConfirmationModal(message, onConfirm, onCancel) {
    const confirmationModal = document.getElementById("confirmationModal");
    const messageText = document.getElementById("modalMessage");
    messageText.textContent = message; // Define a mensagem personalizada
    confirmationModal.style.display = "block";

    // Executa a ação de confirmação
    document.getElementById("confirmAction").onclick = function () {
        confirmationModal.style.display = "none"; // Fecha o modal
        if (onConfirm) onConfirm(); // Executa a função de confirmação passada
    };

    // Executa a ação de cancelamento
    document.getElementById("cancelAction").onclick = function () {
        confirmationModal.style.display = "none"; // Fecha o modal
        if (onCancel) onCancel(); // Executa a função de cancelamento passada
    };

    // Fecha o modal ao clicar fora
    confirmationModal.onclick = function (event) {
        if (event.target === confirmationModal) {
            confirmationModal.style.display = "none"; // Fecha o modal
            if (onCancel) onCancel(); // Executa a função de cancelamento passada
        }
    };
}

//fim modal reutilizavel generico

function exportScore() {
    const scoreData = {
        scores: scores, // Supondo que 'scores' seja um objeto que contém os scores por categoria
        globalScore: globalScore // O score global
    };

    const json = JSON.stringify(scoreData);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "scores.json";
    a.click();

    URL.revokeObjectURL(url);
}
document.getElementById('exportarScore').onclick = exportScore;
function importScore() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                scores = data.scores; // Presume que 'scores' é a variável que armazena os scores
                globalScore = data.globalScore; // Atualiza o score global

                showModalMessage("Importação de scores concluída com sucesso!");
                // Atualize a UI, se necessário
                document.getElementById("score").textContent = scores[currentCategory];
                document.getElementById("global-score").textContent = globalScore;
            } catch (error) {
                console.error("Erro ao importar scores:", error);
                showModalMessage("Erro ao importar scores. Verifique o formato do arquivo.");
            }
        };

        reader.readAsText(file);
    };

    input.click(); // Simula um clique no input
}
document.getElementById('importarScore').onclick = importScore;

function toggleDescricao(descricaoId) {
    const descricaoInput = document.getElementById(descricaoId);
    const mostrarButton = document.querySelector(`.toggle-descricao[onclick*="${descricaoId}"]`);
    const ocultarButton = document.querySelector(`.hide-descricao[onclick*="${descricaoId}"]`);

    if (descricaoInput.style.display === 'none') {
        descricaoInput.style.display = 'block'; // Mostra a descrição
        mostrarButton.style.display = 'none'; // Esconde o botão de mostrar
        ocultarButton.style.display = 'inline'; // Mostra o botão de ocultar
    } else {
        descricaoInput.style.display = 'none'; // Esconde a descrição
        mostrarButton.style.display = 'inline'; // Mostra o botão de mostrar
        ocultarButton.style.display = 'none'; // Esconde o botão de ocultar
    }
}

//exportar local
function exportDatabase() {
    const transaction = db.transaction(["questions"], "readonly");
    const store = transaction.objectStore("questions");
    const request = store.getAll();

    request.onsuccess = function (event) {
        const data = event.target.result;
        const json = JSON.stringify(data);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "quiz.json";
        a.click();

        URL.revokeObjectURL(url);
    };
}
//fim exportar local

//import local
function importDatabase(event) {//importal local
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const json = e.target.result;
            const data = JSON.parse(json);

            const transaction = db.transaction(["questions"], "readwrite");
            const store = transaction.objectStore("questions");

            // Limpa o banco antes de importar novas perguntas
            const clearRequest = store.clear();
            clearRequest.onsuccess = function () {
                // Adiciona cada item do JSON ao banco
                data.forEach(item => {
                    store.put(item);
                });

                // Atualiza a lista de perguntas e categorias após a importação
                loadQuestions(); // Carrega as perguntas
                loadCategorias(); // Atualiza as categorias
                alertaConclusao();
                showModalMessage("Banco de dados importado com sucesso!", 'success');

            };
        } catch (error) {
            alertaTempo();
            showModalMessage("Erro ao importar o banco de dados: " + error.message);
        }
    };

    reader.readAsText(file);
}//fim importar local

// Função para limpar dados do site e retornar uma Promise
function clearSiteCache() {
    return new Promise((resolve, reject) => {
        if ('caches' in window) {
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        return caches.delete(cacheName);
                    })
                );
            }).then(() => {
                console.log("Cache do site limpo com sucesso!");
                resolve(); // Resolve a Promise
            }).catch((error) => {
                console.error("Erro ao limpar o cache do site:", error);
                reject(error); // Reject a Promise em caso de erro
            });
        } else {
            resolve(); // Resolve caso caches não esteja disponível
        }
    });
}
//fim funçao para limpar dados do site

//export nuvem

//fim Função para exportar o banco de dados para o Gist

// Função para importar dados do Gist
// IDs dos Gists públicos
const IMPORT_GIST_ID = '91b30f2ab4db553ac595d17e69c8a095'; // Substitua pelo ID do seu Gist de importação

// Função para importar dados do Gist público
function importDatabaseFromGist() {
    // Limpa o cache do site
    clearSiteCache().then(() => {
        fetch(`https://api.github.com/gists/${IMPORT_GIST_ID}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao carregar os dados do Gist');
                }
                return response.json();
            })
            .then(gistData => {
                const fileContent = gistData.files["quiz_import.json"].content; // Nome do arquivo no Gist
                const data = JSON.parse(fileContent);

                const transaction = db.transaction(["questions"], "readwrite");
                const store = transaction.objectStore("questions");

                // Limpa o banco antes de importar novas perguntas
                const clearRequest = store.clear();
                clearRequest.onsuccess = function () {
                    data.forEach(item => {
                        store.put(item);
                    });

                    loadQuestions();
                    loadCategorias();
                    alertaConclusao();
                    showModalMessage("Banco de dados importado com sucesso do Gist!", 'success');
                };
            })
            .catch(error => {
                alertaTempo();
                showModalMessage("Erro ao importar o banco de dados do Gist: " + error.message, 'error');
            });
    }).catch(error => {
        alertaTempo();
        showModalMessage("Erro ao limpar o cache: " + error.message, 'error');
    });
}//fim Função para importar dados do Gist

// Função para tocar o som nos modais
function alertaSucesso() {
    const successSound = document.getElementById("sucesso-sound");
    successSound.play(); // Toca o som de sucesso
}
function alertaErro() {
    const erroSound = document.getElementById("erro-sound");
    erroSound.play(); // Toca o som de erro
}
function alertaConclusao() {
    const erroSound = document.getElementById("conclusao-sound");
    erroSound.play(); // Toca o som de conclusão
}
function alertaTempo() {
    const erroSound = document.getElementById("tempo-sound");
    erroSound.play(); // Toca o som de tempo esgotado
}
//modal para controlar as respostas
let resolveModalPromise;

function openModal() {
    document.getElementById("modal").style.display = "block";
}
//função para fechar o modal
function closeModal() {
    const modal = document.getElementById("modal");
    modal.style.display = "none";

    // Limpa a classe para não afetar o próximo uso
    const modalContent = document.getElementById("modal-content");
    modalContent.className = "modal-content"; // Reseta as classes

    // Interrompe a leitura de voz ao fechar o modal
    speechSynthesis.cancel();

    if (resolveModalPromise) {
        resolveModalPromise(); // Resolve a promessa quando o modal é fechado
        resolveModalPromise = null; // Limpa a referência
    }
}

//fim função para fechar o modal
// Função para ler o conteúdo do modal
function readModalContent() {
    // Interrompe qualquer leitura em andamento
    speechSynthesis.cancel();

    // Obtém o conteúdo do modal e limpa o texto
    const modalIframe = document.getElementById("modal-iframe");
    const modalDoc = modalIframe.contentDocument || modalIframe.contentWindow.document;
    const modalText = modalDoc.body.innerHTML;
    const textoLimpo = cleanText(modalText);

    // Lê o texto limpo do modal
    speakText(textoLimpo);
}

//fim função para leitura do modal
/*cores para o modal padrão neutro
lembre-se sempre que for usar showModalMessage tem que por qual type de modal vai querer usar 
se nao especificar o padrão neutral será usado*/
function showModalMessage(message, type) {
    speechSynthesis.cancel();

    const lerModal = document.getElementById("lerModalCheckbox").checked;
    const formattedMessage = message.replace(/&gt;/g, '<').replace(/&lt;/g, '>');
    const modalContent = document.getElementById("modal-content");
    const iframe = document.getElementById("modal-iframe");

    // Limpa classes anteriores
    modalContent.className = "modal-content";

    // Adiciona a classe conforme o tipo de mensagem
    if (type === 'success') {
        modalContent.classList.add('success');
    } else if (type === 'error') {
        modalContent.classList.add('error');
    } else if (type === 'alert') {
        modalContent.classList.add('alert');
    } else {
        modalContent.classList.add('neutral');
    }

    // Define altura mínima temporariamente antes de calcular a altura real
    iframe.style.height = '50px'; // Altura mínima para restaurar antes de redimensionar

    // Cria um documento no iframe e escreve a mensagem
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`
        <html>
        <head>
            <style>
                body {
                    margin: 0;
                    padding: 10px;
                    font-family: Arial, sans-serif;
                    overflow-x: auto; /* Rolagem horizontal para textos longos */
                }
                .success { color: green; }
                .error { color: red; }
                .alert { color: orange; }
                .neutral { color: black; }
            </style>
        </head>
        <body>
            <div class="${type}">${formattedMessage}</div>
        </body>
        </html>
    `);
    doc.close();

    // Ajusta a altura do iframe conforme o conteúdo
    iframe.onload = () => {
        const iframeBody = doc.body;
        const contentHeight = iframeBody.scrollHeight;
        iframe.style.height = `${Math.max(contentHeight, 50)}px`; // 50px é a altura mínima para mensagens curtas
        // Espera o carregamento completo antes de iniciar a leitura do conteúdo do modal
        if(lerModal){
        setTimeout(() => {
            const cleanModalText = cleanText(formattedMessage);
            speakText(cleanModalText);
        }, 100); // Adiciona um pequeno atraso para garantir consistência
    };}
    // Exibe o modal
    document.getElementById("modal").style.display = "block";

    return new Promise((resolve) => {
        resolveModalPromise = resolve;
    });
}




// Fechar o modal ao clicar fora dele
window.onclick = function (event) {
    const modal = document.getElementById("modal");
    if (event.target === modal) {
        closeModal();
    }
};


//service worker para funcionar offline otimizado para atualizar automaticamente com timestamp
// Registra o service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('../service-worker.js')
        .then(function (registration) {
            console.log('quiz Service Worker registrado com sucesso:', registration.scope);

            // Verifica se existe um SW novo esperando para ser ativado
            registration.onupdatefound = function () {
                const newWorker = registration.installing;
                newWorker.onstatechange = function () {
                    if (newWorker.state === 'activated') {
                        console.log('Novo Service Worker ativado. Atualizando cache.');
                        window.location.reload();
                    }
                };
            };
        }).catch(function (error) {
            console.log('Falha ao registrar o Service Worker:', error);
        });
}
//fim service worker para funcionar offline otimizado para atualizar automaticamente com timestamp

//salvando valor do campo 1
window.addEventListener('load', function () {
    // Verifica se há algo salvo no sessionStorage com a chave 'pergunta'
    const valorSalvo = sessionStorage.getItem('pergunta');
    if (valorSalvo) {
        // Se houver valor, define o campo de texto com o valor salvo
        document.getElementById('pergunta').value = valorSalvo;
    }
});
// Função para salvar o valor do campo de texto no sessionStorage sempre que o valor mudar
document.getElementById('pergunta').addEventListener('input', function () {
    // Obtém o valor do campo de texto
    const valorAtual = this.value;
    // Salva o valor no sessionStorage com a chave 'pergunta'
    sessionStorage.setItem('pergunta', valorAtual);
});

//salvando valor do campo 2
window.addEventListener('load', function () {
    const valorSalvo = sessionStorage.getItem('respA');
    if (valorSalvo) {
        document.getElementById('respA').value = valorSalvo;
    }
});
document.getElementById('respA').addEventListener('input', function () {
    const valorAtual = this.value;
    sessionStorage.setItem('respA', valorAtual);
});
//salvando valor do campo 3
window.addEventListener('load', function () {
    const valorSalvo = sessionStorage.getItem('descricaoA');
    if (valorSalvo) {
        document.getElementById('descricaoA').value = valorSalvo;
    }
});
document.getElementById('descricaoA').addEventListener('input', function () {
    const valorAtual = this.value;
    sessionStorage.setItem('descricaoA', valorAtual);
});
//salvando valor do campo 4
window.addEventListener('load', function () {
    const valorSalvo = sessionStorage.getItem('respB');
    if (valorSalvo) {
        document.getElementById('respB').value = valorSalvo;
    }
});
document.getElementById('respB').addEventListener('input', function () {
    const valorAtual = this.value;
    sessionStorage.setItem('respB', valorAtual);
});
//salvando valor do campo 5
window.addEventListener('load', function () {
    const valorSalvo = sessionStorage.getItem('descricaoB');
    if (valorSalvo) {
        document.getElementById('descricaoB').value = valorSalvo;
    }
});
document.getElementById('descricaoB').addEventListener('input', function () {
    const valorAtual = this.value;
    sessionStorage.setItem('descricaoB', valorAtual);
});
//salvando valor do campo 6
window.addEventListener('load', function () {
    const valorSalvo = sessionStorage.getItem('respC');
    if (valorSalvo) {
        document.getElementById('respC').value = valorSalvo;
    }
});
document.getElementById('respC').addEventListener('input', function () {
    const valorAtual = this.value;
    sessionStorage.setItem('respC', valorAtual);
});
//salvando valor do campo 7
window.addEventListener('load', function () {
    const valorSalvo = sessionStorage.getItem('descricaoC');
    if (valorSalvo) {
        document.getElementById('descricaoC').value = valorSalvo;
    }
});
document.getElementById('descricaoC').addEventListener('input', function () {
    const valorAtual = this.value;
    sessionStorage.setItem('descricaoC', valorAtual);
});
//salvando valor do campo 8
window.addEventListener('load', function () {
    const valorSalvo = sessionStorage.getItem('respD');
    if (valorSalvo) {
        document.getElementById('respD').value = valorSalvo;
    }
});
document.getElementById('respD').addEventListener('input', function () {
    const valorAtual = this.value;
    sessionStorage.setItem('respD', valorAtual);
});
//salvando valor do campo 9
window.addEventListener('load', function () {
    const valorSalvo = sessionStorage.getItem('descricaoD');
    if (valorSalvo) {
        document.getElementById('descricaoD').value = valorSalvo;
    }
});
document.getElementById('descricaoD').addEventListener('input', function () {
    const valorAtual = this.value;
    sessionStorage.setItem('descricaoD', valorAtual);
});
//salvando valor do campo 10
window.addEventListener('load', function () {
    const valorSalvo = sessionStorage.getItem('resposta-correta');
    if (valorSalvo) {
        document.getElementById('resposta-correta').value = valorSalvo;
    }
});
document.getElementById('resposta-correta').addEventListener('input', function () {
    const valorAtual = this.value;
    sessionStorage.setItem('resposta-correta', valorAtual);
});
//salvando valor do campo 11
window.addEventListener('load', function () {
    const valorSalvo = sessionStorage.getItem('categoria');
    if (valorSalvo) {
        document.getElementById('categoria').value = valorSalvo;
    }
});
document.getElementById('categoria').addEventListener('input', function () {
    const valorAtual = this.value;
    sessionStorage.setItem('categoria', valorAtual);
});


// Função para limpar o sessionStorage e resetar os campos
function limparSessionStorage() {
    // Limpa todos os dados do sessionStorage
    //sessionStorage.clear();

    // Reseta os campos manualmente
    document.getElementById('pergunta').value = '';
    document.getElementById('respA').value = '';
    document.getElementById('descricaoA').value = '';
    document.getElementById('respB').value = '';
    document.getElementById('descricaoB').value = '';
    document.getElementById('respC').value = '';
    document.getElementById('descricaoC').value = '';
    document.getElementById('respD').value = '';
    document.getElementById('descricaoD').value = '';
    document.getElementById('resposta-correta').value = '';
    document.getElementById('categoria').value = '';
}

document.getElementById("toggleButton").addEventListener("click", function () {
    var secPerguntas = document.getElementById("secPerguntas");
    if (secPerguntas.style.display === "none") {
        secPerguntas.style.display = "block"; // Expande a div
    } else {
        secPerguntas.style.display = "none"; // Esconde a div
    }
});
