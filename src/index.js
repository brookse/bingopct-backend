require("dotenv").config();

// import models


// const axios = require("axios");
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const app = express();
app.use(cors());
app.use(express.json())

// Create a MongoClient and connect to db
const { MongoClient, ServerApiVersion } = require("mongodb");
const { LobbyModel } = require("./UserModel");
const mongoDB = process.env.MONGO_DB;
const client = new MongoClient(mongoDB, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function connectToDB() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
// connectToDB().catch(console.dir);
mongoose.connect(mongoDB)
  .then(() => console.log("Connected to MongoDB"))
  .catch(console.error);

// Returns a lobby
app.get("/lobby/:join_code", async (req, res) => {
  const lobby = await LobbyModel.find({join_code: req.params.join_code}).exec();
  if (lobby) {
    res.status(200).json(lobby);
  } else {
    res.status(404).json({ error: "Lobby not found" });
  }
});

app.delete("/lobby/:join_code", async (req, res) => {
  const join_code = req.params.join_code;

  try {
    const deletedLobby = await LobbyModel.findOneAndDelete({ join_code });
    if (deletedLobby) {
      res.status(200).json({ message: "Lobby deleted successfully." });
    } else {
      res.status(404).json({ error: "Lobby not found." });
    }
  } catch (error) {
    res.status(500).json({ error: `Error deleting lobby: ${error}` });
  }
});

// Create a lobby
app.post("/lobby", async (req, res) => {
  const { join_code, game_mode, timer_length, card } = req.body;

  if (!join_code || !game_mode || !timer_length || !card)
    return res.status(400).json({ error: "Join code, game mode, timer length, and card are required." });

  const newLobby = new LobbyModel({
    join_code,
    game_mode,
    timer_length,
    players: [],
    game_state: "waiting",
    is_timer_running: false,
    card
  });

  try {
    const savedLobby = await newLobby.save();
    res.status(201).json(savedLobby);
  } catch (error) {
    res.status(500).json({ error: `Error creating lobby: ${error}` });
  }
});

// Join lobby
// todo this should only return the joined player, so it can be saved by the client
app.post("/lobby/:join_code/join", async (req, res) => {
  const { player_name, player_id } = req.body;
  const join_code = req.params.join_code;

  if (!join_code)
    return res.status(400).json({ error: "Join code is required." });
  if (!player_id || !player_name)
    return res.status(400).json({ error: "Player id and name are required." });

  try {
    const lobby = await LobbyModel.findOne({ join_code }).exec();
    if (!lobby) {
      return res.status(404).json({ error: "Lobby not found, check your join code" });
    }

    // Add the player (won't duplicate because of $addToSet)
    await LobbyModel.findByIdAndUpdate(
      lobby._id,
      {
        $addToSet: {
          players: {
            id: player_id,
            name: player_name,
            is_ready: false,
            player_state: {
              total_bingo: 0,
              total_objectives: 0,
              completion_summary: {},
            },
          },
        },
      },
      { new: true }
    );

    // Retrieve only the matched player element
    const playerDoc = await LobbyModel.findOne(
      { _id: lobby._id, "players.id": player_id },
      { "players.$": 1 }
    ).lean().exec();

    if (playerDoc && playerDoc.players && playerDoc.players.length > 0) {
      return res.status(200).json(playerDoc.players[0]);
    } else {
      return res.status(404).json({ error: "Could not join lobby" });
    }
  } catch (error) {
    return res.status(500).json({ error: `Error joining lobby: ${error}` });
  }
});

// Update player
app.put("/lobby/:join_code/player/:player_id", async (req, res) => {
  const { is_ready, player_state } = req.body;
  const join_code = req.params.join_code;
  const player_id = req.params.player_id;

  console.log('req.body: ', is_ready);
  if (is_ready === undefined && player_state === undefined)
    return res.status(400).json({ error: "Player state or ready state is required." });

  try {
    const setObj = {};
    if (is_ready !== undefined) {
      setObj["players.$.is_ready"] = is_ready;
    }
    if (player_state !== undefined) {
      setObj["players.$.player_state"] = { ...player_state };
    }

    const updated = await LobbyModel.findOneAndUpdate(
      { join_code: join_code, "players.id": player_id },
      { $set: setObj },
      { new: true }
    );

    if (updated) {
      // check to see if all players are ready. if so, start the game
      const allReady = updated.players.every((player) => player.is_ready);
      if (allReady) {
        updated.game_state = "playing";
        updated.timer_start = new Date();
        updated.is_timer_running = true;
      }
      res.status(200).json(updated);
    } else {
      res.status(404).json({ error: "Could not update player" });
    }
  } catch (error) {
    res.status(500).json({ error: `Error updating player: ${error}` });
  }
});

// start game
app.put("/lobby/:join_code/start", async (req, res) => {
  const join_code = req.params.join_code;

  try {
    const lobby = await LobbyModel.findOne({ join_code }).exec();
    // if the game is already in progress, we can't change player states
    if (lobby.game_state !== "waiting") {
      return res.status(400).json({ error: "Game has started or finished, cannot join." });
    }
    // ensure all players are ready
    const allReady = lobby.players.every((player) => player.is_ready);
    if (!allReady) {
      return res.status(400).json({ error: "Not all players are ready." });
    }

    const updated = await LobbyModel.findOneAndUpdate(
      { join_code: join_code },
      {
        $set: {
          game_state: 'playing',
          is_timer_running: true,
          timer_start: new Date().toISOString(),
        },
      },
      { new: true }
    );

    if (updated) {
      res.status(200).json(updated);
    } else {
      res.status(404).json({ error: "Could not start game" });
    }
  } catch (error) {
    res.status(500).json({ error: `Error starting lobby: ${error}` });
  }
});

// finish game
app.put("/lobby/:join_code/finish", async (req, res) => {
  const join_code = req.params.join_code;
  console.log('FINISHING LOBBY: ', join_code);

  try {
    const lobby = await LobbyModel.findOne({ join_code }).exec();
    // if the game is already in progress, we can't change player states
    if (lobby.game_state === "finished") {
      return res.status(400).json({ error: "Game is already finished." });
    }

    // sort the players by winners; first by bingos, then objectives, and then name
    const sortedPlayers = lobby.players.sort((a, b) => {
      console.log('SORTING PLAYERS: ', a.name, b.name);
      if (a.player_state.total_bingo !== b.player_state.total_bingo) {
        console.log('BINGOS: ', a.player_state.total_bingo, b.player_state.total_bingo);
        return b.player_state.total_bingo - a.player_state.total_bingo;
      }
      if (a.player_state.total_objectives !== b.player_state.total_objectives) {
        console.log('OBJECTIVES: ', a.player_state.total_objectives, b.player_state.total_objectives);
        return b.player_state.total_objectives - a.player_state.total_objectives;
      }
      console.log('NAMES: ', a.name, b.name);
      return a.name.localeCompare(b.name);
    });
    console.log('SORTED PLAYERS: ', sortedPlayers);

    const updated = await LobbyModel.findOneAndUpdate(
      { join_code: join_code },
      {
        $set: {
          game_state: 'finished',
          is_timer_running: false,
          players: sortedPlayers,
        },
      },
      { new: true }
    );

    if (updated) {
      res.status(200).json(updated);
    } else {
      res.status(404).json({ error: "Could not start game" });
    }
  } catch (error) {
    res.status(500).json({ error: `Error starting lobby: ${error}` });
  }
});

// update lobby
app.put("/lobby/:join_code", async (req, res) => {
  const { game_state, card, game_mode, timer_length } = req.body;
  const join_code = req.params.join_code;

  if (!game_state && !card && !game_mode && !timer_length)
    return res.status(400).json({ error: "Game state or card is required." });

  if (game_state === 'finished')
    return res.status(400).json({ error: "Use the finish endpoint to finish a game." });

  try {
    const updated = await LobbyModel.findOneAndUpdate(
      { join_code: join_code },
      {
        $set: {
          game_state,
          card,
          game_mode,
          timer_length,
        },
      },
      { new: true }
    );

    if (updated) {
      res.status(200).json(updated);
    } else {
      res.status(404).json({ error: "Could not update lobby" });
    }
  } catch (error) {
    res.status(500).json({ error: `Error updating lobby: ${error}` });
  }
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});