import { Config } from './config.js';
import * as polyfills from './polyfills.js';

// execute polyfills
polyfills.default();

function stringify(A) {
  var cache = [];
  var val = JSON.stringify(A, function (k, v) {
    if (typeof v === 'object' && v !== null) {
      if (cache.indexOf(v) !== -1) return;
      cache.push(v);
    }
    return v;
  });
  return val;
}

function html_encode(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function html_decode(str) {
  return str
    .replace(/&amp\;/g, '&')
    .replace(/&lt\;/g, '<')
    .replace(/&gt\;/g, '>');
}

function addslashes(str) {
  //  discuss at: http://phpjs.org/functions/addslashes/
  // original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: Ates Goral (http://magnetiq.com)
  // improved by: marrtins
  // improved by: Nate
  // improved by: Onno Marsman
  // improved by: Brett Zamir (http://brett-zamir.me)
  // improved by: Oskar Larsson H�gfeldt (http://oskar-lh.name/)
  //    input by: Denny Wardhana
  //   example 1: addslashes("kevin's birthday");
  //   returns 1: "kevin\\'s birthday"

  return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

function getSelText() {
  if (window.getSelection) return window.getSelection().toString();
  else if (document.getSelection) return document.getSelection().toString();
  else if (document.selection) return document.selection.createRange().text;

  return null;
}

function getCaretPosition(ctrl) {
  var CaretPos = 0; // IE Support
  if (document.selection) {
    ctrl.focus();
    var Sel = document.selection.createRange();
    Sel.moveStart('character', -ctrl.value.length);
    CaretPos = Sel.text.length;
  }
  // Firefox support
  else if (ctrl.selectionStart || ctrl.selectionStart == '0')
    CaretPos = ctrl.selectionStart;
  return CaretPos;
}

function setCaretPosition(ctrl, pos) {
  if (ctrl.setSelectionRange) {
    ctrl.focus();
    ctrl.setSelectionRange(pos, pos);
  } else if (ctrl.createTextRange) {
    var range = ctrl.createTextRange();
    range.collapse(true);
    range.moveEnd('character', pos);
    range.moveStart('character', pos);
    range.select();
  }
}

function param(A) {
  A = A.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  var regex = new RegExp('[\\?&]' + A + '=([^&#]*)');
  var results = regex.exec(window.location.search);
  if (results == null) return '';
  else return decodeURIComponent(results[1]);
}

function log() {
  if (Config.debug) console.log.apply(console, arguments);
}

function dump(A) {
  if (Config.debug) console.log(stringify(A));
}

function exists(A) {
  return typeof A != 'undefined' ? 1 : 0;
}

function addCommas(nStr) {
  nStr += '';
  let x = nStr.split('.');
  let x1 = x[0];
  let x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }
  return x1 + x2;
}

function multiprocess(cb) {
  var i = 0,
    busy = 0,
    done = 0;
  var processor = setInterval(function () {
    if (!busy) {
      busy = 1;
      done = cb.call();
      if (done) clearInterval(processor);
      busy = 0;
    }
  }, 100);
}

function glow(url) {
  var stdDeviation = 2,
    rgb = '#000',
    colorMatrix = '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0';

  if (!arguments.length) {
    url = 'glow';
  }

  function my() {
    var defs = this.append('defs');

    var filter = defs
      .append('filter')
      .attr('id', url)
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%')
      .call(function () {
        this.append('feColorMatrix')
          .attr('type', 'matrix')
          .attr('values', colorMatrix);
        this.append('feGaussianBlur')
          // .attr("in", "SourceGraphics")
          .attr('stdDeviation', stdDeviation)
          .attr('result', 'coloredBlur');
      });

    filter.append('feMerge').call(function () {
      this.append('feMergeNode').attr('in', 'coloredBlur');
      this.append('feMergeNode').attr('in', 'SourceGraphic');
    });
  }

  my.rgb = function (value) {
    if (!arguments.length) return color;
    rgb = value;
    color = d3.rgb(value);
    var matrix = '0 0 0 red 0 0 0 0 0 green 0 0 0 0 blue 0 0 0 1 0';
    colorMatrix = matrix
      .replace('red', color.r)
      .replace('green', color.g)
      .replace('blue', color.b);

    return my;
  };

  my.stdDeviation = function (value) {
    if (!arguments.length) return stdDeviation;
    stdDeviation = value;
    return my;
  };

  return my;
}

export {
  stringify,
  html_encode,
  html_decode,
  addslashes,
  getSelText,
  getCaretPosition,
  setCaretPosition,
  param,
  log,
  dump,
  exists,
  addCommas,
  multiprocess,
  glow,
};
