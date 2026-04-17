import https from 'https';

const API_KEY = 'AIzaSyBwHHwrlfZApLIf1KuEiSHKIyJlgMGc2o8';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    if(json.models) {
      json.models.filter(m => m.supportedGenerationMethods.includes('embedContent')).forEach(m => {
        console.log(`✅ Embedding model found: ${m.name}`);
      });
    } else {
      console.log('Error:', json);
    }
  });
});
