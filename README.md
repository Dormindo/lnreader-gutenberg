# LNReader — Project Gutenberg

Plugin para o LNReader que usa a API Gutendex/Project Gutenberg para disponibilizar livros clássicos de domínio público.

## O que ele faz

- Pesquisa por título ou autor.
- Lista livros populares em inglês.
- Mostra capa, autor e informações do livro.
- Tenta separar capítulos/seções automaticamente.
- Usa a edição HTML do Project Gutenberg para leitura dentro do LNReader.

## Instalação no LNReader

O LNReader 2.x instala plugins por meio de um **repositório de plugins**, cujo manifesto contém a URL do JavaScript do plugin.

1. Crie um repositório público no GitHub chamado `lnreader-gutenberg`.
2. Envie todos os arquivos desta pasta para a branch `main`.
3. Abra `.dist/plugins.json` e `.dist/plugins.min.json`.
4. Substitua `SEU_USUARIO` pelo seu nome de usuário do GitHub nos dois arquivos.
5. No LNReader, adicione este endereço como repositório:

   `https://raw.githubusercontent.com/SEU_USUARIO/lnreader-gutenberg/main/.dist/plugins.min.json`

6. Instale **Project Gutenberg**.

## Observação

O plugin usa a API pública Gutendex para catálogo/pesquisa e o HTML disponibilizado pelo Project Gutenberg para leitura. A API documenta pesquisa por título/autor e livros individuais por ID.

Este pacote é uma extensão comunitária e não é afiliado ao Project Gutenberg nem ao LNReader.
