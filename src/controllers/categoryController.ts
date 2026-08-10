import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';

export const getAllCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
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

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};
