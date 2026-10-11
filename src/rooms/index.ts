import type { RoomDef } from '../engine/types';
import { cubicle } from './act1/cubicle';
import { exterior } from './cutscene/exterior';
import { ROOMS_A } from './act1/groupA';
import { ROOMS_B } from './act1/groupB';
import { ROOMS_C } from './act2/groupC';
import { ROOMS_D } from './act2/groupD';
import { ROOMS_E } from './cutscene/groupE';

export const ROOMS: RoomDef[] = [cubicle, exterior, ...ROOMS_A, ...ROOMS_B, ...ROOMS_C, ...ROOMS_D, ...ROOMS_E];
