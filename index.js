const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json()); // Pour parser les requêtes de type application/json

// Remplacez par vos propres valeurs
const GLPI_USERNAME = 'glpi_user';
const GLPI_PASSWORD = 'glpi_password';

// Route de proxy
app.all('*', async (req, res) => {
    // URL GLPI
    const glpiUrl = req.body.url_path;

    // Vérification de l'existence du session_token
    const sessionToken = req.body.session_token || null;

    let token;
    if (!sessionToken) {
        // initSession
        try {
            const initRes = await axios.get(glpiUrl + '/initSession', {
                auth: {
                    username: GLPI_USERNAME,
                    password: GLPI_PASSWORD,
                },
            });
            token = initRes.data.session_token;
        } catch (err) {
            return res.status(500).send('Erreur lors de l\'initialisation de la session GLPI: ' + err.message);
        }
    } else {
        token = sessionToken;
    }

    // Effectue la requête principale
    try {
        const mainRes = await axios({
            method: req.method,
            url: glpiUrl + req.path,
            headers: {
                'Session-Token': token,
                ...req.headers,
            },
            data: req.body,
        });

        // killSession
        try {
            await axios.get(glpiUrl + '/killSession', {
                headers: {
                    'Session-Token': token,
                },
            });
        } catch (err) {
            console.log('Erreur lors de la fermeture de la session GLPI: ' + err.message);
        }

        return res.json(mainRes.data);
    } catch (err) {
        return res.status(500).send('Erreur lors de la requête principale: ' + err.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Le serveur écoute sur le port ${PORT}`));
