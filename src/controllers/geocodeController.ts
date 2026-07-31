import { Request, Response, NextFunction } from 'express';

// GET /geocode/reverse?latitude=x&longitude=y
// Proxy ke OpenStreetMap Nominatim (gratis, no API key)
export const reverseGeocode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'arajut-backend/1.0 (arajut@example.com)' },
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Geocoding service unavailable' });
    }

    const data: any = await response.json();
    const addr = data.address || {};

    res.status(200).json({
      data: {
        address_line: data.display_name || '',
        province: addr.state || addr.province || '',
        city: addr.city || addr.town || addr.regency || addr.county || '',
        district: addr.suburb || addr.village || addr.neighbourhood || '',
        postal_code: addr.postcode || '',
      },
    });
  } catch (error) {
    next(error);
  }
};
