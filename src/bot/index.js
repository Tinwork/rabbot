const builder = require('botbuilder');

const connector = new builder.ChatConnector({
  appId: '4f7dc17a-b470-4de8-8092-04450a26badd',
  appPassword: 'vhWunAWp8tz6H8oBPd5nRAX'
});

const bot = new builder.UniversalBot(connector, [
  function (session) {
    session.send('Bonjour, je suis Jabbot')
    session.beginDialog('carrousel')
  },
  function (session, results) {
    console.log(results)
    session.endConversation("Goodbye until next time...");
  }
])

bot.dialog('carrousel', [
  function (session) {
    var cards = getCardsAttachments();

    // create reply with Carousel AttachmentLayout
    var reply = new builder.Message(session)
      .attachmentLayout(builder.AttachmentLayout.carousel)
      .attachments(cards);

    session.send(reply);
  }
])

bot.dialog('card', [
  function (session) {
    var message = new builder.HeroCard(session)
      .title("Hero Card")
      .subtitle("The Space Needle is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
      .images([
        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
      ])
      .tap(builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Space_Needle"))
    var msg = new builder.Message(session)
      .attachments([message, message]);
    session.send(msg);

    var thumb = new builder.ThumbnailCard(session)
      .title("Thumbnail Card")
      .subtitle("Pike Place Market is a public market overlooking the Elliott Bay waterfront in Seattle, Washington, United States.")
      .images([
        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/320px-PikePlaceMarket.jpg")
      ])
      .tap(builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Pike_Place_Market"))
    msg = new builder.Message(session)
      .attachments([thumb, thumb, thumb]);
    session.endDialog(msg);
  }
])

bot.dialog('rootMenu', [
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
      session.replaceDialog('rootMenu', session.dialogData);
    }
  }
]).reloadAction('showMenu', null, {
  matches: /^(menu|back)/i
});

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

module.exports = {
  connector,
  bot
}

function getCardsAttachments(session) {
  return [
    new builder.HeroCard(session)
    .title('Azure Storage')
    .subtitle('Offload the heavy lifting of data center management')
    .text('Store and help protect your data. Get durable, highly available data storage across the globe and pay only for what you use.')
    .images([
      builder.CardImage.create(session, 'https://docs.microsoft.com/en-us/azure/storage/media/storage-introduction/storage-concepts.png')
    ])
    .buttons([
      builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/services/storage/', 'Learn More')
    ]),

    new builder.ThumbnailCard(session)
    .title('DocumentDB')
    .subtitle('Blazing fast, planet-scale NoSQL')
    .text('NoSQL service for highly available, globally distributed apps—take full advantage of SQL and JavaScript over document and key-value data without the hassles of on-premises or virtual machine-based cloud database options.')
    .images([
      builder.CardImage.create(session, 'https://docs.microsoft.com/en-us/azure/documentdb/media/documentdb-introduction/json-database-resources1.png')
    ])
    .buttons([
      builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/services/documentdb/', 'Learn More')
    ]),

    new builder.HeroCard(session)
    .title('Azure Functions')
    .subtitle('Process events with a serverless code architecture')
    .text('An event-based serverless compute experience to accelerate your development. It can scale based on demand and you pay only for the resources you consume.')
    .images([
      builder.CardImage.create(session, 'https://azurecomcdn.azureedge.net/cvt-5daae9212bb433ad0510fbfbff44121ac7c759adc284d7a43d60dbbf2358a07a/images/page/services/functions/01-develop.png')
    ])
    .buttons([
      builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/services/functions/', 'Learn More')
    ]),

    new builder.ThumbnailCard(session)
    .title('Cognitive Services')
    .subtitle('Build powerful intelligence into your applications to enable natural and contextual interactions')
    .text('Enable natural and contextual interaction with tools that augment users\' experiences using the power of machine-based intelligence. Tap into an ever-growing collection of powerful artificial intelligence algorithms for vision, speech, language, and knowledge.')
    .images([
      builder.CardImage.create(session, 'https://azurecomcdn.azureedge.net/cvt-68b530dac63f0ccae8466a2610289af04bdc67ee0bfbc2d5e526b8efd10af05a/images/page/services/cognitive-services/cognitive-services.png')
    ])
    .buttons([
      builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/services/cognitive-services/', 'Learn More')
    ])
  ];
}