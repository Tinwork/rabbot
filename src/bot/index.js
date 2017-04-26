const builder = require('botbuilder');

const connector = new builder.ChatConnector({
  appId: '4f7dc17a-b470-4de8-8092-04450a26badd',
  appPassword: 'vhWunAWp8tz6H8oBPd5nRAX'
});

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
]);

var questions = [{
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
];

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
    session.send('Upload CV')
  }
])

function getJobCarrousel(session) {
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

bot.beginDialogAction('job', '/job');

module.exports = {
  connector,
  bot
}