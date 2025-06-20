//de access spotify access token van de backend ophalen
async function getAccessToken(){
    try{
        const response = await fetch('http://localhost:4000/token');
        const data = await response.json();
        return data.access_token;
    } catch(error){
        console.error("Token not fetched", error)
    }
}

//zoeken randomizen
function getRandomSearch() {
  // lijst van allemaal lowercase letters
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  // haal een random letter uit deze lijst
  const randomCharacter = characters.charAt(Math.floor(Math.random() * characters.length));
  // deze letter returnen als zoek term
  return randomCharacter;
}








// Voeg de event listener toe aan de hart-container
const heartContainer = document.querySelector(".heart-container");
heartContainer.addEventListener('click', hartjeKlikken);





//carousel 

const swiper = new Swiper('.swiper', {
  // Optional parameters
  loop: true,

  // If we need pagination
  pagination: {
    el: '.swiper-pagination',
  },

  // Navigation arrows
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },

  // And if we need scrollbar
  scrollbar: {
    el: '.swiper-scrollbar',
  },
});







//maak een variabel aan voor de value display en de slider
let valueDisplayTuneder = document.getElementById('valueTuneder')
let rangeSliderTuneder = document.getElementById('rangeSliderTuneder')

//zorgt ervoor dat de initiële waarde wordt weergegeven
valueDisplayTuneder.textContent = rangeSliderTuneder.value;

//functie om de value van de populariteits slider die je bij de vrage hebt opgegeven zichtbaar te maken
let sliderPopulariteit; 
async function fetchPopulariteit() {
    try {
    const response = await fetch("/api/populariteit");
    const data = await response.json();
    sliderPopulariteit = parseInt(data.valuePopulariteit.valuePopulariteit);
    console.log("Session Popularity Value:", sliderPopulariteit);

    //link de tuneder range slider aan de waarde die je hebt opgegeven bij de vraag
    rangeSliderTuneder.value = sliderPopulariteit;
    valueDisplayTuneder.textContent = rangeSliderTuneder.value;

    } catch (error) {
    console.error("Error fetching popularity:", error);
    }
}

fetchPopulariteit();


//update de waarde wanneer de slider beweegt
rangeSliderTuneder.addEventListener('input', function (event) {
    console.log("Slider moved! New value: ", event.target.value);
    valueDisplayTuneder.textContent = event.target.value;
});




// Genres ophalen uit de backend als API call
let geselecteerdeGenre;
async function fetchGenres() {
    try {
        const response = await fetch("/api/genres");
        const data = await response.json();
        
        if (data.selectedGenres && data.selectedGenres.length > 0) {
            geselecteerdeGenre = data.selectedGenres;
            console.log("Geselecteerde Genres:", geselecteerdeGenre);

            // Voeg het geselecteerde genre toe als eerste slide in de Swiper
            genreInSwiper(geselecteerdeGenre);
        } else {
            console.log("Geen genres ontvangen van de backend.");
        }
    } catch (error) {
        console.error("Error fetching genres:", error);
    }
}
        


// Functie om het geselecteerde genre in de Swiper te zetten als eerste slide
function genreInSwiper(genre) {
    const swiperWrapper = document.querySelector(".swiper-wrapper");
    
    if (swiperWrapper && genre) {
        // Maak een nieuwe div voor de slide
        const newSlide = document.createElement("div");
        newSlide.classList.add("swiper-slide");
        newSlide.textContent = genre; // Genre als tekst erin zetten

        // Voeg de nieuwe slide als eerste child toe
        swiperWrapper.prepend(newSlide);

        // **Update Swiper zodat hij de nieuwe slides herkent**
        swiper.update();
    }
}

fetchGenres();



//meer genres om uit te kiezen toevoegen aan swiper 
//const van een lijst aan random genres

async function getGenres () {
    console.log("probeer genres op te halen")
    try{
        // Access token opvragen voordat de data opgevraagd wordt
        const accessToken = await getAccessToken(); 
        //krijg een random array aan artiesten met een random begin letter
        const response = await fetch(`https://api.spotify.com/v1/search?q=${getRandomSearch()}&type=artist&limit=50`, {
        headers: {
            Authorization: 'Bearer ' + accessToken
        }
        });

        
        console.log("Spotify API response status:", response.status); // Debugging
        //alle artiesten data 
        const data = await response.json();


        let filteredGenres = data.artists.items
        .filter(artist => artist.genres.length > 0) // filter alle genre arrays die leeg zijn
        .flatMap(artist => artist.genres); // laat alle genres in een grote array zien 

         // Verwijder dubbele genres 
        let uniqueGenres = [];
        for (let genre of filteredGenres) {
            if (!uniqueGenres.includes(genre)) {
                uniqueGenres.push(genre);
            }
        }

        // Voeg genres toe aan de Swiper
        meerGenresInSwiper(uniqueGenres);

        console.log("Genres:", uniqueGenres); 
    } catch (error) {
        console.error('Error fetching genres:', error);
    }
}


// Functie om extra genres als slides toe te voegen
function meerGenresInSwiper(genres) {
    const swiperWrapper = document.querySelector(".swiper-wrapper");

    if (swiperWrapper && genres.length > 0) {
        genres.forEach(genre => {
            // Maak een nieuwe div voor elke genre-slide
            const newSlide = document.createElement("div");
            newSlide.classList.add("swiper-slide");
            newSlide.textContent = genre; // Genre als tekst erin zetten

            // Voeg de nieuwe slide toe aan de Swiper-wrapper
            swiperWrapper.appendChild(newSlide);

            // **Update Swiper zodat hij de nieuwe slides herkent**
            swiper.update();
        });

        console.log("Genres toegevoegd aan Swiper!");
    }
}

// Haal genres op en voeg ze toe aan de Swiper
getGenres();





//Zoek op basis van slider value en genre die in swiper staat
async function keuzeTonen() {
    try {
        console.log("probeer keuze te laden");

        const accessToken = await getAccessToken(); 

        // Haal het geselecteerde genre uit de actieve Swiper-slide
        let activeSlide = document.querySelector('.swiper-slide-active');
        let geselecteerdGenre = activeSlide ? activeSlide.textContent : null;

        console.log("Geselecteerd genre:", geselecteerdGenre);

        //haal de geselecteerde populariteit op
        let geselecteerdePopulariteit = rangeSliderTuneder.value;


        let gevondenArtiest = null;

        let gevondenArtiesten = null;
    
        // Probeer maximaal 8 keer een artiest te vinden
        for (let i = 0; i < 8; i++) {
            let loadingAnimation = document.getElementById("loading");
            loadingAnimation.classList.remove("hide");

            console.log(`Zoekpoging ${i + 1}...`);
    
            // Nieuwe artiesten ophalen met een willekeurige zoekletter
            const response = await fetch(`https://api.spotify.com/v1/search?q=${getRandomSearch()}&type=artist&limit=50`, {
            headers: { Authorization: 'Bearer ' + accessToken }
            });
    
            console.log("Spotify API response status:", response.status);
            const data = await response.json();

            //zorg ervoor dat geselecteerde genres altijd een array is om foutmeldigen te voorkomen bij het selecteren van maar een genre
            let genresArray;

            if (Array.isArray(geselecteerdGenre)) {
                genresArray = geselecteerdGenre;
            } else {
                genresArray = [geselecteerdGenre];
            }
    
            // Artiesten filteren op populariteit en genres
            gevondenArtiesten = data.artists.items.filter(artist => artist.popularity <= geselecteerdePopulariteit && artist.popularity > 10 && genresArray.some(genre => artist.genres.includes(genre)));
    
            console.log("Gefilterde artiesten:", gevondenArtiesten);
    
            if (gevondenArtiesten.length > 0) {

            // Kies een willekeurige artiest uit de gefilterde lijst
            const random = Math.floor(Math.random() * gevondenArtiesten.length);
            gevondenArtiest = gevondenArtiesten[random];
            console.log("Gevonden artiest:", gevondenArtiest);

            //loading animation stoppen
            let loadingAnimation = document.getElementById("loading");
            loadingAnimation.classList.add("hide");


            // Zet de artiest in de iframe
            let artiestID = gevondenArtiest.id;
            document.getElementById("artiestIframe").src = `https://open.spotify.com/embed/artist/${artiestID}?utm_source=generator`;
            document.getElementById("artiestIframe").style.display = 'block';
            
            //De id meegeven aan de button om die te kunnen opslaan
            document.getElementById('tunderInput').value=gevondenArtiest.id

            break; // Stop de loop als een artiest is gevonden
            }
        }
    
        if (gevondenArtiesten.length == 0) {
            //loading animation stoppen
            let loadingAnimation = document.getElementById("loading");
            loadingAnimation.classList.add("hide");

            console.error("Geen geschikte artiest gevonden na 5 pogingen.");
            //verbergen van Iframe als er geen artiest gevonden wordt
            document.getElementById("artiestIframe").style.display = 'none';
            //dialog laten verschijnen
            const dialog = document.getElementById("errorDialog")
            dialog.showModal();
    
            const closeButton = document.querySelector("dialog button");
    
            closeButton.addEventListener("click", () => {
            dialog.close();
            });
    
            return;
        } 
    
        
        
        } catch (error) {
        console.error("Error fetching artist source", error);
    }
}




//als je op zoek artiest klikt wordt er gezocht
const zoekArtiest = document.getElementById("zoekArtiest");
zoekArtiest.addEventListener("click", keuzeTonen);

//zoek automatisch zodra tuneder pagina opent
document.addEventListener("DOMContentLoaded", async () => {
    await keuzeTonen();
});


//hart split als je op dislike clickt en zoeken start opnieuw
function splitHeart() {
    const heart = document.querySelector(".heart-container");
    heart.classList.add("split");

    // Reset na animatie (na 1000 ms)
    setTimeout(() => {
        heart.classList.remove("split");
    }, 1000);
}

function hartjeKlikken(){
    splitHeart();
    keuzeTonen();
}


document.getElementById('loading').classList.remove('hide');
document.getElementById('loading').classList.add('hide');






