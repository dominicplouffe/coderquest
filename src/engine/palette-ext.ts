// Extended palette entries (16+). Scenery sticks to the 16 EGA colors; these
// few extra tones are reserved for character skin and hair so faces read
// naturally at sprite scale.
export const X = {
  skinL: 16,
  skinLs: 17,
  skinM: 18,
  skinMs: 19,
  skinD: 20,
  skinDs: 21,
  hairBrown: 22,
  hairAuburn: 23,
} as const;

export const EXT_RGB: [number, number, number][] = [
  [0xf4, 0xc2, 0x94], // 16 light skin
  [0xd0, 0x92, 0x6c], // 17 light skin shade
  [0xc8, 0x8c, 0x58], // 18 medium skin
  [0x9a, 0x62, 0x3a], // 19 medium skin shade
  [0x8c, 0x58, 0x34], // 20 dark skin
  [0x60, 0x3a, 0x20], // 21 dark skin shade
  [0x4e, 0x2e, 0x16], // 22 dark brown hair
  [0x84, 0x34, 0x10], // 23 auburn hair
];
