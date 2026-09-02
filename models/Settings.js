const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  publicAdminBalance: { type: Number, default: 0 },
});

const Settings = mongoose.model('Settings', settingsSchema);

async function getSettings() {
  let settings = await Settings.findById('global');
  if (!settings) {
    settings = await Settings.create({ _id: 'global', publicAdminBalance: 0 });
  }
  return settings;
}

module.exports = { Settings, getSettings };