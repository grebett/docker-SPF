const util = require('util');
const express = require('express');
const morgan = require('morgan');
const app = express();
const conf = require('./conf');
const sendFragment = require('./actions').sendFragment;

app.use(morgan(conf.env));

// ready for building an api
app.get('/api/*', (req, res) => {
  res.send(`You called the api with the params: ${util.inspect(req.params)}`);
});

// for every other request, check if the spf paramater is defined
app.get('*', (req, res) => {
  if (req.query.spf === 'navigate' || req.query.spf === 'load') {
    sendFragment(req, res);
  } else {
    res.status(403).end();
  }
});

app.listen(conf.port, function() {
  console.log(`Express server listening on port ${conf.port}`);
});
