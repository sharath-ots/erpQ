import { useState, useEffect } from 'react';

export function useERPDropdown(doctype) {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchOptions = async () => {
            setLoading(true);
            try {
                // Encode the doctype to handle spaces (e.g. "Opportunity Type" -> "Opportunity%20Type")
                const response = await fetch(`/api/crm/get-dropdown?doctype=${encodeURIComponent(doctype)}`);
                if (!response.ok) throw new Error(`Failed to fetch ${doctype}`);
                
                const data = await response.json();
                if (isMounted) {
                    setOptions(data);
                }
            } catch (error) {
                console.error(error);
                if (isMounted) setOptions([]);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchOptions();

        return () => { isMounted = false; };
    }, [doctype]);

    return { options, loading };
}