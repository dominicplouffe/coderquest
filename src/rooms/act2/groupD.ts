import type { RoomDef } from '../../engine/types';
import { deadlock } from './deadlock';
import { bridge } from './bridge';
import { dragon } from './dragon';
import { core } from './core';

// Act II, part 2: inside the Monolith (Deadlock, Null Void, Dragon's Lair, Core).
export const ROOMS_D: RoomDef[] = [deadlock, bridge, dragon, core];
