const HTTP_PORT = process.env.PORT || 3000;

const express = require("express");
const exphbs = require("express-handlebars");
const path = require("path");
const fs = require("fs");
const session = require("client-sessions");
const randomStr = require("randomstring");
const MongoClient = require("mongodb").MongoClient;
const app = express();
const uri = "mongodb+srv://jimhan93:did1203516@jimhanmongodb.jpk4ogk.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const pRouter = require("./routes/Purchase.js");

var strRandom = randomStr.generate();

app.use(
  session({
    cookieName: "GallerySession",
    secret: strRandom,
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
    httpOnly: true,
    secure: true,
    ephemeral: true
  })
);

async function connectToDB() {
  try {
    await client.connect();
    console.log("Connected to database");
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
}

connectToDB();

const images = client.db('gallerydb').collection('Gallery Collection');

app.use("/purchase", pRouter(images));

app.use(function (req, res, next) {
  if (!req.GallerySession) {
    req.GallerySession = { loggedIn: false };
  }
  if (!req.GallerySession.txtUsername) {
    req.GallerySession.txtUsername = null;
  }
  next();
});


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/images", express.static(path.join(__dirname, "/public/images")));
app.use(express.json());

app.engine(".hbs", exphbs.engine({
  extname: ".hbs",
  defaultLayout: false,
  layoutsDir: path.join(__dirname, "/views")
}));

app.set('view engine', '.hbs');

app.get("/", (req, res) => {
  res.render('login');
});

app.post('/', async (req, res) => {
  const txtUsername = req.body.txtUsername;
  const txtPassword = req.body.txtPassword;

  const readUserFile = () => {
    return new Promise((resolve, reject) => {
      fs.readFile('./user.json', 'utf8', (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  };

  try {
    const data = await readUserFile();
    const users = JSON.parse(data);

    if (!users.hasOwnProperty(txtUsername)) {
      res.render('login', { message: 'Not a registered username' });
    } else if (users[txtUsername] !== txtPassword) {
      res.render('login', { message: 'Invalid password' });
    } else {
      req.GallerySession.loggedIn = true;
      req.GallerySession.txtUsername = txtUsername;
      await images.updateMany({}, { $set: { STATUS: "A" } });
      res.redirect('/gallery');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.get("/register", (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const txtUserName = req.body.txtUserName;
  const txtPassword = req.body.txtPassword;
  const txtConfirmPassword = req.body.txtConfirmPassword;

  if (txtPassword !== txtConfirmPassword) {
    return res.render('register', { message: 'Passwords do not match' });
  }

  fs.readFile('./user.json', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    } else {
      const users = JSON.parse(data);

      if (users.hasOwnProperty(txtUserName)) {
        res.render('register', { message: 'Username already exists' });
      } else {
        users[txtUserName] = txtPassword;

        fs.writeFile('./user.json', JSON.stringify(users), (err) => {
          if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
          } else {
            req.GallerySession.loggedIn = true;
            res.redirect('/gallery');
          }
        });
      }
    }
  });
});



app.get("/gallery", async function (req, res) {
  if (req.GallerySession.loggedIn) {
    const cursor = images.find({ STATUS: "A" }, { projection: { _id: 0, FILENAME: 1 } });
    const selected = req.query.selected;
    const image = [];

    try {
      const docs = await cursor.toArray();
      docs.forEach((doc) => {
        image.push(path.parse(doc.FILENAME).name);
      });
      
      res.render('gallery', { image: image, username: req.GallerySession.txtUsername, selected: selected });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal server error");
    }
  } else {
    res.redirect('/');
  }
});

app.post("/gallery", async function (req, res) {
  if (!req.GallerySession.loggedIn) {
    res.redirect('/');
    return;
  }
  const selected = req.body.imgSelect;
  try {
    const cursor = images.find({ STATUS: "A" }, { projection: { _id: 0, FILENAME: 1 } });
    const image = [];
    await cursor.forEach((doc) => {
      image.push(path.parse(doc.FILENAME).name);
    })
    res.render("gallery", { selected, image, username: req.GallerySession.txtUsername });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
})

app.get("/logout", function (req, res) {
  req.GallerySession.loggedIn = false;
  res.redirect("/");
})

const server = app.listen(HTTP_PORT, () => {
  console.log(`Listening on port ${HTTP_PORT}`);
});