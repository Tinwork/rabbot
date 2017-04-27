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

bot
  .dialog('jobCarrousel', [
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
  .reloadAction('jobCarrousel', null, {
    matches: /^menu|show menu|reload|list|start|restart/i
  })

bot.endConversationAction(
  'goodbyeAction',
  'Si vous souhaitez relancer la conversation, parlez moi ou taper menu',
  {
    matches: /^goodbye|quit|bye/i
  }
)

bot.dialog('/job', [
  function(session, args) {
    session.userData.questions = []
    session.sendTyping()
    getQuestions(args.data).then(data => {
      session.userData = {
        questions: data.questions,
        c: {},
        data: {
          candidat: {},
          profile: {}
        },
        id: args.data
      }
      session.beginDialog('askStaticQuestions')
    })
  },
  function(session, args) {
    session.beginDialog('askJobsQuestions')
  },
  function(session) {
    session.send('Merci d"avoir répondu aux questions')
    let data = session.userData
    let response = {
      candidat: data.data.candidat
    }
    response[`profile_${data.id}`] = data.data.profile
    sendResponseData(response)
    session.beginDialog('uploadCV')
  },
  function(session, args) {
    session.beginDialog('chooseDate')
  },
  function(session) {
    session.endConversation(
      'Si vous souhaitez relancer la conversation, parlez moi ou taper menu'
    )
  }
])

var staticQuestions = [
  {
    field: 'firstname',
    prompt: 'Quelle est votre nom ?'
  },
  {
    field: 'lastname',
    prompt: 'Quelle est votre prénom ?'
  },
  {
    field: 'email',
    prompt: 'Quelle est votre email ?'
  },
  {
    field: 'mobile',
    prompt: 'Quelle est votre mobile ?'
  }
]

bot.dialog('askStaticQuestions', [
  function(session, args) {
    // Save previous state (create on first call)
    session.userData.c.index = args ? args.index : 0
    session.userData.c.form = args ? args.form : {}

    // Prompt user for next field
    builder.Prompts.text(
      session,
      staticQuestions[session.userData.c.index].prompt
    )
  },
  function(session, results) {
    // Save users reply
    var field = staticQuestions[session.userData.c.index++].field
    session.userData.data.candidat[field] = results.response

    // Check for end of form
    if (session.userData.c.index >= staticQuestions.length) {
      // Return completed form
      session.endDialogWithResult({
        response: session.userData.data.candidat
      })
    } else {
      // Next field
      session.replaceDialog('askStaticQuestions', session.userData.c)
    }
  }
])

bot.dialog('askJobsQuestions', [
  function(session, args) {
    // Save previous state (create on first call)
    session.dialogData.index = args ? args.index : 0
    session.dialogData.form = args ? args.form : {}

    // Prompt user for next field
    switch (session.userData.questions[session.dialogData.index].type) {
      case 'string':
        builder.Prompts.text(
          session,
          session.userData.questions[session.dialogData.index].body
        )
        break

      case 'int':
        builder.Prompts.number(
          session,
          session.userData.questions[session.dialogData.index].body
        )
        break

      case 'enum':
        builder.Prompts.choice(
          session,
          session.userData.questions[session.dialogData.index].body,
          session.userData.questions[session.dialogData.index].enum
        )
        break

      default:
        builder.Prompts.text(
          session,
          session.userData.questions[session.dialogData.index].body
        )
    }
  },
  function(session, results) {
    // Save users reply
    var r = session.userData.questions[session.dialogData.index++]
    if (r.type === 'string' || r.type === 'int') {
      session.userData.data.profile[`question_${r.id}`] = results.response
    } else if (r.type === 'enum') {
      session.userData.data.profile[`question_${r.id}`] =
        results.response.entity
    }

    // Check for end of form
    if (session.dialogData.index >= session.userData.questions.length) {
      // Return completed form
      session.endDialogWithResult({
        response: session.dialogData.form
      })
    } else {
      // Next field
      session.replaceDialog('askJobsQuestions', session.dialogData)
    }
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
          if (attachment.contentType !== 'application/pdf') {
            var reply = new builder.Message(session).text(
              'Pouvez vous upload votre CV en format pdf ?'
            )
            session.send(reply)
          } else {
            session.endDialog('Merci davoir upload votre CV')
          }
        })
        .catch(err => {
          throw new Error('Error downloading attachment:', {
            statusCode: err.statusCode,
            message: err.response.statusMessage
          })
        })
    } else {
      // No attachments were sent
      var reply = new builder.Message(session).text(
        'Pouvez vous upload votre CV en format pdf ?'
      )
      session.send(reply)
    }
  }
])

bot.dialog('chooseDate', [
  function(session) {
    session.endDialog(
      "Choississez une date. Cette fonctionnalité n'est pas encore finaliser."
    )
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
