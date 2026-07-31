import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';

export const getProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    if (!id) return next(new AppError('Product ID is required', 400));

    const product = await prisma.product.findUnique({
      where: { id: BigInt(id) },
      include: { images: true, category: true },
    });
    if (!product) return next(new AppError('Product not found', 404));

    res.status(200).json({ data: { ...product, id: product.id.toString(), categoryId: product.categoryId.toString() } });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, slug, category_id, short_description, description, price, stock, availability_type, preorder_duration, is_featured, is_active } = req.body;

    if (!name || !slug || !category_id || !description || price === undefined) {
      return next(new AppError('Missing required fields: name, slug, category_id, description, price', 400));
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        categoryId: BigInt(category_id),
        shortDescription: short_description,
        description,
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        availabilityType: availability_type || 'ready_stock',
        preorderDuration: preorder_duration,
        isFeatured: is_featured ?? false,
        isActive: is_active ?? true,
      },
    });

    res.status(201).json({ data: { ...product, id: product.id.toString() } });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    if (!id) return next(new AppError('Product ID is required', 400));

    const { name, slug, category_id, short_description, description, price, stock, availability_type, preorder_duration, is_featured, is_active } = req.body;

    const product = await prisma.product.update({
      where: { id: BigInt(id) },
      data: {
        name,
        slug,
        categoryId: category_id ? BigInt(category_id) : undefined,
        shortDescription: short_description,
        description,
        price: price !== undefined ? parseFloat(price) : undefined,
        stock: stock !== undefined ? parseInt(stock) : undefined,
        availabilityType: availability_type,
        preorderDuration: preorder_duration,
        isFeatured: is_featured,
        isActive: is_active,
      },
    });

    res.status(200).json({ data: { ...product, id: product.id.toString() } });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    if (!id) return next(new AppError('Product ID is required', 400));

    await prisma.product.update({
      where: { id: BigInt(id) },
      data: { deletedAt: new Date(), isActive: false },
    });
    res.status(200).json({ data: null, message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
};

export const deleteProductImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const paramImageId = String(req.params.imageId);
    const paramProductId = String(req.params.id);

    if (!paramImageId || !paramProductId) {
      return next(new AppError('Image ID and Product ID are required', 400));
    }

    const imageId = BigInt(paramImageId);
    const productId = BigInt(paramProductId);

    const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
    if (!image) return next(new AppError('Image not found', 404));

    await prisma.productImage.delete({ where: { id: imageId } });

    res.status(200).json({ data: null, message: 'Image deleted' });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, slug, description, icon, background_color, sort_order, is_active } = req.body;

    if (!name || !slug) return next(new AppError('name and slug are required', 400));

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        icon,
        backgroundColor: background_color,
        sortOrder: parseInt(sort_order) || 0,
        isActive: is_active ?? true,
      },
    });

    res.status(201).json({ data: { ...category, id: category.id.toString() } });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    if (!id) return next(new AppError('Category ID is required', 400));

    const { name, slug, description, icon, background_color, sort_order, is_active } = req.body;

    const category = await prisma.category.update({
      where: { id: BigInt(id) },
      data: {
        name,
        slug,
        description,
        icon,
        backgroundColor: background_color,
        sortOrder: sort_order !== undefined ? parseInt(sort_order) : undefined,
        isActive: is_active,
      },
    });

    res.status(200).json({ data: { ...category, id: category.id.toString() } });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    if (!id) return next(new AppError('Category ID is required', 400));

    await prisma.category.update({
      where: { id: BigInt(id) },
      data: { deletedAt: new Date(), isActive: false },
    });
    res.status(200).json({ data: null, message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};

export const updateSiteSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      brand_name, tagline, hero_badge, hero_heading, hero_highlight,
      hero_description, promotion_title, promotion_description,
      instagram_url, whatsapp_number, contact_email, footer_text,
    } = req.body;

    const settings = await prisma.siteSettings.upsert({
      where: { id: BigInt(1) },
      update: {
        brandName: brand_name,
        tagline, heroBadge: hero_badge, heroHeading: hero_heading,
        heroHighlight: hero_highlight, heroDescription: hero_description,
        promotionTitle: promotion_title, promotionDescription: promotion_description,
        instagramUrl: instagram_url, whatsappNumber: whatsapp_number,
        contactEmail: contact_email, footerText: footer_text,
        updatedBy: BigInt(req.user!.id),
        updatedAt: new Date(),
      },
      create: {
        id: BigInt(1),
        brandName: brand_name || 'Arajut',
        heroHeading: hero_heading || 'Welcome',
        heroDescription: hero_description || '',
        tagline, heroBadge: hero_badge, heroHighlight: hero_highlight,
        promotionTitle: promotion_title, promotionDescription: promotion_description,
        instagramUrl: instagram_url, whatsappNumber: whatsapp_number,
        contactEmail: contact_email, footerText: footer_text,
        updatedBy: BigInt(req.user!.id),
      },
    });

    res.status(200).json({ data: settings });
  } catch (error) {
    next(error);
  }
};

export const getAdminOrders = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      include: { payments: true, shipment: true },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      data: orders.map((o) => ({
        id: o.id.toString(),
        order_number: o.orderNumber,
        status: o.status,
        customer_name: o.customerName,
        customer_email: o.customerEmail,
        total: Number(o.total),
        paid_amount: o.payments.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0),
        remaining_payment: Number(o.total) - o.payments.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0),
        shipment: o.shipment ? { courier: o.shipment.courier, service: o.shipment.service } : null,
        payments: o.payments.map((p) => ({
          id: p.id.toString(),
          method: p.method,
          amount: Number(p.amount),
          status: p.status,
        })),
        created_at: o.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const updatePaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    if (!id) return next(new AppError('Payment ID is required', 400));

    const paymentId = BigInt(id);
    const { status } = req.body;

    const validStatuses = ['pending', 'paid', 'failed', 'expired', 'refunded'];
    if (!validStatuses.includes(status)) {
      return next(new AppError(`Invalid status. Valid: ${validStatuses.join(', ')}`, 400));
    }

    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        paidAt: status === 'paid' ? new Date() : undefined,
      },
    });

    if (status === 'paid') {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'processing', paidAt: new Date() },
      });
    }

    res.status(200).json({ data: { ...payment, id: payment.id.toString() } });
  } catch (error) {
    next(error);
  }
};
