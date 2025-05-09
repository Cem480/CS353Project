const BASE_URL = 'http://localhost:5001';

export async function generateReport(topic, type, adminId, start, end) {
    // build the URL
    let url = `${BASE_URL}/api/report/${topic}/${type}?admin_id=${adminId}`;
    if (type === 'ranged') {
        url += `&start=${start}&end=${end}`;
    }
    try {
        const res = await fetch(url, {
            method: 'GET',
            credentials: 'include',
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || res.statusText);
        }
        return await res.json();
    } catch (e) {
        console.error('Report fetch failed:', e);
        throw e;
    }
}
