import type { RoomDef } from '../../engine/types';
import { stairwell } from './stairwell';
import { basement } from './basement';
import { serverroom } from './serverroom';

// Rooms in this group are registered here.
export const ROOMS_B: RoomDef[] = [stairwell, basement, serverroom];
