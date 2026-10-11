// New game: the opening cinematic.
import type { Game } from '../engine/game';
import { cubicleIntro } from '../rooms/act1/cubicle';

export async function newGame(g: Game) {
  g.set('act', 1);
  g.addItem('phone', true);
  g.set('ext_time', 'dusk');
  g.goto('exterior', [-40, 180, 'right']);
  g.music('title');
  await g.script(async () => {
    await g.wait(1200);
    await g.say("Monolith Systems Inc.\nPurveyors of enterprise software since 1987.\n\nIts entire business runs on THE MONOLITH: a mainframe in the basement that hasn't been rebooted since 1999.", { title: "Coder's Quest", y: 60 });
    g.goto('cubicle', [190, 140, 'up']);
    await cubicleIntro(g);
  });
}
