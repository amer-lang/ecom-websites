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

  if (!AC_URL || !AC_KEY) {
    return res.status(500).json({ error: 'Missing environment variables', AC_URL: !!AC_URL, AC_KEY: !!AC_KEY });
  }

  try {
    // Step 1: Use sync contact endpoint (creates or updates)
    const syncRes = await fetch(`${AC_URL}/api/3/contact/sync`, {
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

    const syncData = await syncRes.json();

    if (!syncRes.ok) {
      return res.status(500).json({ error: 'Failed to sync contact', details: syncData });
    }

    const contactId = syncData?.contact?.id;

    if (!contactId) {
      return res.status(500).json({ error: 'No contact ID returned', details: syncData });
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
          status: '1',
        },
      }),
    });

    const listData = await listRes.json();

    if (!listRes.ok) {
      return res.status(500).json({ error: 'Failed to add to list', details: listData });
    }

    return res.status(200).json({ success: true, contactId });

  } catch (err) {
    return res.status(500).json({ error: 'Exception thrown', message: err.message });
  }
}
