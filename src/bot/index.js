const builder = require('botbuilder')
const Promise = require('bluebird')
const request = require('request-promise').defaults({
  encoding: null
})
const baseUrl = 'http://ec2-54-77-243-23.eu-west-1.compute.amazonaws.com'
let questions = []
const connector = new builder.ChatConnector({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
})

const bot = new builder.UniversalBot(connector, [
  function(session) {
    session.send('Bonjour, je suis Jabbot')
    session.beginDialog('jobCarrousel')
  }
])

bot.dialog('jobCarrousel', [
  function(session) {
    session.send('Voulez-vous postulez pour un de ces profiles ?')
    getJobCarrousel(session).then(cards => {
      var reply = new builder.Message(session)
        .attachmentLayout(builder.AttachmentLayout.carousel)
        .attachments(cards)
      session.send(reply)
    })
  }
])

bot.dialog('/job', [
  function(session, args) {
    questions = []
    session.send('You choose job id %s', args.data)
    getQuestions(args.data).then(data => {
      // FIXME: Lookl at session
      questions = data.questions
      session.beginDialog('askQuestions')
    })
  },
  function(session) {
    session.beginDialog('uploadCV')
  }
])

bot.dialog('askQuestions', [
  function(session, args) {
    // Save previous state (create on first call)
    session.dialogData.index = args ? args.index : 0
    session.dialogData.form = args ? args.form : {}

    // Prompt user for next field
    switch (questions[session.dialogData.index].type) {
      case 'string':
        builder.Prompts.text(session, questions[session.dialogData.index].body)
        break

      case 'int':
        builder.Prompts.number(
          session,
          questions[session.dialogData.index].body
        )
        break

      case 'enum':
        builder.Prompts.choice(
          session,
          questions[session.dialogData.index].body,
          questions[session.dialogData.index].enum
        )
        break

      default:
        builder.Prompts.text(session, questions[session.dialogData.index].body)
    }
  },
  function(session, results) {
    // Save users reply
    var field = questions[session.dialogData.index++].id
    session.dialogData.form[field] = results.response

    // Check for end of form
    if (session.dialogData.index >= questions.length) {
      // Return completed form
      session.endDialogWithResult({
        response: session.dialogData.form
      })
    } else {
      // Next field
      session.replaceDialog('askQuestions', session.dialogData)
    }
  },
  function(session, response) {
    session.send('Merci d"avoir répondu aux questions')
    sendResponseData(response)
    session.beginDialog('uploadCV')
  }
])

bot.dialog('uploadCV', [
  function(session) {
    var msg = session.message
    if (msg.attachments.length) {
      // Message with attachment, proceed to download it.
      // Skype & MS Teams attachment URLs are secured by a JwtToken, so we need to pass the token from our bot.
      var attachment = msg.attachments[0]
      var fileDownload = checkRequiresToken(msg)
        ? requestWithToken(attachment.contentUrl)
        : request(attachment.contentUrl)

      fileDownload
        .then(response => {
          // Send reply with attachment type & size
          var reply = new builder.Message(session).text(
            'Attachment of %s type and size of %s bytes received.',
            attachment.contentType,
            response.length
          )
          session.send(reply)
          session.send('Merci d"avoir upload votre CV')
          session.beginDialog('chooseDate')
        })
        .catch(err => {
          console.log('Error downloading attachment:', {
            statusCode: err.statusCode,
            message: err.response.statusMessage
          })
        })
    } else {
      // No attachments were sent
      var reply = new builder.Message(session).text(
        'Hi there! This sample is intented to show how can I receive attachments but no attachment was sent to me. Please try again sending a new message with an attachment.'
      )
      session.send(reply)
    }
  }
])

bot.dialog('chooseDate', [
  function(session) {
    session.send('Choose a date')
  }
])

bot.beginDialogAction('job', '/job')

const getJobCarrousel = session => {
  return new Promise((resolve, reject) => {
    request({
      uri: baseUrl + '/jobs/getalljob',
      json: true
    })
      .then(data => {
        const result = data.reduce((memo, job) => {
          let card = new builder.HeroCard(session)
          card.title(job.title)
          card.subtitle(job.subtitle)
          card.text(job.description)
          card.images([
            builder.CardImage.create(
              session,
              job.img || 'https://pastebin.com/i/pastebin_logo_side_outline.png'
            )
          ])
          card.buttons([
            builder.CardAction.dialogAction(
              session,
              'job',
              job.id,
              'Apprennez en plus sur ce job'
            )
          ])
          memo.push(card)
          return memo
        }, [])
        resolve(result)
      })
      .catch(err => {
        throw new Error('Connection error', err)
      })
  })
}

const getQuestions = id => {
  return new Promise((resolve, reject) => {
    request({
      uri: baseUrl + `/jobs/getdetailjob/${id}`,
      json: true
    })
      .then(resolve)
      .catch(err => {
        throw new Error('Connection error', err)
      })
  })
}

const sendResponseData = response => {
  // data = {
  //   candidat: {
  //     firstname: 'Youn',
  //     lastname: 'Dupont',
  //     email: 'john@gmail.com',
  //     mobile: '+3365518743'
  //   },
  //   profile_1244: {
  //     question_1: {
  //       libelle: 'Quel est vôtre âge ?',
  //       open: true,
  //       response: '27 ans'
  //     },
  //     question_2: {
  //       libelle: "Quels sont vos centres d'activités ?",
  //       open: false,
  //       response: 'Le sport, la musique et la cuisine'
  //     }
  //   }
  // }
  const options = {
    method: 'POST',
    uri: baseUrl,
    body: {
      data: response
    },
    json: true
  }

  request(options)
    .then(parsedBody => {
      // POST succeeded...
    })
    .catch(err => {
      // POST failed...
    })
}

const requestWithToken = url => {
  return obtainToken().then(function(token) {
    return request({
      url: url,
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/octet-stream'
      }
    })
  })
}

const obtainToken = Promise.promisify(connector.getAccessToken.bind(connector))

const checkRequiresToken = message => {
  return message.source === 'skype' || message.source === 'msteams'
}

module.exports = {
  connector,
  bot
}
