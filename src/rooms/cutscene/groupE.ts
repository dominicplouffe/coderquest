import type { RoomDef } from '../../engine/types';
import { nocGreen } from './noc_green';
import { conference } from './conference';
import { epilogue } from './epilogue';

// Rooms in this group are registered here: the ending's cutscene rooms.
export const ROOMS_E: RoomDef[] = [nocGreen, conference, epilogue];
