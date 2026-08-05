import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import prisma from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';

const getSupabaseAdmin = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new AppError('Supabase storage not configured', 500);
  return createClient(url, key);
};

export const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return next(new AppError('No image file provided', 400));

    const { type, product_id } = req.body;
    const supabase = getSupabaseAdmin();
    const bucket = type === 'hero' || type === 'logo'
      ? (process.env.SUPABASE_SITE_BUCKET || 'site-assets')
      : (process.env.SUPABASE_PRODUCT_BUCKET || 'product-images');

    const ext = req.file.originalname.split('.').pop();
    const fileName = `${type || 'upload'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      const code =
        uploadError.message?.includes('401') ? 'storage_rejected_401' :
        uploadError.message?.includes('bucket') ? 'storage_bucket_not_found' :
        'storage_upload_failed';

      return res.status(500).json({ error: uploadError.message, code });
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);

    let imageRecord = null;
    if (type === 'product' && product_id) {
      const existingImages = await prisma.productImage.count({ where: { productId: BigInt(product_id) } });
      imageRecord = await prisma.productImage.create({
        data: {
          productId: BigInt(product_id),
          path: fileName,
          sortOrder: existingImages,
          isPrimary: existingImages === 0,
          mimeType: req.file.mimetype,
          fileSize: BigInt(req.file.size),
        },
      });
    }

    if (type === 'hero') {
      await prisma.siteSettings.upsert({
        where: { id: BigInt(1) },
        update: { heroImagePath: publicUrl },
        create: {
          id: BigInt(1), brandName: 'Arajut', heroHeading: 'Welcome', heroDescription: '', heroImagePath: publicUrl,
        },
      });
    }

    if (type === 'logo') {
      await prisma.siteSettings.upsert({
        where: { id: BigInt(1) },
        update: { logoPath: publicUrl },
        create: {
          id: BigInt(1), brandName: 'Arajut', heroHeading: 'Welcome', heroDescription: '', logoPath: publicUrl,
        },
      });
    }

    res.status(201).json({
      data: {
        url: publicUrl,
        path: fileName,
        image: imageRecord ? { ...imageRecord, id: imageRecord.id.toString(), productId: imageRecord.productId.toString() } : null,
      },
    });
  } catch (error: any) {
    if (error instanceof AppError) return next(error);
    return res.status(500).json({ error: error.message, code: 'storage_not_configured' });
  }
};
