const path = require('path');
const express = require('express'),
  morgan = require('morgan'),
  bodyParser = require('body-parser');

const app = express();
const cors = require('cors');
app.use(cors());

const mongoose = require('mongoose');
const Models = require('./models.js');

app.use(bodyParser.json());

let auth = require('./auth')(app);

const passport = require('passport');
require('./passport');

const { check, validationResult } = require('express-validator');

const Movies = Models.Movie;
const Users = Models.User;

// mongoose.connect('mongodb://localhost:27017/myFlixDB', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// });

mongoose.connect(process.env.CONNECTION_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(morgan('common'));

app.get('/', (req, res) => {
  res.send('Welcome to movies api');
});

//Get list of movies with authentication
app.get(
  '/movies',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    //res.json(topmovies);
    Movies.find()
      .then(movies => {
        res.status(201).json(movies);
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  }
);

//Get list of users
app.get('/users', (req, res) => {
  Users.find()
    .then(users => {
      res.status(201).json(users);
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//Get a user by Username
app.get(
  '/users/:Username',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Users.findOne({ Username: req.params.Username })
      .then(user => {
        res.json(user);
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  }
);

//Get data about a movie using authentication
app.get(
  '/movies/:Title',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Movies.findOne({ Title: req.params.Title })
      .then(movie => {
        res.json(movie);
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  }
);

//Get description of a genre with authentication
app.get(
  '/movies/genre/:Genre',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Movies.findOne({ 'Genre.Name': req.params.Genre })
      .then(movie => {
        res.json(movie.Genre);
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  }
);

//Get a director's details using authentication
app.get(
  '/movies/director/:Director',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Movies.findOne({ 'Director.Name': req.params.Director })
      .then(movie => {
        res.json(movie.Director);
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  }
);

//Create a new user without using authentication
app.post(
  '/users',
  //Validation logic
  [
    check('Username', 'Username is required').isLength({ min: 5 }),
    check('Username', 'Only alphanumeric allowed').isAlphanumeric(),
    check('Password', 'Password is required')
      .not()
      .isEmpty(),
    check('Email', 'Email not valid').isEmail()
  ],
  (req, res) => {
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);

    Users.findOne({ Username: req.body.Username })
      .then(user => {
        if (user) {
          return res.status(400).send(req.body.Username + ' already Exists');
        } else {
          Users.create({
            Username: req.body.Username,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday
          })
            .then(user => {
              res.status(201).json(user);
            })
            .catch(error => {
              console.error(error);
              res.status(500).send('Error: ' + error);
            });
        }
      })
      .catch(error => {
        console.error(error);
        res.status(500).send('Error: ' + error);
      });
  }
);

//Update a user's details using authentication
app.put(
  '/users/:Username',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $set: {
          Username: req.body.Username,
          Password: hashedPassword,
          Email: req.body.Email,
          Birthday: req.body.Birthday
        }
      },
      { new: true },
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error: ' + err);
        } else {
          res.json(updatedUser);
        }
      }
    );
  }
);

//Add a movie as favorite using authentication
app.post(
  '/users/:Username/movies/:MovieID',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $push: { FavoriteMovies: req.params.MovieID }
      },
      { new: true },
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error: ' + err);
        } else {
          res.json(updatedUser);
        }
      }
    );
  }
);

//Remove a movie from favorites using authentication
app.delete(
  '/users/:Username/movies/:MovieID',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      { $pull: { FavoriteMovies: req.params.MovieID } },
      { new: true },
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error: ' + err);
        } else {
          res.json(updatedUser);
        }
      }
    );
  }
);

//Delete a user using authentication
app.delete(
  '/users/:Username',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Users.findOneAndRemove({ Username: req.params.Username })
      .then(user => {
        if (!user) {
          res.status(400).send(req.params.Username + ' was not found');
        } else {
          res.status(200).send(req.params.Username + ' was deleted.');
        }
      })
      .catch(err => {
        console.error(err);
        res.status(400).send('Error: ' + err);
      });
  }
);

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log('Listening on port ' + port);
});
// app.listen(8080, () => console.log('Your app is listening on port 8080.'));

app.use(express.static('public'));
app.use('/client', express.static(path.join(__dirname, 'client', 'dist')));
app.get('/client/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
