const express = require('express')
const bodyParser = require('body-parser')
const {
  connector,
  bot
} = require('./src/bot/index')

const app = express()

app.set('port', (process.env.PORT || 5000));

app.use(bodyParser.json())

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.post('/api/messages', connector.listen())

app.listen(app.get('port'), function () {
  console.log('Node app is running on port', app.get('port'));
});