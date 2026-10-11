import type { RoomDef } from '../../engine/types';
import { boot } from './boot';
import { heap } from './heap';
import { forest } from './forest';
import { stack } from './stack';
import { loop } from './loop';

// Act II, part 1 (inside the Monolith): Boot Sector, Heap, Spaghetti Forest,
// Stack Overflow Tower, Infinite Loop.
export const ROOMS_C: RoomDef[] = [boot, heap, forest, stack, loop];
