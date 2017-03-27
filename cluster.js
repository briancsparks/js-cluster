
/**
 *  Cluster management in pure Node.js. (Mostly service discovery for now.)
 */
var sg              = require('sgsg');
var _               = sg._;

var lib = {};


_.each(lib, function(value, key) {
  exports[key] = value;
});


