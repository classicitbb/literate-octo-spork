'use strict';
require('dotenv').config();
const createApp = require('./app');

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`PriceSmart Optical server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
