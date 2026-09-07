# SegurosGPT — Arquitetura

> Documento de decisões de produto e arquitetura. Serve de base para o documento de arquitetura a ser elaborado posteriormente. Todo o conteúdo abaixo reflete decisões já fechadas com base no entendimento inicial do produto; pontos ainda em aberto estão marcados explicitamente na seção final.

## 1. Contexto

Este projeto vive dentro do repositório MockOPIN, que já contém uma instância local completa do Open Insurance (OPIN) — Gateway (mTLS), Authorization Server e Resource Server (`mock-service-os/`, `insurance-server-lambdas/`). O SegurosGPT é um novo produto que **consome** essa infraestrutura como qualquer participante regulado faria; ele não modifica, estende nem depende de alterações no backend do mock, que é compartilhado com outros usos do repositório (Conformance Suite, testes de certificação, etc.).

**Regra fixa**: todo o código, configuração e artefatos do SegurosGPT moram dentro de `segurosGPT/`. Nada é alterado fora dessa pasta.

## 2. Visão de produto

SegurosGPT é o **braço direito do corretor de seguros**: dado o CPF de um cliente, o sistema consulta o Open Insurance, levanta o portfólio completo do cliente (tudo que ele já tem contratado, em qualquer linha de produto) e o que está sendo avaliado/cotado, e apresenta ao corretor o melhor cenário possível de forma clara e comparável.

### O que o produto **não é**

Não é um chatbot genérico "especialista em seguros" — isso não tem valor diferencial, já que qualquer um replica isso com um prompt em cima da Grok ou do Claude sem precisar construir um produto novo.

### O que o produto **é**

Um conjunto de automações estruturadas que resolvem tarefas concretas do dia a dia do corretor:

1. **Consulta unificada por CPF** — agrega, num único lugar, tudo que o Open Insurance sabe sobre o portfólio do cliente.
2. **Comparação** — de propostas, produtos e apólices, lado a lado, com critérios normalizados (cobertura, franquia, prêmio, vigência, exclusões).
3. **Detecção de sobreposição de cobertura** — cruza tudo que o cliente já tem contra o que está avaliando contratar, em **qualquer combinação de linhas de produto** (não um caso específico), sinalizando redundâncias e lacunas.
4. **Chat contextual (secundário)** — quando a resposta estruturada não cobre a dúvida do corretor, ele interage livremente via chat, mas com o chat ancorado (*grounded*) nos dados e resultados já levantados naquela sessão — nunca solto, sem contexto.

### Princípio de design central

**Comparação e detecção de sobreposição são determinísticas** (taxonomia canônica + regras em código), não decididas pela IA. A IA entra em dois papéis delimitados:

- **Explicar** em linguagem natural o que os motores determinísticos encontraram (insight/resumo).
- **Conversar** no chat, com grounding no contexto já estruturado da sessão.

Isso importa porque a saída do sistema influencia decisão financeira/de seguro do cliente — reduzir a superfície de alucinação e manter cada comparação/alerta auditável (rastreável até a regra que o gerou) é mais importante do que delegar o cálculo à IA.

## 3. Decisões de arquitetura

| Decisão | Escolha | Motivo |
|---|---|---|
| Stack | Next.js (App Router, TypeScript), full-stack num único projeto | UI e BFF juntos; segredos (certs mTLS, chave da IA) nunca saem do servidor; um único deploy |
| Localização | Tudo dentro de `segurosGPT/` | Backend do mock é compartilhado, não pode ser alterado |
| Autenticação com o Mock OPIN | Reusar `client_one`/`client_two` já seedados (`mock-service-os/mock_as/mongo-seed`), certificados em `README.md:207-218` | Evita criar/manter um novo participante no Directory; adequado ao escopo de mock/PoC |
| Fluxo OAuth com o Mock AS | **Dois grants, um para cada finalidade** — ver Seção 4.1 | Confirmado inspecionando `@RequiredAuthenticationGrant` em todos os controllers: os `Quote*Controller` (cotações/propostas novas) exigem só `CLIENT_CREDENTIALS`; os controllers de dado já contratado (`AutoPolicyController`, `HousingController`, `CustomerController` etc.) exigem `AUTHORISATION_CODE`. Não são intercambiáveis. |
| Papel da IA | Explicação e chat, nunca o cálculo de comparação/sobreposição | Auditabilidade e confiabilidade em decisão financeira |
| Provedor de IA | Grok (a confirmar formalmente), abstraído atrás de um client próprio | Permite trocar de provedor sem reescrever a camada de domínio |
| Persistência | Nenhuma própria nesta fase; tudo consultado on-demand por CPF | Simplicidade inicial; cache/histórico fica como decisão futura |

## 4. Fluxo ponta a ponta

1. Corretor loga no SegurosGPT (autenticação própria, independente do OPIN).
2. Corretor digita o CPF do cliente.
3. O BFF busca em paralelo (ver 4.1): **(a)** dados já contratados pelo cliente via `AUTHORISATION_CODE` headless, e **(b)** novas cotações/propostas via `CLIENT_CREDENTIALS` direto, para todas as linhas de produto disponíveis.
4. A camada de domínio normaliza os dados brutos de cada linha de produto para a taxonomia canônica de cobertura.
5. O **Comparison Engine** monta a matriz comparativa entre propostas/produtos concorrentes.
6. O **Overlap Engine** cruza todo o portfólio do cliente (apólices ativas + propostas novas) por categoria canônica de cobertura, sinalizando sobreposições e lacunas, sem se limitar a nenhum par específico de produtos.
7. A UI renderiza: visão consolidada do cliente, comparador lado a lado, painel de alertas de sobreposição — tudo priorizando clareza e legibilidade para o corretor.
8. A IA gera um resumo textual opcional explicando os achados dos engines (insight).
9. O chat fica disponível, com o contexto da sessão (dados normalizados + resultados dos engines) injetado como grounding, para o corretor aprofundar dúvidas que a resposta estruturada não cobriu.

### 4.1 Os dois grants do Mock OPIN (achado central de implementação)

Inspecionando `@RequiredAuthenticationGrant` em todos os controllers do Resource Server, existe uma divisão limpa que mapeia direto para os dois tipos de automação do produto:

| Finalidade | Controllers | Grant exigido | Como o BFF resolve |
|---|---|---|---|
| **O que o cliente já tem** (apólices, dados pessoais) | `AutoPolicyController`, `HousingController`, `LifePensionController`, `PatrimonialController`, `RuralController`, `TransportPolicyController`, `CustomerController`, `PersonController`, etc. | `AUTHORISATION_CODE` | BFF cria um `consent` (`POST /open-insurance/consents/v2/consents`, com `CLIENT_CREDENTIALS`), depois conduz o login+aprovação de forma headless contra o Mock AS (`POST /interaction/:uid/login` e `/confirm`, credenciais da conta de teste vinculada ao CPF), troca o `code` por access token em `/token`. |
| **Novas cotações/propostas** (o que o cliente poderia contratar) | Todos os `Quote*Controller` (`QuoteAutoController`, `QuoteHousingController`, etc.) | `CLIENT_CREDENTIALS` | Chamada direta, sem consentimento — confirmado com `POST /token` (mTLS, `client_one`) e usado como está. Já testado contra o ambiente rodando localmente com sucesso. |

Isso simplifica a ordem de implementação: o caminho de **cotações** (client_credentials) já funciona e é simples; o caminho de **apólices existentes** (authorisation_code headless) é mais complexo e é o que sustenta a detecção de sobreposição.

**Status: os dois caminhos estão implementados em `src/lib/opin-client/` e validados contra o ambiente rodando localmente** (`createAutoLeadQuote` e `getAuthorisedAccessToken` + `getAutoPolicies`, via `scripts/verify-opin-connection.ts`). Detalhes de implementação (PKCE, JARM, mapeamento scope→role) na Seção 9.

## 5. Camada de domínio

A peça central e não-trivial do produto.

- **Coverage Taxonomy** (`src/domain/taxonomy/coverage-taxonomy.ts`): a chave canônica não é só o tipo de risco (`RiskCategory`), é o par `(risco, bem segurado)` — `RESPONSABILIDADE_CIVIL`, `DANOS_MATERIAIS`, `INCENDIO`, `ALAGAMENTO`, `ROUBO_FURTO`, `ACIDENTES_PESSOAIS`, `ASSISTENCIA`, `VIDROS`, `OUTROS` × `VEICULO`, `IMOVEL`, `CONTEUDO_RESIDENCIA`, `PESSOA`, `OUTRO`. Casar só por risco geraria falso positivo (furto de carro ≠ furto de conteúdo residencial); casar por (risco, bem) é o que torna a sobreposição defensável.
- **Mappers por linha de produto** (`src/domain/taxonomy/mappers/`): implementados **Auto** e **Housing** até aqui, como prova real do padrão — os enums de cobertura de cada linha (`AutoCoverageCode`, `HousingCoverageCode`) foram conferidos direto nos modelos Java gerados (`insurance-swagger/build/.../InsuranceAutoCoverage.java`, `InsuranceHousingCoverage.java`), não supostos. As demais ~13 linhas seguem o mesmo padrão quando forem construídas — não implementadas ainda, para não especular schema não conferido.
- **Comparison Engine** (`src/domain/comparison-engine.ts`): determinístico; recebe N ofertas já normalizadas (mesma linha de produto, tipicamente) e monta a matriz comparativa por categoria canônica × oferta.
- **Overlap Engine** (`src/domain/overlap-engine.ts`): determinístico; recebe o portfólio completo (apólices existentes + cotações, **qualquer linha, qualquer combinação**) e sinaliza toda categoria canônica coberta por mais de uma oferta.
- **Validado com um caso real de sobreposição entre linhas diferentes**: cobertura de morte/invalidez do segurado dentro de uma apólice residencial (`MORTE_E_INVALIDEZ_TOTAL_E_PERMANENTE`) e cobertura de acidentes pessoais dentro de uma apólice de auto (`ACIDENTE_PESSOAIS_DE_PASSAGEIROS_APP_CONDUTOR`) caem na mesma chave canônica `ACIDENTES_PESSOAIS::PESSOA` — sobreposição genuína, não o exemplo ilustrativo de bagagem/viagem usado na discussão original. O engine também confirma, no mesmo teste, que furto de veículo e furto de conteúdo residencial **não** são sinalizados como sobreposição, por serem bens diferentes. Ver `scripts/verify-domain-engines.ts` (`npm run verify:domain`).

## 6. Estrutura de pastas

```
segurosGPT/
├── docs/
│   └── ARCHITECTURE.md                # este documento
├── src/
│   ├── app/
│   │   ├── login/
│   │   ├── dashboard/                 # busca por CPF
│   │   ├── clientes/[cpf]/
│   │   │   ├── page.tsx               # consolidado + comparador + alertas
│   │   │   └── chat/                  # painel de chat contextual
│   │   └── api/
│   │       ├── opin/                  # client mTLS pro Mock OPIN
│   │       ├── domain/
│   │       │   ├── normalize/
│   │       │   ├── compare/
│   │       │   └── overlap/
│   │       ├── ai/
│   │       │   ├── chat/              # grounded no contexto da sessão
│   │       │   └── insights/          # resumo textual dos achados
│   │       └── auth/[...nextauth]/
│   ├── domain/                        # lógica de negócio pura, testável, sem framework
│   │   ├── taxonomy/
│   │   │   ├── coverage-taxonomy.ts
│   │   │   └── mappers/               # um arquivo por linha de produto OPIN
│   │   ├── comparison-engine.ts
│   │   └── overlap-engine.ts
│   ├── lib/
│   │   ├── opin-client/               # mTLS agent, token, chamadas às resource APIs
│   │   └── ai/                        # client Grok, prompts, tool-calling do chat
│   └── types/
├── certs/                             # client_one.crt/.key (gitignored)
├── .env.local                         # segredos (gitignored)
└── package.json
```

## 7. Fora de escopo (fase inicial)

- Redirect real de navegador do titular para consentimento — o BFF conduz o `AUTHORISATION_CODE` de forma headless (server-to-server) contra as contas de teste seedadas, sem UI de login/consentimento real do titular.
- Persistência/banco próprio — consultas on-demand a cada busca por CPF; cache/histórico fica para decisão futura.
- Registro de um novo participante próprio no Directory — reusa-se `client_one`/`client_two`.

## 8. Pontos em aberto

- Confirmação formal do provedor de IA (Grok assumido, mas abstraído atrás de um client próprio para permitir troca).
- Modelo de autenticação do corretor no SegurosGPT (NextAuth simples é o ponto de partida cogitado).
- ~~Senha das contas de teste do Mock AS~~ — resolvido: credencial fornecida pelo usuário e confirmada contra o hash PBKDF2 seedado (`init_credentials.json`). Guardada em `.env.local` (gitignored), nunca em texto plano neste documento. O mesmo hash/salt se repete nas demais contas seedadas, então a mesma senha deve valer para `usuario2`/`usuario3`/`usuario4` — a confirmar ao rodar o ambiente.
- O dataset atual do mock só tem dados reais para 4 CPFs seedados (ver Seção 9) — qualquer outro CPF digitado retornará vazio. Isso é esperado para o mock, mas precisa ficar claro pra não ser confundido com bug em demo.

## 9. Histórico de decisões

- Definido que o produto foca em automações estruturadas (comparação, sobreposição) e não em um chatbot genérico especializado em seguros — um chatbot sozinho não é produto diferenciado.
- Definido que a detecção de sobreposição deve ser genérica para qualquer combinação de linhas de produto, não amarrada ao caso ilustrativo usado na discussão (bagagem em seguro viagem vs. seguro bagagem avulso).
- Definido que comparação e sobreposição são determinísticas; IA atua só em explicação e chat.
- Definido que o chat é mantido como camada secundária, ancorada nos dados e resultados já estruturados da sessão.
- Definido que nada é alterado na arquitetura do backend do mock, por ser compartilhada; todo o desenvolvimento fica contido em `segurosGPT/`.
- Corrigido, após inspecionar o código-fonte do Resource Server, que os endpoints de dados de cliente exigem grant `AUTHORISATION_CODE` (não `client_credentials`). O BFF simula esse fluxo de forma headless contra as contas de teste seedadas do Mock AS, já que o login ali é um formulário simples (mock, não segurança real) — sem necessidade de redirect real de navegador.
- Identificado que o dataset do mock tem 4 CPFs de teste seedados, cada um vinculado a uma conta específica do Mock AS: `08116143018` → `usuario2@iniciadoramodelo.com.br`; `10117409073`, `76109277673`, `87517400444` → demais contas seedadas (ver `insurance-server-lambdas/src/main/resources/db/dataloading/R__write_data_*.sql`). O produto, no ambiente de mock, só retorna dados reais para esses CPFs.
- Refinado o achado do `AUTHORISATION_CODE`: na verdade só os controllers de dado já contratado exigem esse grant. Todos os `Quote*Controller` (cotações/propostas novas) exigem apenas `CLIENT_CREDENTIALS` — já testado com sucesso contra o ambiente local (`POST /token` via mTLS retornou 200). Ver Seção 4.1.
- Ambiente Mock OPIN local levantado e validado (`docker-compose --profile main up`, containers `auth`, `mtls`, `mockapi`, `localstack`, `mongodb`, `psql`) — nota de operação: `auth` e `mtls` podem subir antes do script de seed do LocalStack (`mock-service-os/setup_ssm.sh`) terminar de popular SSM/S3, causando crash na primeira subida; basta reiniciar os dois serviços (`docker-compose up -d auth mtls`) depois que o LocalStack terminar.
- **`opin-client` implementado e validado ponta a ponta contra o mock rodando** (`src/lib/opin-client/`, script de checagem em `scripts/verify-opin-connection.ts`): cotação de auto via `client_credentials` (`quotes/auto.ts`) e leitura de apólice de auto via o fluxo `AUTHORISATION_CODE` headless completo (`consent.ts` — cria consentimento, loga na conta seedada, aprova, troca o `code` por token) funcionando de verdade, não só mapeado em teoria.
- Achado de implementação não previsto na Seção 4.1: o grant `AUTHORISATION_CODE` sozinho não basta para acessar um endpoint de produto — o scope OAuth pedido no `/auth` (ex.: `insurance-auto`) é o que o `SimpleAuthorisation.java` do Resource Server mapeia pro role `@Secured` de cada controller (`insurance-auto` → `AUTO_MANAGE`). As `permissions` do corpo do consentimento (`EnumConsentPermission`) são um registro de negócio separado — não substituem o scope técnico. O `opin-client` pede os dois (`getAuthorisedAccessToken(cpf, permissions, oauthScopes)`).
- A cadeia de redirects do fluxo headless exige seguir múltiplos hops depois do login (`/auth/:uid` antes de voltar a `/interaction/:uid` com o próximo prompt) — assumir que o mesmo `uid` da tela de login serve pra tela de consentimento causa erro 500 no lado do Mock AS (sessão de interação não avançada). O `opin-client` segue a cadeia completa, como um navegador faria.
- Perfil FAPI do Mock AS exige PKCE (`code_challenge`/`code_verifier`, S256) e `response_mode=jwt` (JARM) — resposta de `/auth` e do passo de confirmação vêm como um JWT assinado na query string (`response=`), decodificado sem verificar assinatura (aceitável só por ser nosso mock local).
- **Camada de domínio implementada e testada** (`src/domain/`): taxonomia canônica `(risco, bem segurado)`, mappers para Auto e Housing conferidos contra os modelos Java gerados, Comparison Engine e Overlap Engine determinísticos. Caso de sobreposição real entre linhas diferentes (acidentes pessoais em apólice de auto × morte/invalidez em apólice residencial) validado, junto com um caso negativo (furto de veículo × furto de conteúdo residencial não sinalizados) — prova de que o engine casa por `(risco, bem)` e não por palavra-chave. Ver `scripts/verify-domain-engines.ts`.
