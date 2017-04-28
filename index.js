require('dotenv-extended').load()
require('./src/buffer')
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const { connector, bot } = require('./src/bot')

const app = express()
app.use(express.static('public'))
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

app.get('/', (req, res) => {
  res.sendFile('/public/index.html')
})

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, './public/chat.html'))
})

app.get('/terms-of-use', (req, res) => {
  res.sendFile(path.join(__dirname, './public/terms-of-use.html'))
})

app.get('/privacy-rules', (req, res) => {
  res.sendFile(path.join(__dirname, './public/privacy-rules.html'))
})

app.post('/api/messages', connector.listen())

app.listen(app.get('port'), () => {
  console.log('Node app is running on port', app.get('port'))
})
