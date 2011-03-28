/// client -- use the SMTP client directly.
//
// For simple messages, it's safer to use Mail (see examples/mail.js)
// or Message (see examples/client-message.js).  Nothing is done here
// to protect against header injection, command injection, long lines,
// or a mal-formed body.

var sys = require('sys'),
    mail = require('../lib');

var client = mail.createClient({
  host: 'smtp.gmail.com',
  username: 'me@gmail.com',
  password: '**password**'
});

client.on('error', function(err) {
  client.end();
  throw err;
});

var from = 'sender@example.net',
    to = 'name@somewhere.org',
    transaction = client.mail(from, [to]);

transaction.on('ready', function() {
  this.puts('From: ' + from)
      .puts('To: ' + to)
      .puts('Subject: Hello from Node.JS')
      .puts('')
      .end('Hi, this is Node.JS speaking.');
});

transaction.on('end', function() {
  sys.debug('Message sent!');
  client.quit();
});


