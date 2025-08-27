/**
 * ========================================
 * SCRIPT PRINCIPAL - PAGE D'ACCUEIL
 * ========================================
 */

// Attendre que le DOM soit entièrement chargé
document.addEventListener('DOMContentLoaded', function() {
    
    // ========================================
    // GESTION DU MENU LATÉRAL (SIDEBAR)
    // ========================================
    
    // Récupération des éléments du DOM
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarClose = document.getElementById('sidebarClose');
    
    /**
     * Fonction pour ouvrir la sidebar
     */
    function openSidebar() {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
        // Empêcher le scroll du body quand la sidebar est ouverte
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * Fonction pour fermer la sidebar
     */
    function closeSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        // Rétablir le scroll du body
        document.body.style.overflow = '';
    }
    
    // Événements pour ouvrir/fermer la sidebar
    if (menuToggle) {
        menuToggle.addEventListener('click', openSidebar);
    }
    
    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeSidebar);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
    
    // Fermer la sidebar avec la touche Échap
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            closeSidebar();
        }
    });
    
    // ========================================
    // GESTION DES BOUTONS D'ACTION
    // ========================================
    
    const createMapBtn = document.getElementById('createMapBtn');
    const openMapsBtn = document.getElementById('openMapsBtn');
    
    /**
     * Fonction pour créer une nouvelle carte
     * À terme, cette fonction redirigera vers la page de création
     */
    function createNewMap() {
        console.log('Création d\'une nouvelle carte...');
        
        // Animation du bouton pour donner un feedback visuel
        createMapBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            createMapBtn.style.transform = '';
        }, 150);
                
        // Redirection vers la page de la création de carte
        window.location.href = 'create-map.html';
    }
    
    /**
     * Fonction pour ouvrir la liste des cartes existantes
     * À terme, cette fonction redirigera vers la page de liste des cartes
     */
    function openMapsList() {
        console.log('Ouverture de la liste des cartes...');
        
        // Animation du bouton pour donner un feedback visuel
        openMapsBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            openMapsBtn.style.transform = '';
        }, 150);
        
        // Simulation - À remplacer par la vraie navigation
        alert('Redirection vers la liste des cartes...\n(Cette fonctionnalité sera implémentée dans les prochaines pages)');
        
        // Dans la version finale, décommenter cette ligne :
        // window.location.href = 'maps-list.html';
    }
    
    // Événements pour les boutons d'action
    if (createMapBtn) {
        createMapBtn.addEventListener('click', createNewMap);
    }
    
    if (openMapsBtn) {
        openMapsBtn.addEventListener('click', openMapsList);
    }
    
    // ========================================
    // ANIMATIONS ET EFFETS VISUELS
    // ========================================
    
    /**
     * Animation d'apparition progressive au scroll
     * Utilise l'Intersection Observer API pour détecter les éléments visibles
     */
    function initScrollAnimations() {
        // Sélectionner tous les éléments à animer
        const animatedElements = document.querySelectorAll('.feature-card');
        
        // Options pour l'observer
        const observerOptions = {
            threshold: 0.1, // L'élément doit être visible à 10%
            rootMargin: '0px 0px -50px 0px' // Déclencher 50px avant que l'élément soit visible
        };
        
        // Créer l'observer
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Ajouter une classe pour l'animation
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    
                    // Une fois animé, on n'observe plus l'élément
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        // Initialiser les éléments avec une opacité nulle
        animatedElements.forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            
            // Observer l'élément
            observer.observe(element);
        });
    }
    
    /**
     * Effet parallaxe léger sur la visualisation de carte
     */
    function initParallaxEffect() {
        const mapPreview = document.querySelector('.map-preview');
        
        if (!mapPreview) return;
        
        // Fonction pour calculer l'effet parallaxe
        function handleParallax() {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5; // Vitesse de l'effet (négatif pour aller dans l'autre sens)
            
            mapPreview.style.transform = `translateY(${rate}px)`;
        }
        
        // Écouter le scroll avec throttling pour les performances
        let ticking = false;
        
        function updateParallax() {
            if (!ticking) {
                requestAnimationFrame(handleParallax);
                ticking = true;
                setTimeout(() => {
                    ticking = false;
                }, 16); // ~60fps
            }
        }
        
        window.addEventListener('scroll', updateParallax);
    }
    
    /**
     * Animation des marqueurs de carte
     * Ajoute un effet de pulsation aléatoire
     */
    function initMapMarkersAnimation() {
        const markers = document.querySelectorAll('.marker');
        
        markers.forEach((marker, index) => {
            // Délai différent pour chaque marqueur
            const delay = index * 0.5;
            
            // Animation de pulsation
            setInterval(() => {
                marker.style.transform = 'rotate(-45deg) scale(1.1)';
                setTimeout(() => {
                    marker.style.transform = 'rotate(-45deg) scale(1)';
                }, 200);
            }, 3000 + delay * 1000); // Répéter toutes les 3 secondes + délai
        });
    }
    
    // ========================================
    // UTILITAIRES ET HELPERS
    // ========================================
    
    /**
     * Fonction utilitaire pour débouncer les événements
     * Évite que les événements se déclenchent trop souvent
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
     * Gestion du redimensionnement de la fenêtre
     */
    function handleResize() {
        // Fermer la sidebar si on passe en mode desktop
        if (window.innerWidth > 768 && sidebar.classList.contains('active')) {
            closeSidebar();
        }
    }
    
    // Écouter le redimensionnement avec debounce
    window.addEventListener('resize', debounce(handleResize, 250));
    
    // ========================================
    // GESTION DES ERREURS
    // ========================================
    
    /**
     * Gestionnaire global d'erreurs JavaScript
     */
    window.addEventListener('error', function(e) {
        console.error('Erreur JavaScript:', e.error);
        
        // En production, on pourrait envoyer l'erreur à un service de monitoring
        // sendErrorToMonitoring(e.error);
    });
    
    /**
     * Gestionnaire pour les promesses rejetées non gérées
     */
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Promesse rejetée non gérée:', e.reason);
        
        // Empêcher l'affichage de l'erreur dans la console du navigateur
        e.preventDefault();
    });
    
    // ========================================
    // INITIALISATION
    // ========================================
    
    /**
     * Fonction principale d'initialisation
     */
    function init() {
        console.log('🗺️ MapCreator - Page d\'accueil initialisée');
        
        try {
            // Initialiser toutes les fonctionnalités
            initScrollAnimations();
            initParallaxEffect();
            initMapMarkersAnimation();
            
            // Ajouter des classes pour les animations CSS
            document.body.classList.add('loaded');
            
            console.log('✅ Toutes les fonctionnalités ont été initialisées avec succès');
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
        }
    }
    
    // ========================================
    // FONCTIONNALITÉS FUTURES (PRÉPARATION)
    // ========================================
    
    /**
     * Placeholder pour la gestion du localStorage
     * Cette fonction sera utilisée pour sauvegarder les préférences utilisateur
     */
    function saveUserPreferences(preferences) {
        try {
            localStorage.setItem('mapCreatorPrefs', JSON.stringify(preferences));
            console.log('Préférences sauvegardées:', preferences);
        } catch (error) {
            console.warn('Impossible de sauvegarder les préférences:', error);
        }
    }
    
    /**
     * Placeholder pour charger les préférences utilisateur
     */
    function loadUserPreferences() {
        try {
            const prefs = localStorage.getItem('mapCreatorPrefs');
            return prefs ? JSON.parse(prefs) : null;
        } catch (error) {
            console.warn('Impossible de charger les préférences:', error);
            return null;
        }
    }
    
    /**
     * Fonction pour appliquer un thème (clair/sombre)
     * Préparation pour une future fonctionnalité
     */
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        saveUserPreferences({ theme: theme });
        console.log('Thème appliqué:', theme);
    }
    
    // Charger les préférences au démarrage
    const userPrefs = loadUserPreferences();
    if (userPrefs && userPrefs.theme) {
        applyTheme(userPrefs.theme);
    }
    
    // Démarrer l'initialisation
    init();
    
    // ========================================
    // EXPOSITION GLOBALE POUR DEBUG
    // ========================================
    
    // En mode développement, exposer certaines fonctions pour le debugging
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.MapCreatorDebug = {
            openSidebar,
            closeSidebar,
            createNewMap,
            openMapsList,
            applyTheme,
            saveUserPreferences,
            loadUserPreferences
        };
        
        console.log('🔧 Mode développement détecté - Fonctions de debug disponibles dans window.MapCreatorDebug');
    }
});

// ========================================
// GESTION DE LA PERFORMANCE
// ========================================

/**
 * Optimisation du chargement des images avec lazy loading
 */
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    });
    
    // Observer toutes les images avec la classe 'lazy'
    document.querySelectorAll('img.lazy').forEach(img => {
        imageObserver.observe(img);
    });
}

/**
 * Préchargement des ressources critiques
 */
function preloadCriticalResources() {
    const criticalResources = [
        // Ajouter ici les URLs des prochaines pages
        // 'create-map.html',
        // 'maps-list.html'
    ];
    
    criticalResources.forEach(url => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        document.head.appendChild(link);
    });
}

// Précharger après le chargement complet de la page
window.addEventListener('load', () => {
    // Attendre un peu pour ne pas interférer avec le rendu initial
    setTimeout(preloadCriticalResources, 1000);
});