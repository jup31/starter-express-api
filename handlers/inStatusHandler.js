const axios = require('axios');

// Le code pour traiter les requêtes vers inStatus
async function handleRequest(req, res) {
    // Récupère l'URL inStatus de la requête et lance l'erreur 400 si non trouvée
    const inStatusUrl = req.header('url_path') || null;
    if (!inStatusUrl) {
        return res.status(400).send("L'URL inStatus n'est pas fournie.");
    }

    // Récupère les données de l'incident envoyées par JIRA
    const incidentData = req.body || null;
    if (!incidentData) {
        return res.status(400).send("Les données de l'incident ne sont pas fournies.");
    }

    // Récupère le token d'authentification inStatus de la requête et lance l'erreur 400 si non trouvé
    const inStatusAuthToken = req.header('Authorization') || null;
    if (!inStatusAuthToken) {
        return res.status(400).send("Le token d'authentification inStatus n'est pas fourni.");
    }

    // Mappe les données de l'incident issue de JIRA au format Automation
    // pour les adapter à inStatus
    const mappedIncidentData = {
        name: incidentData.fields.summary,
        message: incidentData.fields.description,
        components: ['clfhzpxw9207406hwn8285t1x7o'],
        started: new Date(incidentData.fields.created).toISOString(),
        status: 'INVESTIGATING', // Utilisation d'un statut prédéfini pour INVESTIGATING
        notify: true, // Vous pouvez adapter ceci en fonction de vos besoins
        statuses: [
            {
                id: 'ckf01fvnxywz50a35nh1qzssm',
                status: 'OPERATIONAL' // Utilisation d'un statut prédéfini pour OPERATIONAL
            }
        ]
    };

    try {
        // Effectue la requête POST vers inStatus pour mettre à jour l'incident
        const response = await axios.post(inStatusUrl +  "/v1/1/incidents", mappedIncidentData, {
            headers: {
                'Authorization':  inStatusAuthToken,
                'Content-Type': 'application/json'
            }
        });

         // Envoie la réponse de inStatus au client
         res.status(response.status).json(response.data);
        } catch (error) {
            console.error("Erreur lors de la mise à jour de l'incident sur inStatus:", error);
            res.status(500).send("Une erreur s'est produite lors de la mise à jour de l'incident sur inStatus.");
        }

    

}

module.exports = {
    handleRequest
};

