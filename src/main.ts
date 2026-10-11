import { Game } from './engine/game';
import { AudioSys } from './engine/audio';
import { ITEMS } from './content/items';
import { ROOMS } from './rooms';
import { SONGS } from './content/music';
import { fallback } from './content/defaults';
import { globalRaw, globalVerbs } from './content/globals';
import { showTitle, help, about } from './content/title';
import { newGame } from './content/intro';
import { person } from './art/cast';
import { deathIcon } from './content/icons';
import { duckHint } from './content/hints';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const game = new Game(canvas);
game.hooks = {
  newGame,
  showTitle,
  fallback,
  globalRaw,
  globalVerbs,
  help,
  about,
  deathIcon,
  playerSprite: () => person('dominic'),
  hint: duckHint,
};
game.audio.register(SONGS);
game.registerItems(ITEMS);
game.registerRooms(ROOMS);
game.registerPeople({
  nicholas: ['nicholas', 'nick', 'nic', 'frontend developer', 'frontend dev'],
  mike: ['mike', 'michael', 'salesman', 'sales guy', 'mike from sales'],
  krishna: ['krishna', 'scientist', 'researcher', 'engineer'],
  fahim: ['fahim', 'sre', 'on call engineer', 'ops guy'],
  denis: ['denis', 'dennis', 'sysadmin', 'greybeard', 'graybeard', 'old man', 'old guy'],
  phil: ['phil', 'ceo', 'boss', 'philip', 'phillip'],
  adriana: ['adriana', 'architect', 'lead architect', 'adrianna'],
  aidan: ['aidan', 'aiden', 'intern', 'kid'],
  king: ['king', 'king kernel', 'kernel', 'old king', 'majesty', 'your majesty', 'monarch'],
});
game.ensurePlayer();

// Debug/testing hooks: ?room=xyz&items=a,b&flags=x,y
const params = new URLSearchParams(location.search);
(window as any).game = game;
game.start();
if (params.get('turbo')) game.turbo = Number(params.get('turbo'));
if (params.get('room')) {
  game.modals = [];
  game.newState('');
  game.playing = true;
  game.state.flags.act = Number(params.get('act') ?? 1);
  for (const it of (params.get('items') ?? '').split(',').filter(Boolean)) game.addItem(it, true);
  for (const fl of (params.get('flags') ?? '').split(',').filter(Boolean)) game.set(fl);
  game.goto(params.get('room')!);
}
void AudioSys;
