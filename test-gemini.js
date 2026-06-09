require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.log('GEMINI_API_KEY is not set');
      return;
    }
    console.log('Key exists:', key.substring(0, 5) + '...');
    
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    console.log('Calling API...');
    const result = await Promise.race([
      model.generateContent('Discordのサーバーテーマ「gaming」の構成を考えて。'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_AFTER_10S')), 10000))
    ]);
    
    console.log('API Response received:');
    console.log(result.response.text().substring(0, 100) + '...');
  } catch (error) {
    console.error('API Error:', error.message);
  }
}

test();
