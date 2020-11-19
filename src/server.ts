import express from 'express';
import { promises } from 'fs';
import path from 'path';

const app = express();
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/stls/', async (req, res) => {
  const dir = await promises.opendir(path.join(__dirname, 'asset/stls/'));
  const files: string[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for await (const dirent of dir) {
    files.push(dirent.name);
  }
  console.log(files);
  res.send(files);
});

app.get('/stls/:id', async (req, res) => {
  const filePath = path.join(__dirname, `asset/stls/${req.params.id}`);
  const result = await promises.readFile(filePath);
  res.send(result);
});

const port = process.env.PORT || 7890;
app.listen(port, () => {
  console.log(`App listening to ${port}....`);
  console.log('Press Ctrl+C to quit.');
});
