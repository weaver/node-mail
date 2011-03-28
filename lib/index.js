var OS = require('os'),
    U = require('./util'),
    Address = require('./address'),
    Message = require('./message'),
    SMTP = require('./smtp');

exports.Mail = Mail;
exports.Message = Message.Message;
U.extend(exports, Address);
U.extend(exports, SMTP);


// ## Mail ##

// A Mail instance encapsulates some connection settings so new
// messages can be quickly sent by giving and envelope and body.

function Mail(opt) {
  if (!(this instanceof Mail))
    return new Mail(opt);

  this.options = opt = opt || {};
  opt.domain = opt.domain || OS.hostname();
};

Mail.prototype.message = function message(headers) {
  return new MailTransaction(this, headers);
};


// ## Mail Transaction ##

// A mail transaction is a quick way to send a single message. A
// transaction creates a client, connects to a mail server, sends a
// message, then disconnects. A transaction succeeds entirely or fails
// entirely.

function MailTransaction(mailer, headers) {
  this.options = mailer.options;
  this.headers = headers;
}

MailTransaction.prototype.body = function(text) {
  this._body = text;
  return this;
};

MailTransaction.prototype.send = function(next) {
  var opt = this.options,
      message = (new Message.Message(this.headers)).body(this._body),
      headers = message.headers,
      sender, recipients, client,
      error;

  next = next || function(err) { throw err; };

  try {
    if (opt.host === undefined)
      next(error = new Error('send: host is required.'));
    else if (!(sender = message.sender()))
      next(error = new Error('send: missing sender (add From or Sender headers).'));
    else if ((recipients = message.recipients()).length == 0)
      next(error = new Error('send: missing recipients (add To, Cc, or Bcc headers).'));
    else
      return this.transmit(sender, recipients, message, function(err) {
        if (error === undefined)
          next(error = err, message);
      });
  } catch (err) {
    if (error === undefined)
      next(error = err);
  }

  return null;
};

MailTransaction.prototype.transmit = function(sender, recip, message, next) {
  var client = SMTP.createClient(this.options),
      error;

  client.on('error', function(err) {
    client.end();
    if (error === undefined)
      next(error = err);
  });

  return client.mail(sender, recip)
    .on('ready', function() {
      this.on('end', function() {
        client.quit();
        if (error === undefined)
          next(error = null, message);
      })
      .end(message.toString());
    });
};
