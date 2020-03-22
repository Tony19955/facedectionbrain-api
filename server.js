const express = require('express');
const bodyParser = require('body-parser');
const Clarifai = require('clarifai');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const app = express();

const api = new Clarifai.App({
  apiKey: '11e4086b704f486ea9c9f99daca723b5'
});

const db = knex({
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    user: 'postgres',
    password: 'postgres',
    database: 'facedetection'
  }
}); 

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send(db.users);
})

app.post('/signin', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json('Incorrect form submission');
  }
  db.select('email', 'hash').from('login')
    .where('email', '=', email)
    .then(data => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db.select('*').from('users')
        .where('email', '=', email)
        .then(user => {
          res.json(user[0])
        })
        .catch(err => res.status(400).json('Unable to get user'))
      } else {
        res.status(400).json('Wrong credentials')
      }
    })
    .catch(err => res.status(400).json('Wrong credentials'))
})

app.post('/register', (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json('Incorrect form submission');
  }
  const hash = bcrypt.hashSync(password);
  db.transaction(trx => {
    trx.insert({
      hash: hash,
      email: email
    })
    .into('login')
    .returning('email')
    .then(loginEmail => {
      return trx('users').returning('*').insert({
        email: loginEmail[0],
        name: name,
        joined: new Date()
      })
      .then(user => {
        res.json(user[0]);
      })  
    })
    .then(trx.commit)
    .catch(trx.rollback)
  })
  
  .catch(err => res.status(400).json('Unable to register'))
})

app.get('/profile/:id', (req, res) => {
  const { id } = req.params;
  db.select('*').from('users').where({id})
    .then(user => {
      if (user.length) {
        res.json(user[0])
      } else {
        res.status(400).json('Not found')
      }
  })
  .catch(err => res.status(400).json('Error getting user'))
})

app.put('/image', (req, res) => {
  const { id } = req.body;
  db('users').where('id', '=', id)
  .increment('entries', 1)
  .returning('entries')
  .then(entries => {
    res.json(entries[0]);
  })
  .catch(err => res.status(400).json('Unable to get entries'))
})

app.post('/imageurl', (req, res) => {
  api.models.predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
  .then(data => {
    res.json(data);
  })
  .catch(err => res.status(400).json('Unable to work with API'))
})

const DATABASE_URL = process.env.DATABASE_URL
app.listen(3000, () => {
  console.log(`Server is listening on port ${DATABASE_URL}`);
})

console.log(3000)