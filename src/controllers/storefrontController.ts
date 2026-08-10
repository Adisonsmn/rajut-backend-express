import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { formatProduct } from './productController.js';
import crypto from 'crypto';

export const getStorefrontData = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const existingCustom = await prisma.product.findFirst({
      where: {
        name: { equals: 'Custom Crochet Order', mode: 'insensitive' }
      }
    });

    if (!existingCustom) {
      await prisma.product.create({
        data: {
          productId: crypto.randomUUID(),
          name: 'Custom Crochet Order',
          description: 'Wujudkan ide rajutanmu bersama Arajut. Harga awal menyesuaikan ukuran dan tingkat detail.',
          category: 'Custom',
          basePrice: 150000,
          imageUrls: [],
          isActive: true,
          variants: {
            create: [
              { color: 'Custom', size: 'Custom', stock: 99 }
            ]
          }
        }
      }).catch(() => {});
    }

    const productsRaw = await prisma.product.findMany({
      where: { isActive: true },
      include: { variants: true },
      orderBy: { createdAt: 'desc' },
    });

    const products = productsRaw.map(formatProduct);

    let categoriesRaw = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (categoriesRaw.length === 0) {
      const defaultCats = [
        { name: 'Umum', slug: 'umum', description: 'Kategori umum produk rajut', icon: '🧶', backgroundColor: 'bg-blush', sortOrder: 1 },
        { name: 'Pakaian', slug: 'pakaian', description: 'Koleksi pakaian rajut', icon: '👔', backgroundColor: 'bg-cream', sortOrder: 2 },
        { name: 'Aksesoris', slug: 'aksesoris', description: 'Aksesoris buatan tangan', icon: '🎀', backgroundColor: 'bg-blush', sortOrder: 3 },
        { name: 'Tas', slug: 'tas', description: 'Tas dan dompet rajut', icon: '👜', backgroundColor: 'bg-cream', sortOrder: 4 },
        { name: 'Boneka', slug: 'boneka', description: 'Boneka amigurumi', icon: '🧸', backgroundColor: 'bg-blush', sortOrder: 5 },
        { name: 'Custom', slug: 'custom', description: 'Pesanan khusus sesuai keinginan', icon: '✨', backgroundColor: 'bg-cream', sortOrder: 6 },
      ];

      for (const cat of defaultCats) {
        await prisma.category.upsert({
          where: { name: cat.name },
          update: {},
          create: cat,
        }).catch(() => {});
      }

      categoriesRaw = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    }

    const categories = categoriesRaw.map(c => ({
      id: c.categoryId,
      categoryId: c.categoryId,
      name: c.name,
      slug: c.slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: c.description || '',
      icon: c.icon || '🧶',
      color: c.backgroundColor || 'bg-blush',
      background_color: c.backgroundColor || 'bg-blush',
      sortOrder: c.sortOrder || 0,
      sort_order: c.sortOrder || 0,
      active: c.isActive,
      is_active: c.isActive,
    }));

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
          heroImage: settingsDb.heroImagePath || '',
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
          heroImage: '',
          promotion_title: 'Promo Spesial Arajut',
          promotion_description: 'Dapatkan penawaran terbatas untuk produk pilihan minggu ini.',
          instagram_url: 'https://instagram.com',
          whatsapp_number: '6281234567890',
          contact_email: 'info@arajut.com',
          footer_text: '© 2026 Arajut. Seluruh Hak Cipta Dilindungi.',
        };

    res.status(200).json({
      success: true,
      data: {
        products,
        categories,
        settings,
      },
    });
  } catch (error) {
    next(error);
  }
};
