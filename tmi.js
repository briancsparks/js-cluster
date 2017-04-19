
/**
 *  Too Much Information -- send JSON telemetry from the servers to an all-points chat.
 */
var sg              = require('sgsg');
var _               = sg._;

var tmi = {};

//
// Like this:
//
// ```js
// var ct = new Room();       // aka cluster-telemetry
// ct.emit(event);
// ct.set(status);
// ```
//

tmi.Room = function(name_) {
  var self = this;
  var name = name_ || 'tmi';

  self.emit = function(eventName /*, value */) {
  };
};

_.each(tmi, function(value, key) {
  exports[key] = value;
});

