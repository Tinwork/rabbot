const builder = require('botbuilder')
const Promise = require('bluebird')
const request = require('request-promise').defaults({
  encoding: null
})
const baseUrl = 'http://52.213.163.137:5000/'
let questions = []
let langChoosed = 'fr'
let staticQuestions = [
  {
    field: 'firstname',
    prompt: 'firstname'
  },
  {
    field: 'lastname',
    prompt: 'lastname'
  },
  {
    field: 'email',
    prompt: 'email',
    regex: /\S+@\S+\.\S+/
  },
  {
    field: 'mobile',
    prompt: 'mobile'
  }
]

const connector = new builder.ChatConnector({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
})

const bot = new builder.UniversalBot(connector)

bot.beginDialogAction('job', '/job')
bot.beginDialogAction('help', '/help', { matches: /^help/i })
bot.endConversationAction('goodbyeAction', 'goodbyeAction', {
  matches: /^goodbye|quit|bye/i
})

const setLocale = (session, lang) => {
  session.preferredLocale(lang, err => {
    if (!err) {
      return true
    } else {
      session.error(err)
    }
  })
}

bot.dialog('/', [
  session => {
    if (session.userData.lang) {
      session.beginDialog('/menu')
    } else {
      setLocale(session, session.userData.lang || langChoosed)
      session.send('greeting')
      session.send('help')
      session.beginDialog('localePickerDialog')
    }
  }
])

bot.dialog('localePickerDialog', [
  session => {
    builder.Prompts.choice(session, 'locale_prompt', ['Français', 'English'], {
      listStyle: builder.ListStyle.button
    })
  },
  (session, results) => {
    let locale
    switch (results.response.entity) {
      case 'English':
        locale = 'en'
        break
      case 'Français':
        locale = 'fr'
        break
    }
    session.userData.lang = locale
    session.preferredLocale(locale, err => {
      if (!err) {
        session.beginDialog('/menu')
      } else {
        session.error(err)
      }
    })
  }
])

bot.dialog('/help', [
  session => {
    session.endDialog('help')
  }
])

bot
  .dialog('/menu', [
    session => {
      session.send('menu')
      getJobCarrousel(session)
        .then(cards => {
          let reply = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments(cards)
          session.send(reply)
        })
        .catch(console.error)
    }
  ])
  .reloadAction('/menu', null, {
    matches: /^menu|show menu|reload|list|start|restart/i
  })

bot.dialog('/job', [
  (session, args) => {
    session.userData.questions = []
    session.sendTyping()
    getQuestions(args.data)
      .then(data => {
        session.userData = Object.assign(session.userData, {
          questions: data.questions,
          c: {},
          data: {
            candidat: {},
            profile: {}
          },
          id: args.data
        })
        session.beginDialog('askStaticQuestions')
      })
      .catch(console.error)
  },
  (session, args) => {
    session.beginDialog('askJobsQuestions')
  },
  session => {
    session.beginDialog('uploadCV')
  },
  (session, upload) => {
    session.sendTyping()
    let response
    const pdf = upload.response
    let data = session.userData

    if (pdf) {
      const base64pdf = btoa(String.fromCharCode.apply(null, pdf))
      response = {
        candidat: data.data.candidat
        // base64pdf: base64pdf
      }
    } else {
      response = {
        candidat: data.data.candidat
        // base64pdf: base64pdf
      }
    }

    response[`profile_${data.id}`] = data.data.profile
    sendResponseData(response)
      .then(result => {
        session.beginDialog('chooseDate')
      })
      .catch(err => {
        session.beginDialog('chooseDate')
        throw new Error('Conncetion error', err)
      })
  },
  session => {
    session.send('finish')
    session.endConversation('restart')
  }
])

bot.dialog('askStaticQuestions', [
  (session, args) => {
    // Save previous state (create on first call)
    session.userData.c.index = args ? args.index : 0
    session.userData.c.form = args ? args.form : {}

    // Prompt user for next field
    builder.Prompts.text(
      session,
      staticQuestions[session.userData.c.index].prompt
    )
  },
  (session, results) => {
    const current = staticQuestions[session.userData.c.index]

    if (current.regex && !current.regex.test(results.response)) {
      session.replaceDialog('askStaticQuestions', session.userData.c)
    } else {
      session.userData.data.candidat[current.field] = results.response
      session.userData.c.index++

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
  }
])

bot.dialog('askJobsQuestions', [
  (session, args) => {
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
          session.userData.questions[session.dialogData.index].enum,
          { listStyle: builder.ListStyle.button }
        )
        break

      default:
        builder.Prompts.text(
          session,
          session.userData.questions[session.dialogData.index].body
        )
    }
  },
  (session, results) => {
    // Save users reply
    let r = session.userData.questions[session.dialogData.index++]
    if (r.type === 'string' || r.type === 'int') {
      session.userData.data.profile[`question_${r.id}`] = {
        libelle: r.body,
        open: false,
        response: results.response
      }
    } else if (r.type === 'enum') {
      session.userData.data.profile[`question_${r.id}`] = {
        libelle: r.body,
        open: false,
        response: results.response.entity
      }
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

bot
  .dialog('uploadCV', [
    session => {
      let msg = session.message
      if (msg.attachments.length) {
        // Message with attachment, proceed to download it.
        // Skype & MS Teams attachment URLs are secured by a JwtToken, so we need to pass the token from our bot.
        let attachment = msg.attachments[0]
        let fileDownload = checkRequiresToken(msg)
          ? requestWithToken(attachment.contentUrl)
          : request(attachment.contentUrl)

        fileDownload
          .then(response => {
            if (
              attachment.contentType === 'application/pdf' ||
              attachment.contentType === 'application/octet-stream'
            ) {
              session.send('upload_verified')
              session.endDialogWithResult({
                response: response
              })
            } else {
              let reply = new builder.Message(session).text('upload_question')
              session.send(reply)
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
        let reply = new builder.Message(session).text('upload_question')
        session.send(reply)
      }
    }
  ])
  .cancelAction('cancelList', 'upload_no_cv', {
    matches: /^skip/i
  })

bot.dialog('chooseDate', [
  session => {
    session.endDialog('')

    // session.endDialog(

    //   "choose_date"

    // )
  }
])

const getJobCarrousel = session => {
  return new Promise((resolve, reject) => {
    request({
      uri: `${baseUrl}/jobs/getalljob`,
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
              `${baseUrl}${job.thumb}` ||
                'https://pastebin.com/i/pastebin_logo_side_outline.png'
            )
          ])
          card.buttons([
            builder.CardAction.dialogAction(session, 'job', job.id, 'job_more')
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
      uri: `${baseUrl}/jobs/getdetailjob /${id}`,
      json: true
    })
      .then(resolve)
      .catch(err => {
        throw new Error('Connection error', err)
      })
  })
}

const sendResponseData = response => {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      uri: `${baseUrl}/api/candidate`,
      body: {
        data: JSON.stringify(response)
      },
      json: true
    }

    request(options).then(resolve).catch(reject)
  })
}

const requestWithToken = url => {
  return obtainToken().then(token => {
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
