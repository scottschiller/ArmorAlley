/**
 * "Ascii Table 3" styles
 * https://github.com/AllMightySauron/ascii-table3/blob/main/ascii-table3.styles.json
 */
const styles = [
  {
    name: 'none',
    borders: {
      top: {
        left: '',
        center: ' ',
        right: '',
        colSeparator: ' '
      },
      middle: {
        left: '',
        center: ' ',
        right: '',
        colSeparator: ' '
      },
      bottom: {
        left: '',
        center: ' ',
        right: '',
        colSeparator: ' '
      },
      data: {
        left: '',
        center: ' ',
        right: '',
        colSeparator: ' '
      }
    }
  },
  {
    name: 'compact',
    // NOTE: edited to use unicode `─` vs. dash `-` for cleaner line delineation.
    borders: {
      top: {
        left: '',
        center: '─',
        right: '',
        colSeparator: '─'
      },
      middle: {
        left: '',
        center: '─',
        right: '',
        colSeparator: ' '
      },
      bottom: {
        left: '',
        center: '',
        right: '',
        colSeparator: ''
      },
      data: {
        left: '',
        center: ' ',
        right: '',
        colSeparator: ' '
      }
    }
  },
  {
    name: 'ramac',
    borders: {
      top: {
        left: '+',
        center: '-',
        right: '+',
        colSeparator: '+'
      },
      middle: {
        left: '+',
        center: '-',
        right: '+',
        colSeparator: '+'
      },
      bottom: {
        left: '+',
        center: '-',
        right: '+',
        colSeparator: '+'
      },
      data: {
        left: '|',
        center: ' ',
        right: '|',
        colSeparator: '|'
      }
    }
  },
  {
    name: 'ascii-table',
    borders: {
      top: {
        left: '.',
        center: '-',
        right: '.',
        colSeparator: '-'
      },
      middle: {
        left: '|',
        center: '-',
        right: '|',
        colSeparator: '-'
      },
      bottom: {
        left: '.',
        center: '-',
        right: '.',
        colSeparator: '-'
      },
      data: {
        left: '|',
        center: ' ',
        right: '|',
        colSeparator: '|'
      }
    }
  },
  {
    name: 'ascii-reStructuredText',
    borders: {
      top: {
        left: '+',
        center: '-',
        right: '+',
        colSeparator: '+'
      },
      middle: {
        left: '+',
        center: '=',
        right: '+',
        colSeparator: '+'
      },
      bottom: {
        left: '+',
        center: '-',
        right: '+',
        colSeparator: '+'
      },
      data: {
        left: '|',
        center: ' ',
        right: '|',
        colSeparator: '|'
      }
    }
  },
  {
    name: 'ascii-reStructuredText-simple',
    borders: {
      top: {
        left: '=',
        center: '=',
        right: '=',
        colSeparator: ' '
      },
      middle: {
        left: '=',
        center: '=',
        right: '=',
        colSeparator: ' '
      },
      bottom: {
        left: '=',
        center: '=',
        right: '=',
        colSeparator: ' '
      },
      data: {
        left: ' ',
        center: ' ',
        right: ' ',
        colSeparator: ' '
      }
    }
  },
  {
    name: 'ascii-dots',
    borders: {
      top: {
        left: '.',
        center: '.',
        right: '.',
        colSeparator: '.'
      },
      middle: {
        left: ':',
        center: '.',
        right: ':',
        colSeparator: ':'
      },
      bottom: {
        left: ':',
        center: '.',
        right: ':',
        colSeparator: ':'
      },
      data: {
        left: ':',
        center: ' ',
        right: ':',
        colSeparator: ':'
      }
    }
  },
  {
    name: 'ascii-rounded',
    borders: {
      top: {
        left: '.',
        center: '-',
        right: '.',
        colSeparator: '.'
      },
      middle: {
        left: ':',
        center: '-',
        right: ':',
        colSeparator: '+'
      },
      bottom: {
        left: "'",
        center: '-',
        right: "'",
        colSeparator: "'"
      },
      data: {
        left: '|',
        center: ' ',
        right: '|',
        colSeparator: '|'
      }
    }
  },
  {
    name: 'ascii-clean',
    borders: {
      top: {
        left: '',
        center: '-',
        right: '',
        colSeparator: '|'
      },
      middle: {
        left: '',
        center: '-',
        right: '',
        colSeparator: '|'
      },
      bottom: {
        left: '',
        center: '-',
        right: '',
        colSeparator: '|'
      },
      data: {
        left: '',
        center: ' ',
        right: '',
        colSeparator: '|'
      }
    }
  },
  {
    name: 'ascii-girder',
    borders: {
      top: {
        left: '//',
        center: '=',
        right: '\\\\',
        colSeparator: '[]'
      },
      middle: {
        left: '|]',
        center: '=',
        right: '[|',
        colSeparator: '[]'
      },
      bottom: {
        left: '\\\\',
        center: '=',
        right: '//',
        colSeparator: '[]'
      },
      data: {
        left: '||',
        center: ' ',
        right: '||',
        colSeparator: '||'
      }
    }
  },
  {
    name: 'unicode-single',
    borders: {
      top: {
        left: '┌',
        center: '─',
        right: '┐',
        colSeparator: '┬'
      },
      middle: {
        left: '├',
        center: '─',
        right: '┤',
        colSeparator: '┼'
      },
      bottom: {
        left: '└',
        center: '─',
        right: '┘',
        colSeparator: '┴'
      },
      data: {
        left: '│',
        center: ' ',
        right: '│',
        colSeparator: '│'
      }
    }
  },
  {
    name: 'unicode-double',
    borders: {
      top: {
        left: '╔',
        center: '═',
        right: '╗',
        colSeparator: '╦'
      },
      middle: {
        left: '╠',
        center: '═',
        right: '╣',
        colSeparator: '╬'
      },
      bottom: {
        left: '╚',
        center: '═',
        right: '╝',
        colSeparator: '╩'
      },
      data: {
        left: '║',
        center: ' ',
        right: '║',
        colSeparator: '║'
      }
    }
  },
  {
    name: 'unicode-mix',
    borders: {
      top: {
        left: '╔',
        center: '═',
        right: '╗',
        colSeparator: '╤'
      },
      middle: {
        left: '╟',
        center: '─',
        right: '╢',
        colSeparator: '┼'
      },
      bottom: {
        left: '╚',
        center: '═',
        right: '╝',
        colSeparator: '╧'
      },
      data: {
        left: '║',
        center: ' ',
        right: '║',
        colSeparator: '│'
      }
    }
  },
  {
    name: 'unicode-round',
    borders: {
      top: {
        left: '╭',
        center: '─',
        right: '╮',
        colSeparator: '┬'
      },
      middle: {
        left: '├',
        center: '─',
        right: '┤',
        colSeparator: '┼'
      },
      bottom: {
        left: '╰',
        center: '─',
        right: '╯',
        colSeparator: '┴'
      },
      data: {
        left: '│',
        center: ' ',
        right: '│',
        colSeparator: '│'
      }
    }
  },
  {
    name: 'github-markdown',
    borders: {
      top: {
        left: '',
        center: '',
        right: '',
        colSeparator: ''
      },
      middle: {
        left: '|',
        center: '-',
        right: '|',
        colSeparator: '|'
      },
      bottom: {
        left: '',
        center: '',
        right: '',
        colSeparator: ''
      },
      data: {
        left: '|',
        center: ' ',
        right: '|',
        colSeparator: '|'
      }
    }
  },
  {
    name: 'reddit-markdown',
    borders: {
      top: {
        left: '',
        center: ' ',
        right: '',
        colSeparator: ' '
      },
      middle: {
        left: '',
        center: '-',
        right: '',
        colSeparator: '|'
      },
      bottom: {
        left: '',
        center: '',
        right: '',
        colSeparator: ''
      },
      data: {
        left: '',
        center: ' ',
        right: '',
        colSeparator: '|'
      }
    }
  }
];

export { styles };