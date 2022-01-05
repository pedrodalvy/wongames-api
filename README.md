# CMS para o projeto WON Games, do curso [React Avançado](https://www.udemy.com/course/react-avancado/)

CMS criado com Strapi para cadastro de jogos, imagens, descrição, etc.

## Requisitos
- [Node.js](https://nodejs.org/en/) Versão 14
- [Docker](https://www.docker.com/) (para utilização do Postgres)

## Utilização
- Instalar as dependências do projeto: `yarn install`
- Iniciar o docker com o postgres: `docker-compose up -d`
- Iniciar o servidor: `yarn develop`
- Utilizar os endpoints: 
  - admin: http://localhost:1337/admin
  - graphql: http://localhost:1337/graphql

## Popular o banco de dados
> Utilizar esse recurso apenas em ambiente de desenvolvimento.

É possível utilizar um scraper para popular o banco de dados em ambiente local.
Para isso, a aplicação deve estar em execução e as rotas `/games/populate` e `/upload` 
devem estar liberadas para acesso público.

O scraper é realizado na página de [gog.com](https://www.gog.com).

- Exemplo:
  ```shell
  curl -X POST http://localhost:1337/games/populate
  ```
  ou
  ```shell
  curl -X POST http://localhost:1337/games/populate\?page=2
  ```
