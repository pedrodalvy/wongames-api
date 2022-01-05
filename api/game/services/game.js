'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */
const axios = require('axios');
const slugify = require('slugify');

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

async function setImage({ image, game, field = 'cover'}) {
  const url = `https:${image}_bg_crop_1680x655.jpg`;

  const { data } = await axios.get(url, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(data, 'base64');

  const FormData = require('form-data');
  const formData = new FormData();

  formData.append('refId', game.id);
  formData.append('ref', 'game');
  formData.append('field', field);
  formData.append('files', buffer, { filename: `${game.slug}.jpg` });

  console.info(`Uploading ${field} image: ${game.slug}.jpg`);

  await axios({
    method: "POST",
    url: `http://${strapi.config.host}:${strapi.config.port}/upload`,
    data: formData,
    headers: {
      "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
    },
  });
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

      const game = await strapi.services.game.create({
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

      await setImage({ image: product.image, game });

      const imagesGallery = product.gallery.slice(0, 5);
      await Promise.all(imagesGallery.map((url) => {
        setImage({image: url, game, field: 'gallery'});
      }));

      await timeout(2000);

      return game;
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
