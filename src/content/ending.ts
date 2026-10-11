// The ending sequence (placeholder until the full cinematic is written).
import type { Game } from '../engine/game';

export async function playEnding(g: Game): Promise<void> {
  await g.say(`THE END.\n\nYour score: ${g.state.score} of 256.`);
  g.toTitle();
}
