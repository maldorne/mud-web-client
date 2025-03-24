import jQuery from 'jquery';

export default function polyfills() {
  String.prototype.has = function (a) {
    if (!a.length) return false;
    return this.indexOf(a) != -1;
  };

  String.prototype.start = function (a) {
    return this.indexOf(a) == 0;
  };

  String.prototype.cap = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
  };

  Date.prototype.ymd = function () {
    var yyyy = this.getFullYear().toString();
    var mm = (this.getMonth() + 1).toString();
    var dd = this.getDate().toString();
    return (
      yyyy +
      '-' +
      (mm[1] ? mm : '0' + mm[0]) +
      '-' +
      (dd[1] ? dd : '0' + dd[0])
    );
  };

  Array.prototype.remove = function () {
    var what,
      a = arguments,
      L = a.length,
      ax;
    while (L && this.length) {
      what = a[--L];
      while ((ax = this.indexOf(what)) != -1) {
        this.splice(ax, 1);
      }
    }
    return this;
  };

  Array.prototype.index = function (key1, val1, key2, val2) {
    if (!key1) {
      for (var i = 0; i < this.length; i++) if (this[i] == val1) return i;
    }

    if (!this.length || !this[0][key1]) return -1;
    for (var i = 0; i < this.length; i++) {
      if (this[i][key1] == val1) {
        if (!val2) return i;
        else if (this[i][key2] == val2) return i;
      }
    }

    return -1;
  };

  Array.prototype.fetch = function (key1, val1, key2) {
    if (!this.length || !this[0][key1]) return null;

    for (var i = 0; i < this.length; i++) {
      if (this[i][key1] == val1) return this[i][key2];
    }

    return null;
  };

  Array.prototype.has = function (v) {
    return this.indexOf(v) != -1;
  };

  Array.prototype.not = function (key1, val1) {
    if (!key1) return null;
    for (var i = 0; i < this.length; i++) if (this[i] != val1) return this[i];
    return null;
  };

  Array.prototype.unique = function () {
    return this.reduce(function (p, c) {
      if (p.indexOf(c) < 0) p.push(c);
      return p;
    }, []);
  };

  Array.prototype.add = function (A) {
    if (this.indexOf(A) == -1) this.push(A);
  };

  Array.prototype.remove = function (A) {
    if (this.indexOf(A) != -1) this.splice(this.indexOf(A), 1);
  };

  if (!Array.prototype.filter) {
    Array.prototype.filter = function (fun /*, thisp*/) {
      var len = this.length;
      if (typeof fun != 'function') throw new TypeError();

      var res = new Array();
      var thisp = arguments[1];
      for (var i = 0; i < len; i++) {
        if (i in this) {
          var val = this[i]; // in case fun mutates this
          if (fun.call(thisp, val, i, this)) res.push(val);
        }
      }
      return res;
    };
  }

  String.prototype.trimm = function () {
    return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
  };

  String.prototype.param = function (A) {
    A = A.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + A + '=([^&#]*)');
    var results = regex.exec(this);
    if (results == null) return '';
    else return decodeURIComponent(results[1]);
  };

  /*
if (!Object.prototype.extend)
  Object.defineProperty(Object.prototype, "extend", {
    enumerable: false,
    value: function() {
      var dest = this;
      for (var i = 0; i < arguments.length; i++) {
        var from = arguments[i], 
          props = Object.getOwnPropertyNames(from);
          props.forEach(function(name) {
            var d = Object.getOwnPropertyDescriptor(from, name);
            Object.defineProperty(dest, name, d);
          });
      }
      return this;
    }
  });
*/

  if (jQuery && jQuery.fn) {
    jQuery.fn.center = function () {
      this.css(
        'top',
        Math.max(0, (jQuery(window).height() - jQuery(this).height()) / 2),
      );
      this.css(
        'left',
        Math.max(0, (jQuery(window).width() - jQuery(this).width()) / 2),
      );
      return this;
    };
  }
}
