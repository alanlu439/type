# Type

Type is a modern, simple 3D typewriter simulator. It lets visitors type normally while their words appear as uneven ink on a live paper texture inside a detailed Three.js typewriter with animated keys, striking typebars, and browser-native sound effects.

## Run Locally

This is a static website. Open `index.html` directly, or serve the folder:

```sh
python3 -m http.server 5173
```

Then visit `http://localhost:5173`.

## Features

- Live paper rendering from a real text input
- Detailed 3D typewriter with visible ribbon spools, platen, keys, and typebars
- Typebar arms that punch toward the paper while typing
- PDF export of the current page
- Ink and paper tone controls
- Reset controls
- Sound on/off with key, return, delete, and bell effects
- One-page responsive WebGL typewriter workspace
