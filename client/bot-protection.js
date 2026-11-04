import { initBotId } from 'botid/client/core';

// Load before main.js so every contact-form fetch receives a challenge response.
initBotId({
  protect: [{
    path: '/api/contact',
    method: 'POST',
    advancedOptions: { checkLevel: 'basic' }
  }]
});
window.wiemanBotProtectionReady = true;
