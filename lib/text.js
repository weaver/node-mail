exports.splitLines = splitLines;
exports.wrap = wrap;
exports.fill = fill;
exports.atMost = atMost;

function splitLines(str) {
  return str.split(/\r\n|\r|\n/);
}

function wrap(str, soft, hard, pattern) {
  var result = [],
      line;

  do {
    result.push(line = atMost(str, soft, hard, pattern));
    str = str.substr(line.length);
  } while(str.length > 0);

  return result;
}

function fill(str, soft, hard, glue) {
  return wrap(str, soft, hard).join(glue || "\n");
}

function atMost(str, soft, hard, pattern) {
  soft = soft || 70;
  hard = (hard === undefined) ? soft : hard;
  pattern = new RegExp(pattern || '\\s', 'gm');

  if (!pattern.global)
    throw new Error("atMost: missing 'g' flag: " + pattern);
  else if (str.length <= soft)
    return str;

  var probe = pattern.exec(str);

  if (!probe || (hard && probe.index >= hard))
    return hard ? str.slice(0, hard) : str;

  var result = str.slice(0, probe.index + 1),
      last = probe.index + 1;

  while ((probe = pattern.exec(str)) && (probe.index <= soft)) {
    result += str.slice(last, probe.index + 1);
    last = probe.index + 1;
  }

  return result;
}