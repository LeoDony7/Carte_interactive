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

    // Fonction ramenant à la page d'accueil
    const sidebarRetourAccueilBtn = document.getElementById('sidebarRetourAccueil');

    if (sidebarRetourAccueilBtn) {
        sidebarRetourAccueilBtn.addEventListener('click', () => {
            // Fermer la sidebar avant de rediriger
            closeSidebar();
            // Redirection vers la page d'accueil
            window.location.href = 'index.html';
        });
    }

    // Fonction amenant à la création de carte
    const sidebarCreateMapBtn = document.getElementById('sidebarCreateMap');

    if (sidebarCreateMapBtn) {
        sidebarCreateMapBtn.addEventListener('click', () => {
            // Fermer la sidebar avant de rediriger
            closeSidebar();
            // Redirection vers la page de création de carte
            window.location.href = 'create-map.html';
        });
    }

    // Fonction amenant à la liste des cartes 
    const sidebarListMapBtn = document.getElementById('sidebarOpenListMap');

    if (sidebarListMapBtn) {
        sidebarListMapBtn.addEventListener('click', () => {
            // Fermer la sidebar avant de rediriger
            closeSidebar();
            // Redirection vers la page avec la liste des cartes
            window.location.href = 'liste-map.html';
        });
    }

/* Suite des fonctions */

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