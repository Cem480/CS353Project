const BASE_URL = 'http://localhost:5001';

// Fetch list of certificates for the current user
export async function getStudentCertificates() {
    try {
        const response = await fetch(`${BASE_URL}/api/certificate/list`, {
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch certificates');
        }

        const data = await response.json();
        return data; // should include { success, certificates }
    } catch (err) {
        console.error('Error fetching certificates:', err);
        throw err;
    }
}

// Delete a certificate by ID
export async function deleteCertificate(certificateId) {
    try {
        const response = await fetch(`${BASE_URL}/api/certificate/delete/${certificateId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to delete certificate');
        }

        return data;
    } catch (err) {
        console.error('Error deleting certificate:', err);
        throw err;
    }
}