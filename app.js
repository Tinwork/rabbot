const express = require('express')
const bodyParser = require('body-parser')
const {
  connector,
  bot
} = require('./src/bot/index')

const app = express()

app.use(bodyParser.json())

app.post('/api/messages', connector.listen())

app.listen(3978, () => {
  console.log('Running at 3978');
})