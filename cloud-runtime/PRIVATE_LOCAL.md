# Íris particular (modo local experimental)

A integração oficial é a opção recomendada. O modo não oficial pode sofrer desconexões, bloqueio temporário ou permanente e alterações sem aviso. Um dispositivo vinculado pode acessar mensagens privadas. Use exclusivamente uma conta própria e um equipamento sob seu controle. Não compartilhe códigos de pareamento, arquivos de sessão, senhas ou a URL privada do painel. Não exponha a porta local em hospedagens públicas, proxies ou túneis.

O painel particular é separado do Manager online e da Íris principal. Não usa o banco Supabase da plataforma. Os dados ficam criptografados em uma pasta privada do equipamento; uma chave local é criada para esta instância. O controle de acesso é individual.

## Execução local

- Requisitos: computador próprio com terminal interativo, Node.js compatível com cloud-runtime/package.json e dependências de mídia do projeto.
- No repositório, instale as dependências do runtime: `npm --prefix cloud-runtime install`.
- Quando ainda não há sessão, a página particular aceita o número da própria conta. O Manager online não coleta números nem credenciais.
- Execute `node cloud-runtime/privateLocal.js` no terminal próprio. Abra o endereço privado exibido no terminal, no mesmo equipamento, leia os avisos. O painel particular mostra a opção de solicitar pareamento para uma conta própria ou iniciar uma sessão já registrada.
- O código, quando disponibilizado pelo serviço, fica restrito ao painel local e é ocultado após dois minutos ou uma mudança de conexão. A compatibilidade real com WhatsApp pessoal ou Business depende do serviço e não é garantida.
- Para encerrar sem desvincular, use Encerrar instância. Para revogar a autorização, consulte os dispositivos vinculados na aplicação oficial.

O código local é experimental; testes automatizados usam apenas valores sintéticos, sem conexão a contas WhatsApp. A existência deste modo não significa autorização oficial da Meta. Não há suporte ao pareamento de terceiros através do site compartilhado.
