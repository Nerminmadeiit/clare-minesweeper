# Claré — The Minesweeper Edition

A Minesweeper game built with HTML, CSS and vanilla JavaScript, in the visual identity of my brand Claré.

**No backend is needed.** Players and best times are saved in the browser with `localStorage`.

## How to open the game

Either:

- **Double-click `index.html`** to open it in your browser (Chrome, Edge, Firefox or Safari), or
- in VS Code, right-click `index.html` and choose **Open with Live Server** (if you have that extension).

You don't need to install anything, and there's no `npm install` or server to start.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure |
| `style.css` | Visual design (Claré colours, crystal squares, layout) |
| `script.js` | All the JavaScript: the game, the timer, players and best times |
| `assets/` | Claré logo and the mine and flag icons |
| `TECHNICAL_EXPLANATION.md` | Technical explanation (in Danish) |

## How to play

- Click a square to open it. The first click is always safe.
- A number shows how many of the 8 squares around it are mines.
- Right-click, or press **F**, to place or remove a flag. On a touch screen, press and hold.
- Arrow keys move between squares; Enter opens a square.
- Open every square that isn't a mine before the time runs out.

## About saved data

`localStorage` saves data **only in the browser you use, on the same website address**.

- Opening the game in another browser or on another computer starts with no players.
- Opening `index.html` directly and opening it through Live Server count as two different addresses, so they each have their own players.
- Clearing the browser's data deletes the saved players.
