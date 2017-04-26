const builder = require('botbuilder');
const Promise = require('bluebird');
const request = require('request-promise').defaults({
  encoding: null
})

const connector = new builder.ChatConnector({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
})

const bot = new builder.UniversalBot(connector, [
  function (session) {
    session.send('Bonjour, je suis Jabbot')
    session.beginDialog('jobCarrousel')
  }
])

bot.dialog('jobCarrousel', [
  function (session) {
    session.send('Voulez-vous postulez pour un de ces profiles ?')
    var cards = getJobCarrousel(session)

    // create reply with Carousel AttachmentLayout
    var reply = new builder.Message(session)
      .attachmentLayout(builder.AttachmentLayout.carousel)
      .attachments(cards);

    session.send(reply);
  }
])

bot.dialog('/job', [
  function (session, args) {
    session.send("You choose job id %s", args.data)
    session.beginDialog('askQuestions')
  },
  function (session) {
    session.beginDialog('uploadCV')
  },
])

bot.dialog('askQuestions', [
  function (session, args) {
    // Save previous state (create on first call)
    session.dialogData.index = args ? args.index : 0;
    session.dialogData.form = args ? args.form : {};

    // Prompt user for next field
    builder.Prompts.text(session, questions[session.dialogData.index].prompt);
  },
  function (session, results) {
    // Save users reply
    var field = questions[session.dialogData.index++].field;
    session.dialogData.form[field] = results.response;

    // Check for end of form
    if (session.dialogData.index >= questions.length) {
      // Return completed form
      session.endDialogWithResult({
        response: session.dialogData.form
      });
    } else {
      // Next field
      session.replaceDialog('askQuestions', session.dialogData);
    }
  },
  function (session, response) {
    console.log(response)
    session.send('Merci d"avoir répondu aux questions')
    session.beginDialog('uploadCV')
  }
])

bot.dialog('uploadCV', [
  function (session) {
    var msg = session.message;
    if (msg.attachments.length) {
      // Message with attachment, proceed to download it.
      // Skype & MS Teams attachment URLs are secured by a JwtToken, so we need to pass the token from our bot.
      var attachment = msg.attachments[0];
      var fileDownload = checkRequiresToken(msg) ?
        requestWithToken(attachment.contentUrl) :
        request(attachment.contentUrl);

      fileDownload.then(response => {
        // Send reply with attachment type & size
        var reply = new builder.Message(session)
          .text('Attachment of %s type and size of %s bytes received.', attachment.contentType, response.length);
        session.send(reply);
        session.send('Merci d"avoir upload votre CV')
        session.beginDialog('chooseDate')
      }).catch(err => {
        console.log('Error downloading attachment:', {
          statusCode: err.statusCode,
          message: err.response.statusMessage
        })
      })
    } else {
      // No attachments were sent
      var reply = new builder.Message(session)
        .text('Hi there! This sample is intented to show how can I receive attachments but no attachment was sent to me. Please try again sending a new message with an attachment.');
      session.send(reply);
    }
  }
])

bot.dialog('chooseDate', [
  function (session) {
    session.send('Choose a date')
  }
])

bot.beginDialogAction('job', '/job');

const questions = [{
    field: 'name',
    prompt: "What's your name?"
  },
  {
    field: 'age',
    prompt: "How old are you?"
  },
  {
    field: 'state',
    prompt: "What state are you in?"
  }
]

const getJobCarrousel = session => {
  const data = [{
      "id": 9,
      "title": "nodejs",
      "description": "oofdg",
      "skills": [
        "z",
        "z",
        "z"
      ],
      "date_start": "2017-04-24T22:00:00.000Z",
      "date_end": "2017-05-24T22:00:00.000Z",
      "img": "https://pastebin.com/i/pastebin_logo_side_outline.png"
    },
    {
      "id": 10,
      "title": "nodejs",
      "description": "george",
      "skills": [
        "z",
        "z",
        "z"
      ],
      "date_start": "2017-04-24T22:00:00.000Z",
      "date_end": "2017-05-24T22:00:00.000Z",
      "img": "https://pastebin.com/i/pastebin_logo_side_outline.png"
    },
    {
      "id": 11,
      "title": "nodejs",
      "description": "bitoux",
      "skills": [
        "z",
        "z",
        "z"
      ],
      "date_start": "2017-04-24T22:00:00.000Z",
      "date_end": "2017-05-24T22:00:00.000Z",
      "img": ""
    },
    {
      "id": 12,
      "title": "nodejs",
      "description": "dup",
      "skills": [
        "z",
        "z",
        "z"
      ],
      "date_start": "2017-04-24T22:00:00.000Z",
      "date_end": "2017-05-24T22:00:00.000Z",
      "img": ""
    },
    {
      "id": 13,
      "title": "nodejs",
      "description": "oofdg",
      "skills": [
        "z",
        "z",
        "z"
      ],
      "date_start": "2017-04-24T22:00:00.000Z",
      "date_end": "2017-05-24T22:00:00.000Z",
      "img": ""
    },
    {
      "id": 14,
      "title": "hfhfgh",
      "description": "oofdg",
      "skills": [
        "z",
        "z",
        "z"
      ],
      "date_start": "2017-04-24T22:00:00.000Z",
      "date_end": "2017-05-24T22:00:00.000Z",
      "img": ""
    }
  ]

  return data.reduce((memo, job) => {
    let card = new builder.HeroCard(session)
    card.title(job.title)
    card.subtitle(job.subtitle)
    card.text(job.description)
    card.images([builder.CardImage.create(session, job.img || 'https://pastebin.com/i/pastebin_logo_side_outline.png')])
    card.buttons([
      builder.CardAction.dialogAction(session, "job", job.id, 'Apprennez en plus sur ce job')
    ])
    memo.push(card)
    return memo
  }, [])
}

const requestWithToken = url => {
  return obtainToken().then(function (token) {
    return request({
      url: url,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/octet-stream'
      }
    })
  })
}

const obtainToken = Promise.promisify(connector.getAccessToken.bind(connector));

const checkRequiresToken = message => {
  return message.source === 'skype' || message.source === 'msteams'
}

module.exports = {
  connector,
  bot
}