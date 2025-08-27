/**
 * ========================================
 * GESTIONNAIRE DE STOCKAGE DES CARTES
 * Gestion centralisée du localStorage pour les cartes
 * ========================================
 */

/**
 * Classe pour gérer le stockage local des cartes
 */
class MapStorage {
    
    // ========================================
    // CONSTANTES DE CONFIGURATION
    // ========================================
    
    static STORAGE_KEY = 'mapCreator_maps'; // Clé principale pour le localStorage
    static SETTINGS_KEY = 'mapCreator_settings'; // Clé pour les paramètres utilisateur
    static MAX_MAPS = 50; // Limite du nombre de cartes stockées
    static VERSION = '1.0.0'; // Version du format de données
    
    // ========================================
    // MÉTHODES DE SAUVEGARDE
    // ========================================
    
    /**
     * Sauvegarde une carte dans le localStorage
     * @param {Object} mapData - Données de la carte à sauvegarder
     * @returns {string} - ID de la carte sauvegardée
     */
    static saveMap(mapData) {
        try {
            console.log('💾 Sauvegarde de la carte:', mapData.title);
            
            // Générer un ID si ce n'est pas déjà fait
            if (!mapData.id) {
                mapData.id = this.generateMapId();
            }
            
            // Ajouter les métadonnées de version et timestamp
            mapData.version = this.VERSION;
            mapData.modified = new Date().toISOString();
            
            // Récupérer les cartes existantes
            const existingMaps = this.getAllMaps();
            
            // Chercher si la carte existe déjà
            const existingIndex = existingMaps.findIndex(map => map.id === mapData.id);
            
            if (existingIndex >= 0) {
                // Mettre à jour la carte existante
                existingMaps[existingIndex] = mapData;
                console.log('🔄 Mise à jour de la carte existante');
            } else {
                // Ajouter une nouvelle carte
                existingMaps.push(mapData);
                console.log('➕ Nouvelle carte ajoutée');
                
                // Vérifier la limite et supprimer les plus anciennes si nécessaire
                this.enforceMapLimit(existingMaps);
            }
            
            // Sauvegarder dans le localStorage
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingMaps));
            
            console.log('✅ Carte sauvegardée avec succès, ID:', mapData.id);
            return mapData.id;
            
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde:', error);
            
            // Si l'erreur est due à un quota dépassé
            if (error.name === 'QuotaExceededError') {
                this.handleStorageQuotaExceeded();
                throw new Error('Espace de stockage insuffisant. Supprimez quelques cartes anciennes.');
            }
            
            throw new Error('Impossible de sauvegarder la carte');
        }
    }
    
    /**
     * Génère un ID unique pour une nouvelle carte
     * @returns {string} - ID unique
     */
    static generateMapId() {
        // Combinaison timestamp + nombre aléatoire pour garantir l'unicité
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `map_${timestamp}_${random}`;
    }
    
    /**
     * Applique la limite du nombre de cartes et supprime les plus anciennes
     * @param {Array} maps - Tableau des cartes
     */
    static enforceMapLimit(maps) {
        if (maps.length > this.MAX_MAPS) {
            // Trier par date de création (plus anciennes en premier)
            maps.sort((a, b) => new Date(a.created) - new Date(b.created));
            
            // Supprimer les plus anciennes
            const toRemove = maps.length - this.MAX_MAPS;
            const removed = maps.splice(0, toRemove);
            
            console.log(`🗑️ ${toRemove} cartes anciennes supprimées pour respecter la limite`);
        }
    }
    
    // ========================================
    // MÉTHODES DE RÉCUPÉRATION
    // ========================================
    
    /**
     * Récupère toutes les cartes sauvegardées
     * @returns {Array} - Tableau des cartes
     */
    static getAllMaps() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (!data) return [];
            
            const maps = JSON.parse(data);
            
            // Validation et migration si nécessaire
            return maps.filter(map => this.validateMapData(map));
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement des cartes:', error);
            return [];
        }
    }
    
    /**
     * Récupère une carte spécifique par son ID
     * @param {string} mapId - ID de la carte
     * @returns {Object|null} - Données de la carte ou null si non trouvée
     */
    static getMapById(mapId) {
        const allMaps = this.getAllMaps();
        return allMaps.find(map => map.id === mapId) || null;
    }
    
    /**
     * Récupère les cartes les plus récentes
     * @param {number} limit - Nombre maximum de cartes à retourner
     * @returns {Array} - Cartes triées par date de modification (plus récentes en premier)
     */
    static getRecentMaps(limit = 10) {
        const allMaps = this.getAllMaps();
        
        return allMaps
            .sort((a, b) => new Date(b.modified) - new Date(a.modified))
            .slice(0, limit);
    }
    
    // ========================================
    // MÉTHODES DE SUPPRESSION
    // ========================================
    
    /**
     * Supprime une carte par son ID
     * @param {string} mapId - ID de la carte à supprimer
     * @returns {boolean} - true si supprimée avec succès
     */
    static deleteMap(mapId) {
        try {
            const allMaps = this.getAllMaps();
            const initialCount = allMaps.length;
            
            const filteredMaps = allMaps.filter(map => map.id !== mapId);
            
            if (filteredMaps.length === initialCount) {
                console.warn('⚠️ Carte non trouvée pour suppression:', mapId);
                return false;
            }
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredMaps));
            console.log('🗑️ Carte supprimée:', mapId);
            
            return true;
            
        } catch (error) {
            console.error('❌ Erreur lors de la suppression:', error);
            return false;
        }
    }
    
    /**
     * Supprime toutes les cartes (réinitialisation complète)
     * @returns {boolean} - true si suppression réussie
     */
    static deleteAllMaps() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('🗑️ Toutes les cartes supprimées');
            return true;
        } catch (error) {
            console.error('❌ Erreur lors de la suppression totale:', error);
            return false;
        }
    }
    
    // ========================================
    // VALIDATION ET MIGRATION
    // ========================================
    
    /**
     * Valide la structure d'une carte
     * @param {Object} mapData - Données de la carte à valider
     * @returns {boolean} - true si la carte est valide
     */
    static validateMapData(mapData) {
        // Vérifications de base
        if (!mapData || typeof mapData !== 'object') return false;
        if (!mapData.id || typeof mapData.id !== 'string') return false;
        if (!mapData.title || typeof mapData.title !== 'string') return false;
        if (!mapData.created || !mapData.modified) return false;
        
        // Vérifier la structure des marqueurs
        if (mapData.markers && Array.isArray(mapData.markers)) {
            for (const marker of mapData.markers) {
                if (!this.validateMarkerData(marker)) {
                    console.warn('⚠️ Marqueur invalide détecté dans la carte:', mapData.id);
                    // On peut choisir de filtrer les marqueurs invalides plutôt que de rejeter toute la carte
                }
            }
        }
        
        return true;
    }
    
    /**
     * Valide la structure d'un marqueur
     * @param {Object} markerData - Données du marqueur à valider
     * @returns {boolean} - true si le marqueur est valide
     */
    static validateMarkerData(markerData) {
        if (!markerData || typeof markerData !== 'object') return false;
        if (typeof markerData.id === 'undefined') return false;
        if (!markerData.titre || typeof markerData.titre !== 'string') return false;
        if (typeof markerData.lat !== 'number' || isNaN(markerData.lat)) return false;
        if (typeof markerData.lon !== 'number' || isNaN(markerData.lon)) return false;
        if (!markerData.couleur || !markerData.icone) return false;
        
        return true;
    }
    
    // ========================================
    // GESTION DES PARAMÈTRES UTILISATEUR
    // ========================================
    
    /**
     * Sauvegarde les paramètres utilisateur
     * @param {Object} settings - Paramètres à sauvegarder
     */
    static saveSettings(settings) {
        try {
            const currentSettings = this.getSettings();
            const updatedSettings = { ...currentSettings, ...settings };
            
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updatedSettings));
            console.log('⚙️ Paramètres sauvegardés:', updatedSettings);
            
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde des paramètres:', error);
        }
    }
    
    /**
     * Récupère les paramètres utilisateur
     * @returns {Object} - Paramètres utilisateur avec valeurs par défaut
     */
    static getSettings() {
        try {
            const data = localStorage.getItem(this.SETTINGS_KEY);
            const defaultSettings = {
                theme: 'light',
                defaultMapCenter: [46.603354, 1.888334],
                defaultZoom: 6,
                defaultLayer: 'standard',
                autoSave: true,
                showTooltips: true,
                language: 'fr'
            };
            
            if (!data) return defaultSettings;
            
            const saved = JSON.parse(data);
            return { ...defaultSettings, ...saved };
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement des paramètres:', error);
            return this.getDefaultSettings();
        }
    }
    
    /**
     * Retourne les paramètres par défaut
     * @returns {Object} - Paramètres par défaut
     */
    static getDefaultSettings() {
        return {
            theme: 'light',
            defaultMapCenter: [46.603354, 1.888334],
            defaultZoom: 6,
            defaultLayer: 'standard',
            autoSave: true,
            showTooltips: true,
            language: 'fr'
        };
    }
    
    // ========================================
    // UTILITAIRES ET MAINTENANCE
    // ========================================
    
    /**
     * Obtient des statistiques sur le stockage
     * @returns {Object} - Statistiques détaillées
     */
    static getStorageStats() {
        try {
            const maps = this.getAllMaps();
            const settings = this.getSettings();
            
            // Calculer la taille approximative en localStorage
            let totalSize = 0;
            for (let key in localStorage) {
                if (key.startsWith('mapCreator_')) {
                    totalSize += localStorage.getItem(key).length;
                }
            }
            
            // Statistiques des marqueurs
            let totalMarkers = 0;
            let oldestMap = null;
            let newestMap = null;
            
            maps.forEach(map => {
                if (map.markers) {
                    totalMarkers += map.markers.length;
                }
                
                const createdDate = new Date(map.created);
                if (!oldestMap || createdDate < new Date(oldestMap.created)) {
                    oldestMap = map;
                }
                if (!newestMap || createdDate > new Date(newestMap.created)) {
                    newestMap = map;
                }
            });
            
            return {
                totalMaps: maps.length,
                maxMaps: this.MAX_MAPS,
                totalMarkers,
                storageSize: totalSize,
                oldestMap: oldestMap ? {
                    id: oldestMap.id,
                    title: oldestMap.title,
                    created: oldestMap.created
                } : null,
                newestMap: newestMap ? {
                    id: newestMap.id,
                    title: newestMap.title,
                    created: newestMap.created
                } : null,
                settings
            };
            
        } catch (error) {
            console.error('❌ Erreur lors du calcul des statistiques:', error);
            return null;
        }
    }
    
    /**
     * Nettoie le stockage en supprimant les données corrompues
     * @returns {Object} - Résultats du nettoyage
     */
    static cleanupStorage() {
        try {
            console.log('🧹 Nettoyage du stockage...');
            
            const allMaps = this.getAllMaps();
            const validMaps = [];
            let removedCount = 0;
            let fixedCount = 0;
            
            allMaps.forEach(map => {
                if (this.validateMapData(map)) {
                    // Nettoyer les marqueurs invalides
                    if (map.markers && Array.isArray(map.markers)) {
                        const validMarkers = map.markers.filter(marker => 
                            this.validateMarkerData(marker)
                        );
                        
                        if (validMarkers.length < map.markers.length) {
                            map.markers = validMarkers;
                            fixedCount++;
                            console.log(`🔧 Marqueurs invalides supprimés de la carte: ${map.title}`);
                        }
                    }
                    
                    validMaps.push(map);
                } else {
                    removedCount++;
                    console.warn(`🗑️ Carte invalide supprimée: ${map.title || 'Sans titre'}`);
                }
            });
            
            // Sauvegarder les cartes nettoyées
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validMaps));
            
            const result = {
                totalProcessed: allMaps.length,
                validMaps: validMaps.length,
                removedMaps: removedCount,
                fixedMaps: fixedCount
            };
            
            console.log('✅ Nettoyage terminé:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Erreur lors du nettoyage:', error);
            throw error;
        }
    }
    
    /**
     * Gère le dépassement de quota de stockage
     */
    static handleStorageQuotaExceeded() {
        console.warn('⚠️ Quota de stockage dépassé, tentative de nettoyage...');
        
        try {
            const maps = this.getAllMaps();
            
            if (maps.length > 10) {
                // Supprimer les 25% les plus anciennes
                const toRemove = Math.floor(maps.length * 0.25);
                maps.sort((a, b) => new Date(a.created) - new Date(b.created));
                maps.splice(0, toRemove);
                
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(maps));
                console.log(`🗑️ ${toRemove} cartes anciennes supprimées pour libérer de l'espace`);
            }
            
        } catch (error) {
            console.error('❌ Impossible de libérer de l\'espace:', error);
        }
    }
    
    // ========================================
    // IMPORT/EXPORT DE DONNÉES
    // ========================================
    
    /**
     * Exporte toutes les cartes au format JSON
     * @returns {string} - JSON des cartes
     */
    static exportAllMaps() {
        try {
            const maps = this.getAllMaps();
            const settings = this.getSettings();
            
            const exportData = {
                version: this.VERSION,
                exported: new Date().toISOString(),
                settings,
                maps
            };
            
            return JSON.stringify(exportData, null, 2);
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'export:', error);
            throw error;
        }
    }
    
    /**
     * Importe des cartes depuis un JSON
     * @param {string} jsonData - Données JSON à importer
     * @param {boolean} replace - Remplacer les données existantes ?
     * @returns {Object} - Résultats de l'import
     */
    static importMaps(jsonData, replace = false) {
        try {
            console.log('📥 Import de cartes...');
            
            const importData = JSON.parse(jsonData);
            
            // Validation de base du format
            if (!importData.maps || !Array.isArray(importData.maps)) {
                throw new Error('Format de fichier invalide');
            }
            
            let existingMaps = replace ? [] : this.getAllMaps();
            let importedCount = 0;
            let skippedCount = 0;
            
            importData.maps.forEach(map => {
                if (this.validateMapData(map)) {
                    // Générer un nouvel ID pour éviter les conflits
                    const newId = this.generateMapId();
                    const importedMap = {
                        ...map,
                        id: newId,
                        imported: new Date().toISOString(),
                        modified: new Date().toISOString()
                    };
                    
                    existingMaps.push(importedMap);
                    importedCount++;
                } else {
                    skippedCount++;
                    console.warn('⚠️ Carte invalide ignorée lors de l\'import');
                }
            });
            
            // Appliquer la limite
            this.enforceMapLimit(existingMaps);
            
            // Sauvegarder
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingMaps));
            
            // Importer les paramètres si présents
            if (importData.settings && !replace) {
                const currentSettings = this.getSettings();
                const mergedSettings = { ...currentSettings, ...importData.settings };
                this.saveSettings(mergedSettings);
            }
            
            const result = {
                imported: importedCount,
                skipped: skippedCount,
                total: existingMaps.length
            };
            
            console.log('✅ Import terminé:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'import:', error);
            throw error;
        }
    }
    
    // ========================================
    // RECHERCHE ET FILTRAGE
    // ========================================
    
    /**
     * Recherche des cartes par titre ou description
     * @param {string} searchTerm - Terme de recherche
     * @returns {Array} - Cartes correspondantes
     */
    static searchMaps(searchTerm) {
        if (!searchTerm || searchTerm.trim().length === 0) {
            return this.getAllMaps();
        }
        
        const term = searchTerm.toLowerCase().trim();
        const allMaps = this.getAllMaps();
        
        return allMaps.filter(map => {
            // Recherche dans le titre
            if (map.title.toLowerCase().includes(term)) return true;
            
            // Recherche dans les marqueurs
            if (map.markers && Array.isArray(map.markers)) {
                return map.markers.some(marker => 
                    (marker.titre && marker.titre.toLowerCase().includes(term)) ||
                    (marker.description && marker.description.toLowerCase().includes(term))
                );
            }
            
            return false;
        });
    }
    
    /**
     * Filtre les cartes par date de création
     * @param {Date} fromDate - Date de début
     * @param {Date} toDate - Date de fin
     * @returns {Array} - Cartes dans la plage de dates
     */
    static filterMapsByDate(fromDate, toDate) {
        const allMaps = this.getAllMaps();
        
        return allMaps.filter(map => {
            const createdDate = new Date(map.created);
            return createdDate >= fromDate && createdDate <= toDate;
        });
    }
    
    /**
     * Groupe les cartes par mois de création
     * @returns {Object} - Cartes groupées par mois
     */
    static groupMapsByMonth() {
        const allMaps = this.getAllMaps();
        const grouped = {};
        
        allMaps.forEach(map => {
            const date = new Date(map.created);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            
            if (!grouped[monthKey]) {
                grouped[monthKey] = [];
            }
            
            grouped[monthKey].push(map);
        });
        
        return grouped;
    }
    
    // ========================================
    // UTILITAIRES DE DÉBOGAGE
    // ========================================
    
    /**
     * Affiche un rapport détaillé du stockage dans la console
     */
    static debugReport() {
        console.group('🔍 Rapport de débogage MapStorage');
        
        try {
            const stats = this.getStorageStats();
            const maps = this.getAllMaps();
            
            console.log('📊 Statistiques générales:', stats);
            console.log('📋 Liste des cartes:', maps.map(m => ({
                id: m.id,
                title: m.title,
                markers: m.markers?.length || 0,
                created: m.created,
                modified: m.modified
            })));
            
            // Vérifier l'intégrité
            const integrity = this.checkDataIntegrity();
            console.log('🔒 Intégrité des données:', integrity);
            
            // Taille du localStorage
            const storageInfo = this.getStorageInfo();
            console.log('💾 Informations de stockage:', storageInfo);
            
        } catch (error) {
            console.error('❌ Erreur lors du rapport de débogage:', error);
        }
        
        console.groupEnd();
    }
    
    /**
     * Vérifie l'intégrité des données stockées
     * @returns {Object} - Rapport d'intégrité
     */
    static checkDataIntegrity() {
        const maps = this.getAllMaps();
        let validMaps = 0;
        let invalidMaps = 0;
        let totalMarkers = 0;
        let invalidMarkers = 0;
        
        maps.forEach(map => {
            if (this.validateMapData(map)) {
                validMaps++;
                
                if (map.markers && Array.isArray(map.markers)) {
                    map.markers.forEach(marker => {
                        totalMarkers++;
                        if (!this.validateMarkerData(marker)) {
                            invalidMarkers++;
                        }
                    });
                }
            } else {
                invalidMaps++;
            }
        });
        
        return {
            totalMaps: maps.length,
            validMaps,
            invalidMaps,
            totalMarkers,
            invalidMarkers,
            integrityScore: maps.length > 0 ? (validMaps / maps.length * 100).toFixed(1) : 100
        };
    }
    
    /**
     * Obtient des informations sur l'utilisation du localStorage
     * @returns {Object} - Informations de stockage
     */
    static getStorageInfo() {
        let totalSize = 0;
        let mapCreatorSize = 0;
        let itemCount = 0;
        
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const value = localStorage.getItem(key);
                totalSize += key.length + value.length;
                itemCount++;
                
                if (key.startsWith('mapCreator_')) {
                    mapCreatorSize += key.length + value.length;
                }
            }
        }
        
        // Estimation de l'espace disponible (la plupart des navigateurs ont ~5-10MB)
        const estimatedQuota = 5 * 1024 * 1024; // 5MB
        const usagePercentage = (totalSize / estimatedQuota * 100).toFixed(1);
        
        return {
            totalSize,
            totalSizeKB: (totalSize / 1024).toFixed(2),
            mapCreatorSize,
            mapCreatorSizeKB: (mapCreatorSize / 1024).toFixed(2),
            itemCount,
            usagePercentage,
            availableSpace: estimatedQuota - totalSize,
            availableSpaceKB: ((estimatedQuota - totalSize) / 1024).toFixed(2)
        };
    }
    
    // ========================================
    // MIGRATION ET MISE À JOUR
    // ========================================
    
    /**
     * Migre les données d'une ancienne version
     * @param {string} fromVersion - Version source
     * @param {string} toVersion - Version cible
     */
    static migrateMaps(fromVersion, toVersion) {
        console.log(`🔄 Migration des données de ${fromVersion} vers ${toVersion}`);
        
        try {
            const maps = this.getAllMaps();
            let migratedCount = 0;
            
            maps.forEach(map => {
                if (!map.version || map.version !== toVersion) {
                    // Appliquer les migrations nécessaires
                    this.applyMigrations(map, fromVersion, toVersion);
                    map.version = toVersion;
                    migratedCount++;
                }
            });
            
            if (migratedCount > 0) {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(maps));
                console.log(`✅ ${migratedCount} cartes migrées avec succès`);
            }
            
            return { migrated: migratedCount, total: maps.length };
            
        } catch (error) {
            console.error('❌ Erreur lors de la migration:', error);
            throw error;
        }
    }
    
    /**
     * Applique les transformations de migration
     * @param {Object} mapData - Données de la carte à migrer
     * @param {string} fromVersion - Version source
     * @param {string} toVersion - Version cible
     */
    static applyMigrations(mapData, fromVersion, toVersion) {
        // Exemple de migration : ajouter des champs manquants
        if (!mapData.created) {
            mapData.created = new Date().toISOString();
        }
        
        if (!mapData.modified) {
            mapData.modified = mapData.created;
        }
        
        if (!mapData.center) {
            mapData.center = [46.603354, 1.888334]; // Centre France par défaut
        }
        
        if (!mapData.zoom) {
            mapData.zoom = 6;
        }
        
        // Migrer les marqueurs si nécessaire
        if (mapData.markers && Array.isArray(mapData.markers)) {
            mapData.markers.forEach(marker => {
                if (!marker.created) {
                    marker.created = mapData.created;
                }
            });
        }
    }
    
    // ========================================
    // MÉTHODES DE DIAGNOSTIC
    // ========================================
    
    /**
     * Teste la disponibilité du localStorage
     * @returns {boolean} - true si le localStorage est disponible
     */
    static isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            console.warn('⚠️ localStorage non disponible:', error);
            return false;
        }
    }
    
    /**
     * Effectue un test complet du système de stockage
     * @returns {Object} - Résultats des tests
     */
    static runDiagnostics() {
        console.group('🔬 Diagnostics MapStorage');
        
        const results = {
            storageAvailable: this.isStorageAvailable(),
            dataIntegrity: null,
            storageInfo: null,
            cleanupResults: null,
            errors: []
        };
        
        try {
            if (results.storageAvailable) {
                results.dataIntegrity = this.checkDataIntegrity();
                results.storageInfo = this.getStorageInfo();
                
                // Test de nettoyage (en mode simulation)
                const originalData = localStorage.getItem(this.STORAGE_KEY);
                results.cleanupResults = this.cleanupStorage();
                
                console.log('✅ Tous les tests réussis');
            } else {
                results.errors.push('localStorage non disponible');
            }
            
        } catch (error) {
            results.errors.push(error.message);
            console.error('❌ Erreur lors des diagnostics:', error);
        }
        
        console.log('📋 Résultats complets:', results);
        console.groupEnd();
        
        return results;
    }
}

// ========================================
// EXPOSITION GLOBALE ET UTILITAIRES
// ========================================

// Exposer MapStorage globalement pour l'utilisation dans d'autres scripts
window.MapStorage = MapStorage;

// Fonction utilitaire pour formater les tailles
window.formatBytes = function(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Fonction utilitaire pour formater les dates
window.formatDate = function(dateString, options = {}) {
    const defaultOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        return new Date(dateString).toLocaleString('fr-FR', finalOptions);
    } catch (error) {
        return 'Date invalide';
    }
};

// ========================================
// INITIALISATION AUTOMATIQUE
// ========================================

// Vérifier la disponibilité du stockage au chargement
document.addEventListener('DOMContentLoaded', function() {
    if (!MapStorage.isStorageAvailable()) {
        console.error('❌ localStorage non disponible - fonctionnalités limitées');
        
        // Afficher un avertissement à l'utilisateur
        if (typeof showToast === 'function') {
            showToast('Stockage local non disponible - les données ne seront pas sauvegardées', 'error');
        }
    } else {
        console.log('✅ MapStorage initialisé et prêt');
        
        // Effectuer un nettoyage automatique si nécessaire
        const stats = MapStorage.getStorageStats();
        if (stats && stats.totalMaps > MapStorage.MAX_MAPS * 0.9) {
            console.log('🧹 Nettoyage automatique en cours...');
            MapStorage.cleanupStorage();
        }
    }
});

console.log('🗂️ Module MapStorage chargé avec succès');