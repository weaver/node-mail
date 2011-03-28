var U = require('./util'),
    Address = require('./address');

exports.Message = Message;

// [Message Format](http://tools.ietf.org/html/rfc5322)
function Message(headers) {
  if (!(this instanceof Message))
    return new Message(headers);

  this._sender = null;
  this._recipients = null;
  this.headers = {};
  this._body = '';

  if (headers) {
    for (var key in headers)
      this.headers[U.titleCaseHeader(key)] = headers[key];
  }

  if (!('Date' in this.headers))
    this.headers['Date'] = U.date();
}

Message.prototype.HEADERS = ['Date', 'Sender', 'From', 'To', 'Cc', 'Subject'];

Message.prototype.body = function(text) {
  this._body = text || '';
  return this;
};

Message.prototype.sender = function(mailbox) {
  if (!this._sender)
    this._sender = extractSender(this.headers);
  return this._sender;
};

Message.prototype.recipients = function(mailbox) {
  if (!this._recipients)
    this._recipients = extractRecipients(this.headers);
  return this._recipients;
};

Message.prototype.toString = function() {
  var headers = U.extend({}, this.headers),
      result = [],
      value;

  // Put these headers in a particular order.
  this.HEADERS.forEach(function(name) {
    if (name in headers) {
      result.push(formatHeader(name, headers[name]));
      delete headers[name];
    }
  });

  // Hide Bcc recipients.
  if ('Bcc' in headers)
    delete headers['Bcc'];

  // Add the rest of the headers in no particular order.
  for (var key in headers)
    result.push(formatHeader(key, headers[key]));

  // The body is separated from the headers by an empty line.
  result.push('');
  result.push(U.fill(this._body));

  return result.join('\r\n');
};


/// --- Aux

function formatHeader(name, value) {
  return U.foldHeader(name, Address.formatAddressList(value));
}

function extractSender(headers) {
  var list =  Address.readAddressList(headers['Sender'] || headers['From']);
  return (list.length > 0) ? list[0] : null;
}

function extractRecipients(headers) {
  var result = [],
      seen = {},
      header;

  ['To', 'Cc', 'Bcc'].forEach(function(name) {
    Address.readAddressList(headers[name]).forEach(function(mailbox) {
      if (!(mailbox in seen)) {
        seen[mailbox] = true;
        result.push(mailbox);
      }
    });
  });

  return result;
}
