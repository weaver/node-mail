var Util = require('util'),
    OS = require('os'),
    Net = require('net'),
    Events = require('events'),
    U = require('./util'),
    Message = require('./message');

exports.Mail = Mail;
exports.createClient = createClient;
exports.Client = Client;
exports.BadReply = BadReply;
exports.Message = Message.Message;
exports.readAddressList = U.readAddressList;
exports.formatAddressList = U.formatAddressList;


// ## Mail ##

function Mail(settings) {
  if (!(this instanceof Mail))
    return new Mail(settings);
  this.settings = settings;
};

Mail.prototype.message = function message(headers) {
  return new MailTransaction(this, headers);
};


// ## Mail Transaction ##

function MailTransaction(mailer, headers) {
  this.settings = mailer.settings;
  this.headers = headers;
}

MailTransaction.prototype.body = function(text) {
  this._body = text;
  return this;
};

MailTransaction.prototype.send = function(callback) {
  var fn = callback || function(err) { throw err; },
      opt = this.settings,
      message = (new Message.Message(this.headers)).body(this._body),
      headers = message.headers,
      sender, recipients, client,
      error;

  try {
    if (opt.host === undefined)
      fn(error = new Error('send: host is required.'));
    else if (!(sender = message.sender()))
      fn(error = new Error('send: missing sender (add From or Sender headers).'));
    else if ((recipients = message.recipients()).length == 0)
      fn(error = new Error('send: missing recipients (add To, Cc, or Bcc headers).'));
    else {
      client = createClient(opt);
      client.on('error', function(err) {
        client.end();
        if (error === undefined)
          fn(error = err);
      });
    }
  } catch (err) {
    if (error === undefined)
      fn(error = err);
    return null;
  }

  return client.mail(sender, recipients)
    .on('ready', function() {
      this
        .on('end', function() {
          client.quit();
          if (error === undefined)
            fn(error = null, message);
        })
        .end(message.toString());
    });
};


/// --- Client

function createClient(opt) {
  return new Client(opt);
}

Util.inherits(Client, Events.EventEmitter);
function Client(opt) {
  Events.EventEmitter.call(this);

  if (!(this.host = opt.host))
    throw new Error('missing required host');

  if (opt.secure || opt.secure === undefined) {
    this.tls = true;
    if (typeof opt.secure == 'object')
      this.credentials = opt.secure;
  }

  this.port = opt.port || (this.tls ? 587 : 25);
  this.domain = opt.domain;
  if (opt.username)
    this.setLogin(opt.username, opt.password);

  this.useSocket(new Net.Socket());
}

Client.prototype.mail = function(from, to) {
  var self = this;

  this.domain = this.domain || OS.hostname();

  process.nextTick(function() {
    self.startSession();
  });

   return new ClientTransaction(this, from, to);
};

Client.prototype.useSocket = function(sock) {
  this.sock = sock;
  return this;
};

Client.prototype.startSession = function() {
  var self = this;

  if (!this.domain)
    this.emit('error', new Error('Missing required domain.'));
  else if (this.sock.readyState != 'closed')
    this.emit('error', new Error('Session already started.'));
  else {
    this.sock
      .once('connect', function() {
        self.reset(220);
      })
      .connect(this.port, this.host);
  }

  return this;
};

Client.prototype.clear = function() {
  this.sock.removeAllListeners('data');
  return this;
};

Client.prototype.reset = function(wait) {
  var self = this,
      buffer = '',
      replies = [];

  this.session = {};
  this.sock.on('data', U.readLines(handle));

  if (wait)
    this.withReply(wait, ehlo);
  else
    ehlo();

  function ehlo() {
    self.command('ehlo', self.domain, function() {
      U.aEach(arguments, extend, ready);
    });
  }

  function handle(line) {
    var probe;

    if (!(probe = line.match(/^(\d{3})([\- ])(.*)/))) {
      self.emit('error', new Error('Badly formatted reply: ' + Util.inspect(line)));
      return;
    }

    U.debug('READ (((%s%s%s)))', probe[1], probe[2], probe[3]);
    replies.push(new Reply(parseInt(probe[1]), probe[3]));

    if (probe[2] == ' ') {
      replies.unshift('reply');
      self.emit.apply(self, replies);
      replies.splice(0, replies.length);
    }
  }

  function extend(reply, index, next) {
    var probe = reply.text.match(/^(\S+)\s*(.*)$/),
        method = probe && self['smtp' + probe[1].toUpperCase()];

    method ? method.call(self, next, probe[2]) : next();
  }

  function ready() {
    self.emit('ready');
  }

  return this;
};

Client.prototype.puts = function(data) {
  this.write(data + '\r\n');
  return this;
};

Client.prototype.write = function(data) {
  U.debug('SEND (((%s)))', data);
  return this.sock.write(data);
};

Client.prototype.end = function(data) {
  U.debug('SEND (((%s)))', data);
  return this.sock.end(data);
};

Client.prototype.command = function(name, args, callback) {
  var cmd = name.toUpperCase();

  if (typeof args == 'string')
    cmd += ' ' + args;
  this.puts(cmd);

  callback = callback || args;
  if (typeof callback == 'function')
    this.withReply(250, callback);

  return this;
};

Client.prototype.withReply = function(code, callback) {
  var self = this;

  if (callback === undefined)
    this.once('reply', code);
  else
    this.once('reply', function(reply) {
      if (reply.code != code)
        self.emit('error', new BadReply('Expected ' + code, reply));
      else
        callback.apply(this, arguments);
    });

  return this;
};

Client.prototype.quit = function() {
  this.end('QUIT\r\n');
  return this;
};


// ## STARTTLS extension <http://tools.ietf.org/html/rfc3207> ##

Client.prototype.smtpSTARTTLS = function(next) {
  var self = this;

  if (!this.tls)
    return next();
  else
    this.command('starttls').withReply(220, secure);

  function secure() {
    var clear = require('./starttls').starttls(self.clear().sock, false, function() {
      if (!clear.authorized)
        self.emit('error', new Error('STARTTLS: failed to secure stream'));
      else {
        self.useSocket(clear).reset();
      }

    });
  }

  return this;
};


// ## AUTH extension <http://www.faqs.org/rfcs/rfc2554.html> ##

Client.prototype.setLogin = function(username, password) {
  this.username = username;
  this.password = password;
  return this;
};

Client.prototype.smtpAUTH = function(next, mechanisms) {
  var names = mechanisms.toUpperCase().split(/\s+/),
      method;

  if (!this.username)
    next();
  else
    for (var i = 0, l = names.length; i < l; i++) {
      method = this['auth' + names[i]];
      if (method) {
        method.call(this, this.username, this.password, next);
        break;
      }
    }
};

// ### LOGIN mechanism <http://www.fehcom.de/qmail/smtpauth.html#FRAMEWORK> ###

Client.prototype.authLOGIN = function(username, password, callback) {
  var self = this,
      b64 = require('./base64');

  this.command('auth', 'login')
    .withReply(334, sendUsername);

  function sendUsername() {
    self.puts(b64.encode64(username))
      .withReply(334, sendPassword);
  }

  function sendPassword() {
    self.puts(b64.encode64(password))
      .withReply(235, callback);
  }

  return this;
};


// ## Reply ##

function Reply(code, text) {
  this.code = code;
  this.text = text;
}

Reply.prototype.toString = function() {
  return this.code + ' ' + this.text;
};

Util.inherits(BadReply, Error);
function BadReply(reason, reply) {
  Error.call(this, reason);
  this.reply = reply;
};

BadReply.prototype.toString = function() {
  return this.message + ': ' + this.reply.toString();
};


// ## ClientTransaction ##

Util.inherits(ClientTransaction, Events.EventEmitter);
function ClientTransaction(client, from, to) {
  Events.EventEmitter.call(this);

  var self = this;

  this.client = client;
  this.done = false;
  this.newline = true;

  client.once('ready', sendFrom);

  function sendFrom() {
    client.command('mail from:', '<' + from + '>', function() {
      U.aEach(to, sendTo, data);
    });
  }

  function sendTo(mailbox, index, next) {
    client.command('rcpt to:', '<' + mailbox + '>', next);
  }

  function data() {
    client.command('data').withReply(354, ready);
  }

  function ready() {
    self.emit('ready');
  }
}

Object.defineProperty(ClientTransaction.prototype, 'session', {
  get: function() {
    return this.client.session;
  }
});

ClientTransaction.prototype.write = function(data) {
  if (this.done) {
    this.client.emit('error', new Error('The transaction has ended.'));
    return this;
  }
  else if ((this.session.bits != 8) && !U.is7Bit(data)) {
    this.client.emit('error', new Error('Data must be 7-bit ASCII.'));
    return this;
  }

  this.client.write(U.stuffDots(data, this.newline));
  this.newline = /\n$/.test(data);

  return this;
};

ClientTransaction.prototype.puts = function(data) {
  return this.write(data + '\r\n');
};

ClientTransaction.prototype.end = function(data) {
  var self = this;

  if (this.done)
    throw new Error('The transaction has ended.');

  if (data !== undefined)
    this.write(data);

  if (!this.newline)
    this.client.write('\r\n');
  this.client.write('.\r\n');

  this.done = true;

  this.client.withReply(250, function() {
    self.emit('end');
  });

  return this;
};
