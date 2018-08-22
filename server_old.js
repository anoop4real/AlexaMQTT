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

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.post('/trail', function(req, res) {

  console.log(req.body.state);
  //res.send('OK')
  publishCommand("amp_led/light", "led", "On")
    .then((result) => {
      // Build the response here and send
      res.send(result);
    })
    .fail((error) => {
      res.status(400)
      res.send(error);
    })
});

function initializeMqttConnection() {

  log('Attempting connection...');
  client = mqtt.connect(clientOptions);
  client.on('connect', function() {
    log('Connected.');
  });
}

function publishCommand(topic, device, state) {
  return new Promise(function(resolve, reject) {
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

function log() {
  if (true) {
    console.log.apply(console, arguments);
  }
}

initializeMqttConnection();
app.listen(port);
console.log('Alexa list RESTful API server started on: ' + port);