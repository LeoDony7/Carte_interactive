/**
 * ========================================
 * ÉDITEUR DE CARTE INTERACTIF
 * Adaptation du script original avec architecture multi-pages
 * ========================================
 */

// ========================================
// VARIABLES GLOBALES ET CONFIGURATION
// ========================================

let map; // Instance de la carte Leaflet
let marqueurs = []; // Tableau des marqueurs créés par l'utilisateur
let choixParClickActif = false; // État du mode sélection de coordonnées
let marqueurTemporaire = null; // Marqueur temporaire lors de la sélection
let currentMapData = null; // Données de la carte actuelle (pour modification)

// Configuration par défaut des cartes
const DEFAULT_MAP_CONFIG = {
    center: [46.603354, 1.888334], // Centre de la France par défaut
    zoom: 6,
    title: "Nouvelle carte"
};

// Types de fonds de carte disponibles
const MAP_LAYERS = {
    'standard': {
        name: 'OpenStreetMap',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors'
    },
    'satellite': {
        name: 'Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '© Esri'
    },
    'terrain': {
        name: 'Terrain',
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '© OpenTopoMap contributors'
    }
};

let currentLayer = 'standard'; // Couche actuellement active

// ========================================
// INITIALISATION DE L'APPLICATION
// ========================================

/**
 * Fonction principale d'initialisation
 * Appelée quand le DOM est prêt
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🗺️ Initialisation de l\'éditeur de carte...');
    
    try {
        // Vérifier si on charge une carte existante ou on en crée une nouvelle
        const urlParams = new URLSearchParams(window.location.search);
        const mapId = urlParams.get('id');
        const isNew = urlParams.get('new') === 'true';
        
        if (mapId) {
            // Charger une carte existante
            loadExistingMap(mapId);
        } else if (isNew) {
            // Créer une nouvelle carte
            initializeNewMap();
        } else {
            // Par défaut, créer une nouvelle carte
            initializeNewMap();
        }
        
        // Initialiser les fonctionnalités
        initializeEventListeners();
        initializeUI();
        
        console.log('✅ Éditeur initialisé avec succès');
        showToast('Éditeur chargé avec succès', 'success');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        showToast('Erreur lors du chargement de l\'éditeur', 'error');
    }
});

/**
 * Initialise une nouvelle carte vierge
 */
function initializeNewMap() {
    console.log('📝 Création d\'une nouvelle carte');
    
    // Initialiser la carte Leaflet
    map = L.map('map').setView(DEFAULT_MAP_CONFIG.center, DEFAULT_MAP_CONFIG.zoom);
    
    // Ajouter la couche de tuiles par défaut
    addMapLayer('standard');
    
    // Réinitialiser les données
    marqueurs = [];
    currentMapData = {
        id: null,
        title: DEFAULT_MAP_CONFIG.title,
        center: DEFAULT_MAP_CONFIG.center,
        zoom: DEFAULT_MAP_CONFIG.zoom,
        layer: 'standard',
        markers: [],
        created: new Date().toISOString(),
        modified: new Date().toISOString()
    };
    
    // Mettre à jour l'interface
    updateMapTitle(currentMapData.title);
    updateMarkersList();
    updateMapStats();
}

/**
 * Charge une carte existante depuis le localStorage
 * @param {string} mapId - ID de la carte à charger
 */
function loadExistingMap(mapId) {
    console.log('📂 Chargement de la carte:', mapId);
    
    try {
        const savedMaps = MapStorage.getAllMaps();
        const mapData = savedMaps.find(m => m.id === mapId);
        
        if (!mapData) {
            throw new Error('Carte non trouvée');
        }
        
        currentMapData = mapData;
        
        // Initialiser la carte avec les données sauvées
        map = L.map('map').setView(mapData.center, mapData.zoom);
        addMapLayer(mapData.layer || 'standard');
        
        // Charger les marqueurs
        marqueurs = [];
        if (mapData.markers && mapData.markers.length > 0) {
            mapData.markers.forEach(markerData => {
                addMarkerToMap(markerData, false); // false = ne pas sauvegarder automatiquement
            });
        }
        
        // Mettre à jour l'interface
        updateMapTitle(mapData.title);
        updateMarkersList();
        updateMapStats();
        
        showToast('Carte chargée avec succès', 'success');
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement:', error);
        showToast('Impossible de charger la carte', 'error');
        
        // Fallback : créer une nouvelle carte
        initializeNewMap();
    }
}

/**
 * Ajoute une couche de tuiles à la carte
 * @param {string} layerType - Type de couche (standard, satellite, terrain)
 */
function addMapLayer(layerType) {
    // Supprimer l'ancienne couche si elle existe
    if (window.currentTileLayer) {
        map.removeLayer(window.currentTileLayer);
    }
    
    const layerConfig = MAP_LAYERS[layerType] || MAP_LAYERS.standard;
    
    window.currentTileLayer = L.tileLayer(layerConfig.url, {
        attribution: layerConfig.attribution,
        maxZoom: 19
    }).addTo(map);
    
    currentLayer = layerType;
    console.log('🗺️ Couche changée pour:', layerConfig.name);
}

// ========================================
// GESTION DES ÉVÉNEMENTS UI
// ========================================

/**
 * Initialise tous les écouteurs d'événements
 */
function initializeEventListeners() {
    
    // === NAVIGATION ===
    const btnBack = document.getElementById('btnBack');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    // === SAUVEGARDE ET EXPORT ===
    const btnSave = document.getElementById('btnSave');
    if (btnSave) {
        btnSave.addEventListener('click', saveCurrentMap);
    }
    
    const btnExport = document.getElementById('btnExport');
    if (btnExport) {
        btnExport.addEventListener('click', exportMapAsHTML);
    }
    
    // === GESTION DU PANNEAU ===
    const togglePanel = document.getElementById('togglePanel');
    const controlPanel = document.getElementById('controlPanel');
    
    if (togglePanel && controlPanel) {
        togglePanel.addEventListener('click', () => {
            controlPanel.classList.toggle('expanded');
            
            // Changer l'icône selon l'état
            const icon = togglePanel.querySelector('i');
            if (controlPanel.classList.contains('expanded')) {
                icon.className = 'fas fa-times';
            } else {
                icon.className = 'fas fa-bars';
            }
        });
    }
    
    // === SECTIONS REPLIABLES ===
    const toggleSections = document.querySelectorAll('.toggle-section');
    toggleSections.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Empêche la propagation vers le header
            const section = btn.closest('.section');
            section.classList.toggle('collapsed');
            
            // Rotation de l'icône
            const icon = btn.querySelector('i');
            if (section.classList.contains('collapsed')) {
                icon.style.transform = 'rotate(180deg)';
            } else {
                icon.style.transform = 'rotate(0deg)';
            }
        });
    });
    
    // === FORMULAIRE D'AJOUT DE MARQUEUR ===
    const formAjouter = document.getElementById('formAjouterMarqueur');
    if (formAjouter) {
        formAjouter.addEventListener('submit', handleAddMarker);
    }
    
    const btnAnnulerAjout = document.getElementById('btnAnnulerAjout');
    if (btnAnnulerAjout) {
        btnAnnulerAjout.addEventListener('click', cancelAddMarker);
    }
    
    // === SÉLECTION DE COORDONNÉES ===
    const btnPickCoordinates = document.getElementById('btnPickCoordinates');
    if (btnPickCoordinates) {
        btnPickCoordinates.addEventListener('click', toggleCoordinatePicking);
    }
    
    // === OUTILS DE LA CARTE ===
    const btnCenterView = document.getElementById('btnCenterView');
    if (btnCenterView) {
        btnCenterView.addEventListener('click', centerMapView);
    }
    
    const btnFitMarkers = document.getElementById('btnFitMarkers');
    if (btnFitMarkers) {
        btnFitMarkers.addEventListener('click', fitMapToMarkers);
    }
    
    const btnChangeLayer = document.getElementById('btnChangeLayer');
    if (btnChangeLayer) {
        btnChangeLayer.addEventListener('click', cycleMapLayer);
    }
    
    const btnResetMap = document.getElementById('btnResetMap');
    if (btnResetMap) {
        btnResetMap.addEventListener('click', confirmResetMap);
    }
    
    // === ÉDITION DU TITRE ===
    const btnEditTitle = document.getElementById('btnEditTitle');
    if (btnEditTitle) {
        btnEditTitle.addEventListener('click', openTitleEditor);
    }
    
    // === MODAL DU TITRE ===
    initializeTitleModal();
    
    // === ÉVÉNEMENTS DE LA CARTE ===
    if (map) {
        // Clic sur la carte pour sélectionner des coordonnées
        map.on('click', handleMapClick);
        
        // Mise à jour des coordonnées quand la vue change
        map.on('moveend zoomend', updateMapData);
    }
}

/**
 * Initialise les éléments de l'interface utilisateur
 */
function initializeUI() {
    // Mettre à jour l'interface initiale
    updateMapStats();
    
    // Ajouter des tooltips aux boutons si nécessaire
    addTooltips();
    
    // Initialiser l'état des sections (toutes ouvertes par défaut)
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('collapsed');
    });
}

// ========================================
// GESTION DES MARQUEURS
// ========================================

/**
 * Gère la soumission du formulaire d'ajout de marqueur
 * @param {Event} e - Événement de soumission du formulaire
 */
function handleAddMarker(e) {
    e.preventDefault();
    
    try {
        // Récupérer les valeurs du formulaire
        const titre = document.getElementById('addTitre').value.trim();
        const description = document.getElementById('addDescription').value.trim();
        const lat = parseFloat(document.getElementById('addLatitude').value);
        const lon = parseFloat(document.getElementById('addLongitude').value);
        const couleur = document.getElementById('addCouleur').value;
        const icone = document.getElementById('addIcone').value;
        
        // Validation des données
        if (!titre) {
            showToast('Le titre est obligatoire', 'error');
            return;
        }
        
        if (isNaN(lat) || isNaN(lon)) {
            showToast('Coordonnées invalides', 'error');
            return;
        }
        
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            showToast('Coordonnées hors limites', 'error');
            return;
        }
        
        // Créer les données du marqueur
        const markerData = {
            id: Date.now(), // ID unique basé sur le timestamp
            titre,
            description,
            lat,
            lon,
            couleur,
            icone,
            created: new Date().toISOString()
        };
        
        // Ajouter le marqueur à la carte et à la liste
        addMarkerToMap(markerData, true);
        
        // Réinitialiser le formulaire
        e.target.reset();
        
        // Nettoyer l'état de sélection
        cancelCoordinatePicking();
        
        showToast('Marqueur ajouté avec succès', 'success');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'ajout du marqueur:', error);
        showToast('Erreur lors de l\'ajout du marqueur', 'error');
    }
}

/**
 * Ajoute un marqueur à la carte Leaflet et à la liste interne
 * @param {Object} markerData - Données du marqueur
 * @param {boolean} shouldSave - Faut-il sauvegarder automatiquement ?
 */
function addMarkerToMap(markerData, shouldSave = true) {
    try {
        // Déterminer la couleur du texte en fonction de la couleur de fond
        const iconColor = getContrastingColor(markerData.couleur);
        
        // Créer l'icône personnalisée
        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:${markerData.couleur};color:${iconColor}" class="marker-pin">${markerData.icone}</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 40], // Point d'ancrage au bas du marqueur
            popupAnchor: [0, -40] // Position de la popup par rapport au marqueur
        });
        
        // Créer le marqueur Leaflet
        const marker = L.marker([markerData.lat, markerData.lon], { icon }).addTo(map);
        
        // Ajouter popup avec contenu riche
        const popupContent = `
            <div class="marker-popup">
                <h4>${markerData.titre}</h4>
                ${markerData.description ? `<p>${markerData.description}</p>` : ''}
                <div class="popup-coords">
                    <i class="fas fa-map-pin"></i>
                    ${markerData.lat.toFixed(4)}, ${markerData.lon.toFixed(4)}
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent, {
            maxWidth: 250,
            className: 'custom-popup'
        });
        
        // Ajouter tooltip
        marker.bindTooltip(markerData.titre, {
            direction: 'top',
            opacity: 0.9,
            offset: [0, -45]
        });
        
        // Ajouter à la liste interne avec référence au marqueur Leaflet
        const markerEntry = { ...markerData, marker };
        marqueurs.push(markerEntry);
        
        // Mettre à jour l'interface
        updateMarkersList();
        updateMapStats();
        
        // Sauvegarder si demandé
        if (shouldSave) {
            autoSave();
        }
        
        console.log('✅ Marqueur ajouté:', markerData.titre);
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'ajout du marqueur:', error);
        throw error;
    }
}

/**
 * Détermine la couleur de texte contrastée selon la couleur de fond
 * @param {string} backgroundColor - Couleur de fond
 * @returns {string} - 'white' ou 'black'
 */
function getContrastingColor(backgroundColor) {
    // Couleurs claires qui nécessitent du texte sombre
    const lightColors = [
        'white', 'lightblue', 'lightgreen', 'lightred', 
        'yellow', 'gray', 'orange', 'cadetblue'
    ];
    
    return lightColors.includes(backgroundColor) ? 'black' : 'white';
}

/**
 * Met à jour l'affichage de la liste des marqueurs
 */
function updateMarkersList() {
    const listeContainer = document.getElementById('listeMarqueurs');
    if (!listeContainer) return;
    
    // Si aucun marqueur, afficher l'état vide
    if (marqueurs.length === 0) {
        listeContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-map-pin"></i>
                <p>Aucun marqueur ajouté</p>
                <p class="empty-subtitle">Commencez par ajouter votre premier marqueur !</p>
            </div>
        `;
        return;
    }
    
    // Générer la liste des marqueurs
    listeContainer.innerHTML = '';
    
    marqueurs.forEach(m => {
        const div = document.createElement('div');
        div.className = 'marqueur-item';
        div.innerHTML = `
            <div class="marker-header">
                <span class="marker-title">${m.titre}</span>
                <div class="marker-actions">
                    <button class="marker-btn" onclick="focusOnMarker(${m.id})" title="Centrer sur ce marqueur">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="marker-btn" onclick="editMarker(${m.id})" title="Modifier ce marqueur">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="marker-btn danger" onclick="confirmDeleteMarker(${m.id})" title="Supprimer ce marqueur">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${m.description ? `<div class="marker-description">${m.description}</div>` : ''}
            <div class="marker-coordinates">
                <i class="fas fa-map-pin"></i>
                ${m.lat.toFixed(4)}, ${m.lon.toFixed(4)}
            </div>
            <div id="edit-form-${m.id}" class="modif-form hidden"></div>
        `;
        
        listeContainer.appendChild(div);
    });
}

/**
 * Centre la carte sur un marqueur spécifique
 * @param {number} markerId - ID du marqueur
 */
function focusOnMarker(markerId) {
    const marker = marqueurs.find(m => m.id === markerId);
    if (marker) {
        map.setView([marker.lat, marker.lon], Math.max(map.getZoom(), 13));
        marker.marker.openPopup();
        showToast(`Centré sur "${marker.titre}"`, 'success');
    }
}

/**
 * Ouvre le formulaire d'édition d'un marqueur
 * @param {number} markerId - ID du marqueur à modifier
 */
function editMarker(markerId) {
    const marker = marqueurs.find(m => m.id === markerId);
    if (!marker) return;
    
    const container = document.getElementById(`edit-form-${markerId}`);
    
    // Générer le formulaire d'édition
    container.innerHTML = `
        <form onsubmit="validateMarkerEdit(event, ${markerId})">
            <div class="form-group">
                <label><i class="fas fa-heading"></i> Titre</label>
                <input type="text" value="${marker.titre}" required>
            </div>
            <div class="form-group">
                <label><i class="fas fa-align-left"></i> Description</label>
                <textarea rows="2">${marker.description}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label><i class="fas fa-palette"></i> Couleur</label>
                    <select>
                        ${generateColorOptions(marker.couleur)}
                    </select>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-icons"></i> Icône</label>
                    <select>
                        ${generateIconOptions(marker.icone)}
                    </select>
                </div>
            </div>
            <div class="marker-coordinates">
                <i class="fas fa-map-pin"></i>
                Coordonnées : ${marker.lat.toFixed(6)}, ${marker.lon.toFixed(6)}
            </div>
            <div class="form-buttons">
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-check"></i> Valider
                </button>
                <button type="button" class="btn btn-secondary" onclick="cancelMarkerEdit(${markerId})">
                    <i class="fas fa-times"></i> Annuler
                </button>
            </div>
        </form>
    `;
    
    container.classList.remove('hidden');
}

/**
 * Génère les options HTML pour le select des couleurs
 * @param {string} selectedColor - Couleur actuellement sélectionnée
 * @returns {string} - HTML des options
 */
function generateColorOptions(selectedColor) {
    const colors = [
        {value: 'red', label: '🔴 Rouge'},
        {value: 'blue', label: '🔵 Bleu'},
        {value: 'green', label: '🟢 Vert'},
        {value: 'orange', label: '🟠 Orange'},
        {value: 'purple', label: '🟣 Violet'},
        {value: 'darkred', label: '🔴 Rouge foncé'},
        {value: 'darkblue', label: '🔵 Bleu foncé'},
        {value: 'darkgreen', label: '🟢 Vert foncé'},
        {value: 'cadetblue', label: '🔷 Bleu gris'},
        {value: 'lightred', label: '🔴 Rouge clair'},
        {value: 'lightblue', label: '🔵 Bleu clair'},
        {value: 'lightgreen', label: '🟢 Vert clair'},
        {value: 'black', label: '⚫ Noir'},
        {value: 'white', label: '⚪ Blanc'},
        {value: 'gray', label: '🔘 Gris'}
    ];
    
    return colors.map(color => 
        `<option value="${color.value}" ${color.value === selectedColor ? 'selected' : ''}>${color.label}</option>`
    ).join('');
}

/**
 * Génère les options HTML pour le select des icônes
 * @param {string} selectedIcon - Icône actuellement sélectionnée
 * @returns {string} - HTML des options
 */
function generateIconOptions(selectedIcon) {
    const icons = [
        {value: '🍴', label: '🍴 Restaurant'},
        {value: '🏛️', label: '🏛️ Musée'},
        {value: '🛍️', label: '🛍️ Shopping'},
        {value: '🎯', label: '🎯 Activité'},
        {value: '🚌', label: '🚌 Transport'},
        {value: '🏨', label: '🏨 Hôtel'},
        {value: '⛱️', label: '⛱️ Plage'},
        {value: '🎭', label: '🎭 Spectacle'},
        {value: '🌲', label: '🌲 Nature'},
        {value: '📷', label: '📷 Photo'},
        {value: '❓', label: '❓ Autre'}
    ];
    
    return icons.map(icon => 
        `<option value="${icon.value}" ${icon.value === selectedIcon ? 'selected' : ''}>${icon.label}</option>`
    ).join('');
}

/**
 * Valide et applique les modifications d'un marqueur
 * @param {Event} e - Événement de soumission
 * @param {number} markerId - ID du marqueur à modifier
 */
function validateMarkerEdit(e, markerId) {
    e.preventDefault();
    
    try {
        const form = e.target;
        const [titreInput, descInput, couleurSelect, iconeSelect] = 
            form.querySelectorAll('input, textarea, select');
        
        const marker = marqueurs.find(m => m.id === markerId);
        if (!marker) {
            showToast('Marqueur non trouvé', 'error');
            return;
        }
        
        // Mettre à jour les données
        marker.titre = titreInput.value.trim();
        marker.description = descInput.value.trim();
        marker.couleur = couleurSelect.value;
        marker.icone = iconeSelect.value;
        marker.modified = new Date().toISOString();
        
        // Mettre à jour l'icône sur la carte
        const iconColor = getContrastingColor(marker.couleur);
        const newIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:${marker.couleur};color:${iconColor}" class="marker-pin">${marker.icone}</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });
        
        marker.marker.setIcon(newIcon);
        
        // Mettre à jour la popup
        const popupContent = `
            <div class="marker-popup">
                <h4>${marker.titre}</h4>
                ${marker.description ? `<p>${marker.description}</p>` : ''}
                <div class="popup-coords">
                    <i class="fas fa-map-pin"></i>
                    ${marker.lat.toFixed(4)}, ${marker.lon.toFixed(4)}
                </div>
            </div>
        `;
        marker.marker.setPopupContent(popupContent);
        
        // Mettre à jour le tooltip
        marker.marker.bindTooltip(marker.titre, {
            direction: 'top',
            opacity: 0.9,
            offset: [0, -45]
        });
        
        // Fermer le formulaire d'édition
        cancelMarkerEdit(markerId);
        
        // Mettre à jour l'interface
        updateMarkersList();
        updateMapStats();
        
        // Sauvegarder
        if (shouldSave) {
            autoSave();
        }
        
        showToast('Marqueur modifié avec succès', 'success');
        
    } catch (error) {
        console.error('❌ Erreur lors de la modification:', error);
        showToast('Erreur lors de la modification', 'error');
    }
}

/**
 * Annule l'édition d'un marqueur
 * @param {number} markerId - ID du marqueur
 */
function cancelMarkerEdit(markerId) {
    const container = document.getElementById(`edit-form-${markerId}`);
    if (container) {
        container.classList.add('hidden');
        container.innerHTML = '';
    }
}

/**
 * Demande confirmation avant de supprimer un marqueur
 * @param {number} markerId - ID du marqueur à supprimer
 */
function confirmDeleteMarker(markerId) {
    const marker = marqueurs.find(m => m.id === markerId);
    if (!marker) return;
    
    const container = document.getElementById(`edit-form-${markerId}`);
    container.innerHTML = `
        <div class="confirm-suppression">
            <p><strong>Supprimer "${marker.titre}" ?</strong></p>
            <p>Cette action est définitive.</p>
            <button onclick="deleteMarker(${markerId})">
                <i class="fas fa-check"></i> Oui, supprimer
            </button>
            <button onclick="cancelMarkerEdit(${markerId})">
                <i class="fas fa-times"></i> Annuler
            </button>
        </div>
    `;
    container.classList.remove('hidden');
}

/**
 * Supprime définitivement un marqueur
 * @param {number} markerId - ID du marqueur à supprimer
 */
function deleteMarker(markerId) {
    try {
        const index = marqueurs.findIndex(m => m.id === markerId);
        if (index === -1) {
            showToast('Marqueur non trouvé', 'error');
            return;
        }
        
        // Supprimer de la carte Leaflet
        map.removeLayer(marqueurs[index].marker);
        
        // Supprimer de la liste interne
        const deletedMarker = marqueurs.splice(index, 1)[0];
        
        // Mettre à jour l'interface
        updateMarkersList();
        updateMapStats();
        
        // Sauvegarder
        autoSave();
        
        showToast(`"${deletedMarker.titre}" supprimé`, 'success');
        
    } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error);
        showToast('Erreur lors de la suppression', 'error');
    }
}

// ========================================
// GESTION DES COORDONNÉES PAR CLIC
// ========================================

/**
 * Active/désactive le mode sélection de coordonnées par clic
 */
function toggleCoordinatePicking() {
    choixParClickActif = !choixParClickActif;
    
    const btnPick = document.getElementById('btnPickCoordinates');
    const mapContainer = document.getElementById('map');
    
    if (choixParClickActif) {
        // Activer le mode sélection
        btnPick.textContent = '❌ Annuler la sélection';
        btnPick.classList.add('active');
        mapContainer.classList.add('picking-coordinates');
        showToast('Cliquez sur la carte pour choisir la position', 'warning');
    } else {
        // Désactiver le mode sélection
        cancelCoordinatePicking();
    }
}

/**
 * Annule la sélection de coordonnées
 */
function cancelCoordinatePicking() {
    choixParClickActif = false;
    
    const btnPick = document.getElementById('btnPickCoordinates');
    const mapContainer = document.getElementById('map');
    
    if (btnPick) {
        btnPick.innerHTML = '<i class="fas fa-mouse-pointer"></i> Cliquer sur la carte';
        btnPick.classList.remove('active');
    }
    
    if (mapContainer) {
        mapContainer.classList.remove('picking-coordinates');
    }
    
    // Supprimer le marqueur temporaire
    if (marqueurTemporaire) {
        map.removeLayer(marqueurTemporaire);
        marqueurTemporaire = null;
    }
}

/**
 * Gère les clics sur la carte
 * @param {Event} e - Événement de clic Leaflet
 */
function handleMapClick(e) {
    if (!choixParClickActif) return;
    
    const { lat, lng } = e.latlng;
    
    // Mettre à jour les champs de coordonnées
    const latInput = document.getElementById('addLatitude');
    const lonInput = document.getElementById('addLongitude');
    
    if (latInput) latInput.value = lat.toFixed(6);
    if (lonInput) lonInput.value = lng.toFixed(6);
    
    // Afficher un marqueur temporaire
    if (marqueurTemporaire) {
        map.removeLayer(marqueurTemporaire);
    }
    
    marqueurTemporaire = L.marker([lat, lng], {
        opacity: 0.6,
        className: 'marker-temporary'
    }).addTo(map);
    
    // Désactiver automatiquement le mode sélection
    cancelCoordinatePicking();
    
    showToast('Coordonnées sélectionnées', 'success');
}

/**
 * Annule l'ajout d'un marqueur et nettoie le formulaire
 */
function cancelAddMarker() {
    const form = document.getElementById('formAjouterMarqueur');
    if (form) {
        form.reset();
    }
    
    cancelCoordinatePicking();
    showToast('Ajout annulé', 'warning');
}

// ========================================
// OUTILS DE LA CARTE
// ========================================

/**
 * Centre la vue de la carte sur la position par défaut
 */
function centerMapView() {
    map.setView(DEFAULT_MAP_CONFIG.center, DEFAULT_MAP_CONFIG.zoom);
    showToast('Vue centrée', 'success');
}

/**
 * Ajuste la vue pour afficher tous les marqueurs
 */
function fitMapToMarkers() {
    if (marqueurs.length === 0) {
        showToast('Aucun marqueur à afficher', 'warning');
        return;
    }
    
    // Créer un groupe avec tous les marqueurs
    const group = new L.featureGroup(marqueurs.map(m => m.marker));
    
    // Ajuster la vue
    map.fitBounds(group.getBounds(), {
        padding: [20, 20] // Marge de 20px autour des marqueurs
    });
    
    showToast('Vue ajustée aux marqueurs', 'success');
}

/**
 * Cycle à travers les différentes couches de carte
 */
function cycleMapLayer() {
    const layerKeys = Object.keys(MAP_LAYERS);
    const currentIndex = layerKeys.indexOf(currentLayer);
    const nextIndex = (currentIndex + 1) % layerKeys.length;
    const nextLayer = layerKeys[nextIndex];
    
    addMapLayer(nextLayer);
    
    // Mettre à jour les données de la carte
    if (currentMapData) {
        currentMapData.layer = nextLayer;
    }
    
    showToast(`Fond changé : ${MAP_LAYERS[nextLayer].name}`, 'success');
}

/**
 * Demande confirmation avant de réinitialiser la carte
 */
function confirmResetMap() {
    if (marqueurs.length === 0) {
        showToast('La carte est déjà vide', 'warning');
        return;
    }
    
    const confirmed = confirm(
        `Supprimer tous les ${marqueurs.length} marqueurs ?\n\n` +
        'Cette action est définitive et ne peut pas être annulée.'
    );
    
    if (confirmed) {
        resetMap();
    }
}

/**
 * Réinitialise complètement la carte
 */
function resetMap() {
    try {
        // Supprimer tous les marqueurs de la carte
        marqueurs.forEach(m => {
            if (m.marker) {
                map.removeLayer(m.marker);
            }
        });
        
        // Vider la liste interne
        marqueurs = [];
        
        // Nettoyer le marqueur temporaire
        if (marqueurTemporaire) {
            map.removeLayer(marqueurTemporaire);
            marqueurTemporaire = null;
        }
        
        // Mettre à jour l'interface
        updateMarkersList();
        updateMapStats();
        
        // Sauvegarder l'état vide
        autoSave();
        
        showToast('Carte réinitialisée', 'success');
        
    } catch (error) {
        console.error('❌ Erreur lors de la réinitialisation:', error);
        showToast('Erreur lors de la réinitialisation', 'error');
    }
}

// ========================================
// GESTION DU TITRE DE LA CARTE
// ========================================

/**
 * Ouvre le modal d'édition du titre
 */
function openTitleEditor() {
    const modal = document.getElementById('titleModal');
    const input = document.getElementById('newMapTitle');
    
    if (modal && input) {
        input.value = currentMapData?.title || '';
        modal.classList.add('active');
        
        // Focus sur l'input après l'animation
        setTimeout(() => {
            input.focus();
            input.select();
        }, 300);
    }
}

/**
 * Initialise les événements du modal de titre
 */
function initializeTitleModal() {
    const modal = document.getElementById('titleModal');
    const closeBtn = document.getElementById('closeTitleModal');
    const cancelBtn = document.getElementById('cancelTitleEdit');
    const form = document.getElementById('formEditTitle');
    
    // Fermer le modal
    function closeModal() {
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    // Fermer en cliquant sur l'overlay
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    // Fermer avec Échap
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.classList.contains('active')) {
            closeModal();
        }
    });
    
    // Soumettre le formulaire
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const newTitle = document.getElementById('newMapTitle').value.trim();
            if (newTitle && newTitle !== currentMapData?.title) {
                updateMapTitle(newTitle);
                
                if (currentMapData) {
                    currentMapData.title = newTitle;
                    currentMapData.modified = new Date().toISOString();
                }
                
                autoSave();
                showToast('Titre mis à jour', 'success');
            }
            
            closeModal();
        });
    }
}

/**
 * Met à jour le titre affiché de la carte
 * @param {string} newTitle - Nouveau titre
 */
function updateMapTitle(newTitle) {
    const titleElement = document.getElementById('mapTitle');
    if (titleElement) {
        titleElement.textContent = newTitle;
    }
}

// ========================================
// SAUVEGARDE ET EXPORT
// ========================================

/**
 * Sauvegarde automatique de la carte
 */
function autoSave() {
    if (!currentMapData) return;
    
    try {
        // Mettre à jour les données avec l'état actuel
        currentMapData.markers = marqueurs.map(m => ({
            id: m.id,
            titre: m.titre,
            description: m.description,
            lat: m.lat,
            lon: m.lon,
            couleur: m.couleur,
            icone: m.icone,
            created: m.created,
            modified: m.modified || m.created
        }));
        
        currentMapData.center = map.getCenter();
        currentMapData.zoom = map.getZoom();
        currentMapData.layer = currentLayer;
        currentMapData.modified = new Date().toISOString();
        
        // Sauvegarder via MapStorage
        const savedId = MapStorage.saveMap(currentMapData);
        
        if (!currentMapData.id) {
            currentMapData.id = savedId;
            // Mettre à jour l'URL sans recharger la page
            const newUrl = `${window.location.pathname}?id=${savedId}`;
            window.history.replaceState({}, '', newUrl);
        }
        
        // Mettre à jour l'affichage de la dernière sauvegarde
        updateLastSavedTime();
        
    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde automatique:', error);
    }
}

/**
 * Sauvegarde manuelle de la carte (bouton Sauvegarder)
 */
function saveCurrentMap() {
    const btnSave = document.getElementById('btnSave');
    
    try {
        // Animation de chargement
        if (btnSave) {
            btnSave.classList.add('loading');
            btnSave.disabled = true;
        }
        
        // Effectuer la sauvegarde
        autoSave();
        
        showToast('Carte sauvegardée avec succès', 'success');
        
    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde:', error);
        showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
        // Retirer l'animation de chargement
        if (btnSave) {
            setTimeout(() => {
                btnSave.classList.remove('loading');
                btnSave.disabled = false;
            }, 500);
        }
    }
}

/**
 * Exporte la carte au format HTML
 */
function exportMapAsHTML() {
    const btnExport = document.getElementById('btnExport');
    
    try {
        // Animation de chargement
        if (btnExport) {
            btnExport.classList.add('loading');
            btnExport.disabled = true;
        }
        
        if (!currentMapData || marqueurs.length === 0) {
            showToast('Aucun marqueur à exporter', 'warning');
            return;
        }
        
        // Générer le HTML de la carte exportée
        const exportHTML = generateExportHTML();
        
        // Créer et télécharger le fichier
        const blob = new Blob([exportHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentMapData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        showToast('Carte exportée avec succès', 'success');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'export:', error);
        showToast('Erreur lors de l\'export', 'error');
    } finally {
        // Retirer l'animation de chargement
        if (btnExport) {
            setTimeout(() => {
                btnExport.classList.remove('loading');
                btnExport.disabled = false;
            }, 1000);
        }
    }
}

/**
 * Génère le HTML pour l'export de carte
 * @returns {string} - Code HTML complet de la carte
 */
function generateExportHTML() {
    const mapCenter = map.getCenter();
    const mapZoom = map.getZoom();
    
    // Générer les marqueurs en JavaScript
    const markersJS = marqueurs.map(m => {
        return `
        {
            lat: ${m.lat},
            lng: ${m.lon},
            title: "${m.titre.replace(/"/g, '\\"')}",
            description: "${m.description.replace(/"/g, '\\"')}",
            color: "${m.couleur}",
            icon: "${m.icone}"
        }`;
    }).join(',');
    
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${currentMapData.title} - Carte Interactive</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body { margin: 0; font-family: Arial, sans-serif; }
        #map { height: 100vh; width: 100%; }
        .custom-div-icon .marker-pin {
            padding: 4px 8px;
            border-radius: 20px;
            font-size: 1.2em;
            text-align: center;
            line-height: 1.4em;
            display: inline-block;
            min-width: 32px;
            min-height: 32px;
            text-shadow: 0 0 2px rgba(0,0,0,0.3);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            border: 2px solid white;
            font-weight: bold;
        }
        .marker-popup h4 {
            margin: 0 0 8px 0;
            color: #1e293b;
        }
        .marker-popup p {
            margin: 0 0 8px 0;
            color: #64748b;
        }
        .popup-coords {
            font-size: 0.8rem;
            color: #94a3b8;
            display: flex;
            align-items: center;
            gap: 4px;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // Initialisation de la carte
        const map = L.map('map').setView([${mapCenter.lat}, ${mapCenter.lng}], ${mapZoom});
        
        // Ajouter la couche de tuiles
        L.tileLayer('${MAP_LAYERS[currentLayer].url}', {
            attribution: '${MAP_LAYERS[currentLayer].attribution}'
        }).addTo(map);
        
        // Fonction pour déterminer la couleur contrastée
        function getContrastingColor(backgroundColor) {
            const lightColors = ['white', 'lightblue', 'lightgreen', 'lightred', 'yellow', 'gray', 'orange', 'cadetblue'];
            return lightColors.includes(backgroundColor) ? 'black' : 'white';
        }
        
        // Données des marqueurs
        const markers = [${markersJS}];
        
        // Ajouter chaque marqueur
        markers.forEach(markerData => {
            const iconColor = getContrastingColor(markerData.color);
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: \`<div style="background-color:\${markerData.color};color:\${iconColor}" class="marker-pin">\${markerData.icon}</div>\`,
                iconSize: [40, 40],
                iconAnchor: [20, 40],
                popupAnchor: [0, -40]
            });
            
            const marker = L.marker([markerData.lat, markerData.lng], { icon }).addTo(map);
            
            const popupContent = \`
                <div class="marker-popup">
                    <h4>\${markerData.title}</h4>
                    \${markerData.description ? \`<p>\${markerData.description}</p>\` : ''}
                    <div class="popup-coords">
                        📍 \${markerData.lat.toFixed(4)}, \${markerData.lng.toFixed(4)}
                    </div>
                </div>
            \`;
            
            marker.bindPopup(popupContent);
            marker.bindTooltip(markerData.title, {
                direction: 'top',
                opacity: 0.9,
                offset: [0, -45]
            });
        });
    </script>
</body>
</html>`;
}

// ========================================
// MISE À JOUR DE L'INTERFACE
// ========================================

/**
 * Met à jour les statistiques affichées de la carte
 */
function updateMapStats() {
    const markerCountElement = document.getElementById('markerCount');
    if (markerCountElement) {
        markerCountElement.textContent = marqueurs.length;
    }
    
    updateLastSavedTime();
}

/**
 * Met à jour l'affichage de la dernière sauvegarde
 */
function updateLastSavedTime() {
    const lastSavedElement = document.getElementById('lastSaved');
    if (lastSavedElement && currentMapData?.modified) {
        const date = new Date(currentMapData.modified);
        lastSavedElement.textContent = date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

/**
 * Met à jour les données de position de la carte
 */
function updateMapData() {
    if (currentMapData && map) {
        currentMapData.center = map.getCenter();
        currentMapData.zoom = map.getZoom();
    }
}

// ========================================
// SYSTÈME DE NOTIFICATIONS TOAST
// ========================================

/**
 * Affiche une notification toast
 * @param {string} message - Message à afficher
 * @param {string} type - Type de toast ('success', 'error', 'warning')
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    // Créer l'élément toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icône selon le type
    let icon = 'fas fa-check';
    if (type === 'error') icon = 'fas fa-exclamation-triangle';
    if (type === 'warning') icon = 'fas fa-exclamation-circle';
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="${icon}"></i>
        </div>
        <div class="toast-message">${message}</div>
    `;
    
    // Ajouter au container
    container.appendChild(toast);
    
    // Animation d'apparition
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Suppression automatique après 4 secondes
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// ========================================
// UTILITAIRES ET HELPERS
// ========================================

/**
 * Ajoute des tooltips aux éléments qui en ont besoin
 */
function addTooltips() {
    // Cette fonction peut être étendue pour ajouter des tooltips personnalisés
    // Pour l'instant, les titles HTML suffisent
}

/**
 * Fonction de debounce pour optimiser les performances
 * @param {Function} func - Fonction à débouncer
 * @param {number} wait - Délai d'attente en ms
 * @returns {Function} - Fonction debouncée
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Validation des données d'entrée
 * @param {Object} data - Données à valider
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validateMarkerData(data) {
    const errors = [];
    
    if (!data.titre || data.titre.trim().length === 0) {
        errors.push('Le titre est obligatoire');
    }
    
    if (isNaN(data.lat) || data.lat < -90 || data.lat > 90) {
        errors.push('Latitude invalide (doit être entre -90 et 90)');
    }
    
    if (isNaN(data.lon) || data.lon < -180 || data.lon > 180) {
        errors.push('Longitude invalide (doit être entre -180 et 180)');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

// ========================================
// GESTION DES RACCOURCIS CLAVIER
// ========================================

/**
 * Gère les raccourcis clavier globaux
 */
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + S = Sauvegarder
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentMap();
    }
    
    // Ctrl/Cmd + E = Exporter
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        exportMapAsHTML();
    }
    
    // Ctrl/Cmd + N = Nouvelle carte (retour à l'accueil)
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (confirm('Retourner à l\'accueil ? Les modifications non sauvegardées seront perdues.')) {
            window.location.href = 'index.html';
        }
    }
    
    // Échap = Annuler l'action en cours
    if (e.key === 'Escape') {
        if (choixParClickActif) {
            cancelCoordinatePicking();
        }
    }
});

// ========================================
// FONCTIONNALITÉS AVANCÉES
// ========================================

/**
 * Ajoute des marqueurs fixes prédéfinis (comme dans ton code original)
 * Cette fonction peut être appelée pour ajouter des points d'intérêt fixes
 */
function ajouterMarqueursFixes() {
    const marqueursFixes = [
        {
            lat: 49.1870, 
            lon: -0.3660, 
            titre: "Air BnB",
            description: "106 rue de Geôle",
            couleur: "darkred",
            icone: "🏠"
        },
        {
            lat: 49.1759, 
            lon: -0.3486, 
            titre: "Gare de Caen",
            description: "Station de train",
            couleur: "gray",
            icone: "🚉"
        },
        {
            lat: 49.4486, 
            lon: 1.0941, 
            titre: "Gare de Rouen",
            description: "Station de train",
            couleur: "gray",
            icone: "🚉"
        }
    ];

    marqueursFixes.forEach(markerData => {
        // Ajouter sans sauvegarder (ce sont des marqueurs fixes)
        addMarkerToMap({
            ...markerData,
            id: `fixed_${Date.now()}_${Math.random()}`, // ID unique pour les fixes
            created: new Date().toISOString()
        }, false);
    });
    
    console.log('📌 Marqueurs fixes ajoutés');
}

/**
 * Recherche de marqueurs par texte
 * @param {string} searchTerm - Terme de recherche
 * @returns {Array} - Marqueurs correspondants
 */
function searchMarkers(searchTerm) {
    if (!searchTerm || searchTerm.trim().length === 0) {
        return marqueurs;
    }
    
    const term = searchTerm.toLowerCase().trim();
    
    return marqueurs.filter(m => 
        m.titre.toLowerCase().includes(term) ||
        m.description.toLowerCase().includes(term)
    );
}

/**
 * Filtre les marqueurs par couleur
 * @param {string} color - Couleur à filtrer
 * @returns {Array} - Marqueurs de cette couleur
 */
function filterMarkersByColor(color) {
    return marqueurs.filter(m => m.couleur === color);
}

// ========================================
// GESTION D'ERREURS ET RÉCUPÉRATION
// ========================================

/**
 * Gestionnaire global d'erreurs
 */
window.addEventListener('error', function(e) {
    console.error('💥 Erreur globale:', e.error);
    showToast('Une erreur inattendue s\'est produite', 'error');
});

/**
 * Gestionnaire pour les promesses rejetées
 */
window.addEventListener('unhandledrejection', function(e) {
    console.error('💥 Promesse rejetée:', e.reason);
    showToast('Erreur lors d\'une opération asynchrone', 'error');
    e.preventDefault();
});

/**
 * Sauvegarde d'urgence avant fermeture de page
 */
window.addEventListener('beforeunload', function(e) {
    try {
        // Tentative de sauvegarde rapide
        if (currentMapData && marqueurs.length > 0) {
            autoSave();
        }
    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde d\'urgence:', error);
    }
});

// ========================================
// FONCTIONS EXPOSÉES GLOBALEMENT
// ========================================

/**
 * Fonction exposée pour le debugging et les appels depuis HTML
 */
window.MapEditor = {
    // Fonctions principales
    saveMap: saveCurrentMap,
    exportMap: exportMapAsHTML,
    resetMap: confirmResetMap,
    
    // Gestion des marqueurs
    addMarker: addMarkerToMap,
    deleteMarker: deleteMarker,
    focusMarker: focusOnMarker,
    editMarker: editMarker,
    
    // Utilitaires
    showToast: showToast,
    searchMarkers: searchMarkers,
    filterMarkers: filterMarkersByColor,
    
    // États
    getCurrentMapData: () => currentMapData,
    getMarkers: () => marqueurs,
    getMapInstance: () => map
};

// ========================================
// FONCTIONS UTILITAIRES POUR L'INTERFACE
// ========================================

/**
 * Met à jour l'état d'un bouton avec animation de chargement
 * @param {HTMLElement} button - Élément bouton
 * @param {boolean} loading - État de chargement
 */
function setButtonLoading(button, loading) {
    if (!button) return;
    
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

/**
 * Applique un thème à l'interface
 * @param {string} theme - 'light' ou 'dark'
 */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Sauvegarder la préférence
    try {
        localStorage.setItem('mapEditorTheme', theme);
    } catch (error) {
        console.warn('Impossible de sauvegarder le thème:', error);
    }
}

/**
 * Charge le thème sauvegardé
 */
function loadSavedTheme() {
    try {
        const savedTheme = localStorage.getItem('mapEditorTheme');
        if (savedTheme) {
            applyTheme(savedTheme);
        }
    } catch (error) {
        console.warn('Impossible de charger le thème sauvegardé:', error);
    }
}

// Charger le thème au démarrage
loadSavedTheme();

console.log('🎯 Script de l\'éditeur de carte chargé avec succès');

// ========================================
// FONCTIONS POUR LA COMPATIBILITÉ HTML
// (Appelées directement depuis le HTML généré)
// ========================================

/**
 * Ces fonctions sont appelées depuis les onclick dans le HTML généré
 * par updateMarkersList(). Elles doivent être globales.
 */

window.focusOnMarker = focusOnMarker;
window.editMarker = editMarker;
window.confirmDeleteMarker = confirmDeleteMarker;
window.deleteMarker = deleteMarker;
window.validateMarkerEdit = validateMarkerEdit;
window.cancelMarkerEdit = cancelMarkerEdit;