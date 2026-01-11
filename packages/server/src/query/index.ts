/**
 * Trellis Query Engine - Module Exports
 */

export {
  propertyPathToSQL,
  propertyExistsSQL,
  validatePropertyPath,
  inferSQLValueType,
  type SQLValueType,
} from './property-path.js';

export {
  filterConditionToSQL,
  filterGroupToSQL,
  type SQLFragment,
} from './filters.js';

export {
  sortSpecToSQL,
  sortToSQL,
  getSortColumns,
  getSortDirections,
} from './sorting.js';

export {
  encodeCursor,
  decodeCursor,
  cursorToSQL,
  extractCursor,
  buildPaginationSQL,
  type Cursor,
  type PaginationResult,
} from './pagination.js';

export {
  buildSelectQuery,
  buildGetByIdQuery,
  type BuildQueryOptions,
  type BuiltQuery,
} from './builder.js';
