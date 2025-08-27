/**
 * ========================================
 * GESTIONNAIRE DE LISTE DES CARTES
 * Interface pour visualiser, gérer et organiser les cartes sauvegardées
 * ========================================
 */

// ========================================
// VARIABLES GLOBALES
// ========================================

let allMaps = []; // Toutes les cartes chargées
let filteredMaps = []; // Cartes après filtrage/recherche
let selectedMaps = new Set(); // IDs des cartes sélectionnées
let currentView = 'grid'; // 'grid' ou 'list'
let currentSort = 'modified-desc'; // Critère de tri actuel
let mapToDelete = null; // Carte en cours de suppression
let mapToRename = null; // Carte en cours de renommage

// ========================================
// INITIALISATION
// ========================================

/**
 * Fonction principale d'initialisation
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 Initialisation de la liste des cartes...');
    
    try {
        // Vérifier la disponibilité du localStorage
        if (!MapStorage.isStorageAvailable()) {
            showErrorState('Le stockage local n\'est pas disponible');
            return;
        }
        
        // Initialiser l'interface
        initializeEventListeners();
        loadAndDisplayMaps();
        
        console.log('✅ Liste des cartes initialisée');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        showErrorState('Erreur lors du chargement');
    }
});

/**
 * Charge et affiche toutes les cartes
 */
function loadAndDisplayMaps() {
    showLoadingState();
    
    setTimeout(() => { // Simule un petit délai de chargement
        try {
            // Charger les cartes depuis le stockage
            allMaps = MapStorage.getAllMaps();
            
            // Initialiser les cartes filtrées
            filteredMaps = [...allMaps];
            
            // Trier selon le critère par défaut
            sortMaps(currentSort);
            
            // Afficher selon l'état
            if (allMaps.length === 0) {
                showEmptyState();
            } else {
                showMapsGrid();
                updateStats();
            }
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement:', error);
            showErrorState('Erreur lors du chargement des cartes');
        }
    }, 300);
}

// ========================================
// GESTION DES ÉVÉNEMENTS
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
    
    const btnNewMap = document.getElementById('btnNewMap');
    if (btnNewMap) {
        btnNewMap.addEventListener('click', () => {
            window.location.href = 'map-editor.html?new=true';
        });
    }
    
    // === RECHERCHE ===
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    
    if (searchInput) {
        // Recherche en temps réel avec debounce
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                handleSearch(e.target.value);
            }, 300);
        });
    }
    
    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            handleSearch('');
        });
    }
    
    // === CHANGEMENT DE VUE ===
    const gridView = document.getElementById('gridView');
    const listView = document.getElementById('listView');
    
    if (gridView) {
        gridView.addEventListener('click', () => changeView('grid'));
    }
    if (listView) {
        listView.addEventListener('click', () => changeView('list'));
    }
    
    // === TRI ===
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            sortMaps(currentSort);
            displayMaps();
        });
    }
    
    // === ACTIONS EN LOT ===
    const btnBulkExport = document.getElementById('btnBulkExport');
    const btnBulkDelete = document.getElementById('btnBulkDelete');
    
    if (btnBulkExport) {
        btnBulkExport.addEventListener('click', handleBulkExport);
    }
    if (btnBulkDelete) {
        btnBulkDelete.addEventListener('click', handleBulkDelete);
    }
    
    // === MODALES ===
    initializeModals();
    
    // === RACCOURCIS CLAVIER ===
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Initialise les modales
 */
function initializeModals() {
    // Modal de suppression
    initializeDeleteModal();
    
    // Modal de renommage
    initializeRenameModal();
}

/**
 * Initialise la modal de suppression
 */
function initializeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    const closeBtn = document.getElementById('closeDeleteModal');
    const confirmBtn = document.getElementById('confirmDelete');
    const cancelBtn = document.getElementById('cancelDelete');
    
    function closeModal() {
        modal?.classList.remove('active');
        mapToDelete = null;
    }
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    // Fermer en cliquant sur l'overlay
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
    
    // Confirmer la suppression
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if (mapToDelete) {
                executeMapDeletion(mapToDelete);
                closeModal();
            }
        });
    }
}

/**
 * Initialise la modal de renommage
 */
function initializeRenameModal() {
    const modal = document.getElementById('renameModal');
    const closeBtn = document.getElementById('closeRenameModal');
    const cancelBtn = document.getElementById('cancelRename');
    const form = document.getElementById('formRenameMap');
    
    function closeModal() {
        modal?.classList.remove('active');
        mapToRename = null;
    }
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    // Fermer en cliquant sur l'overlay
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
    
    // Soumettre le formulaire de renommage
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const newName = document.getElementById('newMapName').value.trim();
            if (newName && mapToRename) {
                executeMapRename(mapToRename, newName);
                closeModal();
            }
        });
    }
}

// ========================================
// AFFICHAGE DES CARTES
// ========================================

/**
 * Affiche l'état de chargement
 */
function showLoadingState() {
    hideAllStates();
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.style.display = 'flex';
    }
}

/**
 * Affiche l'état vide (aucune carte)
 */
function showEmptyState() {
    hideAllStates();
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
        emptyState.style.display = 'flex';
    }
}

/**
 * Affiche l'état d'erreur
 * @param {string} message - Message d'erreur à afficher
 */
function showErrorState(message) {
    hideAllStates();
    const errorState = document.getElementById('errorState');
    if (errorState) {
        const errorText = errorState.querySelector('p');
        if (errorText && message) {
            errorText.textContent = message;
        }
        errorState.style.display = 'flex';
    }
}

/**
 * Affiche la grille des cartes
 */
function showMapsGrid() {
    hideAllStates();
    const mapsGrid = document.getElementById('mapsGrid');
    if (mapsGrid) {
        mapsGrid.style.display = 'grid';
        displayMaps();
    }
}

/**
 * Cache tous les états d'affichage
 */
function hideAllStates() {
    const states = ['loadingState', 'emptyState', 'errorState'];
    states.forEach(stateId => {
        const element = document.getElementById(stateId);
        if (element) {
            element.style.display = 'none';
        }
    });
}

/**
 * Affiche les cartes dans la grille/liste
 */
function displayMaps() {
    const mapsGrid = document.getElementById('mapsGrid');
    if (!mapsGrid) return;
    
    // Appliquer la classe de vue
    mapsGrid.className = `maps-grid ${currentView === 'list' ? 'list-view' : ''}`;
    
    if (filteredMaps.length === 0) {
        mapsGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>Aucun résultat</h3>
                <p>Aucune carte ne correspond à votre recherche.</p>
            </div>
        `;
        return;
    }
    
    // Générer le HTML des cartes
    mapsGrid.innerHTML = filteredMaps.map(mapData => generateMapCard(mapData)).join('');
    
    // Ajouter les écouteurs d'événements sur les nouvelles cartes
    attachCardEventListeners();
}

/**
 * Génère le HTML pour une carte individuelle
 * @param {Object} mapData - Données de la carte
 * @returns {string} - HTML de la carte
 */
function generateMapCard(mapData) {
        const modifiedDate = new Date(mapData.modified).toLocaleString('fr-FR');
    const isSelected = selectedMaps.has(mapData.id);
    
    return `
        <div class="map-card ${isSelected ? 'selected' : ''}" data-id="${mapData.id}">
            <div class="card-header">
                <h3 class="card-title">${mapData.title || 'Sans titre'}</h3>
                <div class="card-actions">
                    <button class="rename-map" data-id="${mapData.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-map" data-id="${mapData.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="card-body">
                <p><i class="fas fa-map-pin"></i> ${mapData.markers?.length || 0} marqueur(s)</p>
                <p><i class="fas fa-clock"></i> Modifiée : ${modifiedDate}</p>
            </div>
            <div class="card-footer">
                <button class="open-map" data-id="${mapData.id}">
                    <i class="fas fa-folder-open"></i> Ouvrir
                </button>
                <label class="select-map">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} data-id="${mapData.id}">
                    Sélectionner
                </label>
            </div>
        </div>
    `;
}

/**
 * Ajoute les écouteurs d’événements aux cartes affichées
 */
function attachCardEventListeners() {
    document.querySelectorAll('.open-map').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            window.location.href = `map-editor.html?id=${id}`;
        });
    });
    
    document.querySelectorAll('.delete-map').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            mapToDelete = id;
            document.getElementById('deleteModal')?.classList.add('active');
            document.getElementById('mapToDeleteName').textContent =
                allMaps.find(m => m.id === id)?.title || 'Carte';
        });
    });
    
    document.querySelectorAll('.rename-map').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            mapToRename = id;
            document.getElementById('renameModal')?.classList.add('active');
            document.getElementById('newMapName').value =
                allMaps.find(m => m.id === id)?.title || '';
        });
    });
    
    document.querySelectorAll('.select-map input').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const id = checkbox.dataset.id;
            if (checkbox.checked) {
                selectedMaps.add(id);
            } else {
                selectedMaps.delete(id);
            }
            toggleBulkActions();
        });
    });
}

/**
 * Active/désactive l’affichage des actions en lot
 */
function toggleBulkActions() {
    const bulkActions = document.getElementById('bulkActions');
    if (!bulkActions) return;
    bulkActions.style.display = selectedMaps.size > 0 ? 'flex' : 'none';
}

/**
 * Recherche et filtre les cartes
 */
function handleSearch(query) {
    query = query.toLowerCase();
    filteredMaps = allMaps.filter(m =>
        (m.title || '').toLowerCase().includes(query)
    );
    sortMaps(currentSort);
    displayMaps();
}

/**
 * Change la vue (grille ou liste)
 */
function changeView(view) {
    currentView = view;
    document.getElementById('gridView').classList.toggle('active', view === 'grid');
    document.getElementById('listView').classList.toggle('active', view === 'list');
    displayMaps();
}

/**
 * Trie les cartes
 */
function sortMaps(criteria) {
    filteredMaps.sort((a, b) => {
        switch (criteria) {
            case 'modified-asc':
                return new Date(a.modified) - new Date(b.modified);
            case 'modified-desc':
                return new Date(b.modified) - new Date(a.modified);
            case 'title-asc':
                return (a.title || '').localeCompare(b.title || '');
            case 'title-desc':
                return (b.title || '').localeCompare(a.title || '');
            case 'markers-asc':
                return (a.markers?.length || 0) - (b.markers?.length || 0);
            case 'markers-desc':
                return (b.markers?.length || 0) - (a.markers?.length || 0);
            default:
                return 0;
        }
    });
}

/**
 * Met à jour les statistiques
 */
function updateStats() {
    document.getElementById('totalMapsCount').textContent = allMaps.length;
    document.getElementById('totalMarkersCount').textContent = allMaps.reduce((sum, m) => sum + (m.markers?.length || 0), 0);
    document.getElementById('storageUsed').textContent = MapStorage.getStorageSize();
}

/**
 * Exécute la suppression d’une carte
 */
function executeMapDeletion(id) {
    MapStorage.deleteMap(id);
    allMaps = allMaps.filter(m => m.id !== id);
    filteredMaps = filteredMaps.filter(m => m.id !== id);
    selectedMaps.delete(id);
    displayMaps();
    updateStats();
    toggleBulkActions();
}

/**
 * Exécute le renommage d’une carte
 */
function executeMapRename(id, newName) {
    MapStorage.renameMap(id, newName);
    const map = allMaps.find(m => m.id === id);
    if (map) map.title = newName;
    displayMaps();
}

/**
 * Gestion de l’export en lot
 */
function handleBulkExport() {
    const ids = Array.from(selectedMaps);
    if (ids.length === 0) return;
    MapStorage.exportMaps(ids);
}

/**
 * Gestion de la suppression en lot
 */
function handleBulkDelete() {
    const ids = Array.from(selectedMaps);
    ids.forEach(id => executeMapDeletion(id));
    selectedMaps.clear();
    toggleBulkActions();
}

/**
 * Raccourcis clavier
 */
function handleKeyboardShortcuts(e) {
    if (e.key === 'Delete' && selectedMaps.size > 0) {
        handleBulkDelete();
    }
}
