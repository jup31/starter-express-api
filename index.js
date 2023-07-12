const express = require('express');
const http = require('http');

const app = express();
app.use(express.json());

// Remplacez par vos propres valeurs
const GLPI_USERNAME = 'glpi_user';
const GLPI_PASSWORD = 'glpi_password';

// Route de proxy
app.all('*', (req, res) => {
    // URL GLPI
    const glpiUrl = req.body.url_path;

    // Vérification de l'existence du session_token
    const sessionToken = req.body.session_token || null;

    if (!sessionToken) {
        // initSession
        const initOptions = {
            hostname: glpiUrl,
            path: '/initSession',
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(GLPI_USERNAME + ':' + GLPI_PASSWORD).toString('base64')
            }
        };

        const initReq = http.request(initOptions, (initRes) => {
            let data = '';
            initRes.on('data', (chunk) => {
                data += chunk;
            });
            initRes.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    const token = parsedData.session_token;
                    proxyRequest(req, res, token, glpiUrl);
                } catch (err) {
                    return res.status(500).send('Erreur lors de l\'initialisation de la session GLPI: ' + err.message);
                }
            });
        });

        initReq.on('error', (error) => {
            return res.status(500).send('Erreur lors de l\'initialisation de la session GLPI: ' + error.message);
        });

        initReq.end();
    } else {
        proxyRequest(req, res, sessionToken, glpiUrl);
    }
});

function proxyRequest(originalReq, originalRes, token, glpiUrl) {
    const options = {
        hostname: glpiUrl,
        path: originalReq.path,
        method: originalReq.method,
        headers: {
            'Session-Token': token,
            ...originalReq.headers,
        },
    };

    const proxy = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            // killSession
            const killOptions = {
                hostname: glpiUrl,
                path: '/killSession',
                method: 'GET',
                headers: {
                    'Session-Token': token,
                },
            };

            const killReq = http.request(killOptions);
            killReq.on('error', (error) => {
                console.log('Erreur lors de la fermeture de la session GLPI: ' + error.message);
            });

            killReq.end();

            // Send response
            originalRes.json(JSON.parse(data));
        });
    });

    proxy.on('error', (error) => {
        return originalRes.status(500).send('Erreur lors de la requête principale: ' + error.message);
    });

    if (originalReq.method === 'POST' || originalReq.method === 'PUT') {
        proxy.write(JSON.stringify(originalReq.body));
    }

    proxy.end();
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Le serveur écoute sur le port ${PORT}`));
