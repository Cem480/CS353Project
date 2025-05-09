const BASE_URL = 'http://localhost:5001';

// Function to get basic profile of a user 
export async function getBasicProfile(userId) {
  try {
    const response = await fetch(`${BASE_URL}/api/profile/basic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ user_id: userId })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch profile.');
    }

    return data.profile;
  } catch (err) {
    console.error("Profile fetch failed:", err);
    throw err;
  }
}