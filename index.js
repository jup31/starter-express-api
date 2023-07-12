const express = require('express');
const http = require('https');

const app = express();
app.use(express.json());

// Route de proxy
app.all('*', (req, res) => {
    // URL GLPI
    const glpiUrl = req.body.url_path;

    // Vérification de l'existence du session_token
    const sessionToken = req.header('Session-Token') || null;

    if (!sessionToken) {
        // initSession
        const userToken = req.header('Authorization');
        const appToken = req.header('App-Token');

        if (!userToken || !appToken) {
            return res.status(400).send('Le token d\'utilisateur ou le token d\'application n\'est pas fourni.');
        }

        const initOptions = {
            host: glpiUrl,
            path: '/apirest.php/initSession?get_full_session=true',
            method: 'GET',
            headers: {
                'Content-Type' : 'application/json',
                'Authorization': userToken,
                'App-Token': appToken
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
                    return res.status(500).send('Erreur lors de l\'initialisation de la session GLPI1: ' + err.message);
                }
            });
        });

        initReq.on('error', (error) => {
            return res.status(500).send('Erreur lors de l\'initialisation de la session GLPI2: ' + error.message);
        });

        initReq.end();
    } else {
        proxyRequest(req, res, sessionToken, glpiUrl);
    }
});

function proxyRequest(originalReq, originalRes, token, glpiUrl) {
    const options = {
        host: glpiUrl,
        path: '/apirest.php/getMyEntities',
        /*rejectUnauthorized : false,*/
        method: originalReq.method,
        headers: {
            'Content-Type' : 'application/json',
            /*'Authorization': userToken,*/
            'App-Token': appToken
            'Session-Token': token
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
                path: '/apirest.php/killSession',
                method: 'GET',
                headers: {
                    'Content-Type' : 'application/json',
                    'Authorization': userToken,
                    'App-Token': appToken,
                    'Session-Token': token
                },
            };

            const killReq = http.request(killOptions);
            killReq.on('error', (error) => {
                console.log('Erreur lors de la fermeture de la session GLPI3: ' + error.message);
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
