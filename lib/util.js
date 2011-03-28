var text = require('./text'),
    ReParse = require('reparse').ReParse;

exports.foldHeader = foldHeader;
exports.escapeHeader = escapeHeader;
exports.fill = fill;
exports.stuffDots = stuffDots;
exports.titleCaseHeader = titleCaseHeader;
exports.is7Bit = is7Bit;
exports.date = date;

exports.eachLine = eachLine;
exports.readLines = readLines;
exports.aEach = aEach;
exports.extend = extend;


// ## Debug ##

var debug;
if (process.env.NODE_DEBUG && /mail/.test(process.env.NODE_DEBUG)) {
  debug = exports.debug = function(label) {
    var args = Array.prototype.slice.call(arguments, 1);
    console.error.apply(console, ['TLS: ' + label].concat(args));
  };
} else {
  debug = exports.debug = function() { };
}


/// --- Formatting

// [Long Header Fields](http://tools.ietf.org/html/rfc5322#section-2.2.3)
function foldHeader(name, value, safe) {
  var line = name + ': ' + escapeHeader(value.replace(/^\s*|\s*$/, ''), safe),
      // Wrap at the character before a space, forcing the space to
      // the next line.  This way, when the segments are glued
      // together the CRLF goes before the space.
      segments = text.wrap(line, 78, 998, ".(?=\\s)"),
      result = segments[0];

  // It's possible that the line was wrapped across a hard boundary.
  // This means a segment might not start with a space character.  One
  // way to handle this is to throw an error.  Since it's unlikely to
  // happen, keep things simple by quietly adding a space.
  for (var i = 1, l = segments.length; i < l; i++)
    result += "\r\n" + segments[i].replace(/^(\S)/, ' $1');
  return result;
}

// [Header Fields](http://tools.ietf.org/html/rfc5322#section-2.2)
function escapeHeader(value, safe) {
  // A header value is allowed to be a printable ASCII character, a
  // tab, or a space.  Anything else is elided into a safe character
  // (space by default).
  return value.replace(/[^ \t\w!"#\$%&'\(\)\*\+,\-\.\/:;<=>\?@\[\\\]\^`\{\|\}\~\]]+/gm, safe || ' ');
}

// [Line Length Limits](http://tools.ietf.org/html/rfc5322#section-2.1.1)
function fill(body) {

  function wrap(result, line) {
    return result.concat(text.wrap(line, 78, 998));
  }

  return text.splitLines(body)
    .reduce(wrap, [])
    .join('\r\n');
}

// [Transparency](http://tools.ietf.org/html/rfc5321#section-4.5.2)
function stuffDots(body, newline) {
  if (newline)
    body = body.replace(/^\./, '..');
  return body.replace(/\r\n\./gm, '\r\n..');
}

function titleCaseHeader(name) {
  return name && name.split(/\-/).map(function(segment) {
    return (segment[0].toUpperCase() + segment.substr(1).toLowerCase());
  }).join('-');
}

function is7Bit(data) {
  return /^[\x00-\x7f]*$/.test(data);
}

// [Date and Time](http://tools.ietf.org/html/rfc5322#section-3.3)
var DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function date(when) {
  when = when || new Date();
  return (
    DAY[when.getDay()]
    + ', ' + pad(when.getDate())
    + ' ' + MONTH[when.getMonth()]
    + ' ' + when.getFullYear()
    + ' ' + pad(when.getHours())
    + ':' + pad(when.getMinutes())
    + ':' + pad(when.getSeconds())
    + ' ' + tz(when.getTimezoneOffset())
  );
}

function tz(n) {
  // From <https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset>:
  //
  //   The time-zone offset is the difference, in minutes, between UTC
  //   and local time. Note that this means that the offset is positive
  //   if the local timezone is behind UTC and negative if it is ahead.
  //   For example, if your time zone is UTC+10 (Australian Eastern
  //   Standard Time), -600 will be returned. Daylight savings time
  //   prevents this value from being a constant even for a given
  //   locale.
  var sign = (n < 0) ? '+' : '-';

  n = Math.abs(n);
  return sign + pad(Math.floor(n / 60)) + pad(n % 60);
};

function pad(n) {
  return (n < 10) ? ('0' + n) : n;
}


/// --- Aux

function eachLine(stream, handle) {
  return stream.on('data', readLines(handle));
}

function readLines(handle) {
  var buffer = '',
      line;

  return function(chunk) {
    buffer += chunk.toString();
    while((line = buffer.match(/^(.*)(?:\r\n|\r|\n)/mg)) !== null) {
      buffer = buffer.substr(line[0].length);
      handle(line[0]);
    }
  };
}

function aEach(list, fn, callback) {
  var index = -1,
      limit = list.length;

  each();

  function each(err) {
    if (err instanceof Error)
      callback(err);
    else if (++index >= limit)
      callback(null);
    else
      fn.call(this, list[index], index, next);
  }

  function next() {
    process.nextTick(each);
  }
}

function extend(target) {
  var obj, key;
  for (var i = 1, l = arguments.length; i < l; i++) {
    if ((obj = arguments[i])) {
      for (key in obj)
        target[key] = obj[key];
    }
  }
  return target;
}