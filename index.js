const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Route de proxy
app.all('*', async (req, res) => {
    // Get the glpiUrl from the request and launch the correct error 400 if not found
    const glpiUrl = req.header('url_path') || null;
    if (!glpiUrl) {
        return res.status(400).send("L'URL GLPI n'est pas fournie.");
    }

    // Get the itemType from the request or set it to Computer by default
    const itemType = req.header('itemType') || 'Computer';
    
    // Check if a Session-Token is provided in the request (should not be provided)
    const sessionToken = req.header('Session-Token') || null;

    if (!sessionToken) {
        // If sessionToken is null, request a new one using initSession GLPI API
        // Get the userToken and appToken from the request and launch the correct error 400 if not found
            const userToken = req.header('Authorization') || null;
            const appToken = req.header('App-Token') || null;
       
        if (!userToken || !appToken) {
            return res.status(400).send("Le token d'utilisateur ou le token d'application n'est pas fourni.");
        }

        try {
            const initResponse = await axios.get(
                `https://${glpiUrl}/apirest.php/initSession?get_full_session=true`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': userToken,
                        'App-Token': appToken,
                    },
                }
            );

            const sessionToken = initResponse.data.session_token;
            await proxyRequest(req, res, token, glpiUrl, appToken);
        } catch (err) {
            return res.status(500).send("Erreur lors de l'initialisation de la session GLPI1: " + err.message);
        }
    } else {
        await proxyRequest(req, res, sessionToken, glpiUrl, appToken);
    }
});

// Function to get the item list from GLPI API and send it back to the client
async function proxyRequest(originalReq, originalRes, sessionToken, glpiUrl, appToken) {
    const options = {
        url: `https://${glpiUrl}/apirest.php/${itemType}/?expand_dropdowns=true`,
        method: originalReq.method,
        headers: {
            'Content-Type': 'application/json',
            'App-Token': appToken,
            'Session-Token': sessionToken,
        },
    };

    try {
        const proxyResponse = await axios(options);

        // killSession
        const killOptions = {
            url: `https://${glpiUrl}/apirest.php/killSession`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'App-Token': appToken,
                'Session-Token': sessionToken,
            }
        };
        // GET request to kill the session
        await axios(killOptions);

        // Send response
        originalRes.json(proxyResponse.data);
    } catch (error) {
        return originalRes.status(500).send("Erreur lors de la requête principale: " + error.message);
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Le serveur écoute sur le port ${PORT}`));
