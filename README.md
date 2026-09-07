# SegurosGPT

O braço direito do corretor de seguros: dado o CPF de um cliente, conecta a um ambiente Open Insurance (OPIN), traz o que o cliente já tem contratado e novas cotações disponíveis, e ajuda o corretor a comparar propostas e detectar sobreposição de cobertura entre apólices — de forma automática e auditável.

Documentação completa de arquitetura e decisões de produto: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
Resultados de validação do backend, em linguagem de negócio: [`docs/tests-back.md`](docs/tests-back.md).

## O que já existe

- **`src/lib/opin-client/`** — client mTLS para qualquer ambiente Open Insurance: token `client_credentials` (cotações) e o fluxo `AUTHORISATION_CODE` completo (dados já contratados pelo cliente).
- **`src/domain/`** — taxonomia canônica de cobertura, mappers por linha de produto (Auto, Housing), e os engines determinísticos de comparação e detecção de sobreposição.
- **`scripts/`** — scripts de verificação (`npm run verify:opin`, `npm run verify:domain`) que exercitam o client e os engines sem precisar de interface.

Ainda não existe interface visual — a próxima etapa é construir as telas sobre essa base já validada.

## Conectando a um ambiente OPIN

O SegurosGPT não assume onde o ambiente Open Insurance está rodando — local (ex.: o [Mock OPIN](https://github.com/br-openinsurance/MockOPIN) para desenvolvimento) ou remoto (um ambiente de homologação/produção real). Tudo é configurado via variáveis de ambiente em `.env.local`:

```bash
OPIN_AUTH_BASE_URL=https://auth.local      # authorization server do ambiente OPIN
OPIN_API_BASE_URL=https://api.local        # resource server do ambiente OPIN
OPIN_CLIENT_ID=client
OPIN_CLIENT_SECRET=1234
OPIN_MOCK_ACCOUNT_PASSWORD=...             # só necessário contra o Mock OPIN (contas de teste seedadas)
```

O certificado mTLS do participante (`client_one.crt` / `client_one.key`, ou o certificado do participante real em produção) fica em `certs/` na raiz do projeto — nunca versionado (veja `.gitignore`).

## Rodando localmente

```bash
npm install
npm run dev
```

Com um ambiente OPIN local no ar (ex.: `make run` no [MockOPIN](https://github.com/br-openinsurance/MockOPIN)) e `.env.local`/`certs/` configurados:

```bash
npm run verify:opin      # exercita o opin-client contra o ambiente configurado
npm run verify:domain    # exercita os engines de comparação/sobreposição com dados de exemplo
```
