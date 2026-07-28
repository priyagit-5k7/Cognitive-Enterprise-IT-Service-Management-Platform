const { Client } = require('pg');

const host = 'localhost';
const port = 5432;
const user = 'postgres';
const passwords = [
  'nandha',
  'Nandha',
  'nandha@123',
  'Nandha@123',
  '23ai051',
  '23ai051@123',
  'priyagit-5k7',
  'priyaR',
  'priyar',
  'PriyaR',
  'priyar@123',
  'PriyaR@123',
  'nandhaengg',
  'nandhaengg@123'
];

async function testPasswords() {
  for (const password of passwords) {
    const client = new Client({
      host,
      port,
      user,
      password,
      database: 'postgres'
    });

    try {
      await client.connect();
      console.log(`SUCCESS! Connected with password: "${password}"`);
      await client.end();
      return;
    } catch (err) {
      // ignore errors
    }
  }
  console.log('All attempted passwords failed.');
}

testPasswords();
