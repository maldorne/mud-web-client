/*
Copyright (c) 2008 Fred Palmer fred.palmer_at_gmail.com

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/
function StringBuffer() {
  this.buffer = [];
}

StringBuffer.prototype.append = function append(string) {
  this.buffer.push(string);
  return this;
};

StringBuffer.prototype.toString = function toString() {
  return this.buffer.join('');
};

var Base64 = {
  codex: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',

  encode: function (input) {
    var output = new StringBuffer();

    var enumerator = new Utf8EncodeEnumerator(input);
    while (enumerator.moveNext()) {
      var chr1 = enumerator.current;

      enumerator.moveNext();
      var chr2 = enumerator.current;

      enumerator.moveNext();
      var chr3 = enumerator.current;

      var enc1 = chr1 >> 2;
      var enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      var enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      var enc4 = chr3 & 63;

      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }

      output.append(
        this.codex.charAt(enc1) +
          this.codex.charAt(enc2) +
          this.codex.charAt(enc3) +
          this.codex.charAt(enc4),
      );
    }

    return output.toString();
  },

  decode: function (input) {
    var output = new StringBuffer();

    var enumerator = new Base64DecodeEnumerator(input);
    while (enumerator.moveNext()) {
      var charCode = enumerator.current;

      if (charCode < 128) output.append(String.fromCharCode(charCode));
      else if (charCode > 191 && charCode < 224) {
        enumerator.moveNext();
        var charCode2 = enumerator.current;

        output.append(
          String.fromCharCode(((charCode & 31) << 6) | (charCode2 & 63)),
        );
      } else {
        enumerator.moveNext();
        var charCode2 = enumerator.current;

        enumerator.moveNext();
        var charCode3 = enumerator.current;

        output.append(
          String.fromCharCode(
            ((charCode & 15) << 12) |
              ((charCode2 & 63) << 6) |
              (charCode3 & 63),
          ),
        );
      }
    }

    return output.toString();
  },
};

function Utf8EncodeEnumerator(input) {
  this._input = input;
  this._index = -1;
  this._buffer = [];
}

Utf8EncodeEnumerator.prototype = {
  current: Number.NaN,

  moveNext: function () {
    if (this._buffer.length > 0) {
      this.current = this._buffer.shift();
      return true;
    } else if (this._index >= this._input.length - 1) {
      this.current = Number.NaN;
      return false;
    } else {
      var charCode = this._input.charCodeAt(++this._index);

      // "\r\n" -> "\n"
      //
      if (charCode == 13 && this._input.charCodeAt(this._index + 1) == 10) {
        charCode = 10;
        this._index += 2;
      }

      if (charCode < 128) {
        this.current = charCode;
      } else if (charCode > 127 && charCode < 2048) {
        this.current = (charCode >> 6) | 192;
        this._buffer.push((charCode & 63) | 128);
      } else {
        this.current = (charCode >> 12) | 224;
        this._buffer.push(((charCode >> 6) & 63) | 128);
        this._buffer.push((charCode & 63) | 128);
      }

      return true;
    }
  },
};

function Base64DecodeEnumerator(input) {
  this._input = input;
  this._index = -1;
  this._buffer = [];
}

Base64DecodeEnumerator.prototype = {
  current: 64,

  moveNext: function () {
    if (this._buffer.length > 0) {
      this.current = this._buffer.shift();
      return true;
    } else if (this._index >= this._input.length - 1) {
      this.current = 64;
      return false;
    } else {
      var enc1 = Base64.codex.indexOf(this._input.charAt(++this._index));
      var enc2 = Base64.codex.indexOf(this._input.charAt(++this._index));
      var enc3 = Base64.codex.indexOf(this._input.charAt(++this._index));
      var enc4 = Base64.codex.indexOf(this._input.charAt(++this._index));

      var chr1 = (enc1 << 2) | (enc2 >> 4);
      var chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      var chr3 = ((enc3 & 3) << 6) | enc4;

      this.current = chr1;

      if (enc3 != 64) this._buffer.push(chr2);

      if (enc4 != 64) this._buffer.push(chr3);

      return true;
    }
  },
};

/*
Copyright (c) 2011, Daniel Guerrero
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
* Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimer in the
documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL DANIEL GUERRERO BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/**
 * Uses the new array typed in javascript to binary base64 encode/decode
 * at the moment just decodes a binary base64 encoded
 * into either an ArrayBuffer (decodeArrayBuffer)
 * or into an Uint8Array (decode)
 *
 * References:
 * https://developer.mozilla.org/en/JavaScript_typed_arrays/ArrayBuffer
 * https://developer.mozilla.org/en/JavaScript_typed_arrays/Uint8Array
 */

var Base64Binary = {
  _keyStr: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',

  /* will return a Uint8Array type */
  decodeArrayBuffer: function (input) {
    var bytes = (input.length / 4) * 3;
    var ab = new ArrayBuffer(bytes);
    this.decode(input, ab);
    return ab;
  },

  decode: function (input, arrayBuffer) {
    //get last chars to see if are valid
    var lkey1 = this._keyStr.indexOf(input.charAt(input.length - 1));
    var lkey2 = this._keyStr.indexOf(input.charAt(input.length - 2));

    var bytes = (input.length / 4) * 3;
    if (lkey1 == 64) bytes--; //padding chars, so skip
    if (lkey2 == 64) bytes--; //padding chars, so skip

    var uarray;
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;
    var j = 0;

    if (arrayBuffer) uarray = new Uint8Array(arrayBuffer);
    else uarray = new Uint8Array(bytes);

    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');

    for (i = 0; i < bytes; i += 3) {
      //get the 3 octects in 4 ascii chars
      enc1 = this._keyStr.indexOf(input.charAt(j++));
      enc2 = this._keyStr.indexOf(input.charAt(j++));
      enc3 = this._keyStr.indexOf(input.charAt(j++));
      enc4 = this._keyStr.indexOf(input.charAt(j++));

      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;

      if (typeof chr1 != 'number') alert('non-number!');
      if (typeof chr2 != 'number') alert('non-number!');
      if (typeof chr3 != 'number') alert('non-number!');

      uarray[i] = chr1;
      if (enc3 != 64) uarray[i + 1] = chr2;
      if (enc4 != 64) uarray[i + 2] = chr3;
    }

    return uarray;
  },

  string: function (input) {
    var s = '';
    for (var i = 0; i < input.byteLength; i++)
      s += String.fromCharCode(input[i]);
    return s;
  },
};

/* Copyright (C) 1999,2012 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0.1
 * LastModified: Jun 29 2012
 */

/* Interface:
 * data = zip_inflate(src);
 */

/* constant parameters */
var zip_WSIZE = 32768; // Sliding Window size
var zip_STORED_BLOCK = 0;
var zip_STATIC_TREES = 1;
var zip_DYN_TREES = 2;

/* for inflate */
var zip_lbits = 9; // bits in base literal/length lookup table
var zip_dbits = 6; // bits in base distance lookup table
var zip_INBUFSIZ = 32768; // Input buffer size
var zip_INBUF_EXTRA = 64; // Extra buffer

/* variables (inflate) */
var zip_slide;
var zip_wp; // current position in slide
var zip_fixed_tl = null; // inflate static
var zip_fixed_td; // inflate static
var zip_fixed_bl, fixed_bd; // inflate static
var zip_bit_buf; // bit buffer
var zip_bit_len; // bits in bit buffer
var zip_method;
var zip_eof;
var zip_copy_leng;
var zip_copy_dist;
var zip_tl, zip_td; // literal/length and distance decoder tables
var zip_bl, zip_bd; // number of bits decoded by tl and td

var zip_inflate_data;
var zip_inflate_pos;

/* constant tables (inflate) */
var zip_MASK_BITS = new Array(
  0x0000,
  0x0001,
  0x0003,
  0x0007,
  0x000f,
  0x001f,
  0x003f,
  0x007f,
  0x00ff,
  0x01ff,
  0x03ff,
  0x07ff,
  0x0fff,
  0x1fff,
  0x3fff,
  0x7fff,
  0xffff,
);
// Tables for deflate from PKZIP's appnote.txt.
var zip_cplens = new Array( // Copy lengths for literal codes 257..285
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  13,
  15,
  17,
  19,
  23,
  27,
  31,
  35,
  43,
  51,
  59,
  67,
  83,
  99,
  115,
  131,
  163,
  195,
  227,
  258,
  0,
  0,
);
/* note: see note #13 above about the 258 in this list. */
var zip_cplext = new Array( // Extra bits for literal codes 257..285
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  99,
  99,
); // 99==invalid
var zip_cpdist = new Array( // Copy offsets for distance codes 0..29
  1,
  2,
  3,
  4,
  5,
  7,
  9,
  13,
  17,
  25,
  33,
  49,
  65,
  97,
  129,
  193,
  257,
  385,
  513,
  769,
  1025,
  1537,
  2049,
  3073,
  4097,
  6145,
  8193,
  12289,
  16385,
  24577,
);
var zip_cpdext = new Array( // Extra bits for distance codes
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
);
var zip_border = new Array( // Order of the bit length code lengths
  16,
  17,
  18,
  0,
  8,
  7,
  9,
  6,
  10,
  5,
  11,
  4,
  12,
  3,
  13,
  2,
  14,
  1,
  15,
);
/* objects (inflate) */

function zip_HuftList() {
  this.next = null;
  this.list = null;
}

function zip_HuftNode() {
  this.e = 0; // number of extra bits or operation
  this.b = 0; // number of bits in this code or subcode

  // union
  this.n = 0; // literal, length base, or distance base
  this.t = null; // (zip_HuftNode) pointer to next level of table
}

function zip_HuftBuild(
  b, // code lengths in bits (all assumed <= BMAX)
  n, // number of codes (assumed <= N_MAX)
  s, // number of simple-valued codes (0..s-1)
  d, // list of base values for non-simple codes
  e, // list of extra bits for non-simple codes
  mm, // maximum lookup bits
) {
  this.BMAX = 16; // maximum bit length of any code
  this.N_MAX = 288; // maximum number of codes in any set
  this.status = 0; // 0: success, 1: incomplete table, 2: bad input
  this.root = null; // (zip_HuftList) starting table
  this.m = 0; // maximum lookup bits, returns actual

  /* Given a list of code lengths and a maximum table size, make a set of
   tables to decode that set of codes.	Return zero on success, one if
   the given code set is incomplete (the tables are still built in this
   case), two if the input is invalid (all zero length codes or an
   oversubscribed set of lengths), and three if not enough memory.
   The code with value 256 is special, and the tables are constructed
   so that no bits beyond that code are fetched when that code is
   decoded. */
  {
    var a; // counter for codes of length k
    var c = new Array(this.BMAX + 1); // bit length count table
    var el; // length of EOB code (value 256)
    var f; // i repeats in table every f entries
    var g; // maximum code length
    var h; // table level
    var i; // counter, current code
    var j; // counter
    var k; // number of bits in current code
    var lx = new Array(this.BMAX + 1); // stack of bits per table
    var p; // pointer into c[], b[], or v[]
    var pidx; // index of p
    var q; // (zip_HuftNode) points to current table
    var r = new zip_HuftNode(); // table entry for structure assignment
    var u = new Array(this.BMAX); // zip_HuftNode[BMAX][]  table stack
    var v = new Array(this.N_MAX); // values in order of bit length
    var w;
    var x = new Array(this.BMAX + 1); // bit offsets, then code stack
    var xp; // pointer into x or c
    var y; // number of dummy codes added
    var z; // number of entries in current table
    var o;
    var tail; // (zip_HuftList)

    tail = this.root = null;
    for (i = 0; i < c.length; i++) c[i] = 0;
    for (i = 0; i < lx.length; i++) lx[i] = 0;
    for (i = 0; i < u.length; i++) u[i] = null;
    for (i = 0; i < v.length; i++) v[i] = 0;
    for (i = 0; i < x.length; i++) x[i] = 0;

    // Generate counts for each bit length
    el = n > 256 ? b[256] : this.BMAX; // set length of EOB code, if any
    p = b;
    pidx = 0;
    i = n;
    do {
      c[p[pidx]]++; // assume all entries <= BMAX
      pidx++;
    } while (--i > 0);
    if (c[0] == n) {
      // null input--all zero length codes
      this.root = null;
      this.m = 0;
      this.status = 0;
      return;
    }

    // Find minimum and maximum length, bound *m by those
    for (j = 1; j <= this.BMAX; j++) if (c[j] != 0) break;
    k = j; // minimum code length
    if (mm < j) mm = j;
    for (i = this.BMAX; i != 0; i--) if (c[i] != 0) break;
    g = i; // maximum code length
    if (mm > i) mm = i;

    // Adjust last length count to fill out codes, if needed
    for (y = 1 << j; j < i; j++, y <<= 1)
      if ((y -= c[j]) < 0) {
        this.status = 2; // bad input: more codes than bits
        this.m = mm;
        return;
      }
    if ((y -= c[i]) < 0) {
      this.status = 2;
      this.m = mm;
      return;
    }
    c[i] += y;

    // Generate starting offsets into the value table for each length
    x[1] = j = 0;
    p = c;
    pidx = 1;
    xp = 2;
    while (--i > 0)
      // note that i == g from above
      x[xp++] = j += p[pidx++];

    // Make a table of values in order of bit lengths
    p = b;
    pidx = 0;
    i = 0;
    do {
      if ((j = p[pidx++]) != 0) v[x[j]++] = i;
    } while (++i < n);
    n = x[g]; // set n to length of v

    // Generate the Huffman codes and for each, make the table entries
    x[0] = i = 0; // first Huffman code is zero
    p = v;
    pidx = 0; // grab values in bit order
    h = -1; // no tables yet--level -1
    w = lx[0] = 0; // no bits decoded yet
    q = null; // ditto
    z = 0; // ditto

    // go through the bit lengths (k already is bits in shortest code)
    for (; k <= g; k++) {
      a = c[k];
      while (a-- > 0) {
        // here i is the Huffman code of length k bits for value p[pidx]
        // make tables up to required level
        while (k > w + lx[1 + h]) {
          w += lx[1 + h]; // add bits already decoded
          h++;

          // compute minimum size table less than or equal to *m bits
          z = (z = g - w) > mm ? mm : z; // upper limit
          if ((f = 1 << (j = k - w)) > a + 1) {
            // try a k-w bit table
            // too few codes for k-w bit table
            f -= a + 1; // deduct codes from patterns left
            xp = k;
            while (++j < z) {
              // try smaller tables up to z bits
              if ((f <<= 1) <= c[++xp]) break; // enough codes to use up j bits
              f -= c[xp]; // else deduct codes from patterns
            }
          }
          if (w + j > el && w < el) j = el - w; // make EOB code end at table
          z = 1 << j; // table entries for j-bit table
          lx[1 + h] = j; // set table size in stack

          // allocate and link in new table
          q = new Array(z);
          for (o = 0; o < z; o++) {
            q[o] = new zip_HuftNode();
          }

          if (tail == null) tail = this.root = new zip_HuftList();
          else tail = tail.next = new zip_HuftList();
          tail.next = null;
          tail.list = q;
          u[h] = q; // table starts after link

          /* connect to last table, if there is one */
          if (h > 0) {
            x[h] = i; // save pattern for backing up
            r.b = lx[h]; // bits to dump before this table
            r.e = 16 + j; // bits in this table
            r.t = q; // pointer to this table
            j = (i & ((1 << w) - 1)) >> (w - lx[h]);
            u[h - 1][j].e = r.e;
            u[h - 1][j].b = r.b;
            u[h - 1][j].n = r.n;
            u[h - 1][j].t = r.t;
          }
        }

        // set up table entry in r
        r.b = k - w;
        if (pidx >= n)
          r.e = 99; // out of values--invalid code
        else if (p[pidx] < s) {
          r.e = p[pidx] < 256 ? 16 : 15; // 256 is end-of-block code
          r.n = p[pidx++]; // simple code is just the value
        } else {
          r.e = e[p[pidx] - s]; // non-simple--look up in lists
          r.n = d[p[pidx++] - s];
        }

        // fill code-like entries with r //
        f = 1 << (k - w);
        for (j = i >> w; j < z; j += f) {
          q[j].e = r.e;
          q[j].b = r.b;
          q[j].n = r.n;
          q[j].t = r.t;
        }

        // backwards increment the k-bit code i
        for (j = 1 << (k - 1); (i & j) != 0; j >>= 1) i ^= j;
        i ^= j;

        // backup over finished tables
        while ((i & ((1 << w) - 1)) != x[h]) {
          w -= lx[h]; // don't need to update q
          h--;
        }
      }
    }

    /* return actual size of base table */
    this.m = lx[1];

    /* Return true (1) if we were given an incomplete table */
    this.status = y != 0 && g != 1 ? 1 : 0;
  } /* end of constructor */
}

/* routines (inflate) */

function zip_GET_BYTE() {
  if (zip_inflate_data.length == zip_inflate_pos) return -1;
  return zip_inflate_data.charCodeAt(zip_inflate_pos++) & 0xff;
}

function zip_NEEDBITS(n) {
  while (zip_bit_len < n) {
    zip_bit_buf |= zip_GET_BYTE() << zip_bit_len;
    zip_bit_len += 8;
  }
}

function zip_GETBITS(n) {
  return zip_bit_buf & zip_MASK_BITS[n];
}

function zip_DUMPBITS(n) {
  zip_bit_buf >>= n;
  zip_bit_len -= n;
}

function zip_inflate_codes(buff, off, size) {
  /* inflate (decompress) the codes in a deflated (compressed) block.
       Return an error code or zero if it all goes ok. */
  var e; // table entry flag/number of extra bits
  var t; // (zip_HuftNode) pointer to table entry
  var n;

  if (size == 0) return 0;

  // inflate the coded data
  n = 0;
  for (;;) {
    // do until end of block
    zip_NEEDBITS(zip_bl);
    t = zip_tl.list[zip_GETBITS(zip_bl)];
    e = t.e;
    while (e > 16) {
      if (e == 99) return -1;
      zip_DUMPBITS(t.b);
      e -= 16;
      zip_NEEDBITS(e);
      t = t.t[zip_GETBITS(e)];
      e = t.e;
    }
    zip_DUMPBITS(t.b);

    if (e == 16) {
      // then it's a literal
      zip_wp &= zip_WSIZE - 1;
      buff[off + n++] = zip_slide[zip_wp++] = t.n;
      if (n == size) return size;
      continue;
    }

    // exit if end of block
    if (e == 15) break;

    // it's an EOB or a length

    // get length of block to copy
    zip_NEEDBITS(e);
    zip_copy_leng = t.n + zip_GETBITS(e);
    zip_DUMPBITS(e);

    // decode distance of block to copy
    zip_NEEDBITS(zip_bd);
    t = zip_td.list[zip_GETBITS(zip_bd)];
    e = t.e;

    while (e > 16) {
      if (e == 99) return -1;
      zip_DUMPBITS(t.b);
      e -= 16;
      zip_NEEDBITS(e);
      t = t.t[zip_GETBITS(e)];
      e = t.e;
    }
    zip_DUMPBITS(t.b);
    zip_NEEDBITS(e);
    zip_copy_dist = zip_wp - t.n - zip_GETBITS(e);
    zip_DUMPBITS(e);

    // do the copy
    while (zip_copy_leng > 0 && n < size) {
      zip_copy_leng--;
      zip_copy_dist &= zip_WSIZE - 1;
      zip_wp &= zip_WSIZE - 1;
      buff[off + n++] = zip_slide[zip_wp++] = zip_slide[zip_copy_dist++];
    }

    if (n == size) return size;
  }

  zip_method = -1; // done
  return n;
}

function zip_inflate_stored(buff, off, size) {
  /* "decompress" an inflated type 0 (stored) block. */
  var n;

  // go to byte boundary
  n = zip_bit_len & 7;
  zip_DUMPBITS(n);

  // get the length and its complement
  zip_NEEDBITS(16);
  n = zip_GETBITS(16);
  zip_DUMPBITS(16);
  zip_NEEDBITS(16);
  if (n != (~zip_bit_buf & 0xffff)) return -1; // error in compressed data
  zip_DUMPBITS(16);

  // read and output the compressed data
  zip_copy_leng = n;

  n = 0;
  while (zip_copy_leng > 0 && n < size) {
    zip_copy_leng--;
    zip_wp &= zip_WSIZE - 1;
    zip_NEEDBITS(8);
    buff[off + n++] = zip_slide[zip_wp++] = zip_GETBITS(8);
    zip_DUMPBITS(8);
  }

  if (zip_copy_leng == 0) zip_method = -1; // done
  return n;
}

function zip_inflate_fixed(buff, off, size) {
  /* decompress an inflated type 1 (fixed Huffman codes) block.  We should
       either replace this with a custom decoder, or at least precompute the
       Huffman tables. */

  // if first time, set up tables for fixed blocks
  if (zip_fixed_tl == null) {
    var i; // temporary variable
    var l = new Array(288); // length list for huft_build
    var h; // zip_HuftBuild

    // literal table
    for (i = 0; i < 144; i++) l[i] = 8;
    for (; i < 256; i++) l[i] = 9;
    for (; i < 280; i++) l[i] = 7;
    for (
      ;
      i < 288;
      i++ // make a complete, but wrong code set
    )
      l[i] = 8;
    zip_fixed_bl = 7;

    h = new zip_HuftBuild(l, 288, 257, zip_cplens, zip_cplext, zip_fixed_bl);
    if (h.status != 0) {
      alert('HufBuild error: ' + h.status);
      return -1;
    }
    zip_fixed_tl = h.root;
    zip_fixed_bl = h.m;

    // distance table
    for (
      i = 0;
      i < 30;
      i++ // make an incomplete code set
    )
      l[i] = 5;
    zip_fixed_bd = 5;

    h = new zip_HuftBuild(l, 30, 0, zip_cpdist, zip_cpdext, zip_fixed_bd);
    if (h.status > 1) {
      zip_fixed_tl = null;
      alert('HufBuild error: ' + h.status);
      return -1;
    }
    zip_fixed_td = h.root;
    zip_fixed_bd = h.m;
  }

  zip_tl = zip_fixed_tl;
  zip_td = zip_fixed_td;
  zip_bl = zip_fixed_bl;
  zip_bd = zip_fixed_bd;
  return zip_inflate_codes(buff, off, size);
}

function zip_inflate_dynamic(buff, off, size) {
  // decompress an inflated type 2 (dynamic Huffman codes) block.
  var i; // temporary variables
  var j;
  var l; // last length
  var n; // number of lengths to get
  var t; // (zip_HuftNode) literal/length code table
  var nb; // number of bit length codes
  var nl; // number of literal/length codes
  var nd; // number of distance codes
  var ll = new Array(286 + 30); // literal/length and distance code lengths
  var h; // (zip_HuftBuild)

  for (i = 0; i < ll.length; i++) ll[i] = 0;

  // read in table lengths
  zip_NEEDBITS(5);
  nl = 257 + zip_GETBITS(5); // number of literal/length codes
  zip_DUMPBITS(5);
  zip_NEEDBITS(5);
  nd = 1 + zip_GETBITS(5); // number of distance codes
  zip_DUMPBITS(5);
  zip_NEEDBITS(4);
  nb = 4 + zip_GETBITS(4); // number of bit length codes
  zip_DUMPBITS(4);
  if (nl > 286 || nd > 30) return -1; // bad lengths

  // read in bit-length-code lengths
  for (j = 0; j < nb; j++) {
    zip_NEEDBITS(3);
    ll[zip_border[j]] = zip_GETBITS(3);
    zip_DUMPBITS(3);
  }
  for (; j < 19; j++) ll[zip_border[j]] = 0;

  // build decoding table for trees--single level, 7 bit lookup
  zip_bl = 7;
  h = new zip_HuftBuild(ll, 19, 19, null, null, zip_bl);
  if (h.status != 0) return -1; // incomplete code set

  zip_tl = h.root;
  zip_bl = h.m;

  // read in literal and distance code lengths
  n = nl + nd;
  i = l = 0;
  while (i < n) {
    zip_NEEDBITS(zip_bl);
    t = zip_tl.list[zip_GETBITS(zip_bl)];
    j = t.b;
    zip_DUMPBITS(j);
    j = t.n;
    if (j < 16)
      // length of code in bits (0..15)
      ll[i++] = l = j; // save last length in l
    else if (j == 16) {
      // repeat last length 3 to 6 times
      zip_NEEDBITS(2);
      j = 3 + zip_GETBITS(2);
      zip_DUMPBITS(2);
      if (i + j > n) return -1;
      while (j-- > 0) ll[i++] = l;
    } else if (j == 17) {
      // 3 to 10 zero length codes
      zip_NEEDBITS(3);
      j = 3 + zip_GETBITS(3);
      zip_DUMPBITS(3);
      if (i + j > n) return -1;
      while (j-- > 0) ll[i++] = 0;
      l = 0;
    } else {
      // j == 18: 11 to 138 zero length codes
      zip_NEEDBITS(7);
      j = 11 + zip_GETBITS(7);
      zip_DUMPBITS(7);
      if (i + j > n) return -1;
      while (j-- > 0) ll[i++] = 0;
      l = 0;
    }
  }

  // build the decoding tables for literal/length and distance codes
  zip_bl = zip_lbits;
  h = new zip_HuftBuild(ll, nl, 257, zip_cplens, zip_cplext, zip_bl);
  if (zip_bl == 0)
    // no literals or lengths
    h.status = 1;
  if (h.status != 0) {
    if (h.status == 1); // **incomplete literal tree**
    return -1; // incomplete code set
  }
  zip_tl = h.root;
  zip_bl = h.m;

  for (i = 0; i < nd; i++) ll[i] = ll[i + nl];
  zip_bd = zip_dbits;
  h = new zip_HuftBuild(ll, nd, 0, zip_cpdist, zip_cpdext, zip_bd);
  zip_td = h.root;
  zip_bd = h.m;

  if (zip_bd == 0 && nl > 257) {
    // lengths but no distances
    // **incomplete distance tree**
    return -1;
  }

  if (h.status == 1) {
    // **incomplete distance tree**
  }
  if (h.status != 0) return -1;

  // decompress until an end-of-block code
  return zip_inflate_codes(buff, off, size);
}

function zip_inflate_start() {
  var i;

  if (zip_slide == null) zip_slide = new Array(2 * zip_WSIZE);
  zip_wp = 0;
  zip_bit_buf = 0;
  zip_bit_len = 0;
  zip_method = -1;
  zip_eof = false;
  zip_copy_leng = zip_copy_dist = 0;
  zip_tl = null;
}

function zip_inflate_internal(buff, off, size) {
  // decompress an inflated entry
  var n, i;

  n = 0;
  while (n < size) {
    if (zip_eof && zip_method == -1) return n;

    if (zip_copy_leng > 0) {
      if (zip_method != zip_STORED_BLOCK) {
        // STATIC_TREES or DYN_TREES
        while (zip_copy_leng > 0 && n < size) {
          zip_copy_leng--;
          zip_copy_dist &= zip_WSIZE - 1;
          zip_wp &= zip_WSIZE - 1;
          buff[off + n++] = zip_slide[zip_wp++] = zip_slide[zip_copy_dist++];
        }
      } else {
        while (zip_copy_leng > 0 && n < size) {
          zip_copy_leng--;
          zip_wp &= zip_WSIZE - 1;
          zip_NEEDBITS(8);
          buff[off + n++] = zip_slide[zip_wp++] = zip_GETBITS(8);
          zip_DUMPBITS(8);
        }
        if (zip_copy_leng == 0) zip_method = -1; // done
      }
      if (n == size) return n;
    }

    if (zip_method == -1) {
      if (zip_eof) break;

      // read in last block bit
      zip_NEEDBITS(1);
      if (zip_GETBITS(1) != 0) zip_eof = true;
      zip_DUMPBITS(1);

      // read in block type
      zip_NEEDBITS(2);
      zip_method = zip_GETBITS(2);
      zip_DUMPBITS(2);
      zip_tl = null;
      zip_copy_leng = 0;
    }

    switch (zip_method) {
      case 0: // zip_STORED_BLOCK
        i = zip_inflate_stored(buff, off + n, size - n);
        break;

      case 1: // zip_STATIC_TREES
        if (zip_tl != null) i = zip_inflate_codes(buff, off + n, size - n);
        else i = zip_inflate_fixed(buff, off + n, size - n);
        break;

      case 2: // zip_DYN_TREES
        if (zip_tl != null) i = zip_inflate_codes(buff, off + n, size - n);
        else i = zip_inflate_dynamic(buff, off + n, size - n);
        break;

      default: // error
        i = -1;
        break;
    }

    if (i == -1) {
      if (zip_eof) return 0;
      return -1;
    }
    n += i;
  }
  return n;
}

function zip_inflate(str) {
  var out, buff;
  var i, j;

  str = substr(2, str.length - 4);

  zip_inflate_start();
  zip_inflate_data = str;
  zip_inflate_pos = 0;
  var last_zip_inflate_pos = -1;

  buff = new Array(1024);
  out = '';
  while (
    (i = zip_inflate_internal(buff, 0, buff.length)) > 0 &&
    last_zip_inflate_pos != zip_inflate_pos
  ) {
    last_zip_inflate_pos = zip_inflate_pos;
    for (j = 0; j < i; j++) out += String.fromCharCode(buff[j]);
  }
  if ((i = -1)) alert(i);

  zip_inflate_data = null; // G.C.
  return out;
}
