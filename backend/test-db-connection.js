const { Client } = require('pg');

const host = 'localhost';
const port = 5432;
const user = 'postgres';
const passwords = [
  'postgres',
  'admin',
  'root',
  'password',
  '123456',
  '1234',
  'Priya@123',
  'priya@123',
  'priya',
  'Priya',
  'PriyaDharshini',
  'PriyaDharshini@123',
  'root123',
  'admin123',
  ''
];

async function testPasswords() {
  for (const password of passwords) {
    console.log(`Testing password: "${password}"...`);
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
      console.log(`Failed for "${password}": ${err.message}`);
    }
  }
  console.log('All attempted passwords failed.');
}

testPasswords();
