require('dotenv-extended').load()
require('./src/buffer')
const express = require('express')
const bodyParser = require('body-parser')
const { connector, bot } = require('./src/bot')

const app = express()
app.use(
  bodyParser.json({
    limit: '300mb',
    extended: true,
    parameterLimit: 1000
  })
)
app.use(
  bodyParser.urlencoded({
    limit: '300mb',
    extended: true,
    parameterLimit: 1000
  })
)

app.set('port', process.env.PORT || 5000)

app.use(bodyParser.json())

app.get('/', function(req, res) {
  res.send('Hello World!')
})

app.post('/api/messages', connector.listen())

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'))
})
