import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { uploadFileToSupabase, deleteFilesFromSupabase } from '../lib/uploadSupabase.js';
import crypto from 'crypto';

export const formatProduct = (p: any) => {
  const stock = Array.isArray(p.variants) && p.variants.length > 0
    ? p.variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0)
    : 0;
  
  const images = (p.imageUrls || []).map((url: string, index: number) => ({
    id: url,
    url,
    path: url,
    is_primary: index === 0
  }));

  const primaryImage = images[0]?.url || '';

  return {
    id: p.productId,
    productId: p.productId,
    name: p.name,
    slug: p.name ? p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : p.productId,
    price: p.basePrice ? Number(p.basePrice) : 0,
    basePrice: p.basePrice ? Number(p.basePrice) : 0,
    stock,
    category: p.category || 'Umum',
    description: p.description || '',
    shortDescription: p.description || '',
    fullDescription: p.description || '',
    image: primaryImage,
    images,
    imageUrls: p.imageUrls || [],
    featured: true,
    is_featured: true,
    active: p.isActive !== false,
    is_active: p.isActive !== false,
    isActive: p.isActive !== false,
    availability_type: 'ready_stock',
    preorder_duration: null,
    variants: p.variants || [],
  };
};

export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    const category = req.query.category as string;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;

    const skip = (page - 1) * limit;

    const whereClause: any = {
      isActive: true
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category) {
      whereClause.category = { contains: category, mode: 'insensitive' };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      whereClause.basePrice = {};
      if (minPrice !== undefined) whereClause.basePrice.gte = minPrice;
      if (maxPrice !== undefined) whereClause.basePrice.lte = maxPrice;
    }

    const totalProducts = await prisma.product.count({ where: whereClause });

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        variants: true
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedProducts = products.map(formatProduct);
    
    res.status(200).json({
      success: true,
      pagination: {
        total: totalProducts,
        page,
        limit,
        totalPages: Math.ceil(totalProducts / limit)
      },
      data: formattedProducts
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  const productId = req.params['id'] as string;

  if (!productId) {
    res.status(404).json({
      success: false,
      error: "Product not found"
    });
    return;
  }
  
  try {
    const requestedProduct = await prisma.product.findUnique({
      where: {
        productId,
      },
      include: {
        variants: true
      }
    });

    if (!requestedProduct) {
      res.status(404).json({
        success: false,
        error: "Product not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: formatProduct(requestedProduct)
    }); 
  } catch (error) {
    next(error);
  }
};

export const addProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { name } = req.body;
  const description = req.body.description || req.body.fullDescription || req.body.short_description || '';
  const priceVal = req.body.price ?? req.body.basePrice;
  const stockVal = req.body.stock !== undefined ? parseInt(req.body.stock) : 0;
  
  let categoryVal = req.body.category || req.body.category_name;
  if (!categoryVal && req.body.category_id) {
    try {
      const catObj = await prisma.category.findUnique({
        where: { categoryId: String(req.body.category_id) }
      });
      if (catObj) categoryVal = catObj.name;
    } catch {}
  }
  if (!categoryVal) categoryVal = 'Umum';

  if (!name || priceVal === undefined) {
    res.status(400).json({
      success: false,
      error: "Nama dan harga produk wajib diisi"
    });
    return;
  }

  let imageUrls: string[] = req.body.imageUrls ? (Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [req.body.imageUrls]) : [];

  const productId = crypto.randomUUID();

  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    try {
      const uploadPromises = req.files.map(file => uploadFileToSupabase(file, 'product', productId));
      const uploadedUrls = await Promise.all(uploadPromises);
      imageUrls = [...imageUrls, ...uploadedUrls];
    } catch (error) {
      return next(error);
    }
  }

  let parsedVariants = req.body.variants;
  if (typeof parsedVariants === 'string') {
    try {
      parsedVariants = JSON.parse(parsedVariants);
    } catch {
      parsedVariants = null;
    }
  }

  if (!parsedVariants || !Array.isArray(parsedVariants) || parsedVariants.length === 0) {
    parsedVariants = [
      { color: 'Standard', size: 'All Size', stock: stockVal }
    ];
  }

  try {
    const newProduct = await prisma.product.create({
      data: {
        productId,
        name,
        description,
        category: categoryVal,
        basePrice: parseFloat(priceVal),
        imageUrls,
        isActive: req.body.is_active !== false && req.body.active !== false,
        variants: {
          create: parsedVariants.map((v: any) => ({
            color: v.color || 'Standard',
            size: v.size || 'All Size',
            stock: v.stock !== undefined ? parseInt(v.stock) : stockVal,
          }))
        }
      },
      include: {
        variants: true
      }
    });

    const formatted = formatProduct(newProduct);

    res.status(201).json({
      success: true,
      data: formatted
    });
  } catch (error) {
    if (imageUrls.length > 0) {
      await deleteFilesFromSupabase(imageUrls, 'product').catch(() => {});
    }
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  const productId = req.params['id'] as string;
  const { name } = req.body;
  const description = req.body.description || req.body.fullDescription || req.body.short_description || '';
  const priceVal = req.body.price ?? req.body.basePrice;
  const stockVal = req.body.stock !== undefined ? parseInt(req.body.stock) : undefined;
  
  let categoryVal = req.body.category || req.body.category_name;
  if (!categoryVal && req.body.category_id) {
    try {
      const catObj = await prisma.category.findUnique({
        where: { categoryId: String(req.body.category_id) }
      });
      if (catObj) categoryVal = catObj.name;
    } catch {}
  }

  const isActive = req.body.is_active !== undefined ? req.body.is_active : req.body.active;

  let keptImages: string[] = req.body.keptImages ? (Array.isArray(req.body.keptImages) ? req.body.keptImages : [req.body.keptImages]) : [];

  if (!productId) {
    res.status(400).json({
      success: false,
      error: "ID produk tidak valid"
    });
    return;
  }

  let existingProduct;
  try {
    existingProduct = await prisma.product.findUnique({ where: { productId } });
    if (!existingProduct) {
      res.status(404).json({ success: false, error: "Produk tidak ditemukan" });
      return;
    }
  } catch (error) {
    return next(error);
  }

  let imageUrls = keptImages.length > 0 ? [...keptImages] : existingProduct.imageUrls;

  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    try {
      const uploadPromises = req.files.map(file => uploadFileToSupabase(file, 'product', productId));
      const uploadedUrls = await Promise.all(uploadPromises);
      imageUrls = [...imageUrls, ...uploadedUrls];
    } catch (error) {
      return next(error);
    }
  }

  try {        
    const updateData: any = {
      imageUrls,
    };

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (categoryVal !== undefined) updateData.category = categoryVal;
    if (priceVal !== undefined) updateData.basePrice = parseFloat(priceVal);
    if (isActive !== undefined) updateData.isActive = isActive === true || isActive === 'true';

    const updatedProduct = await prisma.product.update({
      where: {
        productId
      },
      data: updateData,
      include: {
        variants: true
      }
    });

    const firstVariant = updatedProduct.variants && updatedProduct.variants[0];
    if (stockVal !== undefined && firstVariant) {
      await prisma.productVariant.update({
        where: { variantId: firstVariant.variantId },
        data: { stock: stockVal }
      });
    }

    const reloaded = await prisma.product.findUnique({
      where: { productId },
      include: { variants: true }
    });

    const formatted = formatProduct(reloaded || updatedProduct);

    res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  const productId = req.params['id'] as string;

  if (!productId) {
    res.status(404).json({
      success: false,
      error: "Produk tidak ditemukan"
    });
    return;
  }

  try {
    const existingProduct = await prisma.product.findUnique({ where: { productId } });
    if (!existingProduct) {
      res.status(404).json({ success: false, error: "Produk tidak ditemukan" });
      return;
    }

    const deletedProduct = await prisma.product.update({
      where: { productId },
      data: { isActive: false }
    });

    res.status(200).json({
      success: true,
      data: formatProduct(deletedProduct)
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProductImage = async (req: Request, res: Response, next: NextFunction) => {
  const productId = req.params['id'] as string;
  const imageId = req.params['imgId'] || req.params['imageId'] || req.body.imageUrl;

  if (!productId) {
    res.status(400).json({
      success: false,
      error: "ID produk tidak valid"
    });
    return;
  }

  try {
    const existingProduct = await prisma.product.findUnique({ where: { productId } });
    if (!existingProduct) {
      res.status(404).json({ success: false, error: "Produk tidak ditemukan" });
      return;
    }

    const targetUrl = imageId ? String(imageId) : '';
    const updatedImageUrls = existingProduct.imageUrls.filter(url => url !== targetUrl && !url.includes(targetUrl));

    const updatedProduct = await prisma.product.update({
      where: { productId },
      data: { imageUrls: updatedImageUrls },
      include: { variants: true }
    });

    if (targetUrl) {
      await deleteFilesFromSupabase([targetUrl], 'product').catch(() => {});
    }

    res.status(200).json({
      success: true,
      data: formatProduct(updatedProduct)
    });
  } catch (error) {
    next(error);
  }
};

export const updateProductVariantStock = async (req: Request, res: Response, next: NextFunction) => {
  const productId = req.params['id'] as string;
  const variantId = req.params['variantId'] as string;
  const { stock } = req.body;

  if (!productId || !variantId || stock === undefined) {
    res.status(400).json({
      success: false,
      error: "Format required not fulfilled"
    });
    return;
  }

  try {
    const updatedProductVariant = await prisma.productVariant.update({
      where: {
        variantId,
        productId
      },
      data: {
        stock: parseInt(stock as string)
      }
    });

    res.status(200).json({
      success: true,
      data: updatedProductVariant
    });
  } catch (error) {
    next(error);
  }
};