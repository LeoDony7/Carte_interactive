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

/** Gestion du panneau déroulant vertical **/

// Récupération des éléments du DOM
const dropdownPanel = document.getElementById('dropdownPanel');
const toggleButton = document.getElementById('togglePanel');

// Variable pour suivre l'état du panneau (true = ouvert, false = fermé)
let isPanelOpen = false;

// Initialisation : panneau fermé par défaut
dropdownPanel.classList.add('closed');

// Fonction pour basculer l'état du panneau
function togglePanel() {
    // Inverse l'état
    isPanelOpen = !isPanelOpen;
    
    // Met à jour les classes CSS selon l'état
    if (isPanelOpen) {
        dropdownPanel.classList.remove('closed');
        dropdownPanel.classList.add('open');
        console.log('Panneau déroulé'); // Pour le débogage
    } else {
        dropdownPanel.classList.remove('open');
        dropdownPanel.classList.add('closed');
        console.log('Panneau replié'); // Pour le débogage
    }
}

// Ajout de l'écouteur d'événement sur le bouton
toggleButton.addEventListener('click', togglePanel);

// Optionnel : fermer le panneau avec la touche Échap
document.addEventListener('keydown', function(event) {
    // Si la touche Échap est pressée et le panneau est ouvert
    if (event.key === 'Escape' && isPanelOpen) {
        togglePanel();
    }
});

// Optionnel : animation d'entrée au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Petite animation d'apparition du panneau au chargement
    setTimeout(() => {
        dropdownPanel.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            dropdownPanel.style.transform = 'translateY(0)';
        }, 100);
    }, 200);
});