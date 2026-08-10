import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';

export const getSiteSettings = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settingsDb = await prisma.siteSettings.findFirst({ where: { id: 1 } });

    const settings = settingsDb
      ? {
          brand_name: settingsDb.brandName || 'Arajut',
          tagline: settingsDb.tagline || 'Kerajinan Rajut Handmade Berkualitas',
          logo_path: settingsDb.logoPath || '',
          hero_badge: settingsDb.heroBadge || 'Handmade Local Collection',
          hero_heading: settingsDb.heroHeading || 'Keindahan Rajut Sentuhan Tangan',
          hero_highlight: settingsDb.heroHighlight || 'Pilihan Spesial',
          hero_description: settingsDb.heroDescription || 'Koleksi rajut eksklusif buatan tangan untuk mendukung gaya kasual dan hangat kamu.',
          hero_image_path: settingsDb.heroImagePath || '',
          promotion_title: settingsDb.promotionTitle || 'Promo Spesial Arajut',
          promotion_description: settingsDb.promotionDescription || 'Dapatkan penawaran terbatas untuk produk pilihan minggu ini.',
          instagram_url: settingsDb.instagramUrl || 'https://instagram.com',
          whatsapp_number: settingsDb.whatsappNumber || '6281234567890',
          contact_email: settingsDb.contactEmail || 'info@arajut.com',
          footer_text: settingsDb.footerText || '© 2026 Arajut. Seluruh Hak Cipta Dilindungi.',
        }
      : {
          brand_name: 'Arajut',
          tagline: 'Kerajinan Rajut Handmade Berkualitas',
          logo_path: '',
          hero_badge: 'Handmade Local Collection',
          hero_heading: 'Keindahan Rajut Sentuhan Tangan',
          hero_highlight: 'Pilihan Spesial',
          hero_description: 'Koleksi rajut eksklusif buatan tangan untuk mendukung gaya kasual dan hangat kamu.',
          hero_image_path: '',
          promotion_title: 'Promo Spesial Arajut',
          promotion_description: 'Dapatkan penawaran terbatas untuk produk pilihan minggu ini.',
          instagram_url: 'https://instagram.com',
          whatsapp_number: '6281234567890',
          contact_email: 'info@arajut.com',
          footer_text: '© 2026 Arajut. Seluruh Hak Cipta Dilindungi.',
        };

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};
