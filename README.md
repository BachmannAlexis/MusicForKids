# MusicForKids 🎶

A playful web app that helps children (about 4–10 years old) learn **solfège** — Do, Ré, Mi, Fa, Sol, La, Si — and the basics of music.
It runs in any modern browser, on tablets, phones and computers, with no installation and no account.
It is designed phone-first: every game fits on one screen (portrait or landscape) with no scrolling, and it can be added to the home screen like an app (it has a web app manifest and icons).

## Activities

| | Activity | What children learn |
|---|---|---|
| 🎹 | **Discover** | Play a colorful xylophone or a piano with black keys; each note shows its name and its place on the staff, with ♯ for black keys. |
| 👂 | **Ears** | Hear a note and find its name (ear training), in 3 levels: Do-Mi-Sol → Do…Sol → full scale. |
| 🎼 | **Read** | Read a note on the treble staff and name it, in the same 3 levels. |
| 🪜 | **Scales** (Gammes) | Major, natural minor, harmonic minor and melodic minor scales starting on any of the 12 notes, correctly spelled (Ré majeur: Fa♯ Do♯; Sol♯ mineur harmonique: Fa♯♯). Melodic minor goes up with a raised 6th and 7th and comes back down as the natural minor. Shows the key signature, the scale on the staff and the tones (T) and semitones (½) between notes; listen to it, then play it on the piano for a ⭐. |
| 🧭 | **Modes** | The seven modes (ionien, dorien, phrygien, lydien, mixolydien, éolien, locrien), plus harmonic and melodic minor (on La in Do, with their raised notes ringed), either on the white keys in Do (Ré dorien, Mi phrygien…) or all from the same note to compare them. Each shows its parent major scale, its mood, its tones and semitones, and rings the note that gives it its color (the bright sixth of dorien, the raised fourth of lydien…); listen to it, then play it for a ⭐. |
| 🎯 | **Intervals** | Explore every interval from the minor second to the octave above any note (with the number of semitones), then 4 games: third/fifth/octave in Do, second to octave in Do, major/minor/perfect from any note, and by ear only. |
| 🎹 | **Chords** (Accords) | The seven chords of any major or minor key (I, ii, iii, IV, V, vi, vii°), each shown on the staff and keyboard, plus the I–IV–V–I cadence; a chord builder (major, minor, diminished, augmented on any note, explained as stacked thirds); 4 games: major or minor, four kinds of chords, by ear only, and degrees in Do. |
| 🎡 | **Circle of fifths** (Cycle des quintes) | Three rings: the 12 major keys, their relative minors and the diminished chords. Pick a key and its seven chords light up in their own colors (IV I V outside, ii vi iii in the middle, vii° inside) while the circle turns the key to the top (or stays still with the lock). Two rows of degree buttons (I ii iii IV V vi vii° and i ii° III iv v VI VII) play each chord and show it on the staff in the centre, with the key signature and relative key. 3 games: read a key signature and find the major key (sharps, then flats), or the minor key. |
| 🥁 | **Rhythms** (Rythmes) | The note values and rests (ronde, blanche, noire, croches, pointées, soupir…) with their beats; *Tap the rhythm*: after a count-in, tap a 4/4 bar on the drum and see each note graded on time / close / missed; *Which rhythm?*: hear a rhythm and pick its notation. 4 levels each. |
| 🦜 | **Copy-cat** | Repeat a melody that grows one note at a time (musical memory). 3 lives. |
| 🎵 | **Songs** | Play 13 real songs note by note, guided by the glowing key: the Do Re Mi ladder, Hot Cross Buns, Mary Had a Little Lamb, Twinkle Twinkle (Ah ! vous dirai-je, maman), Au clair de la lune, Frère Jacques, London Bridge, Old MacDonald, Row Your Boat, Lightly Row, Jingle Bells (Vive le vent), Ode to Joy and Happy Birthday. |

Children earn up to 3 ⭐ per game level, one ⭐ per song they finish and one ⭐ per scale or mode they play. Progress is saved in the browser.

### Settings (⚙️)

- **Language:** English or French.
- **Note names:** solfège (Do Re Mi … Si, in both languages) or letters (C D E).
- **Instrument:** xylophone (white notes only) or piano with black keys (Do♯/Ré♭ … La♯/Si♭). Songs that need a black key, like Happy Birthday (Si♭), always use the piano.
- **Sound** on/off, and a button to reset stars.

Each note keeps the same color everywhere (classroom bell / Boomwhacker colors), so children can link color, sound, name and staff position.
On a computer, the keys `A S D F G H J K` (or `1`–`8`) play Do to high Do, and `W E T Y U` play the black keys.

## Run it

It is a static site (HTML, CSS and JavaScript modules, no dependencies). Serve the folder with any web server:

```sh
npm start            # serves on http://localhost:8080
# or: python3 -m http.server 8080
```

Opening `index.html` directly from disk does not work, because browsers block JavaScript modules on `file://`.

It is published at **https://bachmannalexis.github.io/MusicForKids/** by the *Deploy to GitHub Pages* workflow, which runs the tests and deploys on every push to `main` (Settings → Pages → Source: **GitHub Actions**).

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
  logic/            pure game rules and music theory (tested)
  screens/          one module per activity
  ui/               xylophone/piano, staff drawing, icons, helpers
icons/              app icons (home screen)
manifest.webmanifest
tests/
```

### Adding a song

Add an entry to `SONGS` in `js/logic/songs.js` and its title in both languages in `js/i18n.js`.
Melodies are written as `note:beats` tokens (beats default to 1), with `|` between phrases, using notes from `do` to `do2` (high Do). Black keys are written as sharps (`do#`, `re#`, `fa#`, `sol#`, `la#`) or flats (`reb`, `mib`, `solb`, `lab`, `sib`):

```js
{ id: 'mysong', emoji: '🐦', melody: 'do re mi do | mi fa sol:2' }
```
