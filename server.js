// Info van .env file toevoegen om .env te processen.
import dotenv from "dotenv";
dotenv.config();

// Express webserver initialiseren
import express from "express";
import helmet from "helmet";
import sessions from 'express-session';
import bcrypt from "bcryptjs";
import multer from "multer";
import xss from 'xss';
import { MongoClient, ServerApiVersion } from "mongodb";
import fetch from "node-fetch";
import cors from "cors";
import request from "request";

const app = express();
const port = 4000;

// Hier gaan de ingevoerde foto's naartoe
const upload = multer({ dest: 'static/upload/' });

// static data access mogelijk maken
app.use("/static", express.static("static"));
app.use(express.static('public'));

// header script
app.use(express.static('public'));

// APi token krijgen in de backend
async function getAccessToken(){
  try{
      const response = await fetch('http://localhost:4000/token');
      const data = await response.json();
      return data.access_token;
  } catch(error){
      console.error("Token not fetched", error);
  }
}

// ApI aanspreken in de backend
async function getArtist(artistId) {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: {
        Authorization: 'Bearer ' + accessToken
      }
    });

    console.log("Spotify API response status:", response.status); // Debugging
    const data = await response.json();
    console.log(data.name);
    return data;

  } catch (error) {
      console.error('Error fetching data:', error);
  }
}

// Activeren van de helmet module EN alle bronnen van ander websites worden toegestaan
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js", "https://cdnjs.cloudflare.com/ajax/libs/list.js/2.3.1/list.min.js"],
        connectSrc: ["'self'", "https://api.spotify.com", "http://localhost:4000"],
        frameSrc: ["'self'", "https://open.spotify.com"],
        imgSrc: ["'self'", "data:", "https://i.scdn.co"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com', "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css"],
      },
    },
  })
);

// Middleware Sessions bij het inloggen
app.use(
  sessions({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  }),
);

// ejs templates opstarten
app.set("view engine", "ejs");

// console log op welke poort je bent
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

// maakt het mogelijk om informatie op te halen die in formulieren wordt opgegeven
app.use(express.urlencoded({ extended: true }));

// ******** DATABASE **********
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/?retryWrites=true&w=majority&appName=${process.env.DB_NAME}`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // client closes bij finish/error
  }
}
run().catch(console.dir);

// ******* ROUTES **********
app.get("/", function (req, res) {
  res.render("pages/index");
});

app.get("/inlog", function (req, res) {
  res.render("pages/inlog");
});

app.get("/about", (req, res) => {
  res.render("pages/about");
});

app.get('/tuneder', (req, res) => {
  res.render('pages/tuneder');
});

app.get("/contact", (req, res) => {
  res.render("pages/contact");
});

app.get("/filter-populariteit", function (req, res) {
  res.render("pages/filter-populariteit");
});

app.get("/filter-genre", function (req, res) {
  res.render("pages/filter-genre");
});

app.get("/fout-inlog", function (req, res) {
  res.render("pages/fout-inlog");
});

// **********Account aanmaken plus toevoegen in mongo**********
app.post('/add-account', upload.single('profielFoto'), async (req, res) => {
  const database = client.db("klanten");
  const gebruiker = database.collection("user");

  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  let filename;

  if (req.file && req.file.filename) {
    filename = req.file.filename;
  } else {
    filename = "profiel-placeholder.png";
  }

  const doc = {
    name: xss(req.body.name),
    emailadress: xss(req.body.email),
    password: hashedPassword,
    profielFoto: filename,
    favorieten: [],
  };

  const toevoegen = await gebruiker.insertOne(doc);

  console.log(`A document was inserted with the _id: ${toevoegen.insertedId}`);

  if (toevoegen.insertedId) {
    const newUser = await gebruiker.findOne({ emailadress: doc.emailadress });
    if (newUser) {
      console.log("Gebruiker is gevonden na het toevoegen");
    }
    req.session.user = newUser;
    res.redirect("/profiel");
  } else {
    res.send(`Oops er ging iets fout.`);
  }
});

//Route voor de form van het acount aanmaken
app.get("/aanmelden", (req, res) => {
  res.render("pages/aanmelden");
});

// **********inloggen en check via mongo**********
app.post("/inlog-account", async (req, res) => {
  let artiesten = [];
  const database = client.db("klanten");
  const gebruiker = database.collection("user");

  const query = { emailadress: xss(req.body.email) };

  const user = await gebruiker.findOne(query);

  if (user) {
    const isMatch = await bcrypt.compare(req.body.password, user.password);

    if (isMatch) {
      for (const favoriet of user.favorieten) {
        const artiest = await getArtist(favoriet);
        artiesten.push(artiest);
      }
      req.session.user = user;
      res.render("pages/profiel", { user: req.session.user, artiesten });
    } else {
      res.send("Wachtwoord komt niet overeen");
    }
  } else {
    res.render("pages/fout-inlog");
  }
});

app.get("/profiel", async(req, res) => {
  let artiesten = [];

  if (req.session.user) {
    const database = client.db("klanten");
    const gebruiker = database.collection("user");
    const query = { emailadress: xss(req.session.user.emailadress) };
    const user = await gebruiker.findOne(query);

    for (const favoriet of user.favorieten) {
      const artiest = await getArtist(favoriet);
      artiesten.push(artiest);
    }
    res.render("pages/profiel", { user: req.session.user, artiesten });
  } else {
    res.render("pages/inlog");
  }
});

// **********artiesten opslaan in mongodb**********
app.get("/opgeslagen-artiesten", async (req, res) => {
  let artiesten = [];

  if (!req.session.user) {
    return res.redirect("/inlog");
  }

  const database = client.db("klanten");
  const gebruiker = database.collection("user");

  const query = { emailadress: req.session.user.emailadress };
  const user = await gebruiker.findOne(query);

  if (user) {
    for (const favoriet of user.favorieten) {
      const artiest = await getArtist(favoriet);
      artiesten.push(artiest);
    }

    res.render("pages/opgeslagen-artiesten", { user, artiesten });
  } else {
    res.render("pages/inlog");
  }
});

app.post("/opgeslagen-artiesten", async (req, res) => {
  console.log("Ontvangen artiest ID:", req.body.artistId);

  if (!req.session.user) {
    return res.redirect("/inlog");
  }

  const database = client.db("klanten");
  const gebruiker = database.collection("user");

  const query = { emailadress: req.session.user.emailadress };
  const user = await gebruiker.findOne(query);

  const artiestData = req.body.artistId;
  const index = user.favorieten.indexOf(artiestData);

  if (user) {
    if (artiestData == "") {
      return;
    } else {
      if (index >= 0) {
        user.favorieten.splice(index, 1);
        await gebruiker.updateOne(
          { emailadress: req.session.user.emailadress },
          { $set: { favorieten: user.favorieten } }
        );
        console.log("Artiest is verwijdert uit favorieten");
      } else {
        await gebruiker.updateOne(
          { emailadress: req.session.user.emailadress },
          { $push: { favorieten: artiestData } }
        );
        console.log("Artiest is toegevoegd");
      }
    }
  }
  res.redirect("/opgeslagen-artiesten");
});

// ******** uitloggen **********
app.get("/uitloggen", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Fout bij uitloggen:", err);
      return res.send("Er ging iets mis bij het uitloggen.");
    }
    res.redirect("/inlog");
  });
});

// ******* VRAGEN EN KEUZE OPSLAAN ********
app.post("/populariteit-kiezen", async (req, res) => {
  let populariteit = req.body.populariteit; // slider value ophalen

  req.session.user = req.session.user || {};
  req.session.user.valuePopulariteit = populariteit;

  const database = client.db("klanten");
  const gebruiker = database.collection("user");

  const query = { emailadress: req.session.user.emailadress };
  const user = await gebruiker.findOne(query);

  res.render("pages/tuneder", { user });
});

app.get("/api/populariteit", (req, res) => {
  res.json({ valuePopulariteit: req.session.user });
});

app.post("/genre-kiezen", (req, res) => {
  let selectedGenres = req.body.genre || [];

  req.session.user = req.session.user || {};
  req.session.user.selectedGenres = selectedGenres;

  res.render("pages/filter-populariteit");
});

app.get("/api/genres", (req, res) => {
  if (req.session.user && req.session.user.selectedGenres) {
    res.json({ selectedGenres: req.session.user.selectedGenres });
  } else {
    res.json({ selectedGenres: [] });
  }
});

// ******** SPOTIFY API **********
app.use(cors());

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;

app.get("/token", (req, res) => {
  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(client_id + ":" + client_secret).toString("base64"),
    },
    form: {
      grant_type: "client_credentials",
    },
    json: true,
  };

  request.post(authOptions, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const access_token = body.access_token;
      res.json({ access_token: access_token });
    }
  });
});
