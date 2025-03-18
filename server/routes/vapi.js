const express = require('express');
const router = express.Router();
const cors = require('cors');

router.post('/call/web', cors(), async (req, res) => {
  try {
    const response = await fetch('https://api.vapi.ai/call/web', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Vapi proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy request to Vapi' });
  }
});

module.exports = router; 