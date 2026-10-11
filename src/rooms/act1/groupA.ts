import type { RoomDef } from '../../engine/types';
import { office } from './office';
import { phil } from './phil';
import { hallway } from './hallway';
import { breakroom } from './breakroom';
import { noc } from './noc';
import { lab } from './lab';

// Act I office floor: the open office, Phil's office, the elevator lobby,
// the break room, the NOC and the R&D lab.
export const ROOMS_A: RoomDef[] = [office, phil, hallway, breakroom, noc, lab];
