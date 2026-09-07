# SegurosGPT — Validações de Backend (para apresentação ao negócio)

> Este documento resume, em linguagem não técnica, o que já foi construído e **comprovado funcionando** na parte de trás do SegurosGPT — antes de existir qualquer tela. O objetivo é mostrar, com exemplos concretos, o que o sistema já é capaz de resolver.

---

## 1. O que foi testado

Duas frentes, que juntas sustentam a proposta do produto:

1. **Conseguimos falar de verdade com o Open Insurance** — buscar o que um cliente já tem contratado e pedir novas cotações — não é só uma integração desenhada no papel, foi executada contra o ambiente real e funcionou.
2. **O motor que compara e cruza coberturas funciona corretamente** — inclusive nos casos difíceis, onde é fácil o sistema "ver sobreposição" onde não existe.

---

## 2. Teste 1 — Trazer os dados do cliente e pedir cotações

**O que foi feito:** para um CPF de teste, o sistema conectou no Open Insurance, se autenticou como o próprio cliente autorizaria (processo de consentimento), e trouxe de volta os dados da apólice de auto dele. Na sequência, pediu uma cotação nova de seguro auto para o mesmo perfil.

**Por que isso importa:** é a base de tudo — sem isso não existe "o que o cliente já tem" nem "o que ele poderia contratar". Essa etapa é a mais arriscada tecnicamente (é o mesmo processo de segurança que os bancos e seguradoras usam de verdade), e já está funcionando de ponta a ponta.

**Resultado:** conexão validada, autenticação validada, os dois tipos de busca (dado existente e cotação nova) validados.

---

## 3. Teste 2 — Comparar propostas de seguradoras diferentes

**Cenário simulado:** um corretor pede cotação de seguro auto para o mesmo cliente em duas seguradoras.

| Cobertura | Seguradora A | Seguradora B |
|---|---|---|
| Danos ao veículo | ✅ | — |
| Incêndio | ✅ | — |
| Roubo e furto | ✅ (incluso na compreensiva) | ✅ |
| Responsabilidade civil | ✅ | ✅ |
| Vidros | ✅ | — |
| Carro reserva | — | ✅ |
| **Prêmio (exemplo)** | R$ 2.400 | R$ 2.100 |

**O que o sistema conseguiu mostrar automaticamente:** as duas propostas cobrem responsabilidade civil e roubo/furto, mas só a Seguradora A cobre vidros e danos ao veículo, enquanto só a B oferece carro reserva — e é R$ 300 mais barata. Esse é exatamente o tipo de comparação que hoje o corretor provavelmente faz manualmente, olhando proposta por proposta.

---

## 4. Teste 3 — Detectar sobreposição de cobertura (o caso mais importante)

Este é o teste que mais interessa ao negócio, porque é onde o SegurosGPT vai além de "mostrar dados" e passa a **gerar uma recomendação de valor real pro cliente final**.

### 4.1 Caso positivo — sobreposição real encontrada

**Cenário simulado:** um cliente já tem um seguro residencial que inclui cobertura de morte e invalidez, **e também** tem um seguro de auto que inclui cobertura de acidentes pessoais para o condutor.

**O que o sistema identificou:** essas duas coberturas, embora estejam em apólices de ramos completamente diferentes (residencial e auto), protegem a mesma coisa — a pessoa do segurado, contra o mesmo tipo de risco (acidente/invalidez). O sistema sinalizou isso como uma **sobreposição** — o cliente pode estar pagando duas vezes pela mesma proteção.

**Por que isso é a prova de conceito mais forte do produto:** o exemplo inicial que motivou a ideia foi "seguro viagem com bagagem já incluída + seguro bagagem avulso". Este teste prova que o sistema resolve o problema **de forma genérica** — encontrou uma sobreposição real num par de ramos completamente diferente daquele exemplo original, sem ter sido programado especificamente para esse caso.

### 4.2 Caso negativo — o sistema NÃO erra por excesso de zelo

**Cenário simulado:** o mesmo cliente tem cobertura de roubo/furto no seguro de auto (proteção do carro) **e** cobertura de roubo/furto no seguro residencial (proteção dos bens dentro de casa).

**O que o sistema fez:** **não** sinalizou isso como sobreposição — corretamente. São coisas diferentes sendo protegidas (o carro vs. os pertences dentro de casa), mesmo usando a mesma palavra "roubo e furto" nas duas apólices.

**Por que isso importa tanto quanto o caso positivo:** um sistema que aponta sobreposição toda vez que vê uma palavra parecida gera alerta falso, perde a confiança do corretor e do cliente rapidamente. Provar que o sistema distingue "mesmo risco, bem diferente" de "mesmo risco, mesmo bem" é o que torna a recomendação confiável o suficiente pra ser levada a sério.

---

## 5. O que isso prova, em uma frase

O SegurosGPT já consegue, de forma automática e comprovada: **buscar o que o cliente tem, buscar novas propostas, comparar as propostas entre si, e encontrar sobreposições de cobertura reais sem gerar alarme falso** — os quatro pilares centrais do produto, validados com dados e cenários concretos, antes mesmo de existir uma tela.

---

## 6. Atualização — telas construídas e sobreposição rodando com dado real

Depois da primeira versão deste documento, dois avanços:

1. **Já existe interface** — o corretor digita o CPF numa tela de busca e cai numa tela do cliente com o portfólio, os alertas de sobreposição e a comparação de propostas.
2. **A sobreposição deixou de depender só de exemplo simulado.** Descobrimos que buscar o detalhe de cobertura de uma apólice exige um passo extra de "seleção de recursos" durante o processo de autorização — o mesmo passo que, no mundo real, é a tela onde o cliente escolhe quais apólices específicas ele libera pro corretor ver. Esse mesmo passo também afetava a listagem básica das apólices: antes de resolver isso, o sistema achava (errado) que os clientes de teste só tinham seguro residencial, sem seguro auto. Depois da correção, ficou claro que eles têm os dois. O sistema já busca a cobertura de verdade de cada apólice e roda a detecção de sobreposição em cima do dado real — para os clientes de teste disponíveis hoje, o auto e o residencial deles não se cruzam (são riscos diferentes), então nenhuma sobreposição aparece, e isso está certo. O mecanismo em si já não é mais só uma prova de conceito com dado inventado.

A comparação de propostas (Seção 3) continua usando exemplo simulado — motivo diferente: buscar uma cotação nova hoje só confirma que o pedido foi recebido, ainda não devolve o valor do prêmio pra comparar.

---

## 7. O que ainda não existe (pra não gerar expectativa errada)

- **Só duas linhas de seguro implementadas até agora** (Auto e Residencial), das cerca de 15 disponíveis no Open Insurance — as demais seguem o mesmo padrão já provado, mas ainda não foram construídas.
- **Os valores de prêmio da comparação de propostas ainda são exemplos simulados** — falta ligar a busca de cotação nova a um resultado com preço de verdade.
- **A explicação em linguagem natural (IA) ainda não foi ligada** — os testes acima são só a parte determinística (regras), que é a base sobre a qual a IA vai explicar os achados depois.
- **Login do corretor ainda não existe** — qualquer um com acesso ao ambiente entra direto na busca por CPF.
