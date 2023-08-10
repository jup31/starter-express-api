const axios = require('axios');

// Le code pour traiter les requêtes vers GLPI
async function handleRequest(req, res) {
    
     // Récupère l'URL GLPI de la requête et lance l'erreur 400 si non trouvée
     const glpiUrl = req.header('url_path') || null;
     if (!glpiUrl) {
         return res.status(400).send("L'URL GLPI n'est pas fournie.");
     }
 
     // Récupère le type d'item de la requête ou le définit par défaut à Computer
     const itemType = req.header('itemType') || 'Computer';
     
     // Si le Session-Token est null, demande un nouveau en utilisant l'API initSession de GLPI
     const sessionToken = req.header('Session-Token') || null;
 
     if (!sessionToken) {
         // Si le Session-Token est null, demande un nouveau en utilisant l'API initSession de GLPI
         // Récupère le token d'utilisateur et le token d'application de la requête et lance l'erreur 400 si non trouvés
             const userToken = req.header('Authorization') || null;
             const appToken = req.header('App-Token') || null;
        
         if (!userToken || !appToken) {
             return res.status(400).send("Le token d'utilisateur ou le token d'application n'est pas fourni.");
         }
 
         // Requête GET à l'API initSession de GLPI
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
             await proxyRequest(req, res, sessionToken, glpiUrl, appToken, itemType);
         } catch (err) {
             return res.status(500).send("Erreur lors de l'initialisation de la session GLPI: " + err.message);
         }
     } else {
         await proxyRequest(req, res, sessionToken, glpiUrl, appToken, itemType);
     }
}

// Fonction pour récupérer la liste des items depuis l'API GLPI et l'envoyer au client
async function proxyRequest(originalReq, originalRes, sessionToken, glpiUrl, appToken, itemType) {
    
    // Requête GET à l'API GLPI : liste des items
    try {
        const options = {
            url: `https://${glpiUrl}/apirest.php/${itemType}/?expand_dropdowns=true`,
            method: originalReq.method,
            headers: {
                'Content-Type': 'application/json',
                'App-Token': appToken,
                'Session-Token': sessionToken,
            }
        };

        const proxyResponse = await axios(options);
    
    } catch (error) {
        if (error.response) {
            // Si une réponse est renvoyée par le serveur (statut >= 400)
            const responseMessage = error.response.data || 'Aucune réponse du serveur.';
            return originalRes.status(error.response.status).send("Erreur lors de la requête principale: " + error.message+ "Response.message :"+responseMessage);
        } else {
            // Si aucune réponse du serveur (ex: erreur de connexion)
            return originalRes.status(500).send("Erreur lors de la requête principale: " + error.message);
        }
    }

    // Requête GET à l'API killSession de GLPI
    try {
        
        const killOptions = {
            url: `https://${glpiUrl}/apirest.php/killSession`,
            method: originalReq.method,
            headers: {
                'Content-Type': 'application/json',
                'App-Token': appToken,
                'Session-Token': sessionToken,
            }
        }; 
        // Requête GET pour tuer la session
        await axios(killOptions);

    } catch (error) {
        if (error.response) {
            // Si une réponse est renvoyée par le serveur (statut >= 400)
            const responseMessage = error.response.data || 'Aucune réponse du serveur.';
            return originalRes.status(error.response.status).send("Erreur lors de la requête killSession: " + error.message + "Response.message :" +responseMessage);
        } else {
            // Si aucune réponse du serveur (ex: erreur de connexion)
            return originalRes.status(500).send("Erreur lors de la requête killSession: " + error.message);
        }
    }

     // renvoyer les données que l'on a reçues de GLPI dans la réponse au client
     console.log("proxyResponse.data :"+proxyResponse.data);
     console.log("proxyResponse :"+JSON.stringify(proxyResponse));
     originalRes.json(proxyResponse.data);


}

module.exports = {
    handleRequest
};
