window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('config-form');
  const statusDiv = document.getElementById('status');

  const inputs = {
    siteUrl: document.getElementById('siteUrl'),
    gitRepo: document.getElementById('gitRepo'),
    gitName: document.getElementById('gitName'),
    gitEmail: document.getElementById('gitEmail'),
    gitToken: document.getElementById('gitToken'),
  };

  // Carregar config salva ao abrir
  window.electronAPI.loadConfig().then(({ success, config }) => {
    if (success) {
      Object.entries(inputs).forEach(([key, input]) => {
        if (config[key]) input.value = config[key];
      });
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusDiv.textContent = 'Salvando...';

    const newConfig = {};
    Object.entries(inputs).forEach(([key, input]) => {
      newConfig[key] = input.value.trim();
    });

    const result = await window.electronAPI.saveConfig(newConfig);

    if (result.success) {
      statusDiv.textContent = 'Configuração salva com sucesso!';
      statusDiv.style.color = 'green';

      // Fecha a janela após salvar
      window.electronAPI.closeWindow();
    } else {
      statusDiv.textContent = 'Erro ao salvar: ' + result.error;
      statusDiv.style.color = 'red';
    }
  });
});
