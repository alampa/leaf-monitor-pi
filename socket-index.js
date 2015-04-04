// global variables
var host = 'http://10.0.0.4:3001',
  pollInterval = 1000,                     // poll adc in ms.
  emitInterval = 10000 / pollInterval;     // emit every minute.

// requires
var mcp3008 = require('mcp3008.js'),
  moment = require('moment'),
  logger = require('./logger');

global.logger = logger;

logger.info('creating connection to ADC..');
var adc = new mcp3008();
var channel = 0;

logger.info('creating connection to host socket..');
var socket = require('socket.io-client')(host);

// start processing on connect.
socket.on('connect', function() {

  // setup other listeners.
  socket.on('disconnect', function() {
    logger.warn('lost connection to host ...')
    stop_logging();
  });

  socket.on('reconnect', function() {
    logger.info('... reconnected to host.');
    stop_logging();
  });

  logger.info('connected to ' + host);
  start_logging();

});

var start_logging = function() {

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
      socket.emit('sample', payload);
      peak = 0;
      min = 0;
      counter = 0;
    }
  });
}

var stop_logging = function() {
  adc.stop(channel);
}

var terminate = function() {
  socket.disconnect();
  adc.stop(channel);
  adc.close();
}

process.on('SIGTERM', function() {
  terminate();
});

process.on('SIGINT', function() {
  terminate();
});

process.on('exit', function() {
  terminate();
});
