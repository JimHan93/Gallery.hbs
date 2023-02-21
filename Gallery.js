const HTTP_PORT = process.env.PORT || 3000;

const express = require("express");
const exphbs = require("express-handlebars");
const readline = require("linebyline");
const path = require("path");
const fs = require("fs");
const session = require("client-sessions");
const randomStr = require("randomstring");
const app = express();

var strRandom = randomStr.generate();

app.use(
  session({
    cookieName: "GallerySession",
    secret: strRandom,
    duration: 30 * 60* 1000,
    activeDuration: 5 * 60 * 1000,
    httpOnly: true,
    secure: true,
    ephemeral: true
  })
);

app.use(function(req, res, next) {
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

app.post('/', (req, res) => {
  const txtUsername = req.body.txtUsername;
  const txtPassword = req.body.txtPassword;

  fs.readFile('./user.json', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    } else {
      const users = JSON.parse(data);

      if (!users.hasOwnProperty(txtUsername)) {
        res.render('login', { message: 'Not a registered username' });
      } else if (users[txtUsername] !== txtPassword) {
        res.render('login', { message: 'Invalid password' });
      } else {
        req.GallerySession.loggedIn = true;
        req.GallerySession.txtUsername = txtUsername;
        res.redirect('/gallery');
      }
    }
  });
});

app.get("/register", (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const txtUserName = req.body.txtUserName;
  const txtPassword = req.body.txtPassword;
  const txtConfirmPassword = req.body.txtConfirmPassword;

  if (txtPassword !== txtConfirmPassword){
    return res.render('register', {message: 'Passwords do not match'});
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



const rl = readline("./images.txt");
var image = [];
rl.on("line", (line, lineCount, byteCount) => {
  image.push(path.parse(line).name);
})

.on("error", (err) => {
  console.error(err);
});

app.get("/gallery", function(req, res){
  if (req.GallerySession.loggedIn){
    res.render('gallery', {image: image, username: req.GallerySession.txtUsername});
  }else {
    res.redirect('/');
  }
});

app.post("/gallery", function(req, res) {
  var selected = req.body.rdoImage;
  if (!req.GallerySession.loggedIn) {
    res.redirect('/');
    return;
  }
  res.render("gallery", { selected, image, username: req.GallerySession.txtUsername });
});

app.get("/logout", function(req, res) {
  req.GallerySession.loggedIn = false;
  res.redirect("/");
})

const server = app.listen(HTTP_PORT, () => {
  console.log(`Listening on port ${HTTP_PORT}`);
});