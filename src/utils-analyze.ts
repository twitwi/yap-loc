import gpxParser, { type Point, type Track } from './gpxparser'

export const argFact = (compareFn: (a: number[], b:number[])=>number[]) => (array:number[]) => array.map((el, idx) => [el, idx]).reduce(compareFn)[1]
export const argMax = argFact((min:number[], el:number[]) => (el[0] > min[0] ? el : min))
export const argMin = argFact((max:number[], el:number[]) => (el[0] < max[0] ? el : max))

const __gpxParserTool = new gpxParser() as unknown as { calcDistanceBetween: (a: Point, b: Point) => number}
export function distance(a: Point, b: Point) {
  return __gpxParserTool.calcDistanceBetween(a, b)
}

export function nearestPointInList(p: Point, points: Point[]) {
  return argMin(points.map((pp) => distance(p, pp)))
}

export function representerNearestPointsInTrack(p: {lat: number, lon: number}, gpxTrack: Track, factor: number, noiseInMeters: number) {
  const points = gpxTrack.points
  const iNearest = nearestPointInList(p as Point, points)
  const thr = noiseInMeters + factor * distance(p as Point, points[iNearest])
  const res = []

  let wasClose = false
  let iClose = -1
  for (let i = 0; i < 1 + points.length; i++) {
    const isClose = i < points.length && distance(p as Point, points[i]) < thr
    if (wasClose !== isClose) {
      if (isClose) {
        iClose = i
      } else {
        res.push(iClose + nearestPointInList(p as Point, points.slice(iClose, i)))
      }
    }
    wasClose = isClose
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
