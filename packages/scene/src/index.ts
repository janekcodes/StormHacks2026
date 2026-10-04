export const packageName = '@museum/scene'

export { FloorMap, type FloorMapProps, type FloorMapPlayer } from './map/FloorMap'
export { toSvg, fromSvg, PLAN_WIDTH_PX, PLAN_HEIGHT_PX } from './map/projection'
export { sortExhibitsForMap } from './map/sortExhibits'

export { Museum, type MuseumProps } from './Museum'
export { usePlayer, type PlayerState } from './player/usePlayer'
export { detectQuality, settingsFor, type QualityTier, type QualitySettings } from './quality'
export { roomAt, inPoly, roomCentroid, type Room } from './rooms'
export {
  blocked,
  buildCollisionSegments,
  buildObstacles,
  slideMove,
  segDist,
  PLAYER_RADIUS,
  SEG_CLEARANCE
} from './player/collision'

export {
  loadNavMesh,
  findPath,
  findClosestNavPoint,
  findWalkableNavPoint,
  getNavQuery,
  disposeNav,
  type NavPath,
  type NavPoint2
} from './nav/useNav'
export {
  travelTo,
  cancelTravel,
  isTravelling,
  TravelDriver,
  TRAVEL_SPEED_M_S,
  FACE_BLEND_M,
  type TravelOptions
} from './nav/travel'
export {
  setStandpoints,
  getStandpoints,
  exhibitStandPoint,
  roomTarget,
  ROOM_JUMP_ORDER,
  roomJumpLabel,
  type NavTarget,
  type StandpointsData
} from './nav/targets'
export { museum, bindMuseumApi, setMapBuilding, type MuseumNavApi } from './nav/api'
