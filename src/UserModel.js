const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const CompletionSummarySchema = new Schema(
  {
    completed_at: { type: String, required: true },
    notes: { type: String }
  },
  { _id: false }
);

const PlayerStateSchema = new Schema({
  total_bingo: { type: Number, required: true },
  total_objectives: { type: Number, required: true },

  completion_summary: {
    type: Map,
    of: CompletionSummarySchema
  }
});

const PlayerSchema = new Schema({
  id: String,
  name: String,
  is_ready: Boolean,
  player_state: PlayerStateSchema,
})

const LobbySchema = new Schema({
  id: String,
  game_state: String,
  card: {
    first: [String],
    second: [String],
    third: [String],
    fourth: [String],
    fifth: [String],
    tiebreaker: String,
  },
  players: [PlayerSchema],
  join_code: String,
  game_mode: String,
  timer_length: Number,
  timer_start: Date,
  is_timer_running: Boolean,
});

const LobbyModel = mongoose.model("LobbyModel", LobbySchema);
const PlayerModel = mongoose.model("PlayerModel", PlayerSchema);
const CompletionSummaryModel = mongoose.model("CompletionSummaryModel", CompletionSummarySchema);
const PlayerStateModel = mongoose.model("PlayerStateModel", PlayerStateSchema);

module.exports = {
  LobbyModel,
  PlayerModel,
  CompletionSummaryModel,
  PlayerStateModel
};
