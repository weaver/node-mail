# SMTP Reference #

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
