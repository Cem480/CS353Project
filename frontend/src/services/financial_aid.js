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
  export async function submitFinancialAidApplication(courseId, studentId, applicationData) {
  try {
    const response = await fetch(`${BASE_URL}/api/financial_aid/${courseId}/${studentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        income: applicationData.income,
        statement: applicationData.statement
      })
    });
    return await response.json();
  } catch (err) {
    console.error("Failed to submit financial aid application:", err);
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

  export async function get_student_financial_aid_applications(studentId) {
    try {
      const response = await fetch(`${BASE_URL}/api/student/${studentId}/financial_aid_applications`, {
        method: 'GET',
        credentials: 'include'
      });

      // Log status and headers
      console.log("Response status:", response.status);
      console.log("Content-Type:", response.headers.get("content-type"));

      // Try parsing JSON
      const data = await response.json();
      console.log("Response JSON:", data);
      return data;

    } catch (err) {
      console.error("Failed to fetch student's financial aid applications:", err);
      throw err;
    }
  }

  export async function hasStudentAppliedForAid(courseId, studentId) {
  try {
    const res = await fetch(`${BASE_URL}/api/financial_aid/has_applied/${courseId}/${studentId}`, {
      method: 'GET',
      credentials: 'include'
    });
    const result = await res.json();
    console.log("API Response:", result); 
    return result;
  } catch (err) {
    console.error("Failed to check financial aid application:", err);
    throw err;
  }
}


