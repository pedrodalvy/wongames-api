'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */
const axios = require('axios');
const slugify = require('slugify');

async function getGameInfo(slug) {
  const jsdom = require('jsdom');
  const { JSDOM } = jsdom;

  const body = await axios.get(`https://www.gog.com/game/${slug}`);
  const dom = new JSDOM(body.data);

  const description = dom.window.document.querySelector('.description');

  return {
    rating: 'BR0',
    short_description: description.textContent.trim().slice(0, 160),
    description: description.innerHTML,
  }
}

async function getByName(name, entityName) {
  return strapi.services[entityName].findOne({ name });
}

async function create(name, entityName) {
  const item = await getByName(name, entityName);

  if (!item) {
    const slug = slugify(name, { lower: true });
    return strapi.services[entityName].create({ name, slug });
  }
}

async function createManyToManyData(products) {
  const developers = {};
  const publishers = {};
  const categories = {};
  const platforms = {};

  products.forEach((product) => {
    const { developer, publisher, genres, supportedOperatingSystems } = product;

    developers[developer] = true;
    publishers[publisher] = true;

    genres && genres.forEach((genre) => {
      categories[genre] = true;
    });

    supportedOperatingSystems && supportedOperatingSystems.forEach((platform) => {
      platforms[platform] = true;
    });
  });

  return Promise.all([
    ...Object.keys(developers).map((name) => create(name, 'developer')),
    ...Object.keys(publishers).map((name) => create(name, "publisher")),
    ...Object.keys(categories).map((name) => create(name, "category")),
    ...Object.keys(platforms).map((name) => create(name, "platform")),
  ]);
}

async function createGames(products) {
  Promise.all(products.map(async (product) => {
    const { title } = product;
    const item = await getByName(title, 'game');

    if (!item) {
      console.log(`Creating: ${title}...`);

      const { globalReleaseDate, genres, supportedOperatingSystems } = product
      const { slug, price, developer, publisher } = product

      const releaseDate = new Date(Number(globalReleaseDate) * 1000).toISOString();
      const categories = await Promise.all(
        genres.map((genre) => getByName(genre, 'category'))
      );
      const platforms = await Promise.all(
        supportedOperatingSystems.map((platform) => getByName(platform, 'platform'))
      );

      return strapi.services.game.create({
        name: title,
        slug: slug.replace(/_/g, '-'),
        price: price.amount,
        release_date: releaseDate,
        categories,
        platforms,
        developers: [await getByName(developer, 'developer')],
        publisher: await getByName(publisher, 'publisher'),
        ...(await getGameInfo(slug)),
      })
    }
  }))
}

module.exports = {
  populate: async (params) => {
    const gogApiUrl = `https://www.gog.com/games/ajax/filtered?mediaType=game&page=1&sort=popularity`;

    const { data: { products } } = await axios.get(gogApiUrl);

    await createManyToManyData(products);
    await createGames(products);
  }
};
