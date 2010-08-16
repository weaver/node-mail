# Node Mail #

This SMTP client helps you send email safely and easily using
Node.JS.  The client currently supports TLS and auth-login.

## Installation ##

Node Mail has no third-party dependencies.  To install, you can `npm
install mail` or download the library and add `mail` to a folder in
your `NODE_PATH`.

## Sending Mail ##

The `Mail` class encapsulates connection settings and can be used as a
safe, high-level mailer.

    var sys = require('sys'),
        mail = require('mail').Mail({
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
      .body('Node speaks SMTP!')
      .send(function(err) {
        if (err) throw err;
        sys.debug('Sent!');
      });

### Mail(settings) ###

Create a new mailer that can be used to send messages.  Possible
settings include:

  + `port`: server listens on this port (defualt: 25)
  + `host`: server hostname
  + `domain`: the domain of the sender (default: `hostname -f`)
  + `secure`: `true`, `false`, or crypto credentials (defualt: true)
  + `username`: user for server authentication
  + `password`: password for server authentication

#### Mail.message(headers) ####

Begin a `MailTransaction`.  The `headers` object may contain any any
SMTP headers.  When the message is formatted, email addresses are
validated, header names are title-cased, and header values escaped to
prevent injection.  A `Date` header is automatically added.

An email address may be an array, a single address, or a string with
command-separated addresses.  Individual addresses may be bare or in
the format `"Display Name" <name@example.net>`.

#### MailTransaction.body(text) ####

Add a body to a mail transaction.  Long lines are automatically
wrapped.

#### MailTransaction.send(callback) ####

Connect to the server, transmit the message, and quit.  The callback
should be in the form `function(err, message) { ... }`.  Upon success,
`err` is `null` and `message` is set to the `Message` object that was
sent to the server.

## SMTP Client ##

The SMTP client library is similar in spirit to Node's `http` module.
It doesn't provide safety features like address validation, header
escaping, or body wrapping.  The `Client` class extends `net.Stream`.

### createClient(port, host, [domain=`hostname -f`, secure=true]) ###

Return a new `Client` object.  The `port` and `host` are required.
The optional `secure` parameter can be `true`, `false`, or a crypto
credentials object.  If it is `false`, it won't attempt to use TLS
even if the server supports it.

    var client = mail.createClient(587, 'smtp.gmail.com');
    client.setLogin('me@gmail.com', '**password**');
    client.on('error', function(err) {
      client.end();
      throw err;
    });

#### event: 'ready' ####

This event is emitted once the client has connected and said `EHLO`.

#### event: 'reply' ####

This event is emitted when a reply is received from the server.  The
handler is passed any number of `Reply` objects, which have `code` and
`text` properties.

#### Client.mail(from, to) ####

Begin a `ClientTransaction`.  The `from` parameter is the sender's
email address and `to` is an array of recipients.  Addresses must be
in a bare format.

#### Client.command(name, [args, callback]) ####

Send a command to the server.  Optional `args` may be given, which is
a string representing command arguments.  Passing a `callback` is a
shortcut for `.withReply(250, callback)`.

#### Client.withReply([code, ]callback) ####

Listen for the next reply, passing any `Reply` objects along to
`callback`.  If `code` is given, throw an error if the reply code
doesn't match.

#### Client.quit() ####

Terminate the connection with a `QUIT` command.

#### Client.setLogin(username, password) ####

If the server requires `AUTH LOGIN`, enable it by setting the
authentication parameters.

### ClientTransaction ###

The `Client.mail()` method returns a new `ClientTransaction`.  Once
the `MAIL FROM`,  `RCPT TO`, and `DATA` commands have been sent, the
transaction emits `'ready'` and data can be written.

    var from = 'sender@example.net',
        to = 'name@somewhere.org',
        transaction = client.mail(from, [to]);

    transaction.on('ready', function() {
      this.write(...)
          .end();
    });

    transaction.on('end', function() {
      client.quit();
    });

#### event: 'ready' ####

Emitted once the envelope is sent and data is can be written.

#### event: 'end' ####

Emitted once the `DATA` command has been successfully terminated.

#### ClientTransaction.write(data) ####

Write data.

#### ClientTransaction.puts(data) ####

Write a line of data (shortcut for `.write(data + '\r\n')`.

#### ClientTransaction.end([data]) ####

Optionally write `data`, then terminate the `DATA` command with a
`'.\r\n'`.  Upon success, an `'end'` event is emitted.

## Compatibility ##

Node Mail has been tested against [qmail][1] and [gmail][2] using Node
version `v0.1.103`.  A working subset of these RFCs are supported:

  + [Internet Message Format](http://tools.ietf.org/html/rfc5322)
  + [Simple Mail Transfer Protocol](http://tools.ietf.org/html/rfc5321)
  + [Authentication Extension](http://www.faqs.org/rfcs/rfc2554.html)
  + [SMTP Transport Layer Security](http://tools.ietf.org/html/rfc3207)

There is not currently support for MIME.

[1]: http://qmail.org/top.html
[2]: http://mail.google.com/support/bin/answer.py?hl=en&answer=13287

## License ##

Copyright (c) 2010, Ben Weaver &lt;ben@orangesoda.net&gt;
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

* Redistributions of source code must retain the above copyright
  notice, this list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright
  notice, this list of conditions and the following disclaimer in the
  documentation and/or other materials provided with the distribution.

* Neither the name of the <organization> nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT
HOLDER> BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

