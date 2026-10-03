# Seventy Steps

A Lovecraftian open-world soulslike in retro 3D: Doom-style billboarded sprites in PS1-era low-poly
worlds, from Miskatonic University and Arkham down the Seventy Steps into the Dreamlands and out past
the Ultimate Gate. Everything you see and most of what you hear is generated in code; the spec is
[`docs/SPEC.md`](docs/SPEC.md) and every judgment call is logged in [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Run it

```sh
npm install
npm run dev        # in the browser, at http://localhost:5173/
npm run check      # typecheck and the tests (Vitest)
npm run build      # a production build into dist/
npm run desktop    # build, then open it in the desktop shell (Electron): what ships on Steam
npm run icon       # write the icon, drawn in code, to build/icon.png for packaging
```

Routes for testing: `?fresh` (a new game, no title), `?arena` (the combat arena), `?bestiary` (every
creature), `?spawn=<id>`, `?look`, `?debug` (the debug panel).

## Play it

| | Keyboard and mouse | Pad |
| --- | --- | --- |
| Move / look | WASD / the mouse | left / right stick |
| Light, heavy attack | LMB, Shift+LMB | RB, RT |
| Block, parry | RMB, Shift+RMB | LB, LT |
| Dodge (hold: sprint) | Space | B |
| Revolver | F | X |
| Lock on | Q | R3 |
| West's Reagent / Laudanum / lamp oil | R / T / G | Y / D-pad ↓ / D-pad ↑ |
| Rest, talk, act | E | A |
| Map / pause | M / Esc | View / Menu |

Every keyboard action can be rebound under Controls. Prompts name the buttons of whichever device you
used last.

## Saves

Three slots. In the browser they live in its storage; in the desktop shell they are files in the
user's data folder (`saves/`), alongside the settings and the records of endings and achievements,
where Steam Cloud can keep them.

## Credits

See the in-game Credits, [`public/audio/CREDITS.md`](public/audio/CREDITS.md) and
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

Copyright © 2026 DroDigital. All rights reserved. Source code is publicly viewable for portfolio and evaluation purposes only. No permission is granted to copy, redistribute, modify, or commercially use this project.