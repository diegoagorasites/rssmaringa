const btnConfig = document.getElementById('btn-config');
const statusText = document.getElementById('status-text');

btnConfig.addEventListener('click', () => {
  window.electronAPI.abrirConfig();
});

// Se quiser mostrar status de algo, pode usar uma função assim para atualizar
function atualizarStatus(texto) {
  statusText.textContent = texto;
}

// Exemplo: ao carregar, status pronto
window.addEventListener('DOMContentLoaded', () => {
  atualizarStatus('Pronto');
});
