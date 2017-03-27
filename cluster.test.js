
var clusterLib          = require('./cluster');
var test                = require('ava');

var Service             = clusterLib.Service;

test(t => {
  t.deepEqual([1, 2], [1, 2]);
});

test.cb(t => {
  t.plan(1);

  var service = new Service('bar');
  service.registerService('baz', 'localhost:18881', 1, function(err, res) {
    service.getServiceLocation('baz', function(err, res) {
      //console.log(err, res);
      t.deepEqual(res, ['localhost:18881']);
      t.end();
    });
  });
});

test.cb('cluster should expire service registrations', t => {
  t.plan(1);

  var service = new Service('barx', 'localhost', 6379);
  service.registerService('bazx', 'localhost:17771', 1, function(err, res) {
    setTimeout(function() {
      service.getServiceLocation('baz', function(err, res) {
        t.deepEqual(res, [null]);
        t.end();
      });
    }, 2000);
  });
});

