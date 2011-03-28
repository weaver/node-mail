/// mail -- send an email
//
// This is the simplest, safest way to send an email.  Headers are
// escaped and folded, email addresses are validated, and the body is
// validated and wrapped.

var sys = require('sys'),
    mail = require('../lib').Mail({
      host: 'smtp.gmail.com',
      username: 'me@gmail.com',
      password: '**password**'
    });

mail.message({
    from: 'sender@example.net',
    to: ['recipient@somewhere.org'],
    subject: 'Hello from Node.JS'
  })
  .body('Node speaks SMTP.')
  .send(function(err) {
    if (err) throw err;
    sys.debug('Sent!');
  });
