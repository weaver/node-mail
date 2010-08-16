var sys = require('sys'),
    net = require('net'),
    events = require('events'),
    util = require('./util'),
    msg = require('./message');

exports.Mail = Mail;
exports.createClient = createClient;
exports.Client = Client;
exports.BadReply = BadReply;
exports.Message = msg.Message;
exports.readAddressList = util.readAddressList;
exports.formatAddressList = util.formatAddressList;


/// --- Mail

function Mail(settings) {
  if (!(this instanceof Mail))
    return new Mail(settings);
  this.settings = settings;
};

Mail.prototype.message = function message(headers) {
  return new MailTransaction(this, headers);
};

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
      settings = this.settings,
      port = settings.port || 25,
      host = settings.host,
      message = msg.Message(this.headers).body(this._body),
      headers = message.headers,
      sender, recipients, client;

  try {
    if (host === undefined)
      fn(new Error('send: host is required.'));
    else if (!(sender = message.sender()))
      fn(new Error('send: missing sender (add From or Sender headers).'));
    else if ((recipients = message.recipients()).length == 0)
      fn(new Error('send: missing recipients (add To, Cc, or Bcc headers).'));

    client = createClient(port, host, settings.domain, settings.secure);
    if (settings.username)
      client.setLogin(settings.username, settings.password);

    client.on('error', function(err) {
      client.end();
      fn(err);
    });
  } catch (err) {
    fn(err);
    return null;
  }

  return client.mail(sender, recipients).on('ready', function() {
    this.end(message.toString()).on('end', function() {
      client.quit();
      fn(null, message);
    });
  });
};


/// --- Client

function createClient(port, host, domain, secure) {
  var client = new Client();

  client.port = port;
  client.host = host;
  client.domain = domain;

  if (secure || secure === undefined) {
    client.tls = true;
    if (typeof secure == 'object')
      client.credentials = secure;
  }

  return client;
}

sys.inherits(Client, net.Stream);
function Client() {
  net.Stream.call(this);
  this.setEncoding('ascii');
}

Client.prototype.one = function(name, callback) {
  var self = this;

  function once() {
    self.removeListener(name, once);
    callback.apply(this, arguments);
  }

  return this.on(name, once);
};

Client.prototype.mail = function(from, to) {
  var self = this;

  if (this.domain)
    this.session();
  else
    util.getHostname(function(err, domain) {
      if (err)
        self.emit('error', err);
      else {
        self.domain = domain;
        self.session();
      }
    });

   return new ClientTransaction(this, from, to);
};

Client.prototype.session = function(domain) {
  var self = this;

  this.domain = domain || this.domain;

  if (!this.domain)
    this.emit('error', new Error('Missing required domain.'));
  else if (this.readyState != 'closed')
    this.emit('error', new Error('Session already started.'));
  else {
    this.clear = util.rememberListeners(this);
    this.connect(this.port, this.host);
    this.one('connect', function() {
      self.reset(220);
    });
  }

  return this;
};

Client.prototype.reset = function(wait) {
  var self = this,
      buffer = '',
      replies = [];

  this.clear();
  this.session = {};
  this.on('data', util.readLines(handle));

  if (wait)
    this.withReply(wait, ehlo);
  else
    ehlo();

  function ehlo() {
    self.command('ehlo', self.domain, function() {
      util.aEach(arguments, extend, ready);
    });
  }

  function handle(line) {
    var probe;

    if (!(probe = line.match(/^(\d{3})([\- ])(.*)/))) {
      self.emit('error', new Error('Badly formatted reply: ' + sys.inspect(line)));
      return;
    }

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
    this.one('reply', code);
  else
    this.one('reply', function(reply) {
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


/// --- STARTTLS extension <http://tools.ietf.org/html/rfc3207>

Client.prototype.smtpSTARTTLS = function(next) {
  var self = this;

  if (!this.tls)
    return next();
  else
    this.command('starttls').withReply(220, secure);

  function secure() {
    this.setSecure();
    this.one('secure', function() {
      self.reset();
    });
  }

  return this;
};


/// --- AUTH extension <http://www.faqs.org/rfcs/rfc2554.html>

Client.prototype.setLogin = function(username, password) {
  this.username = username;
  this.password = password;
  return this;
};

Client.prototype.smtpAUTH = function(next, mechanisms) {
  var names = mechanisms.toUpperCase().split(/\s+/),
      method;

  for (var i = 0, l = names.length; i < l; i++) {
    method = this['auth' + names[i]];
    if (method) {
      method.call(this, this.username, this.password, next);
      break;
    }
  }
};

// LOGIN mechanism <http://www.fehcom.de/qmail/smtpauth.html#FRAMEWORK>
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


/// --- Reply

function Reply(code, text) {
  this.code = code;
  this.text = text;
}

Reply.prototype.toString = function() {
  return this.code + ' ' + this.text;
};

sys.inherits(BadReply, Error);
function BadReply(reason, reply) {
  Error.call(this, reason);
  this.reply = reply;
};

BadReply.prototype.toString = function() {
  return this.message + ': ' + this.reply.toString();
};


/// --- ClientTransaction

sys.inherits(ClientTransaction, events.EventEmitter);
function ClientTransaction(client, from, to) {
  var self = this;

  this.client = client;
  this.session = client.session;
  this.done = false;
  this.newline = true;

  client.one('ready', sendFrom);

  function sendFrom() {
    client.command('mail from:', '<' + from + '>', function() {
      util.aEach(to, sendTo, data);
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

ClientTransaction.prototype.write = function(data) {
  if (this.done) {
    this.client.emit('error', new Error('The transaction has ended.'));
    return this;
  }
  else if ((this.session.bits != 8) && !util.is7Bit(data)) {
    this.client.emit('error', new Error('Data must be 7-bit ASCII.'));
    return this;
  }

  this.client.write(util.stuffDots(data, this.newline));
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
