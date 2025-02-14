/**
 * Type definition for table section style.
 * @typedef {Object} SectionStyle
 * @property {string} left          The left border character.
 * @property {string} center        The center border character.
 * @property {string} right         The right border character.
 * @property {string} colSeparator  The column separator character.
 */
 export type SectionStyle = {
    left: string,
    center: string,
    right: string,
    colSeparator: string
}

 /**
  * Borders style definition.
  * @typedef {Object} Borders
  * @property {SectionStyle} top    The style for top section borders (above heading). 
  * @property {SectionStyle} middle The style for middle section borders (between heading and data). 
  * @property {SectionStyle} bottom The style for bottom section borders (below data). 
  * @property {SectionStyle} data   The style for data row borders. 
  */
 export type Borders = {
     top: SectionStyle,
     middle: SectionStyle,
     bottom: SectionStyle,
     data: SectionStyle
 }

/**
 * Type definition for a table style.
 * @typedef {Object} Style
 * @property {string} name Style name.
 * @property {Borders} borders The border styles for each section.
 */
export type Style = {
    name: string,
    borders: Borders
}

/**
 * @typedef {object} ColumnFormatJSON
 * @property {number[]} aligns Alignment setting for each data column. 
 * @property {number[]} widths Width setting for each data column.
 * @property {boolean[]} wrappings Wrapping setting for each data column.
 */
export type ColumnFormatJSON = {
    aligns: number[],
    widths: number[],
    wrappings: boolean[]
}

/**
 * @typedef {object} FormattingJSON
 * @property {number} titleAlign Title alignment setting.
 * @property {ColumnFormatJSON} columns Format settings for each column.
 * @property {boolean} justify Whether to justify table columns.
 */
export type FormattingJSON = {
    titleAlign: number,
    columns: ColumnFormatJSON,
    justify: boolean
}

/**
 * @typedef {object} TableJSON
 * @property {string} title Table title text.
 * @property {string[]} heading Array of table column headings.
 * @property {string[][]} rows  Array of table rows (each row contains an array of data columns).
 * @property {FormattingJSON} formatting Table formatting settings.
 */
export type TableJSON = {
    title: string,
    heading: string[],
    rows: string[][],
    formatting: FormattingJSON
}