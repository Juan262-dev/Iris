# Íris — preparação de hospedagem

A branch iris-cloud é experimental. O painel original não está pronto para publicação na internet; contém execução de código e precisa de revisão. Não implantar esta branch publicamente antes dessa revisão.

## Variáveis do servidor
- IRIS_AUTH_STORE=supabase
- SUPABASE_URL: URL HTTPS do projeto
- SUPABASE_SECRET_KEY: chave secreta exclusiva do servidor (ou SUPABASE_SERVICE_ROLE_KEY legado)
- IRIS_SESSION_ENCRYPTION_KEY: 32 bytes aleatórios, codificados em 64 caracteres hexadecimais

Nunca adicionar os valores ao Git, ao navegador, ao chat, a logs ou à imagem Docker. Manter cópia segura da chave de criptografia fora do repositório. Não usar a mesma conta/sessão em duas instâncias simultâneas. O armazenamento cifra e autentica um snapshot da sessão antes de gravar. RLS e permissões da tabela bloqueiam acesso dos papéis públicos. A sessão existente em arquivos locais não é migrada automaticamente.

## Pendências
- Testar instalação, persistência, reinicialização, pareamento e revogação com conta de teste autorizada.
- Revisar e desativar execução remota arbitrária, exposição de logs e comandos incompatíveis com segurança/privacidade; substituir credenciais padrão.
- Configurar porta do Render e autenticação do painel antes de publicar.
- Configurar acesso às mensagens de grupos apenas com conhecimento e autorização dos participantes.
- A suspensão do Render gratuito interrompe o bot. O Supabase preserva o estado, não garante funcionamento contínuo.
- Após logout, não tentar reconectar automaticamente com estado revogado; revisar o estado do servidor e executar um novo pareamento autorizado.

A versão main permanece original. Nenhum segredo ou sessão real foi adicionado.