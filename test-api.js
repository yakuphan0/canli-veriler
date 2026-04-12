import axios from 'axios';

async function testApi() {
  try {
    const url = 'https://api.football-data.org/v4/competitions';
    const { data } = await axios.get(url, {
      headers: { 'X-Auth-Token': '67162e4f0be94c17b1427415d2e9d0a2' }
    });
    
    console.log("Available competitions:");
    for(const c of data.competitions){
        console.log(`ID: ${c.id}, Code: ${c.code}, Name: ${c.name}, Country: ${c.area.name}`);
    }
  } catch (e) {
    console.error("API failed:", e.message);
  }
}
testApi();
