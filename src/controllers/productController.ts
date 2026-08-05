import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';

export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const products = await prisma.product.findMany({
            include: {
                variants: true
            }
        });
        
        res.status(200).json({
            success: true,
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
                productId: parseInt(id as string)
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
    const { name, description, basePrice, imageUrl, variants } = req.body;
    
    if (!name || !description || !basePrice || !imageUrl || !variants) {
        res.status(400).json({
            success: false,
            error: "Format required not fulfilled"
        });
        
        return;
    }

    try {
        const newProduct = await prisma.product.create({
            data: {
                name,
                description,
                basePrice: parseFloat(basePrice),
                imageUrl,
                variants: {
                    create: variants
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
        next(error);
    }
}

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { name, description, basePrice, imageUrl, variants } = req.body;

    if (!id || !name || !description || !basePrice || !imageUrl) {
        res.status(400).json({
            success: false,
            error: "Format required not fulfilled"
        });
        
        return;
    }

    try {        
        const updateData: any = {
            name,
            description,
            basePrice: parseFloat(basePrice),
            imageUrl,
        };

        if (variants && Array.isArray(variants)) {
            updateData.variants = {
                upsert: variants.map((v: any) => ({
                    where: { variantId: v.variantId || 0 },
                    update: { color: v.color, size: v.size, stock: v.stock },
                    create: { color: v.color, size: v.size, stock: v.stock }
                }))
            };
        }

        const updatedProduct = await prisma.product.update({
            where: {
                productId: parseInt(id as string)
            },
            data: updateData,
            include: {
                variants: true
            }
        });

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
        const deletedProduct = await prisma.product.delete({
            where: {
                productId: parseInt(id as string)
            }
        });

        res.status(200).json({
            success: true,
            data: deletedProduct
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
                variantId: parseInt(variantId as string),
                productId: parseInt(id as string)
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