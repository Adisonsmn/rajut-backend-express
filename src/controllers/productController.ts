import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { uploadFileToSupabase, deleteFilesFromSupabase } from '../lib/uploadSupabase.js';
import crypto from 'crypto';

export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
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
            whereClause.category = { equals: category, mode: 'insensitive' };
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
        
        res.status(200).json({
            success: true,
            pagination: {
                total: totalProducts,
                page,
                limit,
                totalPages: Math.ceil(totalProducts / limit)
            },
            data: products
        });
    } catch (error) {
        next(error);
    }
}

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
        res.status(404).json({
            success: false,
            error: "Product not found"
        });

        return;
    }
    
    try {
        const requestedProduct = await prisma.product.findUnique({
            where: {
                productId: id as string,
                isActive: true
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
            data: requestedProduct
        }); 
    } catch (error) {
        next(error);
    }
}

export const addProduct = async (req: Request, res: Response, next: NextFunction) => {
    let { name, description, basePrice, variants, category } = req.body;
    let imageUrls: string[] = req.body.imageUrls ? (Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [req.body.imageUrls]) : [];
    
    // VALIDATE FIRST
    if (!name || !description || !basePrice || !variants) {
        res.status(400).json({
            success: false,
            error: "Format required not fulfilled"
        });
        return;
    }

    let parsedVariants = variants;
    if (typeof variants === 'string') {
        try {
            parsedVariants = JSON.parse(variants);
            if (typeof parsedVariants === 'string') {
                parsedVariants = JSON.parse(parsedVariants);
            }
        } catch (e) {
            res.status(400).json({
                success: false,
                error: "Invalid JSON format for variants"
            });
            return;
        }
    }

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

    if (imageUrls.length === 0) {
        res.status(400).json({
            success: false,
            error: "Format required not fulfilled: At least 1 image is required"
        });
        return;
    }

    try {
        const newProduct = await prisma.product.create({
            data: {
                productId,
                name,
                description,
                category,
                basePrice: parseFloat(basePrice),
                imageUrls,
                variants: {
                    create: parsedVariants
                }
            },
            include: {
                variants: true
            }
        });

        res.status(201).json({
            success: true,
            data: newProduct
        });
    } catch (error) {
        await deleteFilesFromSupabase(imageUrls, 'product');
        next(error);
    }
}

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    let { name, description, basePrice, variants, category, isActive } = req.body;
    let keptImages: string[] = req.body.keptImages ? (Array.isArray(req.body.keptImages) ? req.body.keptImages : [req.body.keptImages]) : [];

    // VALIDATE FIRST
    if (!id || !name || !description || !basePrice) {
        res.status(400).json({
            success: false,
            error: "Format required not fulfilled"
        });
        return;
    }

    let parsedVariants = variants;
    if (typeof variants === 'string') {
        try {
            parsedVariants = JSON.parse(variants);
            if (typeof parsedVariants === 'string') {
                parsedVariants = JSON.parse(parsedVariants);
            }
        } catch (e) {
            res.status(400).json({
                success: false,
                error: "Invalid JSON format for variants"
            });
            return;
        }
    }

    let parsedIsActive: boolean | undefined = undefined;
    if (isActive !== undefined) {
        parsedIsActive = isActive === 'true' || isActive === true;
    }

    let existingProduct;
    try {
        existingProduct = await prisma.product.findUnique({ where: { productId: id as string } });
        if (!existingProduct) {
            res.status(404).json({ success: false, error: "Product not found" });
            return;
        }
    } catch (error) {
        return next(error);
    }

    let imageUrls = [...keptImages];

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        try {
            const uploadPromises = req.files.map(file => uploadFileToSupabase(file, 'product', id as string));
            const uploadedUrls = await Promise.all(uploadPromises);
            imageUrls = [...imageUrls, ...uploadedUrls];
        } catch (error) {
            return next(error);
        }
    }

    if (imageUrls.length === 0) {
        res.status(400).json({
            success: false,
            error: "Format required not fulfilled: At least 1 image is required"
        });
        return;
    }

    try {        
        const updateData: any = {
            name,
            description,
            category,
            basePrice: parseFloat(basePrice),
            imageUrls,
        };

        if (parsedIsActive !== undefined) {
            updateData.isActive = parsedIsActive;
        }

        if (parsedVariants && Array.isArray(parsedVariants)) {
            updateData.variants = {
                upsert: parsedVariants.map((v: any) => ({
                    where: { variantId: v.variantId || '00000000-0000-0000-0000-000000000000' },
                    update: { color: v.color, size: v.size, stock: v.stock },
                    create: { color: v.color, size: v.size, stock: v.stock }
                }))
            };
        }

        const updatedProduct = await prisma.product.update({
            where: {
                productId: id as string
            },
            data: updateData,
            include: {
                variants: true
            }
        });

        // Cleanup old images that are not in imageUrls anymore
        const imagesToDelete = existingProduct.imageUrls.filter(oldUrl => !imageUrls.includes(oldUrl));
        if (imagesToDelete.length > 0) {
            await deleteFilesFromSupabase(imagesToDelete, 'product');
        }

        res.status(200).json({
            success: true,
            data: updatedProduct
        });
    } catch (error) {
        next(error);
    }
}

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
        res.status(404).json({
            success: false,
            error: "Product not found"
        });
        return;
    }

    try {
        const existingProduct = await prisma.product.findUnique({ where: { productId: id as string } });
        if (!existingProduct) {
            res.status(404).json({ success: false, error: "Product not found" });
            return;
        }

        // Soft delete: just set isActive to false instead of actually deleting
        const deletedProduct = await prisma.product.update({
            where: {
                productId: id as string
            },
            data: {
                isActive: false
            }
        });

        // We DO NOT delete images from Supabase during Soft Delete, 
        // as past orders/transactions might still need to display the product image.

        res.status(200).json({
            success: true,
            data: deletedProduct
        });
    } catch (error) {
        next(error);
    }
}

export const deleteProductImage = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { imageUrl } = req.body;

    if (!id || !imageUrl) {
        res.status(400).json({
            success: false,
            error: "Format required not fulfilled"
        });
        return;
    }

    try {
        const existingProduct = await prisma.product.findUnique({ where: { productId: id as string } });
        if (!existingProduct) {
            res.status(404).json({ success: false, error: "Product not found" });
            return;
        }

        if (!existingProduct.imageUrls.includes(imageUrl)) {
            res.status(404).json({ success: false, error: "Image not found on product" });
            return;
        }

        if (existingProduct.imageUrls.length === 1) {
            res.status(400).json({ success: false, error: "Cannot delete the last image of a product" });
            return;
        }

        const updatedImageUrls = existingProduct.imageUrls.filter(url => url !== imageUrl);

        const updatedProduct = await prisma.product.update({
            where: { productId: id as string },
            data: { imageUrls: updatedImageUrls },
            include: { variants: true }
        });

        await deleteFilesFromSupabase([imageUrl], 'product');

        res.status(200).json({
            success: true,
            data: updatedProduct
        });
    } catch (error) {
        next(error);
    }
}

export const updateProductVariantStock = async (req: Request, res: Response, next: NextFunction) => {
    const { id, variantId } = req.params;
    const { stock } = req.body;

    if (!id || !variantId || stock === undefined) {
        res.status(400).json({
            success: false,
            error: "Format required not fulfilled"
        });
        
        return;
    }

    try {
        const updatedProductVariant = await prisma.productVariant.update({
            where: {
                variantId: variantId as string,
                productId: id as string
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
}