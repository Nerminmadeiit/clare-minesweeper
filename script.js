/* =========================================================
   Claré — The Minesweeper Edition
   Al spillets JavaScript i én fil.

   1. Indstillinger og elementer på siden
   2. Spillets tilstand (variabler, der ændrer sig under spillet)
   3. Opbygning af pladen
   4. Selve spillet
   5. Timer
   6. Tegning af pladen på siden
   7. Spillere og bedste tider (gemt i localStorage)
   8. Event listeners (klik, taster, touch)
   9. Opstart
   ========================================================= */

/* ---------- 1. Indstillinger og elementer på siden ---------- */

const ROWS = 8;
const COLS = 8;
const MINE_COUNT = 10;
const WARNING_SECONDS = 10; // nedtællingen bliver ravfarvet i de sidste 10 sekunder
const LONG_PRESS_MS = 500; // hvor længe man skal holde på et felt på mobil for at sætte et flag

// Navnet, vi bruger til at gemme data i localStorage
const PLAYERS_KEY = "clarePlayers";

// Spillet
const boardEl = document.getElementById("board");
const newGameBtn = document.getElementById("new-game-btn");
const timeLimitSelect = document.getElementById("time-limit");
const mineCounterEl = document.getElementById("mine-counter");
const elapsedEl = document.getElementById("elapsed");
const remainingEl = document.getElementById("remaining");
const gameMessageEl = document.getElementById("game-message");
const gameCardEl = document.querySelector(".game-card");

// Spillere
const playerCardEl = document.getElementById("player-card");
const registerForm = document.getElementById("register-form");
const usernameInput = document.getElementById("username");
const existingForm = document.getElementById("existing-form");
const playerSelect = document.getElementById("player-select");
const continueBtn = existingForm.querySelector("button");
const playerMessageEl = document.getElementById("player-message");
const currentPlayerEl = document.getElementById("current-player");
const currentPlayerNameEl = document.getElementById("current-player-name");
const switchPlayerBtn = document.getElementById("switch-player-btn");

// Leaderboard
const leaderboardEl = document.getElementById("leaderboard");
const leaderboardPlayerEl = document.getElementById("leaderboard-player");
const scoreListEl = document.getElementById("score-list");
const leaderboardNoteEl = document.getElementById("leaderboard-note");
const saveStatusEl = document.getElementById("save-status");

/* ---------- 2. Spillets tilstand ---------- */

let board = []; // board[row][col] indeholder ét felt (et objekt)
let minesPlaced = false; // minerne placeres efter det første klik, så det første klik altid er sikkert
let gameOver = false;
let flagsPlaced = 0;

let timerId = null; // id'et fra setInterval, som skal bruges til at stoppe timeren
let startTime = null; // tidspunktet for det første klik, i millisekunder
let elapsedSeconds = 0;

let currentPlayer = null; // navnet på den spiller, der spiller nu

// Til "tryk og hold" på touchskærme
let pressTimer = null;
let isLongPress = false;
let lastTouchTime = 0;

/* ---------- 3. Opbygning af pladen ---------- */

/**
 * Laver en ny 8×8-plade: et array med 8 rækker, der hver har 8 felt-objekter.
 */
function createBoard() {
  const newBoard = [];

  for (let row = 0; row < ROWS; row++) {
    const rowOfSquares = [];

    for (let col = 0; col < COLS; col++) {
      rowOfSquares.push({
        row: row,
        col: col,
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        isExploded: false, // true for den mine, spilleren klikkede på
        adjacentMines: 0, // hvor mange af de 8 naboer der er miner
      });
    }

    newBoard.push(rowOfSquares);
  }

  return newBoard;
}

/**
 * Returnerer en liste med felterne omkring (row, col).
 * Et felt i midten har 8 naboer, et hjørnefelt kun 3,
 * så vi springer positioner over, der ligger uden for pladen.
 */
function getNeighbours(row, col) {
  const neighbours = [];

  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      const isInsideBoard = r >= 0 && r < ROWS && c >= 0 && c < COLS;
      const isTheSquareItself = r === row && c === col;

      if (isInsideBoard && !isTheSquareItself) {
        neighbours.push(board[r][c]);
      }
    }
  }

  return neighbours;
}

/**
 Placerer 10 miner tilfældigt. Det sker efter det første klik, og det
 klikkede felt og felterne omkring det får aldrig en mine. På den måde
 er det første klik altid sikkert og åbner et område.
 */
function placeMines(safeRow, safeCol) {
  let minesAdded = 0;

  while (minesAdded < MINE_COUNT) {
    // Vælg en tilfældig række og kolonne (0–7)
    const row = Math.floor(Math.random() * ROWS);
    const col = Math.floor(Math.random() * COLS);

    const isNearFirstClick =
      Math.abs(row - safeRow) <= 1 && Math.abs(col - safeCol) <= 1;

    // Placér kun en mine, hvis feltet er ledigt og ikke ligger ved det første klik.
    // Ellers prøver løkken bare et nyt tilfældigt felt.
    if (!board[row][col].isMine && !isNearFirstClick) {
      board[row][col].isMine = true;
      minesAdded++;
    }
  }

  countAdjacentMines();
  minesPlaced = true;
}

/**
 * Giver hvert felt sit tal: hvor mange af naboerne der er miner.
 */
function countAdjacentMines() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      let count = 0;

      for (const neighbour of getNeighbours(row, col)) {
        if (neighbour.isMine) {
          count++;
        }
      }

      board[row][col].adjacentMines = count;
    }
  }
}

/* ---------- 4. Selve spillet ---------- */

/**
 Kører, når spilleren klikker på et felt (eller trykker Enter på det).
 */
function handleReveal(row, col) {
  const square = board[row][col];

  // Ignorér klik, når spillet er slut, og klik på åbne felter og flag
  if (gameOver || square.isRevealed || square.isFlagged) {
    return;
  }

  // Spillets første klik: nu placeres minerne, og uret starter
  if (!minesPlaced) {
    placeMines(row, col);
    startTimer();
  }

  if (square.isMine) {
    square.isRevealed = true;
    square.isExploded = true;
    endGame(false, "You hit a mine. Try again?");
    return;
  }

  revealSquare(row, col);

  if (checkWin()) {
    endGame(true);
  } else {
    renderBoard();
  }
}

/**
 Åbner et felt. Hvis feltet ikke har nogen nabominer (et "0"), er der
 intet farligt omkring det, så vi åbner også alle naboerne.
 Funktionen kalder sig selv for hver nabo (det kaldes rekursion),
 så et helt tomt område åbnes med ét klik.
 */
function revealSquare(row, col) {
  const square = board[row][col];

  // Stop her, hvis feltet allerede er åbent eller har et flag.
  // Uden dette tjek ville funktionen kalde sig selv i det uendelige.
  if (square.isRevealed || square.isFlagged) {
    return;
  }

  square.isRevealed = true;

  if (square.adjacentMines === 0) {
    for (const neighbour of getNeighbours(row, col)) {
      revealSquare(neighbour.row, neighbour.col);
    }
  }
}

/**
 * Sætter eller fjerner et flag (højreklik, F-tasten eller tryk og hold).
 */
function toggleFlag(row, col) {
  const square = board[row][col];

  // Flag er kun tilladt på skjulte felter, mens spillet kører
  if (gameOver || square.isRevealed) {
    return;
  }

  if (square.isFlagged) {
    square.isFlagged = false;
    flagsPlaced--;
  } else {
    square.isFlagged = true;
    flagsPlaced++;
  }

  updateMineCounter();
  renderBoard();
}

/**
 Spilleren vinder, når alle felter, der IKKE er miner, er åbnet.
 (Man behøver ikke flag for at vinde.)
 */
function checkWin() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const square = board[row][col];

      // Et sikkert felt er stadig skjult: spillet er ikke vundet endnu
      if (!square.isMine && !square.isRevealed) {
        return false;
      }
    }
  }

  return true;
}

/**
 Afslutter spillet.
 @param {boolean} won     - true, hvis spilleren har ryddet pladen
 @param {string} message  - teksten, der vises, når spilleren har tabt
 */
function endGame(won, message) {
  gameOver = true;
  stopTimer();
  boardEl.classList.add("game-over");

  for (const row of board) {
    for (const square of row) {
      if (won && square.isMine) {
        // En sidste detalje: sæt flag på alle minerne
        square.isFlagged = true;
      }
      if (!won && square.isMine && !square.isFlagged) {
        // Vis spilleren, hvor alle minerne var
        square.isRevealed = true;
      }
    }
  }

  if (won) {
    flagsPlaced = MINE_COUNT;
    updateMineCounter();
    showGameMessage(
      `Board cleared in ${formatTime(elapsedSeconds)}. Beautifully done.`,
      "win",
    );
    saveBestTime(elapsedSeconds);
  } else {
    showGameMessage(message, "lose");
  }

  renderBoard();
}

/**
 Starter et nyt spil med en ny, tom plade.
 */
function newGame() {
  stopTimer();

  board = createBoard();
  minesPlaced = false;
  gameOver = false;
  flagsPlaced = 0;
  startTime = null;
  elapsedSeconds = 0;

  boardEl.classList.remove("game-over");
  updateMineCounter();
  updateTimerDisplay();
  showGameMessage("", "");
  renderBoard();
}

/* ---------- 5. Timer ---------- */

/**
 Laver sekunder om til "mm:ss", for eksempel 75 -> "01:15".
 */
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return (
    String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0")
  );
}

/** Den valgte tidsgrænse i sekunder (menuens værdier er i sekunder). */
function getTimeLimit() {
  return Number(timeLimitSelect.value);
}

/**
 Starter uret. Vi gemmer starttidspunktet og regner hvert sekund den
 forløbne tid ud fra computerens ur i stedet for bare at lægge 1 til.
 Så forbliver tiden korrekt, selv hvis browseren er langsom et øjeblik.
 */
function startTimer() {
  startTime = Date.now();
  timerId = setInterval(tick, 1000);
}

/*Kører hvert sekund, mens et spil er i gang. */
function tick() {
  elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  updateTimerDisplay();

  if (elapsedSeconds >= getTimeLimit()) {
    endGame(false, "Time's up. The ice has closed over.");
  }
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;

  // Tag en sidste, præcis aflæsning af tiden (aldrig mere end tidsgrænsen)
  if (startTime !== null) {
    elapsedSeconds = Math.min(
      Math.floor((Date.now() - startTime) / 1000),
      getTimeLimit(),
    );
    updateTimerDisplay();
  }
}

function updateTimerDisplay() {
  const remaining = Math.max(0, getTimeLimit() - elapsedSeconds);

  elapsedEl.textContent = formatTime(elapsedSeconds);
  remainingEl.textContent = formatTime(remaining);

  // Klassen "warning" gør nedtællingen ravfarvet (se style.css)
  const isAlmostOver = startTime !== null && remaining <= WARNING_SECONDS;
  remainingEl.classList.toggle("warning", isAlmostOver);
}

/* ---------- 6. Tegning af pladen på siden ---------- */

function updateMineCounter() {
  mineCounterEl.textContent = MINE_COUNT - flagsPlaced;
}

function showGameMessage(text, type) {
  gameMessageEl.textContent = text;
  gameMessageEl.className = "game-message " + type;
}

/**
 Tegner pladen ud fra dataene i `board`. Hvert felt bliver en <button>,
 så man også kan nå det med Tab-tasten og trykke på det med Enter.
 CSS-klasserne (revealed, mine, flagged, n1–n8) bestemmer, hvordan det ser ud.
 */
function renderBoard() {
  // Husk, hvilket felt der havde tastaturfokus, så vi kan give det tilbage efter tegningen
  const focusedRow = document.activeElement.dataset.row;
  const focusedCol = document.activeElement.dataset.col;

  boardEl.innerHTML = "";

  for (const row of board) {
    for (const square of row) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cell";
      button.dataset.row = square.row; // bliver til data-row="…" i HTML'en
      button.dataset.col = square.col;
      button.setAttribute("role", "gridcell");

      // En beskrivelse til skærmlæsere, f.eks. "Row 2, column 5, 3 neighbouring mines"
      const position = `Row ${square.row + 1}, column ${square.col + 1}`;
      let label = position + ", hidden";

      if (square.isRevealed && square.isMine) {
        button.classList.add("revealed", "mine");
        if (square.isExploded) {
          button.classList.add("exploded");
        }
        button.textContent = "✸"; // skjules af CSS, som viser assets/mine.svg i stedet
        label = position + ", mine";
      } else if (square.isRevealed) {
        button.classList.add("revealed");
        if (square.adjacentMines > 0) {
          button.classList.add("n" + square.adjacentMines); // farve, f.eks. .n3
          button.textContent = square.adjacentMines;
          label = `${position}, ${square.adjacentMines} neighbouring mines`;
        } else {
          label = position + ", empty";
        }
      } else if (square.isFlagged) {
        button.classList.add("flagged");
        button.textContent = "⚑"; // skjules af CSS, som viser assets/flag.svg i stedet
        label = position + ", flagged";
      }

      button.setAttribute("aria-label", label);
      boardEl.appendChild(button);
    }
  }

  if (focusedRow !== undefined) {
    focusSquare(focusedRow, focusedCol);
  }
}

function focusSquare(row, col) {
  const button = boardEl.querySelector(
    `[data-row="${row}"][data-col="${col}"]`,
  );
  if (button) {
    button.focus();
  }
}

/* ---------- 7. Spillere og bedste tider (localStorage) ----------
   Alle spillere gemmes som én liste under nøglen "clarePlayers":
   [
     { name: "nermin", bestTimes: [ { seconds: 31, date: "2026-11-06T14:05:00.000Z" } ] },
     { name: "anna",   bestTimes: [] }
   ]
   localStorage kan kun gemme tekst, så vi bruger JSON.stringify til at gemme
   listen og JSON.parse til at lave den om til et array igen. */

function loadPlayers() {
  const savedText = localStorage.getItem(PLAYERS_KEY);

  // Allerførste gang er der ikke gemt noget endnu
  if (savedText === null) {
    return [];
  }
  return JSON.parse(savedText);
}

function savePlayers(players) {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
}

/**
 Finder en spiller ud fra navnet. Store og små bogstaver er ligegyldige,
 så "Nermin" og "nermin" er den samme spiller. Returnerer undefined,
 hvis spilleren ikke findes.
 */
function findPlayer(players, name) {
  for (const player of players) {
    if (player.name.toLowerCase() === name.toLowerCase()) {
      return player;
    }
  }
  return undefined;
}

function showPlayerMessage(text) {
  playerMessageEl.textContent = text;
  playerMessageEl.className = "player-message error";
}

/**
 Fylder menuen "Existing player" med alle gemte spillere.
 */
function fillPlayerSelect() {
  const players = loadPlayers();
  playerSelect.innerHTML = "";

  if (players.length === 0) {
    playerSelect.innerHTML = '<option value="">No players yet</option>';
    playerSelect.disabled = true;
    continueBtn.disabled = true;
    return;
  }

  for (const player of players) {
    const option = document.createElement("option");
    option.value = player.name;
    option.textContent = player.name;
    playerSelect.appendChild(option);
  }

  playerSelect.disabled = false;
  continueBtn.disabled = false;
}

/**
 Registrerer en ny spiller fra feltet "New player".
 */
function registerPlayer() {
  const name = usernameInput.value.trim(); // trim() fjerner mellemrum i starten og slutningen
  const players = loadPlayers();

  if (name.length < 3 || name.length > 20) {
    showPlayerMessage("Usernames must be 3–20 characters.");
    return;
  }

  if (findPlayer(players, name) !== undefined) {
    showPlayerMessage(
      'That username is already taken. If it is yours, choose it under "Existing player".',
    );
    return;
  }

  players.push({ name: name, bestTimes: [] });
  savePlayers(players);
  choosePlayer(name);
}

/**
 Gør `name` til den aktuelle spiller: skjuler registreringskortet,
 viser spillet og leaderboardet og starter et nyt spil.
 */
function choosePlayer(name) {
  currentPlayer = name;

  currentPlayerNameEl.textContent = name;
  leaderboardPlayerEl.textContent = name;
  playerMessageEl.textContent = "";
  saveStatusEl.textContent = "";

  playerCardEl.hidden = true;
  currentPlayerEl.hidden = false;
  gameCardEl.hidden = false;
  leaderboardEl.hidden = false;

  newGame();
  showBestTimes("");

  // Tastaturbrugere lander direkte på pladens første felt
  focusSquare(0, 0);
}

/**
 Går tilbage til registreringskortet. Et spil, der ikke er færdigt, opgives.
 */
function switchPlayer() {
  currentPlayer = null;
  newGame(); // stopper timeren

  gameCardEl.hidden = true;
  currentPlayerEl.hidden = true;
  leaderboardEl.hidden = true;
  playerCardEl.hidden = false;

  usernameInput.value = "";
  fillPlayerSelect();
  usernameInput.focus();
}

/**
 Gemmer en vindertid for den aktuelle spiller:
 tilføj den, sortér med den hurtigste først, behold de tre hurtigste, gem.
 */
function saveBestTime(seconds) {
  const players = loadPlayers();
  const player = findPlayer(players, currentPlayer);

  const newTime = {
    seconds: seconds,
    date: new Date().toISOString(), // f.eks. "2026-11-06T14:05:00.000Z"
  };

  player.bestTimes.push(newTime);

  // Sortér fra hurtigst til langsomst (færrest sekunder først)
  player.bestTimes.sort(function (a, b) {
    return a.seconds - b.seconds;
  });

  // Behold kun de tre hurtigste tider
  player.bestTimes = player.bestTimes.slice(0, 3);

  savePlayers(players);

  if (player.bestTimes.includes(newTime)) {
    saveStatusEl.textContent = "Your time has been saved to your best times.";
  } else {
    saveStatusEl.textContent = "Not a top-three time this round. Keep going!";
  }
  saveStatusEl.className = "save-status success";

  showBestTimes(newTime.date);
}

/**
 Viser den aktuelle spillers bedste tider i leaderboardet.
 @param {string} newDate - datoen for en tid, der lige er gemt, så den række kan lyse op
 */
function showBestTimes(newDate) {
  const player = findPlayer(loadPlayers(), currentPlayer);
  scoreListEl.innerHTML = "";

  if (player.bestTimes.length === 0) {
    leaderboardNoteEl.textContent =
      "No times yet. Clear the board to set your first record.";
    leaderboardNoteEl.hidden = false;
    return;
  }

  leaderboardNoteEl.hidden = true;

  for (let i = 0; i < player.bestTimes.length; i++) {
    const score = player.bestTimes[i];

    const item = document.createElement("li");
    item.className = "score-row";
    if (score.date === newDate) {
      item.classList.add("is-new"); // en blød animation, der fremhæver rækken (se style.css)
    }

    const rank = document.createElement("span");
    rank.className = "score-rank";
    rank.setAttribute("aria-hidden", "true"); // den nummererede liste fortæller allerede skærmlæsere placeringen
    rank.textContent = i + 1;

    const time = document.createElement("span");
    time.className = "score-time";
    time.textContent = formatTime(score.seconds);

    const date = document.createElement("time");
    date.className = "score-date";
    date.dateTime = score.date;
    date.textContent = new Date(score.date).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

    item.append(rank, time, date);
    scoreListEl.appendChild(item);
  }
}

/* ---------- 8. Event listeners ----------
   Én listener på hele pladen i stedet for 64 listeners (én pr. felt).
   event.target.closest('.cell') finder det felt, der blev klikket på. */

/*Læser række og kolonne for det felt, en hændelse skete på. */
function getSquarePosition(event) {
  const cell = event.target.closest(".cell");
  if (cell === null) {
    return null;
  }
  return { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
}

// Venstreklik eller tryk (Enter og mellemrum tæller også, fordi felterne er knapper)
boardEl.addEventListener("click", function (event) {
  const position = getSquarePosition(event);
  if (position !== null) {
    handleReveal(position.row, position.col);
  }
});

// Højreklik: sæt et flag i stedet for at åbne browserens menu
boardEl.addEventListener("contextmenu", function (event) {
  event.preventDefault();

  // Android-telefoner sender også et højreklik, når man trykker og holder.
  // Touch-koden nedenfor håndterer allerede det, så vi ignorerer det her.
  if (Date.now() - lastTouchTime < 1000) {
    return;
  }

  const position = getSquarePosition(event);
  if (position !== null) {
    toggleFlag(position.row, position.col);
  }
});

// Touchskærme: tryk og hold på et felt for at sætte et flag
boardEl.addEventListener(
  "touchstart",
  function (event) {
    const cell = event.target.closest(".cell");
    if (cell === null) {
      return;
    }

    lastTouchTime = Date.now();
    isLongPress = false;

    // Hvis fingeren stadig er nede efter LONG_PRESS_MS, er det et langt tryk
    pressTimer = setTimeout(function () {
      isLongPress = true;
      cell.classList.add("pressing"); // feltet lyser op, så spilleren kan se, at det virkede
    }, LONG_PRESS_MS);
  },
  { passive: true },
);

// Hvis fingeren glider væk (f.eks. for at scrolle), er det ikke et langt tryk
boardEl.addEventListener(
  "touchmove",
  function () {
    clearTimeout(pressTimer);
  },
  { passive: true },
);

boardEl.addEventListener("touchend", function (event) {
  clearTimeout(pressTimer);
  lastTouchTime = Date.now();

  if (isLongPress) {
    isLongPress = false;
    event.preventDefault(); // forhindrer, at trykket også tæller som et klik (som ville åbne feltet)
    const position = getSquarePosition(event);
    if (position !== null) {
      toggleFlag(position.row, position.col);
    }
  }
});

// Tastatur: F sætter et flag, piletasterne flytter mellem felterne
boardEl.addEventListener("keydown", function (event) {
  const position = getSquarePosition(event);
  if (position === null) {
    return;
  }

  let row = position.row;
  let col = position.col;

  if (event.key === "f" || event.key === "F") {
    toggleFlag(row, col);
    return;
  }

  if (event.key === "ArrowUp") row--;
  else if (event.key === "ArrowDown") row++;
  else if (event.key === "ArrowLeft") col--;
  else if (event.key === "ArrowRight") col++;
  else return; // alle andre taster: gør ingenting

  event.preventDefault(); // forhindrer piletasterne i at scrolle siden

  // Bliv inden for pladen
  row = Math.min(ROWS - 1, Math.max(0, row));
  col = Math.min(COLS - 1, Math.max(0, col));
  focusSquare(row, col);
});

// Knapper og menuer
newGameBtn.addEventListener("click", newGame);

// Hvis man skifter tidsgrænse, starter et nyt spil, så grænsen ikke kan ændres midt i et spil
timeLimitSelect.addEventListener("change", newGame);

registerForm.addEventListener("submit", function (event) {
  event.preventDefault(); // forhindrer formularen i at genindlæse siden
  registerPlayer();
});

existingForm.addEventListener("submit", function (event) {
  event.preventDefault();
  choosePlayer(playerSelect.value);
});

switchPlayerBtn.addEventListener("click", switchPlayer);

/* ---------- 9. Opstart ---------- */

// Spillet starter altid på registreringskortet. Gemte spillere
// kan vælges i menuen "Existing player".
fillPlayerSelect();
newGame();
