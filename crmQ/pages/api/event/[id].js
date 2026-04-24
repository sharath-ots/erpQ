import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from "secrets";

export default async function handler(req, res) {
    const authHeader = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;
    const headers = {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    if (req.method == 'PUT') {
        // 2. Extract the event name (ID) from the URL
        const { id } = req.query;
        try {
            // 3. Forward the request to the actual ERPNext server
            const erpResponse = await fetch(`${CITYQ_ERPNEXT_URL}/api/resource/Event/${id}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(req.body) // Pass the React data straight to ERPNext
            });

            const data = await erpResponse.json();

            // 4. Handle ERPNext errors (e.g., validation failed)
            if (!erpResponse.ok) {
                console.error("ERP Error:", data);
                return res.status(erpResponse.status).json(data);
            }

            // 5. Send success back to React
            return res.status(200).json(data);

        } catch (error) {
            console.error("Next.js Proxy Error:", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
    // else if (req.method == 'POST') {

    //     try {

    //         const erpResponse = await fetch(`${CITYQ_ERPNEXT_URL}/api/resource/Event`, {
    //             method: 'POST',
    //             headers: headers,
    //             body: JSON.stringify(req.body) // Pass the React data straight to ERPNext
    //         });

    //         const data = await erpResponse.json();

    //         // 4. Handle ERPNext errors (e.g., validation failed)
    //         if (!erpResponse.ok) {
    //             console.error("ERP Error:", data);
    //             return res.status(erpResponse.status).json(data);
    //         }

    //         // 5. Send success back to React
    //         return res.status(200).json(data);

    //     } catch (error) {
    //         console.error("Next.js Proxy Error:", error);
    //         return res.status(500).json({ message: "Internal Server Error" });
    //     }
    // }
    else {
        return res.status(405).json({ error: 'Method not allowed' });
    }


}