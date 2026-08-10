import { Request, Response, NextFunction } from 'express';

// GET /api/geocode/reverse?latitude=x&longitude=y
export const reverseGeocode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    let result = {
      address_line: '',
      province: '',
      city: '',
      district: '',
      postal_code: '',
    };

    // Attempt 1: OpenStreetMap Nominatim
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=id`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ArajutApp/1.0' },
      });

      if (response.ok) {
        const data: any = await response.json();
        const addr = data.address || {};

        result.province = addr.state || addr.province || addr.region || addr.state_district || '';
        result.city = addr.city || addr.town || addr.regency || addr.county || addr.municipality || addr.city_district || addr.subdistrict || '';
        result.district = addr.suburb || addr.district || addr.village || addr.neighbourhood || addr.quarter || addr.hamlet || '';
        result.postal_code = addr.postcode || addr.postal_code || '';

        const roadParts = [
          addr.road || addr.street || addr.pedestrian || addr.footway || addr.path,
          addr.house_number || addr.building,
        ].filter(Boolean);

        if (roadParts.length > 0) {
          result.address_line = roadParts.join(' ');
          if (result.district || result.city) {
            result.address_line += `, ${result.district || result.city}`;
          }
        } else {
          result.address_line = data.display_name || '';
        }
      }
    } catch {}

    // Attempt 2: BigDataCloud Fallback if any primary field is missing
    if (!result.province || !result.city || !result.address_line) {
      try {
        const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=id`;
        const bdcResp = await fetch(bdcUrl);
        if (bdcResp.ok) {
          const bdcData: any = await bdcResp.json();
          if (!result.province) result.province = bdcData.principalSubdivision || '';
          if (!result.city) result.city = bdcData.city || bdcData.locality || bdcData.localityInfo?.administrative?.[2]?.name || '';
          if (!result.district) result.district = bdcData.localityInfo?.administrative?.[3]?.name || bdcData.localityInfo?.administrative?.[4]?.name || '';
          if (!result.postal_code) result.postal_code = bdcData.postcode || '';
          if (!result.address_line) {
            result.address_line = [bdcData.locality, bdcData.city, bdcData.principalSubdivision].filter(Boolean).join(', ');
          }
        }
      } catch {}
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
