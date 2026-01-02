lyzzi_admin / 6fWjE7AXjOCgInDz

db set up

- add `MONGO_DB` to `.env`

setup

- list of stock objectives, separated by difficulty, saved in memory?
- slider/%/number to decide how many of each difficulty (or any, combine them all)
- generates a 5x5 bingo card where each square is half the objective, half an input field OR toggle (disabled during setup)
- squares can be dragged/swapped to adjust positioning, or text edited
- squares can also just be manually edited
- select game mode (below)
- once fully setup, generate a unique code to share
- once code is generated, cannot be updated
- select a tie-breaker; only shown if there's a tie at the end of timer

game modes

- synchronous: when the lobby owner chooses (or when all members select 'ready'?) the timer starts. at the end of the timer, each person's card is disabled and results are shown
- asynchronous: creator can set an optional timeout date (or none for indefinite), players can grab the code, start their timer, and complete their own card within the built-in limit. at the end of the timeout date, results are shown
- leaderboard option??

lobby

- locate a bingo card by entering unique code; this creates a local copy for the user from the parent card
- enter a nickname
- built in timer. how to start - is someone a lobby owner or once everyone readies up? once the timer starts, it cannot be stopped
- when others have joined the code/lobby, they can see updates of others (maybe just a color representation below their own card)
- don't show the objective until timer starts

during play

- when a user inputs/toggles true, changes background
- sums up the number of bingos, and independent objectives
- once started, the timer ticks down and cannot be stopped (alert once time is up?), disables card editing when time is up
- at the end of timer, if there's a tie, present the tie breaker

other

- people can edit their own custom objective lists
- people can nominate/community vote objectives into the stock lists
