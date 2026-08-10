import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { uploadFileToSupabase } from '../lib/uploadSupabase.js';
import { AppError } from '../lib/AppError.js';

export const uploadAsset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return next(new AppError('File gambar wajib diunggah', 400));
    }

    const type = (req.body.type || 'product') as 'product' | 'hero' | 'account' | 'site';
    const productId = req.body.product_id ? String(req.body.product_id) : undefined;
    const publicUrl = await uploadFileToSupabase(req.file, type, productId);

    if (type === 'product' && productId) {
      const existingProduct = await prisma.product.findUnique({ where: { productId } });
      if (existingProduct) {
        const updatedImageUrls = [...existingProduct.imageUrls, publicUrl];
        await prisma.product.update({
          where: { productId },
          data: { imageUrls: updatedImageUrls }
        });
      }
    } else if (type === 'hero' || type === 'site') {
      await prisma.siteSettings.upsert({
        where: { id: 1 },
        update: { heroImagePath: publicUrl },
        create: { id: 1, heroImagePath: publicUrl }
      });
    }

    res.status(200).json({
      success: true,
      url: publicUrl,
      data: {
        url: publicUrl,
        path: publicUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, slug, description, icon, background_color, sort_order, is_active } = req.body;

    if (!name) {
      return next(new AppError('Nama kategori wajib diisi', 400));
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description,
        icon: icon || '🧶',
        backgroundColor: background_color || '#FDF2F4',
        sortOrder: sort_order ? parseInt(sort_order) : 0,
        isActive: is_active !== false,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: category.categoryId,
        categoryId: category.categoryId,
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        background_color: category.backgroundColor,
        sort_order: category.sortOrder,
        is_active: category.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId = req.params['id'] as string;
    const { name, slug, description, icon, background_color, sort_order, is_active } = req.body;

    const existing = await prisma.category.findUnique({ where: { categoryId } });
    if (!existing) {
      return next(new AppError('Kategori tidak ditemukan', 404));
    }

    const updated = await prisma.category.update({
      where: { categoryId },
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

    res.status(200).json({
      success: true,
      data: {
        id: updated.categoryId,
        categoryId: updated.categoryId,
        name: updated.name,
        slug: updated.slug,
        description: updated.description,
        icon: updated.icon,
        background_color: updated.backgroundColor,
        sort_order: updated.sortOrder,
        is_active: updated.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId = req.params['id'] as string;
    await prisma.category.delete({ where: { categoryId } });

    res.status(200).json({
      success: true,
      message: 'Kategori berhasil dihapus',
    });
  } catch (error) {
    next(error);
  }
};

export const updateSiteSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      brand_name,
      tagline,
      logo_path,
      hero_badge,
      hero_heading,
      hero_highlight,
      hero_description,
      hero_image_path,
      promotion_title,
      promotion_description,
      instagram_url,
      whatsapp_number,
      contact_email,
      footer_text,
    } = req.body;

    const updated = await prisma.siteSettings.upsert({
      where: { id: 1 },
      update: {
        brandName: brand_name,
        tagline,
        logoPath: logo_path,
        heroBadge: hero_badge,
        heroHeading: hero_heading,
        heroHighlight: hero_highlight,
        heroDescription: hero_description,
        heroImagePath: hero_image_path,
        promotionTitle: promotion_title,
        promotionDescription: promotion_description,
        instagramUrl: instagram_url,
        whatsappNumber: whatsapp_number,
        contactEmail: contact_email,
        footerText: footer_text,
      },
      create: {
        id: 1,
        brandName: brand_name,
        tagline,
        logoPath: logo_path,
        heroBadge: hero_badge,
        heroHeading: hero_heading,
        heroHighlight: hero_highlight,
        heroDescription: hero_description,
        heroImagePath: hero_image_path,
        promotionTitle: promotion_title,
        promotionDescription: promotion_description,
        instagramUrl: instagram_url,
        whatsappNumber: whatsapp_number,
        contactEmail: contact_email,
        footerText: footer_text,
      },
    });

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminOrders = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        user: true,
        address: true,
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
        payments: true,
      },
      orderBy: { transactionDate: 'desc' },
    });

    const formatted = transactions.map(t => {
      const totalPrice = Number(t.totalPrice || 0);
      const paymentsList = t.payments || [];
      const paidAmount = paymentsList
        .filter((p: any) => p.status === 'paid' || p.status === 'Paid')
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

      const items = (t.items || []).map((item: any) => ({
        transaction_item_id: item.transactionItemId,
        variant_id: item.variantId,
        product_name: item.variant?.product?.name || 'Produk Rajut',
        quantity: item.quantity,
        price: Number(item.price || 0),
      }));

      return {
        transaction_id: t.transactionId,
        id: t.transactionId,
        user_id: t.userId,
        full_name: t.user?.fullName || 'Pelanggan',
        customer_name: t.user?.fullName || 'Pelanggan',
        order_number: t.orderNumber || `TRX-${t.transactionId.slice(0, 8).toUpperCase()}`,
        status: t.status || 'Pending',
        total_price: totalPrice,
        total: totalPrice,
        paid_amount: paidAmount,
        remaining_payment: Math.max(0, totalPrice - paidAmount),
        transaction_date: t.transactionDate,
        address: t.address
          ? {
              address_id: t.address.addressId,
              recipient_name: t.address.receiverName,
              street_address: t.address.addressLine || t.address.address,
              address_line: t.address.addressLine || t.address.address,
              city: t.address.city,
            }
          : null,
        transaction_items: items,
        items,
        payments: paymentsList.map((p: any) => ({
          id: p.paymentId,
          payment_id: p.paymentId,
          method: p.method,
          amount: Number(p.amount || 0),
          status: p.status,
        })),
      };
    });

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTransactionStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transactionId = req.params['id'] as string;
    const { status } = req.body;

    const updated = await prisma.transaction.update({
      where: { transactionId },
      data: { status },
    });

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const paymentId = req.params['id'] as string;
    const { status } = req.body;

    const updated = await prisma.payment.update({
      where: { paymentId },
      data: { status },
    });

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminPromos = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const promos = await prisma.promo.findMany({
      orderBy: { promoName: 'asc' },
    });

    const formatted = promos.map(p => ({
      promo_id: p.promoId,
      promo_name: p.promoName,
      promo_code: p.promoCode,
      discount_percent: p.discountPercent ? Number(p.discountPercent) : null,
      discount_amount: p.discountAmount ? Number(p.discountAmount) : null,
      valid_until: p.validUntil ? p.validUntil.toISOString().split('T')[0] : null,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

export const createPromo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { promo_name, promo_code, discount_percent, discount_amount, valid_until } = req.body;

    if (!promo_name || !promo_code) {
      res.status(400).json({ success: false, error: 'Nama dan kode promo wajib diisi' });
      return;
    }

    const newPromo = await prisma.promo.create({
      data: {
        promoName: promo_name,
        promoCode: promo_code.toUpperCase(),
        discountPercent: discount_percent ? parseFloat(discount_percent) : null,
        discountAmount: discount_amount ? parseFloat(discount_amount) : null,
        validUntil: valid_until ? new Date(valid_until) : null,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        promo_id: newPromo.promoId,
        promo_name: newPromo.promoName,
        promo_code: newPromo.promoCode,
        discount_percent: newPromo.discountPercent ? Number(newPromo.discountPercent) : null,
        discount_amount: newPromo.discountAmount ? Number(newPromo.discountAmount) : null,
        valid_until: newPromo.validUntil ? newPromo.validUntil.toISOString().split('T')[0] : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deletePromo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const promoId = req.params['id'] as string;
    await prisma.promo.delete({ where: { promoId } });

    res.status(200).json({
      success: true,
      message: 'Promo berhasil dihapus',
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminCustomRequests = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = await prisma.customProductRequest.findMany({
      include: {
        user: true,
        responses: {
          include: {
            admin: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = requests.map(r => ({
      request_id: r.requestId,
      custom_name: r.customName,
      description: r.description,
      status: r.status,
      created_at: r.createdAt,
      user_name: r.user?.fullName || 'Pelanggan',
      user_email: r.user?.email || '',
      reference_images: r.referenceImages || [],
      responses: r.responses.map(res => ({
        response_id: res.responseId,
        response_message: res.responseMessage,
        estimated_price: res.estimatedPrice ? Number(res.estimatedPrice) : null,
        estimated_finish_date: res.estimatedFinishDate ? res.estimatedFinishDate.toISOString().split('T')[0] : null,
        status_after_response: res.statusAfterResponse,
        created_at: res.createdAt,
      })),
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

export const respondCustomRequest = async (req: any, res: Response, next: NextFunction) => {
  try {
    const requestId = req.params['id'] as string;
    const { response_message, estimated_price, estimated_finish_date, status_after_response } = req.body;

    const adminId = req.user?.userId;

    if (!adminId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const newResponse = await prisma.customProductResponse.create({
      data: {
        requestId,
        adminId,
        responseMessage: response_message || '',
        estimatedPrice: estimated_price ? parseFloat(estimated_price) : null,
        estimatedFinishDate: estimated_finish_date ? new Date(estimated_finish_date) : null,
        statusAfterResponse: status_after_response || 'Approved',
      },
    });

    await prisma.customProductRequest.update({
      where: { requestId },
      data: { status: status_after_response || 'Approved' },
    });

    res.status(200).json({
      success: true,
      data: newResponse,
    });
  } catch (error) {
    next(error);
  }
};
