import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { uploadFileToSupabase, deleteFilesFromSupabase } from '../lib/uploadSupabase.js';
import crypto from 'crypto';

export const getAllCustomProductRequests = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const customProductRequests = await prisma.customProductRequest.findMany({
            include: {
                responses: true
            }
        });

        res.status(200).json({
            success: true,
            data: customProductRequests
        });
    } catch (error) {
        next(error);
    }
}

export const getCustomProductRequestById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
        res.status(404).json({
            success: false,
            error: "Custom product request not found"
        })

        return;
    }

    try {
        const requestedProduct = await prisma.customProductRequest.findUnique({
            where: {
                requestId: id as string
            },
            include: {
                responses: true
            }
        })

        if (!requestedProduct) {
            res.status(404).json({
                success: false,
                error: "Custom product request not found"
            })
            return;
        }

        res.status(200).json({
            success: true,
            data: requestedProduct
        })
    } catch (error) {
        next(error);
    }
}

export const addCustomProductRequest = async (req: Request, res: Response, next: NextFunction) => {
    let userId = req.user!.id;
    let { customName, description, status } = req.body;
    let referenceImages: string[] = req.body.referenceImages ? (Array.isArray(req.body.referenceImages) ? req.body.referenceImages : [req.body.referenceImages]) : [];
    
    if (!userId || !customName || !description) {
        res.status(400).json({
            success: false,
            error: "Format required not fulfilled"
        })
        return;
    }

    const requestId = crypto.randomUUID();

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        try {
            const uploadPromises = req.files.map(file => uploadFileToSupabase(file, 'custom-product', requestId));
            const uploadedUrls = await Promise.all(uploadPromises);
            referenceImages = [...referenceImages, ...uploadedUrls];
        } catch (error) {
            return next(error);
        }
    }

    try {
        const newCustomProductRequest = await prisma.customProductRequest.create({
            data: {
                requestId,
                userId,
                customName,
                description,
                referenceImages,
                status: status || 'Pending'
            }
        })

        res.status(201).json({
            success: true,
            data: newCustomProductRequest
        })
    } catch (error) {
        await deleteFilesFromSupabase(referenceImages, 'custom-product');
        next(error);
    }
}

export const updateCustomProductRequest = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    let userId = req.user!.id;
    let { customName, description, status } = req.body;
    let keptImages: string[] = req.body.keptImages ? (Array.isArray(req.body.keptImages) ? req.body.keptImages : [req.body.keptImages]) : [];

    if (!id || !userId || !customName || !description) {
        res.status(400).json({
            success: false,
            error: "Format required not fulfilled"
        })
        return;
    }

    let existingRequest;
    try {
        existingRequest = await prisma.customProductRequest.findUnique({ where: { requestId: id as string } });
        if (!existingRequest) {
            res.status(404).json({ success: false, error: "Custom product request not found" });
            return;
        }

        if (existingRequest.userId !== userId) {
            res.status(403).json({ success: false, error: "Forbidden" });
            return;
        }

        const allowedStatuses = ['Pending', 'Requested', 'Modified'];
        if (!allowedStatuses.includes(existingRequest.status)) {
            res.status(403).json({ success: false, error: "Cannot modify request at this stage" });
            return;
        }
    } catch (error) {
        return next(error);
    }
    
    let referenceImages = [...keptImages];

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        try {
            const uploadPromises = req.files.map(file => uploadFileToSupabase(file, 'custom-product', id as string));
            const uploadedUrls = await Promise.all(uploadPromises);
            referenceImages = [...referenceImages, ...uploadedUrls];
        } catch (error) {
            return next(error);
        }
    }

    try {
        const updateData: any = {
            customName,
            description,
            referenceImages,
            status
        };    

        const updatedRequest = await prisma.customProductRequest.update({
            where: {
                requestId: id as string
            },
            data: updateData
        });

        const imagesToDelete = existingRequest.referenceImages.filter(oldUrl => !referenceImages.includes(oldUrl));
        if (imagesToDelete.length > 0) {
            await deleteFilesFromSupabase(imagesToDelete, 'custom-product');
        }

        res.status(200).json({
            success: true,
            data: updatedRequest
        })
    } catch (error) {
        next(error);
    }
}

export const deleteCustomProductRequest = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    
    try {
        if (!id) {
            res.status(404).json({ success: false, error: "Custom product request not found" });
            return;
        }
        
        const requestedProduct = await prisma.customProductRequest.findUnique({
            where: { requestId: id as string }
        })

        if (!requestedProduct) {
            res.status(404).json({ success: false, error: "Custom product request not found" });
            return;
        }

        if (req.user!.role !== 'ADMIN' && requestedProduct.userId !== req.user!.id) {
            res.status(403).json({ success: false, error: "Forbidden" });
            return;
        }

        const allowedStatuses = ['Pending', 'Requested', 'Modified'];
        if (req.user!.role !== 'ADMIN' && !allowedStatuses.includes(requestedProduct.status)) {
            res.status(403).json({ success: false, error: "Cannot delete request at this stage" });
            return;
        }

        const deleteCustomProductRequest = await prisma.customProductRequest.delete({
            where: { requestId: id as string }
        })

        if (requestedProduct.referenceImages.length > 0) {
            await deleteFilesFromSupabase(requestedProduct.referenceImages, 'custom-product');
        }

        res.status(200).json({
            success: true,
            data: deleteCustomProductRequest
        })
    } catch (error) {
        next(error);
    }
}

export const deleteCustomProductRequestImage = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { imageUrl } = req.body;

    if (!id || !imageUrl) {
        res.status(400).json({ success: false, error: "Format required not fulfilled" });
        return;
    }

    try {
        const existingRequest = await prisma.customProductRequest.findUnique({ where: { requestId: id as string } });
        if (!existingRequest) {
            res.status(404).json({ success: false, error: "Request not found" });
            return;
        }

        if (existingRequest.userId !== req.user!.id) {
            res.status(403).json({ success: false, error: "Forbidden" });
            return;
        }

        const allowedStatuses = ['Pending', 'Requested', 'Modified'];
        if (!allowedStatuses.includes(existingRequest.status)) {
            res.status(403).json({ success: false, error: "Cannot modify request at this stage" });
            return;
        }

        if (!existingRequest.referenceImages.includes(imageUrl)) {
            res.status(404).json({ success: false, error: "Image not found on request" });
            return;
        }

        const updatedImageUrls = existingRequest.referenceImages.filter(url => url !== imageUrl);

        const updatedRequest = await prisma.customProductRequest.update({
            where: { requestId: id as string },
            data: { referenceImages: updatedImageUrls }
        });

        await deleteFilesFromSupabase([imageUrl], 'custom-product');

        res.status(200).json({ success: true, data: updatedRequest });
    } catch (error) {
        next(error);
    }
}

export const getCustomProductResponseByRequestId = async (req: Request, res: Response, next: NextFunction) => {
    const { requestId } = req.params;
    
    if (!requestId) {
        res.status(404).json({ success: false, error: "Custom product response not found" });
        return;
    }
    
    try {
        const customProductResponse = await prisma.customProductResponse.findMany({
            where: { requestId: requestId as string }
        })

        res.status(200).json({ success: true, data: customProductResponse });
    } catch (error) {
        next(error);
    }
}

export const getCustomProductResponseById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    
    if (!id) {
        res.status(404).json({ success: false, error: "Custom product response not found" });
        return;
    }
    
    try {
        const customProductResponse = await prisma.customProductResponse.findUnique({
            where: { responseId: id as string }
        })

        if (!customProductResponse) {
            res.status(404).json({ success: false, error: "Custom product response not found" });
            return;
        }

        res.status(200).json({ success: true, data: customProductResponse });
    } catch (error) {
        next(error);
    }
}

export const addCustomProductResponse = async (req: Request, res: Response, next: NextFunction) => {
    const { requestId } = req.params;
    const adminId = req.user!.id;
    const { responseMessage, estimatedPrice, estimatedFinishDate, statusAfterResponse } = req.body;
    let responseImages: string[] = req.body.responseImages ? (Array.isArray(req.body.responseImages) ? req.body.responseImages : [req.body.responseImages]) : [];
    
    if (!requestId || !adminId || !responseMessage) {
        res.status(400).json({ success: false, error: "Format required not fulfilled" });
        return;
    }

    const responseId = crypto.randomUUID();

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        try {
            const uploadPromises = req.files.map(file => uploadFileToSupabase(file, 'custom-product-response', responseId));
            const uploadedUrls = await Promise.all(uploadPromises);
            responseImages = [...responseImages, ...uploadedUrls];
        } catch (error) {
            return next(error);
        }
    }
    
    try {
        const newCustomProductResponse = await prisma.$transaction(async (tx) => {
            const response = await tx.customProductResponse.create({
                data: {
                    responseId,
                    requestId: requestId as string,
                    adminId,
                    responseMessage,
                    responseImages,
                    estimatedPrice: estimatedPrice ? parseFloat(estimatedPrice) : undefined,
                    estimatedFinishDate: estimatedFinishDate ? new Date(estimatedFinishDate) : undefined,
                    statusAfterResponse
                }
            })

            if (statusAfterResponse) {
                await tx.customProductRequest.update({
                    where: { requestId: requestId as string },
                    data: { status: statusAfterResponse }
                })
            }

            return response;
        })

        res.status(201).json({ success: true, data: newCustomProductResponse });
    } catch (error) {
        await deleteFilesFromSupabase(responseImages, 'custom-product-response');
        next(error);
    }
}

export const updateCustomProductResponse = async (req: Request, res: Response, next: NextFunction) => {
    const { requestId, id } = req.params;
    const adminId = req.user!.id;
    const { responseMessage, estimatedPrice, estimatedFinishDate, statusAfterResponse } = req.body;
    let keptImages: string[] = req.body.keptImages ? (Array.isArray(req.body.keptImages) ? req.body.keptImages : [req.body.keptImages]) : [];
    
    if (!requestId || !id || !adminId || !responseMessage) {
        res.status(400).json({ success: false, error: "Format required not fulfilled" });
        return;
    }

    let existingResponse;
    try {
        existingResponse = await prisma.customProductResponse.findUnique({ where: { responseId: id as string } });
        if (!existingResponse) {
            res.status(404).json({ success: false, error: "Custom product response not found" });
            return;
        }

        if (existingResponse.requestId !== requestId as string) {
            res.status(403).json({ success: false, error: "Forbidden" });
            return;
        }
    } catch (error) {
        return next(error);
    }

    let responseImages = [...keptImages];

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        try {
            const uploadPromises = req.files.map(file => uploadFileToSupabase(file, 'custom-product-response', id as string));
            const uploadedUrls = await Promise.all(uploadPromises);
            responseImages = [...responseImages, ...uploadedUrls];
        } catch (error) {
            return next(error);
        }
    }
    
    try {
        const updateData: any = {
            adminId,
            responseMessage,
            responseImages,
            estimatedPrice: estimatedPrice ? parseFloat(estimatedPrice) : undefined,
            estimatedFinishDate: estimatedFinishDate ? new Date(estimatedFinishDate) : undefined,
            statusAfterResponse
        };
        
        const updatedCustomProductResponse = await prisma.$transaction(async (tx) => {
            const response = await tx.customProductResponse.update({
                where: { responseId: id as string },
                data: updateData
            })

            if (statusAfterResponse) {
                await tx.customProductRequest.update({
                    where: { requestId: requestId as string },
                    data: { status: statusAfterResponse }
                })
            }

            return response;
        })

        const imagesToDelete = existingResponse.responseImages.filter(oldUrl => !responseImages.includes(oldUrl));
        if (imagesToDelete.length > 0) {
            await deleteFilesFromSupabase(imagesToDelete, 'custom-product-response');
        }
        
        res.status(200).json({ success: true, data: updatedCustomProductResponse });
    } catch (error) {
        next(error);
    }
}

export const deleteCustomProductResponse = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    
    try {
        if (!id) {
            res.status(404).json({ success: false, error: "Custom product response not found" });
            return;
        }
        
        const customProductResponse = await prisma.customProductResponse.findUnique({
            where: { responseId: id as string }
        })
        
        if (!customProductResponse) {
            res.status(404).json({ success: false, error: "Custom product response not found" });
            return;
        }
        
        const deleteCustomProductResponse = await prisma.customProductResponse.delete({
            where: { responseId: id as string }
        })

        if (customProductResponse.responseImages.length > 0) {
            await deleteFilesFromSupabase(customProductResponse.responseImages, 'custom-product-response');
        }
        
        res.status(200).json({ success: true, data: deleteCustomProductResponse });
    } catch (error) {
        next(error);
    }
}

export const deleteCustomProductResponseImage = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { imageUrl } = req.body;

    if (!id || !imageUrl) {
        res.status(400).json({ success: false, error: "Format required not fulfilled" });
        return;
    }

    try {
        const existingResponse = await prisma.customProductResponse.findUnique({ where: { responseId: id as string } });
        if (!existingResponse) {
            res.status(404).json({ success: false, error: "Response not found" });
            return;
        }

        if (!existingResponse.responseImages.includes(imageUrl)) {
            res.status(404).json({ success: false, error: "Image not found on response" });
            return;
        }

        const updatedImageUrls = existingResponse.responseImages.filter(url => url !== imageUrl);

        const updatedResponse = await prisma.customProductResponse.update({
            where: { responseId: id as string },
            data: { responseImages: updatedImageUrls }
        });

        await deleteFilesFromSupabase([imageUrl], 'custom-product-response');

        res.status(200).json({ success: true, data: updatedResponse });
    } catch (error) {
        next(error);
    }
}