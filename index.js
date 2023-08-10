// en : This is the main file of the proxy server. It will be used to make requests to the GLPI API.
// fr : Ceci est le fichier principal du serveur proxy. Il sera utilisé pour faire des requêtes à l'API GLPI.

// en : Import the axios library to make HTTP requests
// fr : Importe la bibliothèque axios pour faire des requêtes HTTP
const axios = require('axios');
// en : Import the express library to create the server
// fr : Importe la bibliothèque express pour créer le serveur
const express = require('express');

const app = express();
app.use(express.json());


app.all('*', async (req, res) => {
    // en : Get the glpiUrl from the request and launch the correct error 400 if not found
    // fr : Récupère l'URL GLPI de la requête et lance l'erreur 400 si non trouvée
    const glpiUrl = req.header('url_path') || null;
    if (!glpiUrl) {
        return res.status(400).send("L'URL GLPI n'est pas fournie.");
    }

    // en : Get the itemType from the request or set it to Computer by default
    // fr : Récupère le type d'item de la requête ou le définit par défaut à Computer
    const itemType = req.header('itemType') || 'Computer';
    
    // en : If sessionToken is null, request a new one using initSession GLPI API
    // fr : Si le Session-Token est null, demande un nouveau en utilisant l'API initSession de GLPI
    const sessionToken = req.header('Session-Token') || null;

    if (!sessionToken) {
        // en : If sessionToken is null, request a new one using initSession GLPI API
        // en : Get the userToken and appToken from the request and launch the correct error 400 if not found
        // fr : Si le Session-Token est null, demande un nouveau en utilisant l'API initSession de GLPI
        // fr : Récupère le token d'utilisateur et le token d'application de la requête et lance l'erreur 400 si non trouvés
            const userToken = req.header('Authorization') || null;
            const appToken = req.header('App-Token') || null;
       
        if (!userToken || !appToken) {
            return res.status(400).send("Le token d'utilisateur ou le token d'application n'est pas fourni.");
        }
        // en : GET request to initSession GLPI API
        // fr : Requête GET à l'API initSession de GLPI
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

// en : Function to get the item list from GLPI API and send it back to the client
// fr : Fonction pour récupérer la liste des items depuis l'API GLPI et l'envoyer au client
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

        // en : GET request to killSession GLPI API
        // fr : Requête GET à l'API killSession de GLPI
        const killOptions = {
            url: `https://${glpiUrl}/apirest.php/killSession`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'App-Token': appToken,
                'Session-Token': sessionToken,
            }
        };
        // en : GET request to killSession GLPI API
        // fr : Requête GET pour tuer la session
        await axios(killOptions);

        // en : Send the response back to the client
        // fr : Envoie la réponse au client
        originalRes.json(proxyResponse.data);
    } catch (error) {
        return originalRes.status(500).send("Erreur lors de la requête principale: " + error.message);
    }
}

// en : Start the server
// fr : Démarre le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Le serveur écoute sur le port ${PORT}`));
