const { checkBotId } = require('botid/server');
const { createContactHandler } = require('../lib/contact');

// Shared rate limiting runs at Vercel's firewall before this function.
// The canonical rule lives in config/contact-firewall.json.
module.exports = createContactHandler({ checkBotId });
