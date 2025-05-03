const BASE_URL = 'http://localhost:5001';

  export async function getFinancialAidStats(instructorId) {
    try {
      const response = await fetch(`${BASE_URL}/api/instructor/${instructorId}/financial_aid_stats`, {
        method: 'GET',
        credentials: 'include'
      });
      return await response.json();
    } catch (err) {
      console.error("Failed to fetch financial aid stats:", err);
      throw err;
    }
  }
  
  export async function getFinancialAidApplications(instructorId) {
    try {
      const response = await fetch(`${BASE_URL}/api/instructor/${instructorId}/financial_aid_applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      });
      return await response.json();
    } catch (err) {
      console.error("Failed to fetch applications:", err);
      throw err;
    }
  }
  
  export async function evaluateFinancialAid(courseId, studentId, instructorId, isAccepted) {
    try {
      const response = await fetch(`${BASE_URL}/api/financial_aid/evaluate/${courseId}/${studentId}/${instructorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_accepted: isAccepted })
      });
      return await response.json();
    } catch (err) {
      console.error("Error during financial aid evaluation:", err);
      throw err;
    }
  }