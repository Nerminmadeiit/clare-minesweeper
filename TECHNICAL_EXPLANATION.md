# Claré — The Minesweeper Edition: Teknisk forklaring

*Projekt på 1. semester, Professionsbachelor i Webudvikling, IBA*

## 1. Hvad er projektet?

Claré — The Minesweeper Edition er et Minesweeper-spil i browseren, designet i min brands, Clarés, visuelle identitet. Spilleren registrerer sig med et brugernavn, spiller på en 8×8-plade med 10 miner og skal nå at åbne alle sikre felter, før en selvvalgt tidsgrænse (1–10 minutter) løber ud. Hver spillers tre hurtigste tider gemmes med dato og klokkeslæt.

Projektet er lavet med HTML, CSS og ren JavaScript uden frameworks, biblioteker eller server. Spillere og tider gemmes i browserens `localStorage`. Man åbner bare `index.html` i browseren.

## 2. Filer

| Fil | Indhold |
|---|---|
| `index.html` | Sidens struktur: logo, registrering, spilleplade, leaderboard |
| `style.css` | Hele det visuelle design |
| `script.js` | Al JavaScript: spillet, timeren, spillere og bedste tider |
| `assets/` | Claré-logoet samt ikonerne for mine og flag (SVG) |

`script.js` er delt op i ni afsnit med overskrifter: indstillinger, spillets tilstand, opbygning af pladen, selve spillet, timer, tegning af pladen, spillere og tider, event listeners og opstart.

## 3. Sådan virker spillet

- **Pladen:** `createBoard()` bruger to `for`-løkker inde i hinanden til at lave et array med 8 rækker, hvor hver række har 8 objekter. Hvert objekt er ét felt med egenskaber som `isMine`, `isRevealed`, `isFlagged` og `adjacentMines`. Spillet ændrer kun disse data, og bagefter tegner `renderBoard()` felterne som `<button>`-elementer.
- **Miner:** `placeMines()` kører først efter det første klik. Den vælger tilfældige felter med `Math.random()` i en `while`-løkke, indtil der er placeret 10 miner. Felter, der allerede har en mine, eller som ligger ved siden af det første klik, springes over. Derfor er det første klik altid sikkert.
- **Tal:** `countAdjacentMines()` tæller for hvert felt, hvor mange af naboerne der er miner. `getNeighbours()` finder de op til 8 naboer og springer positioner uden for pladen over.
- **Åbne felter:** `handleReveal()` kører, når man klikker. Er feltet en mine, taber man. Ellers åbner `revealSquare()` feltet. Har feltet 0 nabominer, kalder funktionen sig selv for alle naboerne (rekursion), så et helt tomt område åbnes med ét klik.
- **Flag:** `toggleFlag()` sætter eller fjerner et flag ved højreklik, F-tasten eller et langt tryk på mobil. Et felt med flag kan ikke åbnes ved et uheld.
- **Sejr og nederlag:** `checkWin()` gennemgår alle felter og returnerer `true`, når alle felter uden mine er åbnet. `endGame()` stopper timeren, viser en besked og gemmer tiden, hvis man har vundet.

## 4. Sådan virker timeren

Timeren starter ved det første klik. `startTimer()` gemmer starttidspunktet med `Date.now()` og bruger `setInterval()` til at kalde `tick()` hvert sekund. `tick()` regner den forløbne tid ud som "nu minus start". Det er mere præcist end bare at lægge 1 til hvert sekund. Nedtællingen er tidsgrænsen minus den forløbne tid. Den bliver ravfarvet i de sidste 10 sekunder, og når den når nul, taber man. Skifter man tidsgrænse i menuen, startes et nyt spil.

## 5. Spillere og tider med localStorage

Alle spillere gemmes som ét array af objekter under nøglen `clarePlayers`:

```js
[ { name: "nermin", bestTimes: [ { seconds: 31, date: "2026-11-06T14:05:00.000Z" } ] } ]
```

`localStorage` kan kun gemme tekst. Derfor gør `savePlayers()` arrayet til tekst med `JSON.stringify()`, og `loadPlayers()` gør det til et array igen med `JSON.parse()`.

- **Registrering:** `registerPlayer()` tjekker, at navnet er 3–20 tegn og ikke allerede findes (uanset store og små bogstaver), og tilføjer så spilleren.
- **Eksisterende spiller:** `fillPlayerSelect()` fylder menuen med de gemte navne, og `choosePlayer()` starter spillet for den valgte spiller. Spillet starter altid på registreringskortet, men spillere og tider er stadig gemt, når siden genindlæses.
- **Gem en tid:** når man vinder, tilføjer `saveBestTime()` den nye tid med dato, sorterer tiderne fra hurtigst til langsomst med `.sort()`, beholder de tre hurtigste med `.slice(0, 3)` og gemmer. `showBestTimes()` viser dem derefter i leaderboardet.

**Vigtigt:** `localStorage` gemmer kun data i den samme browser og på den samme adresse (origin). Åbner man spillet i en anden browser eller på en anden computer, er der ingen spillere.

## 6. Visuelle designvalg

Designet bygger på mit Claré-moodboard: luksuriøst, minimalistisk, frossen krystal, is og glas.

- **Farver:** Clarés farvepalet er defineret én gang som CSS-variabler: sort `#0E0E0E` som baggrund, isblå `#A6BDCC` til accenter, offwhite `#F5F3EF` til tekst samt funktionsfarverne til succes, advarsel og fare.
- **Krystalfelter:** skjulte felter ligner gennemsigtig is, lavet med CSS-gradienter og skygger. Åbnede felter er mørke, så forskellen er tydelig.
- **Miner og flag:** egne SVG-ikoner. Minen er en krystal med skarpe splinter, og den mine, man klikkede på, lyser rødt. Flaget er en vimpel i sølv og is.
- **Typografi:** Cormorant Garamond til overskrifter og Inter til tekst.
- **Mobil og tilgængelighed:** layoutet tilpasser sig mobilskærme, felterne er knapper med beskrivelser til skærmlæsere, man kan spille med tastaturet, og fokus er tydeligt synligt.

## 7. Tekniske begrænsninger

- Data gemmes kun i én browser. Der er ingen fælles database, så spillere kan ikke se hinandens tider på tværs af computere.
- Der er intet login. Alle, der bruger browseren, kan vælge en hvilken som helst spiller.
- Spillet kører helt i browseren, så en bruger med udviklerværktøjer kan ændre sine tider i `localStorage`.
- Tider gemmes i hele sekunder, så to spil kan få samme tid.

Undervejs i projektet byggede jeg også en version med en Node.js/Express-server og en JSON-fil. Jeg valgte at aflevere denne enklere version med `localStorage`, som opgaven også tillader, fordi koden er lettere at forstå og forklare på mit niveau.

## 8. Brug af Claude Code

Projektet er lavet med betydelig hjælp fra **Claude Code**, en AI-kodeassistent fra Anthropic. Claude Code skrev og implementerede det meste af koden ud fra mine instruktioner.

Min rolle var at:

- bestemme kravene ud fra opgaven og dele arbejdet op i trin
- styre det visuelle design ud fra mit eget Claré-moodboard, mine brandfarver og mit logo
- gennemgå resultatet efter hvert trin og bestemme, hvad der skulle ændres
- beslutte at forenkle koden til et niveau, jeg bedre kan forstå
- teste spillet i browseren

Claude Code kørte også automatiske browsertests af spillet, før det blev afleveret. Jeg har ikke selv skrevet hver linje, men jeg har fået de vigtigste funktioner forklaret trin for trin for at forstå, hvordan spillet virker.
