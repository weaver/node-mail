# Node Mail #

This SMTP client helps you send email safely and easily using
Node.JS. It supports TLS and auth-login so you can send through
gmail. It also implements sanity checks to safeguard against header
injection attacks.

## Installation ##

Use NPM to install:

    npm install mail

## Sending Mail ##

The `Mail` class encapsulates connection settings and can be used as a
safe, high-level mailer.

    var mail = require('mail').Mail({
      host: 'smtp.gmail.com',
      username: 'me@gmail.com',
      password: '**password**'
    });

Use the mailer to send messages:

    mail.message({
      from: 'sender@example.net',
      to: ['recipient@somewhere.org'],
      subject: 'Hello from Node.JS'
    })
    .body('Node speaks SMTP!')
    .send(function(err) {
      if (err) throw err;
      console.log('Sent!');
    });

## Mail(options) ##

Create a new mailer that can be used to send messages.  Common options
include:

  + `host`: server hostname
  + `username`: user for server authentication
  + `password`: password for server authentication,

Other options:

  + `secure`: `true`, `false`, or crypto credentials (default: `true`)
  + `port`: server listens on this port (default: 587 or 25)
  + `domain`: the domain of the sender (default: `os.hostname()`)
  + `mimeTransport`: `7BIT` or `8BITMIME` (default: `8BITMIME`)

### Mail.message(headers) ###

Begin a `MailTransaction`.  The `headers` object may contain any any
SMTP headers.  When the message is formatted, email addresses are
validated, header names are title-cased, and header values escaped to
prevent injection.  A `Date` header is automatically added.

An email address may be an array, a single address, or a string with
command-separated addresses.  Individual addresses may be bare or in
the format `"Display Name" <name@example.net>`.

### MailTransaction.body(text) ###

Add a body to a mail transaction.  Long lines are automatically
wrapped.

### MailTransaction.send(callback) ###

Connect to the server, transmit the message, and quit.  The callback
should be in the form `function(err, message) { ... }`.  Upon success,
`err` is `null` and `message` is set to the `Message` object that was
sent to the server.

## Compatibility ##

Node Mail has been tested against [qmail][1] and [gmail][2] using Node
version `v0.4.3`.  A working subset of these RFCs are supported:

  + [Internet Message Format](http://tools.ietf.org/html/rfc5322)
  + [Simple Mail Transfer Protocol](http://tools.ietf.org/html/rfc5321)
  + [Authentication Extension](http://tools.ietf.org/html/rfc2554)
  + [SMTP Transport Layer Security](http://tools.ietf.org/html/rfc3207)
  + [8-bit MIME Transport](http://tools.ietf.org/html/rfc6152)

There is not currently direct support for multipart messages or
attachments, although `node-mail` will send messages in this format if
they're build manually.

[1]: http://qmail.org/top.html
[2]: http://mail.google.com/support/bin/answer.py?hl=en&answer=13287

## License ##

Copyright (c) 2010 - 2011, Ben Weaver &lt;ben@orangesoda.net&gt;
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

