/// client -- use the SMTP client with a Message object.
//
// For simple messages, it's safer to use Mail (see examples/mail.js).
// This example uses a Message object to add some structure and
// safety.

var sys = require('sys'),
    mail = require('../lib');

var message = new mail.Message({
  from: 'sender@example.net',
  to: ['name@somewhere.org'],
  subject: 'Hello from Node.JS'
})
.body('Hello from Node.JS');

var client = mail.createClient({
  host: 'smtp.gmail.com',
  username: 'me@gmail.com',
  password: '**password**'
});

client.on('error', function(err) {
  client.end();
  throw err;
});

var transaction = client.mail(message.sender(), message.recipients());
transaction.on('ready', function() {
  transaction.end(message.toString());
  transaction.on('end', function() {
    sys.debug('Message sent!');
    client.quit();
  });
});

