# MusicForKids 🎶

A playful web app that helps children (about 4–10 years old) learn **solfège** — Do, Ré, Mi, Fa, Sol, La, Si/Ti — and the basics of music.
It runs in any modern browser, on tablets, phones and computers, with no installation and no account.

## Activities

| | Activity | What children learn |
|---|---|---|
| 🎹 | **Discover** | Play a colorful xylophone; each note shows its name and its place on the staff. |
| 👂 | **Ears** | Hear a note and find its name (ear training), in 3 levels: Do-Mi-Sol → Do…Sol → full scale. |
| 🎼 | **Read** | Read a note on the treble staff and name it, in the same 3 levels. |
| 🦜 | **Copy-cat** | Repeat a melody that grows one note at a time (musical memory). 3 lives. |
| 🎵 | **Songs** | Play real songs note by note, guided by the glowing bar: Twinkle Twinkle, Frère Jacques, Au clair de la lune, Mary Had a Little Lamb, Ode to Joy, and the Do Re Mi ladder. |

Children earn up to 3 ⭐ per game level and one ⭐ per song they finish. Progress is saved in the browser.

### Settings (⚙️)

- **Language:** English or French.
- **Note names:** solfège (Do Re Mi, with *Ti* in English and *Si* in French) or letters (C D E).
- **Sound** on/off, and a button to reset stars.

Each note keeps the same color everywhere (classroom bell / Boomwhacker colors), so children can link color, sound, name and staff position.
On a computer, the keys `A S D F G H J K` (or `1`–`8`) play Do to high Do.

## Run it

It is a static site (HTML, CSS and JavaScript modules, no dependencies). Serve the folder with any web server:

```sh
npm start            # serves on http://localhost:8080
# or: python3 -m http.server 8080
```

Opening `index.html` directly from disk does not work, because browsers block JavaScript modules on `file://`.

To publish it, enable **GitHub Pages** for this repository (Settings → Pages → deploy from the `main` branch, root folder).

## Tests

```sh
npm test
```

The game rules (notes, quiz scoring, Copy-cat, song parsing, progress) live in `js/logic/` as pure functions and are tested with Node's built-in test runner.

## Project layout

```
index.html
css/styles.css
js/
  app.js            router, header, settings
  audio.js          Web Audio xylophone synth
  i18n.js           English and French texts
  storage.js        saves settings and stars in localStorage
  logic/            pure game rules (tested)
  screens/          one module per activity
  ui/               xylophone, staff drawing, helpers
tests/
```

### Adding a song

Add an entry to `SONGS` in `js/logic/songs.js` and its title in both languages in `js/i18n.js`.
Melodies are written as `note:beats` tokens (beats default to 1), with `|` between phrases, using notes from `do` to `do2` (high Do):

```js
{ id: 'mysong', emoji: '🐦', melody: 'do re mi do | mi fa sol:2' }
```
