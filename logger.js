'use strict';

var winston = require('winston'),
  transports = [
    new (winston.transports.Console)({
      level : 'info',
      timestamp: true,
      handleExceptions : true,
      prettyPrint : true,
      colorize : true
    })
  ];


var logger = new (winston.Logger)({
  transports : transports,
  exitOnError : true
});

exports.log = function(str) {
  logger.debug(str);
}

exports.debug = function(str) {
  logger.debug(str);
}

exports.info = function(str) {
  logger.info(str);
}

exports.warn = function(str) {
  logger.warn(str);
}

exports.error = function(str) {
  logger.error(str);
}
