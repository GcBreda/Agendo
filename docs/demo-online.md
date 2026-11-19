# Demonstração online

Versão do Agendô para apresentar sem instalar nada: quem for apresentar só abre um link no navegador, no computador ou no celular. Usa **apenas dados fictícios**.

## Como fica

- Um **PostgreSQL gratuito** e um **único serviço web** no Render, que serve o site e a API no mesmo endereço.
- O arquivo `render.yaml`, na raiz do repositório, descreve os dois. O Render gera sozinho os segredos (`JWT_SECRET` e `PRONTUARIO_KEY`); nenhum segredo vai para o Git.
- A cada início, o serviço aplica as migrations e roda dois seeds:
  - `seed.js`: a Dra. Ana Melo (profissional) e a Fernanda Lima (paciente);
  - `seed-demo.js`: cinco pacientes fictícios e consultas de duas semanas antes até duas semanas depois do primeiro deploy. Só roda se o banco ainda não tiver consultas, então não apaga o que for criado durante a demonstração.
- Sem `REDIS_URL`, os lembretes ficam desligados e o agendamento funciona normalmente.

## Como criar (uma vez)

1. No [Render](https://dashboard.render.com), clique em **New** e depois em **Blueprint**.
2. Conecte o repositório `GcBreda/Agendo` e escolha a branch.
3. Confira os dois recursos (`agendo-demo-db` e `agendo-demo`) e clique em **Apply**.
4. Espere o primeiro deploy terminar (alguns minutos) e abra o endereço que aparece no serviço `agendo-demo`.

> O Render permite só **um** banco gratuito por conta. Se ele recusar, apague antes o banco antigo da versão de testes.

## Contas de acesso

As mesmas contas fictícias do seed, listadas em "Como rodar localmente" no README: uma de profissional (Dra. Ana Melo) e uma de paciente (Fernanda Lima).

## No dia da apresentação

- **Abra o link 2 a 3 minutos antes.** No plano gratuito, o serviço "dorme" depois de 15 minutos sem uso, e o primeiro acesso depois disso leva cerca de um minuto.
- **Duas sessões ao mesmo tempo:** profissional numa janela normal e paciente numa janela anônima, ou no celular.
- **Internet:** tenha o roteador do celular como reserva.
- **Plano B:** os slides em PDF e as imagens das telas.

## Limitações

- Lembretes desligados e envio de e-mail simulado.
- O banco gratuito do Render expira 30 dias depois de criado.
- As telas do prontuário ainda estão em construção.

## Depois da apresentação

Suspenda o serviço `agendo-demo` no Render (ou apague os dois recursos). Nunca cadastre dados reais nessa versão.
