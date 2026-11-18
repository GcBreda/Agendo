# Política de segurança

O Agendô é um projeto acadêmico em desenvolvimento. Ele ainda não deve guardar dados reais de pacientes.

## Como relatar uma vulnerabilidade

Não abra uma issue pública. Use o relato privado do GitHub:

1. Abra a aba **Security** deste repositório.
2. Clique em **Report a vulnerability**.
3. Descreva o problema, como reproduzi-lo e o impacto que você espera.

A equipe responde assim que possível. Por ser um projeto de estudantes, não há prazo garantido.

## O que está no escopo

- O código deste repositório: backend, frontend e migrations do banco.
- Falhas que exponham conteúdo de prontuário, dados de pacientes, senhas, tokens ou chaves.
- Falhas de autorização, por exemplo um profissional conseguir ver o paciente de outro.

## Regras para quem testa

- Teste só em uma instalação local, seguindo o [README](README.md#como-rodar-localmente).
- Não teste serviços online ligados ao projeto sem autorização da equipe.
- Use apenas dados fictícios, nos testes e no relato.

## Como o projeto protege segredos

- Senhas, chaves e endereços de banco ficam só em arquivos `.env` locais, que o Git ignora. O repositório tem apenas o modelo `.env.example`, com valores fictícios.
- A chave que cifra o prontuário (`PRONTUARIO_KEY`) é gerada por script e nunca é exibida nem enviada ao repositório.
- Se um segredo for publicado por engano, ele deve ser trocado no serviço de origem. Apagar o arquivo não basta, porque o histórico do Git guarda as versões antigas.
