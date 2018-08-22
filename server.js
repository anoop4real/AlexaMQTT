var mqtt = require('mqtt');
var client;
var env = {
  host: "test.mosquitto.org",
  port: "1883",
  // username: "",
  // password: ""
}
var clientOptions = {
  protocol: 'mqtt',
  host: env.host,
  port: env.port,
  // username: env.username,
  // password: env.password,
  //rejectUnauthorized: true
};
var publishOptions = {
  qos: 2
};
let express = require('express'),
  bodyParser = require('body-parser'),
  port = process.env.PORT || 3000,
  app = express();
let alexaVerifier = require('alexa-verifier');

const SKILL_NAME = 'DeviceManager';
const HELP_MESSAGE = 'You can say turn on light, or, you can say exit... What can I help you with?';
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Enjoy the day...Goodbye!';
const PAUSE = '<break time="0.3s" />'
const WHISPER = '<amazon:effect name="whispered"/>'
const MISSING_DETAILS = 'Missing device details, please try again'
var isFisrtTime = true

app.use(bodyParser.json({
  verify: function getRawBody(req, res, buf) {
    req.rawBody = buf.toString();
  }
}));

function requestVerifier(req, res, next) {
  alexaVerifier(
    req.headers.signaturecertchainurl,
    req.headers.signature,
    req.rawBody,
    function verificationCallback(err) {
      if (err) {
        res.status(401).json({
          message: 'Verification Failure',
          error: err
        });
      } else {
        next();
      }
    }
  );
}

function log() {
  if (true) {
    console.log.apply(console, arguments);
  }
}
app.post('/devicemanager', requestVerifier, function(req, res) {

  if (req.body.request.type === 'LaunchRequest') {
    res.json(help());
    isFisrtTime = false
  } else if (req.body.request.type === 'SessionEndedRequest') { /* ... */
    log("Session End")
  } else if (req.body.request.type === 'IntentRequest') {

    switch (req.body.request.intent.name) {
      case 'HandleCommand':
        if (!req.body.request.intent.slots.DeviceName || !req.body.request.intent.slots.DeviceName.value ||
          !req.body.request.intent.slots.Command || !req.body.request.intent.slots.Command.value) {

          res.json(handleDataMissing())
        } else {
          const device = req.body.request.intent.slots.DeviceName.value
          const command = req.body.request.intent.slots.Command.value
          publishCommand("amp_led/light", device, command)
            .then((result) => {
              // Build the response here and send
              res.json(buildResponse("Ok lights on", true, " lights on"))
            })
            .fail((error) => {
              res.json(buildResponse("Unable to process request", true, null))
            })
        }

        break;

      case 'AMAZON.StopIntent':
        res.json(stopAndExit());
        break;
      case 'AMAZON.HelpIntent':
        res.json(help());
        break;
      default:
        break;
    }
  }
});

function initializeMqttConnection() {

  log('Attempting connection...');
  client = mqtt.connect(clientOptions);
  client.on('connect', function() {
    log('Connected.');
  });

  client.on('error', function(e) {
    log('Connection error.', e);
    client.end();
  });
}

function publishCommand(topic, device, state) {
  return new Promise((resolve, reject) => {
    var payload = JSON.stringify({
      device: state
    });

    client.publish(topic, payload, publishOptions, function(e) {
      if (e) {
        log('Publishing error.', e);
        reject(e);
      }
      log('Published.');
      resolve('data');
    });
  })
}

function handleDataMissing() {
  return buildResponse(MISSING_DETAILS, true, null)
}

function stopAndExit() {

  const speechOutput = STOP_MESSAGE
  var jsonObj = buildResponse(speechOutput, true, "");
  return jsonObj;
}

function help() {

  const speechOutput = HELP_MESSAGE
  const reprompt = HELP_REPROMPT
  var jsonObj = buildResponseWithRepromt(speechOutput, false, "", reprompt);

  return jsonObj;
}

function buildResponse(speechText, shouldEndSession, cardText) {

  const speechOutput = "<speak>" + speechText + "</speak>"
  var jsonObj = {
    "version": "1.0",
    "response": {
      "shouldEndSession": shouldEndSession,
      "outputSpeech": {
        "type": "SSML",
        "ssml": speechOutput
      }
    },
    "card": {
      "type": "Simple",
      "title": SKILL_NAME,
      "content": cardText,
      "text": cardText
    },
  }
  return jsonObj
}

function buildResponseWithRepromt(speechText, shouldEndSession, cardText, reprompt) {

  const speechOutput = "<speak>" + speechText + "</speak>"
  var jsonObj = {
    "version": "1.0",
    "response": {
      "shouldEndSession": shouldEndSession,
      "outputSpeech": {
        "type": "SSML",
        "ssml": speechOutput
      }
    },
    "card": {
      "type": "Simple",
      "title": SKILL_NAME,
      "content": cardText,
      "text": cardText
    },
    "reprompt": {
      "outputSpeech": {
        "type": "PlainText",
        "text": reprompt,
        "ssml": reprompt
      }
    },
  }
  return jsonObj
}

initializeMqttConnection();

app.listen(port);

console.log('Alexa list RESTful API server started on: ' + port);