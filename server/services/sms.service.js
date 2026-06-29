const AfricasTalking = require('africastalking');

const at = AfricasTalking({
  apiKey:   process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
});
const sms = at.SMS;

async function sendSms(phoneNumber, message) {
  try {
    await sms.send({ to: [phoneNumber], message });
  } catch (err) {
    console.error('[SMS] Failed to send to', phoneNumber, ':', err.message || err);
  }
}

module.exports = { sendSms };
