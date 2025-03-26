/**
 * Colorize.js adds ANSI 16-color codes and XTERM256 colors using span tags
 * Used internally by other modules, such as ScrollView.js
 */

import { colors256 } from './colors256.js';

export class Colorize {
  constructor() {
    this.ansi = {
      30: '#000', // black
      '1;30': '#6E6E6E', // bright black
      31: '#bf1b00', // red
      '1;31': '#ff193f', // bright red
      32: '#00ac00', // green
      '1;32': '#a1e577', // bright green
      33: '#DAA520', // yellow
      '1;33': '#f3df00', // bright yellow
      34: '#1f68d5', // blue
      '1;34': '#3680ee', // bright blue
      35: '#a501a7', // magenta
      '1;35': '#e100e4', // bright magenta
      36: '#01c8d4', // cyan
      '1;36': '#5bedf6', // bright cyan
      37: '#dbdbdb', // off-white
      '1;37': '#fff; font-weight: bold', // bright white
      39: '#dbdbdb', // default
    };

    this.bgansi = {
      40: 'Black',
      '1;40': 'DimGray',
      41: 'Red',
      '1;41': 'OrangeRed',
      42: 'Green',
      '1;42': 'LightGreen,',
      43: 'GoldenRod',
      '1;43': 'Gold',
      44: 'Blue',
      '1;44': 'LightSkyBlue',
      45: 'DarkOrchid',
      '1;45': 'Magenta',
      46: 'Cyan',
      '1;46': 'LightCyan',
      47: 'FloralWhite',
      '1;47': 'White',
      49: 'Black',
      '1;49': 'DimGray',
    };

    this.other = {
      '[1m': '<b>',
      '[3m': '<i>',
      '[4m': '<u>',
      '[7m': '' /* invert */,
      '[9m': '<s>',
      '[22m': '</b>',
      '[23m': '</i>',
      '[24m': '</u>',
      '[27m': '' /* uninvert */,
      '[29m': '</s>',
    };

    // Import colors256 array from a separate file for better maintainability
    this.colors256 = colors256;
  }

  prep(text) {
    return text
      .replace(/\033/g, ';')
      .replace(/[m\[]/g, '')
      .split(';')
      .slice(1);
  }

  stripANSI(text) {
    return text.replace(/\033\[[0-9;]+?m/g, '');
  }

  colorize(text) {
    if (text.includes('[7m')) {
      text = text.replace(/(\033\[.*?)3([0-9])(.*?m)\033\[7m/g, '$14$2$3');
    }

    // Wrap the entire text in a span to start
    text = '<span>' + text;

    // Handle resets with proper span closure and opening
    text = text.replace(/\033\[[0;]+m/g, '</span><span>');

    const matches = text.match(
      /(\033\[[0-9;]+m\033\[[0-9;]+m|\033\[[0-9;]+m)/g,
    );
    if (!matches) return text + '</span>'; // Close the initial span if no matches

    const uniqueMatches = [...new Set(matches)].sort(
      (a, b) => b.length - a.length,
    );

    uniqueMatches.forEach((match) => {
      let color = '';
      let bgcolor = '';
      let bold = '';
      let italic = '';
      let xterm = false;

      const codes = this.prep(match);

      // Process style codes
      codes.forEach((code) => {
        if (code === '1') bold = ' font-weight: bold;';
        else if (code === '3') italic = ' font-style: italic;';
      });

      // Process color codes
      codes.forEach((code, index) => {
        if (code === '5') {
          if (codes[index - 1] === '38') {
            color = `color:${this.colors256[parseInt(codes[index + 1])]};`;
            xterm = true;
          } else if (codes[index - 1] === '48') {
            bgcolor = ` background-color:${this.colors256[parseInt(codes[index + 1])]};`;
            xterm = true;
          }
        } else if (!xterm && this.ansi[code]) {
          color = `color:${bold ? this.ansi[`1;${code}`] : this.ansi[code]};`;
        } else if (!xterm && this.bgansi[code]) {
          bgcolor = ` background-color:${bold ? this.bgansi[`1;${code}`] : this.bgansi[code]};`;
        }
      });

      let replacement = '</span><span';
      if (color || bgcolor || bold || italic) {
        replacement += ` style="${color}${bgcolor}${bold}${italic}"`;
      }
      replacement += '>';

      const regex = new RegExp(match.replace(/\[/g, '\\['), 'g');
      text = text.replace(regex, replacement);
    });

    // Replace other formatting codes
    Object.entries(this.other).forEach(([code, replacement]) => {
      const regex = new RegExp(`\u001b\\${code}`, 'g');
      text = text.replace(regex, replacement);
    });

    // Clean up remaining escape sequences
    text = text
      .replace(/\033\[[0-9;]+?m/g, '')
      .replace(/\033\[2J/g, '')
      .replace(/\033\[0c/g, '');

    // Clean up empty spans and close any remaining span
    return (
      text.replace(/<span><\/span>/g, '').replace(/<span>\s*<\/span>/g, '') +
      '</span>'
    );
  }

  process = (text) => {
    if (!text.includes('\u001b')) return text;
    console.log('Processing text with ANSI codes:', text, this.colorize(text));
    return this.colorize(text);
  };
}
