/**
 * Created by alanlampa on 4/4/15.
 */
// global variables
var pollInterval = 1000,                     // poll adc in ms.
  emitInterval = 60000 / pollInterval;     // 60K = emit every minute.

// requires
var mcp3008 = require('mcp3008.js'),
  moment = require('moment'),
  Parse = require('parse').Parse,
  logger = require('./logger');

global.logger = logger;

logger.info('initializing parse..');
Parse.initialize('3OYpa92P0WpoSp0ZuUUB4kvdoxSkOjD3RyT86OE1', 'WjYdfyUu9q7WxsqEdiIx0IoyeNyFCpkzvZoY9lYk');

logger.info('creating connection to ADC..');
var adc = null;
var channel = 0;

var start_logging = function() {

  adc = new mcp3008();

  logger.info('sampling started...');

  // place to store the peak value
  var peak = 0,
    min = 0,
    counter = 0;

  var payload = {
    timestamp : '',
    channel : channel,
    data : 0
  };

  adc.poll(channel, pollInterval, function(value) {

    if (value > peak) { peak = value; }
    if (value < min) { min = value; }
    counter ++;

    if (counter >= emitInterval) {
      payload.timestamp = moment().format();
      payload.data = peak;

      logger.debug(payload);
      send_data(payload);

      // new function to send push notifications on events.
      track_events(payload);

      peak = 0;
      min = 0;
      counter = 0;
    }
  });
}

var stop_logging = function() {
  if (adc != null) {
    adc.stop(channel);
    adc.close();
  }
}

var send_data = function(payload) {
  var LeafData = Parse.Object.extend('LeafData');
  var data = new LeafData();

  data.set("timestamp", payload.timestamp);
  data.set("data", payload.data);

  data.save(null, {
    success : function(data) {
      logger.debug('new object created with id: ' + data.id);
    },
    error : function(data, error) {
      logger.error('error in saving to cloud: ' + error.message);
    }
  });
}

var prev_payload = null;
var isCharging = false;
var track_events = function(curr_payload) {

  var titleString = "";
  var alertString = "";

  if (curr_payload.data > 100) {

    if (! isCharging) {
      logger.info("Detected charging start");

      Parse.Push.send({
        channels: [ "alert-leaf-monitor-start" ],
        data: {
          alert: "Charging started: " + moment().format('h:mm a')
        }
      }, {
        success: function() {
          logger.info("Pushed notification - charging started.");
        },
        error: function(error) {
          logger.error("Error in pushing start notification: " + JSON.stringify(error));
        }
      });

    }
    isCharging = true;
  }

  if (prev_payload == null) {
    prev_payload = curr_payload;
    return;
  }

  // if I was charging and the current payload drops to less than 100
  // then i must have stopped charging.
  if (isCharging && curr_payload.data < 50) {

    logger.info("Detected charging stopped.");
    isCharging = false;

    // if the drop is more than 400 then something is up.
    var drop = prev_payload.data - curr_payload.data;
    if (drop > 400) {
      alertString = "Charging may have stopped prematurely.";
    }
    else {
      alertString = "Charging completed."
    }

    Parse.Push.send({
      channels: [ "alert-leaf-monitor-end" ],
      data: {
        alert: alertString
      }
    }, {
      success: function() {
        logger.info("Pushed notification: " + alertString);
      },
      error: function(error) {
        logger.error("Error pushing notification:" + JSON.stringify(error));
      }
    });
  }

}

var terminate = function() {
  stop_logging();
}

// let the magic happen.
start_logging();

process.on('SIGTERM', function() {
  terminate();
});

process.on('SIGINT', function() {
  terminate();
});

process.on('exit', function() {
  terminate();
});
