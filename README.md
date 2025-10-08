# Projeto ISA 2.5 - Plataforma SaaS de Automação

Bem-vindo ao repositório do projeto **ISA 2.5**, uma plataforma SaaS robusta construída para automação, com um foco inicial na integração e gerenciamento de conexões do WhatsApp através da Evolution API.

##  arquitetura e tecnologias

Este projeto utiliza uma arquitetura moderna e desacoplada, combinando um frontend reativo com um backend serverless para escalabilidade e eficiência.

### **Frontend**
- **Framework:** React com Vite
- **Linguagem:** TypeScript
- **UI:** shadcn/ui e Tailwind CSS
- **Cliente Supabase:** `supabase-js` para interação com o backend.

### **Backend (Serverless)**
- **Plataforma:** Supabase Edge Functions
- **Runtime:** Deno (compatível com TypeScript)
- **Funcionalidade Principal:** A função `evolution` atua como um micro-serviço, gerenciando o ciclo de vida das conexões com a Evolution API.

### **API Externa**
- **Evolution API:** Uma API auto-hospedada (`https://evo.inovapro.cloud`) que gerencia as instâncias do WhatsApp.

## Funcionalidades Implementadas

### **Conexão com WhatsApp (`WhatsAppConnection.tsx`)**
- **Criação de Instância:** Gera um QR Code para que o usuário possa conectar seu número de WhatsApp.
- **Verificação de Status em Tempo Real:** Monitora o status da conexão a cada 3 segundos, atualizando a interface em tempo real.
- **Gerenciamento de Estado:** Exibe o status atual da conexão com badges e ícones informativos.
- **Desconexão:** Permite que o usuário encerre a conexão da instância ativa.

### **Backend - Supabase Function `evolution`**
A função `evolution/index.ts` expõe os seguintes endpoints baseados em ações:
- `{ "action": "createInstance" }`: Cria uma nova instância na Evolution API.
- `{ "action": "checkStatus", "instanceName": "..." }`: Verifica o status de uma instância.
- `{ "action": "deleteInstance", "instanceName": "..." }`: Remove uma instância.

## Configuração do Ambiente

### **Pré-requisitos**
- Node.js e npm
- Supabase CLI

### **Passos para Instalação**
1.  **Clonar o Repositório:** `git clone <URL_DO_SEU_REPOSITORIO_GIT>`
2.  **Instalar Dependências:** `npm install`
3.  **Configurar Frontend (`.env.local`):
    ```env
    VITE_SUPABASE_URL=https://tcswbkvsatskhaskwnit.supabase.co
    VITE_SUPABASE_ANON_KEY=<SUA_ANON_KEY>
    ```
4.  **Configurar Backend (Supabase Secrets):**
    ```sh
    npx supabase secrets set EVOLUTION_API_URL="https://evo.inovapro.cloud"
    npx supabase secrets set EVOLUTION_API_KEY="SUA_CHAVE_API"
    ```

### **Rodando o Projeto**
- **Frontend:** `npm run dev`
- **Backend (local):** `npx supabase functions serve`

## Deploy
- **Frontend:** Vercel, Netlify, Firebase Hosting, etc.
- **Backend:** `npx supabase functions deploy evolution --no-verify-jwt`

## Diagnóstico e Solução de Problemas

Esta seção contém guias para diagnosticar erros comuns que podem ocorrer.

### **Erro 400: Bad Request ao Criar Instância**

Um erro `400 Bad Request` da Evolution API significa que os dados enviados no corpo da requisição estão incompletos ou são inválidos. Siga estes passos para diagnosticar:

**1. Conferir os Dados Enviados**

Verifique o objeto `requestBody` dentro da função `handleCreateInstance` em `supabase/functions/evolution/index.ts`. Garanta que todos os campos obrigatórios pela Evolution API estão presentes. Consulte a documentação da API para a lista de parâmetros.

**2. Teste Direto via cURL**

Execute uma chamada direta para a API para isolar o problema. Se esta chamada falhar, o problema está nos dados enviados ou na sua API. Se funcionar, o problema está na sua função Supabase.

```sh
cURL -X POST https://evo.inovapro.cloud/instance/create \
-H "apikey: SUA_CHAVE_API" \
-H "Content-Type: application/json" \
-d '{
  "instanceName": "teste_curl_123",
  "token": "token_curl_123",
  "qrcode": true,
  "number": ""
}'
```

**3. Log Detalhado na Função Supabase**

Adicione um log temporário na sua função `handleCreateInstance` para ver exatamente o que está sendo enviado:

```javascript
// Dentro de handleCreateInstance, antes do fetch
console.log("Enviando para a Evolution API:", JSON.stringify(requestBody));
```
Isso permitirá comparar o corpo da requisição com o que a API espera.

**4. Possíveis Causas Comuns**
- **Campo Obrigatório Faltando:** O corpo da requisição não contém um campo que a API exige (como `instanceName` ou `number`).
- **Caracteres Inválidos:** O `instanceName` contém espaços, acentos ou símbolos não permitidos.
- **Chave de API (apikey) Incorreta:** A chave no header não é válida ou não tem permissão.
- **Endpoint Errado:** A URL da requisição está incorreta.
