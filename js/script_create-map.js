/* Script de l'interface de modification d'une carte */

// Initialisation de la carte centrée sur la France
const map = L.map('map').setView([46.5, 2.5], 6);

// Fond de carte OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Bouton Return : redirection vers la page d'accueil
document.getElementById('btnReturn').addEventListener('click', () => {
    window.location.href = 'index.html'; 
});
