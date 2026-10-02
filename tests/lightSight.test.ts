/**
 * What of the world's lights the eye can see (round 37, "the torches still glow through the walls and are seen on the
 * outside"): a light behind a wall is dark, a light in the open is whole, a few are looked at a frame, and the share
 * eases rather than pops. The real dungeons are walked from the street: nothing inside one lights the world.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { LIGHTS } from '../src/data/tuning';
import { clearOf, createLightSight, type Sighted } from '../src/render/lightSight';
import { dungeonPieces } from '../src/render/siteMeshes';
import { createWorldLights, type LightSpot } from '../src/render/worldLights';
import { worldUniforms } from '../src/render/worldMaterial';
import type { Collider, CollisionWorld } from '../src/world/colliders';
import { doorwayClear } from '../src/world/dungeonParts';
import { worldLayout } from '../src/world/placements';
import { ground } from '../src/world/terrain';
import { createWorldCollision } from '../src/world/worldCollision';

const world = (...colliders: Collider[]): CollisionWorld => ({ colliders, off: new Set(), ground: () => -100, contain: () => undefined });
/** A wall a metre thick across the way, from x = -10 to 10 and z = 4 to 5. */
const WALL: Collider = { kind: 'box', min: { x: -10, y: -5, z: 4 }, max: { x: 10, y: 8, z: 5 } };
const lightAt = (x: number, y: number, z: number, kind = 'torch'): Sighted => ({ s: { x, y, z, kind }, v: 1 });
const eye = { x: 0, y: 1.7, z: 0 };
const { perFrame, rise, fall } = LIGHTS.sight;

/** Runs `frames` frames of `seconds`, from `time`: returns the time reached. */
function run(sight: ReturnType<typeof createLightSight>, near: readonly Sighted[], at: { x: number; y: number; z: number }, from: number, seconds: number): number {
  const frames = Math.round(seconds * 60);
  for (let i = 1; i <= frames; i++) sight.update(near, at, from + i / 60);
  return from + frames / 60;
}

describe('what the eye can see of a light', () => {
  it('a light behind a wall is dark, one before it whole', () => {
    const near = [lightAt(0, 2, 8), lightAt(2, 2, 2)];
    const sight = createLightSight(() => world(WALL));
    run(sight, near, eye, 0, 1);
    expect(near[0].v).toBe(0);
    expect(near[1].v).toBe(1);
  });

  it('a torch a hand in front of the wall it is on shows from that side and not from the other; one buried in the wall (the dungeons had them) shows from neither', () => {
    const w = world(WALL);
    const flame = { x: 0, y: 2.2, z: 3.67 }; // the room's side: a third of a metre off the wall's face
    expect(clearOf(w, { x: 0, y: 1.7, z: -3 }, flame, LIGHTS.sight.pull, LIGHTS.sight.lift)).toBe(true);
    expect(clearOf(w, { x: 0, y: 1.7, z: 12 }, { x: 0, y: 2.2, z: 5.33 }, LIGHTS.sight.pull, LIGHTS.sight.lift)).toBe(true); // the other side's own
    expect(clearOf(w, { x: 0, y: 1.7, z: 12 }, flame, LIGHTS.sight.pull, LIGHTS.sight.lift)).toBe(false); // through the wall
    const buried = { x: 0, y: 2.2, z: 4.17 }; // the case the dungeons had: the flame inside the face it hangs on
    expect(clearOf(w, { x: 0, y: 1.7, z: -3 }, buried, LIGHTS.sight.pull, LIGHTS.sight.lift)).toBe(false);
    expect(clearOf(w, { x: 0, y: 1.7, z: 12 }, buried, LIGHTS.sight.pull, LIGHTS.sight.lift)).toBe(false);
  });

  it('a fire above its ring of stones shows over them', () => {
    const ring = world({ kind: 'cylinder', x: 5, z: 0, radius: 0.5, y0: 0, y1: 0.6 });
    expect(clearOf(ring, { x: 0, y: 1.7, z: 0 }, { x: 5, y: 0.45, z: 0 }, LIGHTS.sight.pull, LIGHTS.sight.lift)).toBe(true);
    expect(clearOf(ring, { x: 0, y: 0.2, z: 0 }, { x: 5, y: 0.45, z: 0 }, LIGHTS.sight.pull, LIGHTS.sight.lift)).toBe(true); // and from the ground: a flame stands higher than its ring
    expect(clearOf(world({ kind: 'cylinder', x: 5, z: 0, radius: 0.5, y0: 0, y1: 3 }), { x: 0, y: 1.7, z: 0 }, { x: 5, y: 0.45, z: 0 }, LIGHTS.sight.pull, LIGHTS.sight.lift)).toBe(false); // not behind a post
  });

  it('the ground hides a fire too', () => {
    const hill: CollisionWorld = { colliders: [], off: new Set(), ground: (x) => (x > 3 && x < 7 ? 6 : 0), contain: () => undefined };
    const near = [lightAt(10, 1.2, 0, 'fire')];
    run(createLightSight(() => hill), near, { x: 0, y: 1.7, z: 0 }, 0, 1);
    expect(near[0].v).toBe(0);
  });

  it('shows a street lamp, a lit window and an Elder Sign from anywhere, without a ray: the land hides them, and the depth test knows the land', () => {
    const nothing = {} as CollisionWorld; // a ray on it would throw
    const near = [lightAt(3, 2, 3, 'lamp'), lightAt(3, 2, 6, 'window'), lightAt(3, 2, 9, 'sigil')];
    const sight = createLightSight(() => nothing);
    run(sight, near, { x: 40, y: 1.6, z: 40 }, 0, 0.2);
    run(sight, near, { x: -40, y: 1.6, z: 9 }, 0.2, 0.2);
    expect(near.map((n) => n.v)).toEqual([1, 1, 1]);
  });

  it('with no world to look through, every light shows', () => {
    const near = [lightAt(0, 2, 8)];
    run(createLightSight(() => null), near, eye, 0, 0.5);
    expect(near[0].v).toBe(1);
  });

  it('a few lights are looked at a frame, the longest unlooked first, the others dark until their turn', () => {
    const near = Array.from({ length: perFrame * 3 }, (_, i) => lightAt(i * 0.2 - 3, 2, 8)); // all behind the wall, a hundred lights is no different
    const open = Array.from({ length: perFrame * 3 }, (_, i) => lightAt(i * 0.2 - 3, 2, 2)); // all in the open
    const sight = createLightSight(() => world(WALL));
    const all = [...open, ...near];
    sight.update(all, eye, 0.1);
    expect(all.filter((n) => n.v > 0).length).toBeLessThanOrEqual(perFrame); // only those looked at (and found clear) have begun to show
    const t = run(sight, all, eye, 0.1, 0.5);
    expect(t).toBeGreaterThan(0.5);
    expect(open.every((n) => n.v > 0.95)).toBe(true);
    expect(near.every((n) => n.v === 0)).toBe(true);
  });

  it('eases in and out rather than pops: gone within a fifth of a second, whole within a third', () => {
    const near = [lightAt(0, 2, 2)];
    const sight = createLightSight(() => world(WALL));
    let t = run(sight, near, eye, 0, 1);
    expect(near[0].v).toBe(1);
    t = run(sight, near, { x: 0, y: 1.7, z: 12 }, t, 1 / 60); // the eye goes through the wall
    expect(near[0].v).toBeGreaterThan(0.5); // not gone in a frame
    t = run(sight, near, { x: 0, y: 1.7, z: 12 }, t, 0.2);
    expect(near[0].v).toBeLessThan(0.05);
    expect(1 - Math.exp(-fall * 0.2)).toBeGreaterThan(0.95);
    t = run(sight, near, eye, t, 1 / 3);
    expect(near[0].v).toBeGreaterThan(0.95);
    expect(1 - Math.exp(-rise / 3)).toBeGreaterThan(0.95);
  });

  it('an eye pressed into a wall leaves what was seen as it was', () => {
    const near = [lightAt(0, 2, 2)];
    const sight = createLightSight(() => world(WALL));
    const t = run(sight, near, eye, 0, 1);
    expect(near[0].v).toBe(1);
    run(sight, near, { x: 0, y: 1.7, z: 4.5 }, t, 1); // inside the wall: every ray starts in it
    expect(near[0].v).toBe(1);
  });

  it('a light out of reach for a while begins again dark', () => {
    const near = [lightAt(0, 2, 2)];
    const sight = createLightSight(() => world(WALL));
    let t = run(sight, near, eye, 0, 1);
    expect(near[0].v).toBe(1);
    t += LIGHTS.sight.forget + 1; // out of reach: not listed
    sight.update([], eye, t);
    sight.update(near, { x: 0, y: 1.7, z: 12 }, t + 0.001); // back in reach, from behind the wall: not shown before it is looked at
    expect(near[0].v).toBeLessThan(0.05);
  });
});

describe('what a street sees of a dungeon (the torches that glowed through the library and the townhouse walls)', () => {
  /** A dungeon's lights as the scene is given them, its rect, and the world as it stands with its doors shut (their openings stopped: a door is no collider). */
  function dungeon(id: string): { lights: LightSpot[]; rect: { x0: number; z0: number; x1: number; z1: number }; shut: CollisionWorld } {
    const d = worldLayout().dungeons.find((x) => x.layout.def.id === id)!;
    const lights: LightSpot[] = [];
    for (const _ of dungeonPieces(d, lights)) void _;
    return { lights, rect: d.layout.rect, shut: { ...createWorldCollision(), colliders: d.layout.doors.map(doorwayClear) } };
  }
  const lampsLit = (inside: { x0: number; z0: number; x1: number; z1: number }): number => worldUniforms.uLamps.value.filter((l) => l.w > 0 && l.x > inside.x0 && l.x < inside.x1 && l.z > inside.z0 && l.z < inside.z1).length;
  /** Stands at `at` for a second and a half, among `lights`, in `w`. */
  function stand(w: CollisionWorld, lights: readonly LightSpot[], x: number, y: number, z: number): void {
    const sky = createWorldLights(() => w);
    sky.add(1, lights);
    const at = new THREE.Vector3(x, y, z);
    for (let i = 1; i <= 90; i++) sky.update(at, i / 60, null);
  }

  it.each(['library', 'munoz_rooms', 'shunned_cellar'])('lights nothing of %s from the street, whichever side it is looked at from', (id) => {
    const { lights, rect, shut } = dungeon(id);
    expect(lights.filter((l) => l.kind === 'torch').length).toBeGreaterThan(10);
    const mid = { x: (rect.x0 + rect.x1) / 2, z: (rect.z0 + rect.z1) / 2 };
    const spots: [number, number][] = [[mid.x, rect.z0 - 4], [mid.x, rect.z1 + 4], [rect.x0 - 4, mid.z], [rect.x1 + 4, mid.z], [rect.x0 + 20, rect.z0 - 4], [rect.x1 - 20, rect.z1 + 4]];
    for (const [x, z] of spots) {
      stand(shut, lights, x, ground(x, z) + 1.7, z);
      expect(lampsLit(rect), `${id} from ${x.toFixed(0)},${z.toFixed(0)}`).toBe(0);
    }
  }, 30000);

  it('and lights a room to whoever stands in it', () => {
    const { lights, rect, shut } = dungeon('library');
    const room = worldLayout().dungeons.find((x) => x.layout.def.id === 'library')!.layout.rooms[0];
    stand(shut, lights, room.x, ground(room.x, room.z) + 1.7, room.z);
    expect(lampsLit(rect)).toBeGreaterThan(1);
  }, 30000);
});
