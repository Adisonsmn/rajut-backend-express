import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';

const buildImageUrl = (path: string) =>
  path.startsWith('http')
    ? path
    : `${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.SUPABASE_PRODUCT_BUCKET}/${path}`;

const mapProduct = (p: any) => {
  const imageUrl = p.images ? buildImageUrl(p.images.path) : null;
  return {
    id: p.id.toString(),
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    stock: p.stock,
    category: p.category?.name ?? '',
    image: imageUrl,
    images: imageUrl ? [imageUrl] : [],
    readyStock: p.availabilityType === 'ready_stock',
    active: p.isActive,
    featured: p.isFeatured,
    description: p.shortDescription ?? p.description,
    fullDescription: p.description,
    preorderDuration: p.preorderDuration ?? null,
    availability_type: p.availabilityType,
    short_description: p.shortDescription,
    category_id: p.category?.id.toString() ?? null,
  };
};

export const getStorefront = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [products, categories, settings] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true, deletedAt: null },
        include: { images: true, category: true },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.category.findMany({
        where: { isActive: true, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.siteSettings.findFirst(),
    ]);

    res.status(200).json({
      data: {
        products: products.map(mapProduct),
        categories: categories.map((c) => ({
          id: c.id.toString(),
          name: c.name,
          slug: c.slug,
          description: c.description,
          icon: c.icon,
          color: c.backgroundColor,
          background_color: c.backgroundColor,
          sortOrder: c.sortOrder,
          sort_order: c.sortOrder,
          active: c.isActive,
          is_active: c.isActive,
        })),
        settings: settings
          ? {
              brand_name: settings.brandName,
              tagline: settings.tagline,
              logo_path: settings.logoPath,
              hero_badge: settings.heroBadge,
              hero_heading: settings.heroHeading,
              hero_highlight: settings.heroHighlight,
              hero_description: settings.heroDescription,
              hero_image_path: settings.heroImagePath,
              promotion_title: settings.promotionTitle,
              promotion_description: settings.promotionDescription,
              instagram_url: settings.instagramUrl,
              whatsapp_number: settings.whatsappNumber,
              contact_email: settings.contactEmail,
              footer_text: settings.footerText,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search, featured } = req.query;
    const categorySlug = typeof category === 'string' ? category : undefined;
    const searchStr = typeof search === 'string' ? search : undefined;

    const whereInput: any = {
      isActive: true,
      deletedAt: null,
    };

    if (featured === 'true') {
      whereInput.isFeatured = true;
    }

    if (searchStr) {
      whereInput.name = { contains: searchStr };
    }

    if (categorySlug) {
      whereInput.category = { slug: categorySlug };
    }

    const products = await (prisma.product as any).findMany({
      where: whereInput,
      include: { images: true, category: true },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });

    res.status(200).json({ data: products.map(mapProduct) });
  } catch (error) {
    next(error);
  }
};

export const getProductBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = String(req.params.slug);

    const product = await prisma.product.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      include: { images: true, category: true },
    });

    if (!product) return next(new AppError('Product not found', 404));

    res.status(200).json({ data: mapProduct(product) });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });

    res.status(200).json({
      data: categories.map((c) => ({
        id: c.id.toString(),
        name: c.name,
        slug: c.slug,
        description: c.description,
        icon: c.icon,
        color: c.backgroundColor,
        background_color: c.backgroundColor,
        sortOrder: c.sortOrder,
        sort_order: c.sortOrder,
        active: c.isActive,
        is_active: c.isActive,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getSiteSettings = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.siteSettings.findFirst();
    if (!settings) return next(new AppError('Site settings not found', 404));

    res.status(200).json({
      data: {
        brand_name: settings.brandName,
        tagline: settings.tagline,
        logo_path: settings.logoPath,
        hero_badge: settings.heroBadge,
        hero_heading: settings.heroHeading,
        hero_highlight: settings.heroHighlight,
        hero_description: settings.heroDescription,
        hero_image_path: settings.heroImagePath,
        promotion_title: settings.promotionTitle,
        promotion_description: settings.promotionDescription,
        instagram_url: settings.instagramUrl,
        whatsapp_number: settings.whatsappNumber,
        contact_email: settings.contactEmail,
        footer_text: settings.footerText,
      },
    });
  } catch (error) {
    next(error);
  }
};
