export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstName, lastName, email, phone } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const AC_URL = process.env.AC_URL;
  const AC_KEY = process.env.AC_KEY;
  const LIST_ID = '111';

  try {
    // Step 1: Create or update the contact
    const contactRes = await fetch(`${AC_URL}/api/3/contacts`, {
      method: 'POST',
      headers: {
        'Api-Token': AC_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contact: {
          email,
          firstName: firstName || '',
          lastName: lastName || '',
          phone: phone || '',
        },
      }),
    });

    const contactData = await contactRes.json();

    // Handle duplicate contact (AC returns 422 with a contact id)
    let contactId = contactData?.contact?.id;

    if (!contactId && contactData?.errors) {
      // Contact may already exist — fetch by email
      const searchRes = await fetch(
        `${AC_URL}/api/3/contacts?email=${encodeURIComponent(email)}`,
        {
          headers: { 'Api-Token': AC_KEY },
        }
      );
      const searchData = await searchRes.json();
      contactId = searchData?.contacts?.[0]?.id;
    }

    if (!contactId) {
      return res.status(500).json({ error: 'Could not create or find contact' });
    }

    // Step 2: Add contact to list 111
    const listRes = await fetch(`${AC_URL}/api/3/contactLists`, {
      method: 'POST',
      headers: {
        'Api-Token': AC_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contactList: {
          list: LIST_ID,
          contact: contactId,
          status: '1', // 1 = subscribed
        },
      }),
    });

    const listData = await listRes.json();

    return res.status(200).json({ success: true, contactId });
  } catch (err) {
    console.error('ActiveCampaign error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
