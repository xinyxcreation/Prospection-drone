# Prospection Drone

PWA statique inspirée de l'architecture d'Event-drone.

## Fonctionnalités

- Deux onglets : **Agences immobilières** et **Diagnostiqueurs immobiliers**
- Recherche et filtres par statut
- Fiche compacte sur la carte principale
- Fiche détaillée au clic
- Historique de toutes les visites avec date
- Résultat : **Accord / En attention / Refus**
- Nombre de cartes laissées à chaque visite
- Décrément automatique du stock global de cartes
- Compteur de demandes de devis + dates + montant facultatif
- Statistiques par onglet
- Modification / suppression des prospects
- Sauvegarde locale dans le navigateur
- Export / import JSON pour sauvegarder ou transférer les données
- Fonctionnement PWA hors ligne après le premier chargement

## Données

Les données sont actuellement stockées dans `localStorage` du navigateur. Aucun serveur n'est nécessaire pour cette version.

Le stock initial est fixé à **100 cartes** et peut être ajusté directement dans les données exportées si nécessaire.

## Installation

Décompresser puis héberger le dossier sur GitHub Pages ou un autre hébergement HTTPS.
