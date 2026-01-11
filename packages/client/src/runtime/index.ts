/**
 * Trellis Block Runtime - Public Exports
 *
 * Re-exports wiring, navigation, and block rendering utilities.
 */

// Wiring
export type {
  BlockEvent,
  EventReceiver,
  NavigationActions,
  WiringConnection,
} from './wiring.js';

export {
  WiringManager,
  createWiringManager,
} from './wiring.js';

// Navigation
export type {
  ParsedRoute,
  RouteSegment,
  RouteMatch,
  NavigationState,
  NavigationListener,
} from './navigation.js';

export {
  parseRoutePattern,
  matchRoute,
  buildPath,
  parseQueryString,
  buildQueryString,
  NavigationManager,
  createNavigationManager,
} from './navigation.js';

// Block Renderer
export type {
  BlockInstance,
  BlockSpecRegistry,
} from './block-renderer.js';

export {
  resolveBlock,
  getVisibleBlocks,
  findBlockById,
  getAllBlockIds,
} from './block-renderer.js';
