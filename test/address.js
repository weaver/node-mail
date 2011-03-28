var Assert = require('assert'),
    Address = require('../lib/address');

module.exports = {
  'read address list': function() {
    var list = Address.readAddressList('a@b.com, "Friend\'s Email" <you@example.net>');
    Assert.deepEqual(list, ['a@b.com', 'you@example.net']);
  },

  'format address list': function() {
    var string = Address.formatAddressList(['a@b.com', 'you@example.net']);
    Assert.equal(string, 'a@b.com, you@example.net');
  }
};
