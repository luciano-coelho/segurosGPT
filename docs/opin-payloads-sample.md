# Payloads reais recebidos do OPIN — captura de referência

> Gerado por `scripts/capture-opin-payloads.ts` contra o ambiente Mock OPIN rodando localmente, pro CPF de teste `76109277673`. Tokens truncados por segurança; todo o resto é a resposta real, sem edição, na ordem em que o app realmente chama cada endpoint.

## Índice

- [Token client_credentials (scope quote-auto-lead)](#token-client-credentials-scope-quote-auto-lead)
- [POST /open-insurance/quote-auto/v1/lead/request](#post-open-insurance-quote-auto-v1-lead-request)
- [POST /open-insurance/consents/v2/consents (decodificado do JWS)](#post-open-insurance-consents-v2-consents-decodificado-do-jws)
- [Resposta final do /auth (JARM, decodificada)](#resposta-final-do-auth-jarm-decodificada)
- [POST /token (grant_type=authorization_code)](#post-token-grant-type-authorization-code)
- [GET /open-insurance/insurance-auto/v1/insurance-auto](#get-open-insurance-insurance-auto-v1-insurance-auto)
- [GET /open-insurance/insurance-auto/v1/insurance-auto/mock-auto-policy-1/policy-info](#get-open-insurance-insurance-auto-v1-insurance-auto-mock-auto-policy-1-policy-info)
- [GET /open-insurance/insurance-housing/v1/insurance-housing](#get-open-insurance-insurance-housing-v1-insurance-housing)
- [GET /open-insurance/insurance-housing/v1/insurance-housing/01a6dff1-74ab-4005-bfff-8b737c2c5915/policy-info](#get-open-insurance-insurance-housing-v1-insurance-housing-01a6dff1-74ab-4005-bfff-8b737c2c5915-policy-info)

## Token client_credentials (scope quote-auto-lead)

**Usado para:** Autenticação pra pedir cotação nova

POST /token no Mock AS, mTLS + client_secret_basic. Não precisa de CPF nem de aprovação do cliente.

```json
{
  "access_token": "u4wLxTC563vD…(truncado)",
  "token_type": "Bearer",
  "expires_in": 900,
  "scope": "quote-auto-lead"
}
```

## POST /open-insurance/quote-auto/v1/lead/request

**Usado para:** Não usado em nenhuma tela hoje - a comparação de propostas é ilustrativa (ver docs/ARCHITECTURE.md)

Pede uma cotação nova de auto. Resposta só confirma recebimento (status RCVD) - não devolve prêmio nem coberturas calculadas.

```json
{
  "data": {
    "status": "RCVD",
    "statusUpdateDateTime": "2026-09-07T19:38:56Z"
  },
  "links": {
    "self": "https://api.local/open-insurance/quote-auto/v1/lead/request"
  },
  "meta": {
    "totalRecords": 1,
    "totalPages": 1
  }
}
```

## POST /open-insurance/consents/v2/consents (decodificado do JWS)

**Usado para:** Passo 1 do fluxo de autorização - registra o que vai ser pedido, ainda não dá acesso a nada

Resposta vem assinada (JWS compacto, application/jwt) - aqui já decodificada. O corpo que enviamos é o objeto acima (loggedUser + permissions + expirationDateTime).

```json
{
  "data": {
    "consentId": "urn:raidiaminsurance:043d670d-32f9-4ae8-a510-ea2e274979a3",
    "creationDateTime": "2026-09-07T19:38:56Z",
    "status": "AWAITING_AUTHORISATION",
    "statusUpdateDateTime": "2026-09-07T19:38:56Z",
    "permissions": [
      "RESOURCES_READ",
      "DAMAGES_AND_PEOPLE_AUTO_READ",
      "DAMAGES_AND_PEOPLE_AUTO_POLICYINFO_READ",
      "DAMAGES_AND_PEOPLE_HOUSING_READ",
      "DAMAGES_AND_PEOPLE_HOUSING_POLICYINFO_READ"
    ],
    "expirationDateTime": "2026-09-08T19:38:56Z"
  },
  "links": {
    "self": "https://api.local/open-insurance/consents/v2/consents/urn:raidiaminsurance:043d670d-32f9-4ae8-a510-ea2e274979a3"
  }
}
```

## Resposta final do /auth (JARM, decodificada)

**Usado para:** Passo 2 - o titular (simulado) aprova o consentimento

O Mock AS responde com um JWT assinado (JARM) na query string, não um `code` direto. Aqui só o campo relevante - o JWT completo também carrega state/aud/exp/iss.

```json
{
  "code": "KmlafvP8aXV_…(truncado)"
}
```

## POST /token (grant_type=authorization_code)

**Usado para:** Passo 3 - troca o code pelo access token vinculado ao consentimento

Esse access_token é o que autentica todas as chamadas de dado real abaixo.

```json
{
  "access_token": "a-aMyRPp7wg5…(truncado)",
  "expires_in": 900,
  "id_token": "eyJhbGciOiJQUzI1NiIsImtpZCI6InhRTHM0NXhZeUpyMW9tSHM0cW5CMnJoZXM5cU5GSElIUTVZUFFLVkpsaU0ifQ.eyJzdWIiOiJ1c3VhcmlvMUBzZWd1cmFkb3JhbW9kZWxvLmNvbS5iciIsImFjciI6InVybjpicmFzaWw6b3Blbmluc3VyYW5jZTpsb2EzIiwibm9uY2UiOiI5Y2NjNjY2Ny0zMDc5LTQ5MmUtYmM4NC03MTMxMzk0MGNjOTAiLCJhdWQiOiJjbGllbnQiLCJleHAiOjE3ODg4MTM1MzYsImlhdCI6MTc4ODgwOTkzNiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmxvY2FsIn0.Op3DTLseloTUEvvkxCogkP0_oZEq-08oU7IpgSgfK45RrAlGP8SFqoP4YXbMZAnsPGBy25UBoyGLyEwmSetY1j0HiJQy5RFZseipDYSpyq2cSOahrOEfeG5ps2VkmIi3KhQFyu9YNcLCqTEwx1Tsu7SWUtflYW-JQo2mpFo_qhqKL9syVVotIUfU5fDlTGkNiGM37sA-0EAwoRLOgQ1DN35nYoag4rQuOtHbGL3kWTivRwwN3E_cZrj8_F3AReLgeOo8o_JWG-S6JBzpJ4ovsjejQ3nykuNJitdqsUzRDnciw06fpNkEe3GcJTi6GoIW808TOD9heiwG4Fo2jJS4ww",
  "refresh_token": "sK6TC3fpmuwT-Z8KdK2x5Kf73NInW3xJxAs-q8CLAcD",
  "scope": "openid resources insurance-auto insurance-housing consent:urn:raidiaminsurance:043d670d-32f9-4ae8-a510-ea2e274979a3",
  "token_type": "Bearer"
}
```

## GET /open-insurance/insurance-auto/v1/insurance-auto

**Usado para:** Cards de portfólio (linha Auto) + KPI de apólices ativas

Lista de apólices de auto do cliente - só policyId e nome do produto, sem detalhe de cobertura.

```json
{
  "data": [
    {
      "brand": "Mock",
      "companies": [
        {
          "companyName": "Mock Insurer",
          "cnpjNumber": "12345678901234",
          "policies": [
            {
              "policyId": "mock-auto-policy-1",
              "productName": "Mock Insurer Auto Policy Plan"
            }
          ]
        }
      ]
    }
  ],
  "links": {
    "self": "https://api.local/open-insurance/insurance-auto/v1/insurance-auto?page-size=25&page=1",
    "first": "https://api.local/open-insurance/insurance-auto/v1/insurance-auto?page-size=25&page=1",
    "last": "https://api.local/open-insurance/insurance-auto/v1/insurance-auto?page-size=25&page=1"
  },
  "meta": {
    "totalRecords": 1,
    "totalPages": 1
  }
}
```

## GET /open-insurance/insurance-auto/v1/insurance-auto/mock-auto-policy-1/policy-info

**Usado para:** Tags de cobertura, prêmio, vigência no card de apólice + Overlap Engine + nome do cliente

Detalhe completo da apólice - é daqui que tiramos coverages (normalizados pelo domain layer), termStartDate/termEndDate e insureds[].name.

```json
{
  "data": {
    "documentType": "APOLICE_INDIVIDUAL",
    "policyId": "mock-auto-policy-1",
    "issuanceType": "EMISSAO_PROPRIA",
    "issuanceDate": "2026-09-07",
    "termStartDate": "2026-08-28",
    "termEndDate": "2026-09-17",
    "maxLMG": {
      "amount": "100.00",
      "unitType": "MONETARIO"
    },
    "proposalId": "mock-auto-policy-proposal-1",
    "insureds": [
      {
        "identification": "76109277673",
        "identificationType": "CPF",
        "name": "Usuário 1",
        "birthDate": "2000-01-01",
        "postCode": "10000000",
        "city": "Sao Paulo",
        "state": "SP",
        "country": "BRA",
        "address": "Av Naburo Ykesaki, 1270"
      }
    ],
    "insuredObjects": [
      {
        "identification": "76109277673",
        "type": "CONDUTOR",
        "description": "condutor",
        "coverages": [
          {
            "branch": "0111",
            "code": "PEQUENOS_REPAROS",
            "susepProcessNumber": "12345",
            "LMI": {
              "amount": "100.00",
              "unitType": "MONETARIO"
            },
            "termStartDate": "2026-08-28",
            "termEndDate": "2026-09-17",
            "isMainCoverage": true,
            "feature": "GRANDES_RISCOS",
            "type": "REGULAR_COMUM",
            "premiumAmount": {
              "amount": "100.00",
              "unitType": "MONETARIO"
            },
            "premiumPeriodicity": "MENSAL"
          }
        ]
      }
    ],
    "repairNetwork": "LIVRE_ESCOLHA",
    "repairedPartsUsageType": "NOVA",
    "repairedPartsClassification": "ORIGINAL",
    "repairedPartsNationality": "NACIONAL",
    "validityType": "MENSAL"
  },
  "links": {
    "self": "https://api.local/open-insurance/insurance-auto/v1/insurance-auto/mock-auto-policy-1/policy-info"
  },
  "meta": {
    "totalRecords": 1,
    "totalPages": 1
  }
}
```

## GET /open-insurance/insurance-housing/v1/insurance-housing

**Usado para:** Cards de portfólio (linha Residencial) + KPI de apólices ativas

Mesma estrutura da lista de auto.

```json
{
  "data": [
    {
      "brand": "Mock",
      "companies": [
        {
          "companyName": "Mock Insurer",
          "cnpjNumber": "12345678901234",
          "policies": [
            {
              "policyId": "01a6dff1-74ab-4005-bfff-8b737c2c5915",
              "productName": "Mock Insurer Housing Policy"
            }
          ]
        }
      ]
    }
  ],
  "links": {
    "self": "https://api.local/open-insurance/insurance-housing/v1/insurance-housing"
  },
  "meta": {
    "totalRecords": 1,
    "totalPages": 1
  }
}
```

## GET /open-insurance/insurance-housing/v1/insurance-housing/01a6dff1-74ab-4005-bfff-8b737c2c5915/policy-info

**Usado para:** Tags de cobertura no card de apólice + Overlap Engine + nome do cliente

Note a diferença de shape pro auto: aqui não existe premiumAmount por cobertura em lugar nenhum.

```json
{
  "data": {
    "documentType": "APOLICE_INDIVIDUAL",
    "policyId": "1111111",
    "susepProcessNumber": "string",
    "groupCertificateId": "string",
    "issuanceType": "EMISSAO_PROPRIA",
    "issuanceDate": "2022-12-31",
    "termStartDate": "2022-12-31",
    "termEndDate": "2023-12-31",
    "leadInsurerCode": "string",
    "leadInsurerPolicyId": "string",
    "maxLMG": {
      "amount": "9871667727569.12",
      "unitType": "MONETARIO",
      "unit": {
        "code": "Br",
        "description": "BRL"
      }
    },
    "proposalId": "string",
    "insureds": [
      {
        "identification": "12345678900",
        "identificationType": "CPF",
        "identificationTypeOthers": "RNE",
        "name": "Nome Sobrenome",
        "birthDate": "1999-06-12",
        "postCode": "17500001",
        "email": "email@example.com",
        "city": "Rio de Janeiro",
        "state": "RJ",
        "country": "BRA",
        "address": "Avenida Naburo Ykesaki, 1270",
        "addressAdditionalInfo": "Fundos"
      }
    ],
    "beneficiaries": [
      {
        "identification": "12345678900",
        "identificationType": "CPF",
        "identificationTypeOthers": "RNE",
        "name": "Nome Sobrenome"
      }
    ],
    "intermediaries": [
      {
        "type": "REPRESENTANTE",
        "identification": "12345678900",
        "identificationType": "CPF",
        "identificationTypeOthers": "RNE",
        "name": "Nome Sobrenome",
        "postCode": "17500001",
        "city": "Rio de Janeiro",
        "state": "RJ",
        "country": "BRA",
        "address": "Avenida Naburo Ykesaki, 1270"
      }
    ],
    "insuredObjects": [
      {
        "identification": "string",
        "type": "AUTOMOVEL",
        "description": "string",
        "amount": {
          "amount": "9871667727569.12",
          "unitType": "MONETARIO",
          "unit": {
            "code": "Br",
            "description": "BRL"
          }
        },
        "coverages": [
          {
            "branch": "0111",
            "code": "DANOS_ELETRICOS",
            "description": "string",
            "internalCode": "string",
            "susepProcessNumber": "string",
            "LMI": {
              "amount": "100",
              "unitType": "PORCENTAGEM"
            },
            "isLMISublimit": true,
            "termStartDate": "2022-12-31",
            "termEndDate": "2023-12-31",
            "isMainCoverage": true,
            "feature": "MASSIFICADOS",
            "type": "PARAMETRICO",
            "gracePeriod": 0,
            "gracePeriodicity": "DIA",
            "gracePeriodCountingMethod": "DIAS_UTEIS",
            "premiumPeriodicity": "ANUAL"
          }
        ]
      }
    ],
    "branchInfo": {
      "insuredObjects": [
        {
          "identification": "string",
          "propertyType": "APARTAMENTO",
          "postCode": "10000000",
          "interestRate": "10.00",
          "costRate": "10.00",
          "updateIndex": "IGPDI_FGV",
          "lenders": [
            {
              "companyName": "string",
              "cnpjNumber": "12345678901234"
            }
          ]
        }
      ],
      "insureds": [
        {
          "identification": "12345678900",
          "identificationType": "CPF"
        }
      ]
    }
  },
  "links": {
    "self": "https://api.local/open-insurance/insurance-housing/v1/insurance-housing/01a6dff1-74ab-4005-bfff-8b737c2c5915/policy-info"
  },
  "meta": {
    "totalRecords": 1,
    "totalPages": 1
  }
}
```
