export const FILTER_CONDITIONS = [
    { label: 'Equals', value: '=' },
    { label: 'Not Equals', value: '!=' },
    { label: 'Like', value: 'like' },
    { label: 'Not Like', value: 'not like' },
    { label: 'In', value: 'in' },
    { label: 'Not In', value: 'not in' },
    { label: 'Is', value: 'is' },
    { label: 'Greater Than', value: '>' },
    { label: 'Less Than', value: '<' },
    { label: 'Between', value: 'between' },
];

export const evaluateFrappeFilter = (rowValue, filterOperator, filterValue, fieldName) => {

    // 🚀 EXPERT FIX: Bulletproof Date Parsing for ERPNext
    if (filterOperator === 'between') {
        if (!Array.isArray(filterValue) || filterValue.length !== 2) return false;
        if (!rowValue) return false;

        try {
            let rowDateStr = String(rowValue).trim();

            // 1. Un-scramble ERPNext's Custom Date Formats
            // Check if Frappe sent it backwards (e.g., DD-MM-YYYY instead of YYYY-MM-DD)
            let dateOnly = rowDateStr.split(' ')[0].split('T')[0];
            let parts = dateOnly.split('-');

            if (parts.length === 3 && parts[2].length === 4) {
                // It's DD-MM-YYYY. Flip it to YYYY-MM-DD for JavaScript to understand!
                rowDateStr = `${parts[2]}-${parts[1]}-${parts[0]}T${rowDateStr.split(' ')[1] || '00:00:00'}`;
            } else {
                // It's standard ISO, just replace the Frappe space with a "T"
                rowDateStr = rowDateStr.replace(' ', 'T');
            }

            const rowTime = new Date(rowDateStr).getTime();
            if (isNaN(rowTime)) return false;

            // 2. Parse the User's Input Dates
            // Input 1 is locked to 00:00:00 (Start of Day)
            const startTime = filterValue[0]
                ? new Date(`${filterValue[0]}T00:00:00`).getTime()
                : new Date('1970-01-01T00:00:00').getTime();

            // Input 2 is locked to 23:59:59 (End of Day)
            const endTime = filterValue[1]
                ? new Date(`${filterValue[1]}T23:59:59`).getTime()
                : new Date('2099-12-31T23:59:59').getTime();

            // --- SILENT DEBUGGER: Uncomment this if you want to see the math in your console! ---
            console.log(`Checking ${fieldName}: Frappe Sent -> ${rowValue} | Parsed As -> ${new Date(rowTime).toLocaleString()} | Falls between ${new Date(startTime).toLocaleString()} AND ${new Date(endTime).toLocaleString()}?`, (rowTime >= startTime && rowTime <= endTime));

            // 3. Mathematical Comparison
            return rowTime >= startTime && rowTime <= endTime;

        } catch (error) {
            console.error("Date Filter Error:", error);
            return false;
        }
    }

    // Standard evaluation for everything else (Equals, Like, In, etc.)
    const val1 = String(rowValue || '').toLowerCase().trim();
    const val2 = String(filterValue || '').toLowerCase().trim();

    switch (filterOperator) {
        case '=': return val1 === val2;
        case '!=': return val1 !== val2;
        case 'like':
            const cleanVal2Like = val2.replace(/%/g, '');
            return val1.includes(cleanVal2Like);
        case 'not like':
            const cleanVal2NotLike = val2.replace(/%/g, '');
            return !val1.includes(cleanVal2NotLike);
        case 'in':
            const inValues = val2.split(',').map(v => v.trim());
            return inValues.includes(val1);
        case 'not in':
            const notInValues = val2.split(',').map(v => v.trim());
            return !notInValues.includes(val1);
        case 'is':
            if (val2 === 'set') return val1 !== '';
            if (val2 === 'not set') return val1 === '';
            return false;

        // 🚀 EXPERT FIX: Smart Number vs Date Comparison
        case '>': {
            const isNumeric = !isNaN(Number(rowValue)) && !isNaN(Number(filterValue)) && rowValue !== '' && filterValue !== '';
            if (isNumeric) {
                return Number(rowValue) > Number(filterValue);
            }
            return val1 > val2; // Natively handles ISO Date strings like '2026-04-30' > '2026-02-06'
        }
        case '<': {
            const isNumeric = !isNaN(Number(rowValue)) && !isNaN(Number(filterValue)) && rowValue !== '' && filterValue !== '';
            if (isNumeric) {
                return Number(rowValue) < Number(filterValue);
            }
            return val1 < val2; // Natively handles ISO Date strings
        }

        default: return true;
    }
};

export const applyFrappeFilters = (rows, filters) => {
    if (!filters || filters.length === 0) return rows;

    return rows.filter(row => {
        for (let filter of filters) {
            // 🚀 EXPERT FIX: If the filter is wrapped in an array, treat it as an "OR" group!
            if (Array.isArray(filter)) {
                // .some() checks if AT LEAST ONE of the conditions is true
                const isMatchGroup = filter.some(f => {
                    const rawValue = row[f.field] || (f.field === 'email' ? row.email_id : '');
                    return evaluateFrappeFilter(rawValue, f.operator, f.value, f.field);
                });

                // If NONE of the OR conditions match, throw the row away
                if (!isMatchGroup) return false;

            } else {
                // Standard AND logic for normal, un-nested filters
                const rawValue = row[filter.field] || (filter.field === 'email' ? row.email_id : '');
                const isMatch = evaluateFrappeFilter(rawValue, filter.operator, filter.value, filter.field);

                if (!isMatch) return false;
            }
        }
        return true;
    });
};