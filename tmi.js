
/**
 *  Too Much Information -- send JSON telemetry from the servers to an all-points chat.
 */
var sg                  = require('sgsg');
var _                   = sg._;
var request             = sg.extlibs.superagent;

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

tmi.trace = function(who, where_, params) {
  var now = _.now();
  var where = where_;
  if (!_.isArray(where)) {
    where = [where];
  }

  console.log('asdfasdfsdfasdfasdfasfasf------------------');
  request
    .post('http://localhost:54321/event/'+who)
    .send(_.extend({foo:'bar', where: where, trace: true}, params || {}))
    .end(function(err, res) {
    });
};

tmi.Room = function(name_) {
  var self = this;
  var name = name_ || 'tmi';

  self.emit = function(eventName /*, value */) {
  };
};

_.each(tmi, function(value, key) {
  exports[key] = value;
});

