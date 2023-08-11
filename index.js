// Ceci est le fichier principal du serveur proxy. Il sera utilisé pour faire des requêtes à l'API GLPI.
// Il est possible de lancer le serveur en utilisant la commande "node index.js" dans le terminal.
const express = require('express');
const glpiHandler = require('./handlers/glpiHandler'); // Importe le gestionnaire pour GLPI
const inStatusHandler = require('./handlers/inStatusHandler'); // Importe le gestionnaire pour inStatus

const app = express();
app.use(express.json());

// Endpoint pour les requêtes GLPI
app.all('/glpi', async (req, res) => {
    // Traite la requête vers GLPI
    await glpiHandler.handleRequest(req, res);  
});

// Endpoint pour les requêtes inStatus
app.all('/instatus', async (req, res) => {
    // Traite la requête vers inStatus
    await inStatusHandler.handleRequest(req, res);
});

// Démarre le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Le serveur écoute sur le port ${PORT}`));
