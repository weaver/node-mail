var sys = require('sys'),
    mail = require('../lib/mail').Mail({
      host: 'smtp.gmail.com',
      port: 587,
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
