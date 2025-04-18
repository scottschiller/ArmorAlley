/**
 * "Ascii Table 3" styles - a subset of the original.
 * https://github.com/AllMightySauron/ascii-table3/blob/main/ascii-table3.styles.json
 */
const styles = [
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
  }
];

export { styles };
