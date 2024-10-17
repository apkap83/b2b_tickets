// pages/api/consent.js
import { cookies } from 'next/headers';

export default function handler(req, res) {
  // Get the existing cookie value
  const consent = cookies().get('consent');

  // Set a new cookie value
  cookies().set('consent', 'true', { path: '/' });

  // Return the cookie value
  res.status(200).json({ consent });
}
