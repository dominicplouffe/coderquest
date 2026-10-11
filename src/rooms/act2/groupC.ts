import type { RoomDef } from '../../engine/types';
import { boot } from './boot';
import { heap } from './heap';
import { forest } from './forest';
import { stack } from './stack';

// Rooms in this group are registered here.
export const ROOMS_C: RoomDef[] = [boot, heap, forest, stack];
