'use strict';
const db = require('../server/db');
const createApp = require('../server/app');

let app;
let ready = false;

const appPromise = db._migrate().then(() => {
  app = createApp();
  ready = true;
});

module.exports = async (req, res) => {
  if (!ready) await appPromise;
  app(req, res);
};
