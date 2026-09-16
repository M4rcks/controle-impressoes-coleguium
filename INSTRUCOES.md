# Controle de Impressões — publicação no Netlify

O layout e as funções visuais estão preservados. O Supabase é usado somente para que Marcos e Everton compartilhem o mesmo histórico.

## 1. Criar o banco no Supabase

1. Crie um projeto em https://supabase.com.
2. Abra **SQL Editor**.
3. Copie todo o conteúdo de `supabase.sql` e clique em **Run**.
4. Abra **Project Settings > API** e copie a Project URL e a chave `service_role`.

Nunca publique a chave `service_role` no código ou em repositório público.

## 2. Publicar no Netlify

1. Descompacte este ZIP.
2. Acesse https://app.netlify.com e conecte a pasta a um repositório do GitHub.
3. Em **Site configuration > Environment variables**, crie:
   - `SUPABASE_URL` com a Project URL;
   - `SUPABASE_SERVICE_ROLE_KEY` com a chave service_role.
4. Faça a publicação novamente depois de salvar as variáveis.

O Netlify detectará o Next.js e executará `npm run build`.

## Teste local opcional

Duplique `.env.example` com o nome `.env.local`, preencha as variáveis e execute `npm install` e `npm run dev`.
