/*Adicionando Event Listeners Configure os eventos de clique para os botões:*/
document
.getElementById("btnSalvarArquivo")
.addEventListener("click", salvarPresetEmArquivo);

document
.getElementById("btnCarregarArquivo")
.addEventListener("click", function () {
    document.getElementById("fileInput").click();
});

document
.getElementById("fileInput")
.addEventListener("change", carregarPresetDeArquivo);

// Função para criptografar os dados
function criptografarDados(dados, chave) {
return CryptoJS.AES.encrypt(dados, chave).toString();
}

// Função para descriptografar os dados
function descriptografarDados(dadosCriptografados, chave) {
try {
    const bytes = CryptoJS.AES.decrypt(dadosCriptografados, chave);
    return bytes.toString(CryptoJS.enc.Utf8);
} catch (e) {
    return null; // Retorna null se a chave estiver incorreta
}
}

// Função para salvar o preset e os caracteres de substituição criptografados em um arquivo
function salvarPresetEmArquivo() {
const original = document.getElementById("charOriginal").value;
const novo = document.getElementById("charNovo").value;
const presetInicio = document.getElementById("presetInicio").value;
const presetFinal = document.getElementById("presetFinal").value;

const chave = prompt(
    "Digite uma chave secreta para criptografar o preset e os caracteres:"
);

// Salva todos os dados em um objeto
const dados = JSON.stringify({
    original: original,
    novo: novo,
    presetInicio: presetInicio,
    presetFinal: presetFinal,
});

const dadosCriptografados = criptografarDados(dados, chave);

const blob = new Blob([dadosCriptografados], { type: "text/plain" });
const link = document.createElement("a");
link.href = URL.createObjectURL(blob);
link.download = "dados_seguros.txt";
link.click();
}

// Função para carregar os dados criptografados de um arquivo
function carregarPresetDeArquivo(event) {
const arquivo = event.target.files[0];
if (!arquivo) {
    return;
}

const leitor = new FileReader();
leitor.onload = function (e) {
    const conteudoCriptografado = e.target.result;
    const chave = prompt(
        "Digite a chave secreta para descriptografar os dados:"
    );
    const dadosDescriptografados = descriptografarDados(
        conteudoCriptografado,
        chave
    );

    if (dadosDescriptografados) {
        const dados = JSON.parse(dadosDescriptografados);
        // Preenche os campos com os dados carregados
        document.getElementById("charOriginal").value = dados.original;
        document.getElementById("charNovo").value = dados.novo;
        document.getElementById("presetInicio").value = dados.presetInicio;
        document.getElementById("presetFinal").value = dados.presetFinal;
        alert("Dados carregados com sucesso!");
    } else {
        alert("Chave incorreta ou dados inválidos.");
    }
};

leitor.readAsText(arquivo);
}

// Unificar o onload para carregar os presets e o tema
window.onload = function () {
// Carregar os presets salvos no localStorage
if (localStorage.getItem("charOriginal")) {
    document.getElementById("charOriginal").value =
        localStorage.getItem("charOriginal");
}
if (localStorage.getItem("charNovo")) {
    document.getElementById("charNovo").value =
        localStorage.getItem("charNovo");
}
if (localStorage.getItem("presetInicio")) {
    document.getElementById("presetInicio").value =
        localStorage.getItem("presetInicio");
}
if (localStorage.getItem("presetFinal")) {
    document.getElementById("presetFinal").value =
        localStorage.getItem("presetFinal");
}

// Verificar e aplicar o tema armazenado no localStorage
const themeSwitch = document.getElementById("themeSwitch");
if (localStorage.getItem("dark-mode") === "enabled") {
    document.body.classList.add("dark-mode");
    themeSwitch.checked = true;
} else {
    document.body.classList.add("light-mode");
}
};

// Função para alternar o tema e salvar a escolha no localStorage
const themeSwitch = document.getElementById("themeSwitch");
themeSwitch.addEventListener("change", function () {
if (this.checked) {
    document.body.classList.remove("light-mode");
    document.body.classList.add("dark-mode");
    localStorage.setItem("dark-mode", "enabled");
} else {
    document.body.classList.remove("dark-mode");
    document.body.classList.add("light-mode");
    localStorage.setItem("dark-mode", "disabled");
}
});

// Função para substituir o texto e salvar os presets no localStorage
function substituirTexto() {
let texto = document.getElementById("texto").value;
const charsOriginais = document
    .getElementById("charOriginal")
    .value.split(",");
const charsNovos = document.getElementById("charNovo").value.split(",");

if (charsOriginais.length !== charsNovos.length) {
    document.getElementById("resultado").value =
        "Erro: Quantidade de caracteres diferentes.";
    return;
}

let textoModificado = texto;

for (let i = 0; i < charsOriginais.length; i++) {
    const regex = new RegExp(charsOriginais[i], "g");
    textoModificado = textoModificado.replace(regex, charsNovos[i]);
}

let presetInicio = document.getElementById("presetInicio").value;
if (document.getElementById("converterInicio").checked) {
    for (let i = 0; i < charsOriginais.length; i++) {
        const regex = new RegExp(charsOriginais[i], "g");
        presetInicio = presetInicio.replace(regex, charsNovos[i]);
    }
}

let presetFinal = document.getElementById("presetFinal").value;
if (document.getElementById("converterFinal").checked) {
    for (let i = 0; i < charsOriginais.length; i++) {
        const regex = new RegExp(charsOriginais[i], "g");
        presetFinal = presetFinal.replace(regex, charsNovos[i]);
    }
}

textoModificado = presetInicio + textoModificado + presetFinal;

document.getElementById("resultado").value = textoModificado;

// Salvar os presets no localStorage
localStorage.setItem(
    "charOriginal",
    document.getElementById("charOriginal").value
);
localStorage.setItem(
    "charNovo",
    document.getElementById("charNovo").value
);
localStorage.setItem(
    "presetInicio",
    document.getElementById("presetInicio").value
);
localStorage.setItem(
    "presetFinal",
    document.getElementById("presetFinal").value
);
}

// Função para copiar o texto
function copiarTexto() {
const resultado = document.getElementById("resultado");
resultado.select();
resultado.setSelectionRange(0, 99999);
document.execCommand("copy");
alert("Texto copiado para a área de transferência!");
}

// Event listeners para substituir texto e copiar
document
.getElementById("texto")
.addEventListener("input", substituirTexto);
document
.getElementById("charOriginal")
.addEventListener("input", substituirTexto);
document
.getElementById("charNovo")
.addEventListener("input", substituirTexto);
document
.getElementById("presetInicio")
.addEventListener("input", substituirTexto);
document
.getElementById("presetFinal")
.addEventListener("input", substituirTexto);
document
.getElementById("converterInicio")
.addEventListener("change", substituirTexto);
document
.getElementById("converterFinal")
.addEventListener("change", substituirTexto);

document
.getElementById("btn-copiar")
.addEventListener("click", copiarTexto);

/*salvar preset de meus caracteres no indexedDB*/

// Função para inicializar o IndexedDB
function initDB() {
return new Promise((resolve, reject) => {
    const request = indexedDB.open("formatterDB", 1);

    request.onupgradeneeded = function (event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("presets")) {
            db.createObjectStore("presets", {
                keyPath: "id",
                autoIncrement: true,
            });
        }
    };

    request.onsuccess = function (event) {
        resolve(event.target.result);
    };

    request.onerror = function (event) {
        reject("Erro ao inicializar o IndexedDB");
    };
});
}

// Função para salvar um preset no IndexedDB
function salvarPreset(nome, original, novo) {
initDB().then((db) => {
    const tx = db.transaction("presets", "readwrite");
    const store = tx.objectStore("presets");
    store.add({
        nome: nome,
        original: original,
        novo: novo,
    });

    tx.oncomplete = function () {
        alert("Preset salvo com sucesso!");
    };

    tx.onerror = function () {
        alert("Erro ao salvar o preset.");
    };
});
}

// Função para carregar presets do IndexedDB
function carregarPresets() {
initDB().then((db) => {
    const tx = db.transaction("presets", "readonly");
    const store = tx.objectStore("presets");
    const request = store.getAll();

    request.onsuccess = function () {
        const presets = request.result;
        const listaPresets = document.getElementById("listaPresets");
        listaPresets.innerHTML = ""; // Limpar lista anterior

        presets.forEach((preset) => {
            const li = document.createElement("li");
            li.textContent = `${preset.nome} (Original: ${preset.original}, Novo: ${preset.novo})`;

            // Botão para carregar preset
            const btnCarregar = document.createElement("button");
            btnCarregar.textContent = "Carregar";
            btnCarregar.addEventListener("click", function () {
                document.getElementById("charOriginal").value = preset.original;
                document.getElementById("charNovo").value = preset.novo;
            });

            li.appendChild(btnCarregar);
            listaPresets.appendChild(li);
        });
    };

    request.onerror = function () {
        alert("Erro ao carregar os presets.");
    };
});
}

// Event listeners para salvar e carregar presets
document
.getElementById("btnSalvarPreset")
.addEventListener("click", function () {
    const nome = prompt("Digite o nome do preset:");
    const original = document.getElementById("charOriginal").value;
    const novo = document.getElementById("charNovo").value;
    if (nome) {
        salvarPreset(nome, original, novo);
    }
});

document
.getElementById("btnCarregarPresets")
.addEventListener("click", carregarPresets);

/*Fim salvar preset de meus caracteres no indexedDB*/
 
//service worker para funcionar offline otimizado para atualizar automaticamente com timestamp
// Registra o service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('../service-worker.js')
        .then(function (registration) {
            console.log('formatar Service Worker registrado com sucesso:', registration.scope);
            
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

// manter a sessão dos campos de texto para nao perder ao navegar para outras abas
// Função para carregar o valor salvo no sessionStorage quando a página é carregada
window.addEventListener('load', function () {
    // Verifica se há algo salvo no sessionStorage com a chave 'campoTexto'
    const valorSalvo = sessionStorage.getItem('texto');
    if (valorSalvo) {
        // Se houver valor, define o campo de texto com o valor salvo
        document.getElementById('texto').value = valorSalvo;
    }
});
// Função para salvar o valor do campo de texto no sessionStorage sempre que o valor mudar
document.getElementById('texto').addEventListener('input', function () {
    // Obtém o valor do campo de texto
    const valorAtual = this.value;
    // Salva o valor no sessionStorage com a chave 'campoTexto'
    sessionStorage.setItem('texto', valorAtual);
});
// Função para limpar o sessionStorage e resetar os campos
function limparSessionStorage() {
    // Limpa todos os dados do sessionStorage
    //sessionStorage.clear();

    // Reseta os campos manualmente
    document.getElementById('texto').value = '';
}