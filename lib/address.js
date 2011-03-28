var ReParse = require('reparse').ReParse;

exports.formatAddressList = formatAddressList;
exports.readAddressList = readAddressList;


/// --- [Address List](http://tools.ietf.org/html/rfc5322#section-3.4)

function formatAddressList(list) {
  if (!(list instanceof Array))
    return list;
  return list.join(', ');
}

function readAddressList(obj) {
  if (!obj)
    return [];
  else if (obj instanceof Array)
    return obj.reduce(function(result, item) {
      return result.concat(readAddressList(item));
    }, []);

  return (new ReParse(obj)).start(addressList);
}

function addressList() {
  return this.sepEndBy(address, /^\s*,\s*/);
}

function address() {
  return this.choice(namedAddress, bareAddress);
}

function namedAddress() {
  return this.seq(phrase, /^\s*</m, bareAddress, /^>/)[3];
}

function bareAddress() {
  return this.seq(word, /^@/, word).slice(1).join('');
}

function phrase() {
  return this.many(word);
}

function word() {
  return this.skip(/^\s+/).choice(quoted, dottedAtom);
}

function quoted() {
  return this.match(/^"(?:\\.|[^"\r\n])+"/m);
}

function dottedAtom() {
  return this.match(/^[!#\$%&'\*\+\-\/\w=\?\^`\{\|\}~]+(?:\.[!#\$%&'\*\+\-\/\w=\?\^`\{\|\}~]+)*/m);
}
