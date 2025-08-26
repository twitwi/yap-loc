import gpxParser, { type Point, type Track } from './gpxparser'
import unilabs from 'kd-tree-javascript'

export const maxRed = (a: number, b: number) => Math.max(a, b)
export const minRed = (a: number, b: number) => Math.min(a, b)
export const argFact = (compareFn: (a: number[], b:number[])=>number[]) => (array:number[]) => array.map((el, idx) => [el, idx]).reduce(compareFn)[1]
export const argMax = argFact((min:number[], el:number[]) => (el[0] > min[0] ? el : min))
export const argMin = argFact((max:number[], el:number[]) => (el[0] < max[0] ? el : max))

export type KdPoint = Point & { ind: number }
export type KdTree = unilabs.kdTree<KdPoint>
const __gpxParserTool = new gpxParser() as unknown as { calcDistanceBetween: (a: Point, b: Point) => number}
export function distance(a: Point, b: Point) {
  return __gpxParserTool.calcDistanceBetween(a, b)
}
export function makeKdTreeFromTrack(t: Track) {
  const withIndex = t.points.map((p, ind) => ({...p, ind }))
  return new unilabs.kdTree(withIndex, distance, ['lat', 'lon'])
}

export function representerNearestPointsInTrack(p: {lat: number, lon: number}, tree: KdTree, factor: number, noiseInMeters: number) {
  const [[, dNearest]] = tree.nearest(p as KdPoint, 1)
  const thr = noiseInMeters + factor * dNearest
  const res = []
  const allClose = tree.nearest(p as KdPoint, 100, thr).sort((a, b) => a[0].ind - b[0].ind)
  let prevInd = -999
  let lastClosestInd = -999
  let lastClosestDist = undefined
  for (let i = 0; i < 1 + allClose.length; i++) {
    const ind = allClose[i]?.[0]?.ind
    if (i === 0) {
      // first point
      lastClosestInd = ind
      lastClosestDist = allClose[i][1]
    } else if (ind !== prevInd + 1) { // includes undefined at the end
      // end of group
      res.push(lastClosestInd)
      lastClosestInd = ind
      lastClosestDist = allClose[i]?.[1]
    } else {
      // continuing a group
      const dist = allClose[i][1]
      if (dist < lastClosestDist!) {
        lastClosestInd = ind
        lastClosestDist = dist
      }
    }
    prevInd = ind
  }
  return res
}

export function computeCumulatedDPlus(track: Track & { cumulatedDPlus?: number[] }) {
  track.cumulatedDPlus = [0]
  let i = 1
  let p_prev = track.points[i - 1]
  while (track.points[i - 1].ele === null) {
    track.cumulatedDPlus.push(0)
    i++
  }
  p_prev = track.points[i - 1]
  let last_ele = p_prev.ele
  const STEP = 9 // flat unless at least STEP meters from current plateau
  // poor man's no-backtrack smoothing
  for (; i < track.points.length; i++) {
    const p = track.points[i]

    if (p.ele == null) {
      track.cumulatedDPlus.push(track.cumulatedDPlus[i - 1])
      continue
    }
    if (p.ele > last_ele + STEP) {
      track.cumulatedDPlus.push(track.cumulatedDPlus[i - 1] + p.ele - last_ele)
      last_ele = p.ele
    } else {
      if (p.ele < last_ele - STEP) {
        track.cumulatedDPlus.push(track.cumulatedDPlus[i - 1])
        last_ele = p.ele
      } else {
        track.cumulatedDPlus.push(track.cumulatedDPlus[i - 1])
      }
    }
  }
  return track.cumulatedDPlus
}
