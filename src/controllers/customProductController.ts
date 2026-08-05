import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';

export const getAllCustomProductRequests = async (req: Request, res: Response, next: NextFunction) => {
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
                requestId: parseInt(id as string)
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
    const { userId, customName, description, referenceImage, status } = req.body;
    
    if (!userId || !customName || !description) {
        res.status(400).json({
            success: false,
            error: "Format required not fulfilled"
        })

        return;
    }
    
    try {
        const newCustomProductRequest = await prisma.customProductRequest.create({
            data: {
                userId,
                customName,
                description,
                referenceImage,
                status
            }
        })

        res.status(201).json({
            success: true,
            data: newCustomProductRequest
        })
    } catch (error) {
        next(error);
    }
}

export const updateCustomProductRequest = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId, customName, description, referenceImage, status } = req.body;

    if (!id || !userId || !customName || !description) {
        res.status(400).json({
            success: false,
            error: "Format required not fulfilled"
        })

        return;
    }
    
    try {
        const updateData: any = {
            userId,
            customName,
            description,
            referenceImage,
            status
        };    
        
        const requestedProduct = await prisma.customProductRequest.findUnique({
            where: {
                requestId: parseInt(id as string)
            }
        })

        if (!requestedProduct) {
            res.status(404).json({
                success: false,
                error: "Custom product request not found"
            })

            return;
        }

        if (requestedProduct.userId !== parseInt(userId as string)){
            res.status(403).json({
                success: false,
                error: "Forbidden"
            })

            return;
        }

        const updatedRequest = await prisma.customProductRequest.update({
            where: {
                requestId: parseInt(id as string)
            },
            data: updateData
        });

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
            res.status(404).json({
                success: false,
                error: "Custom product request not found"
            })

            return;
        }
        
        const requestedProduct = await prisma.customProductRequest.findUnique({
            where: {
                requestId: parseInt(id as string)
            }
        })

        if (!requestedProduct) {
            res.status(404).json({
                success: false,
                error: "Custom product request not found"
            })

            return;
        }

        const deleteCustomProductRequest = await prisma.customProductRequest.delete({
            where: {
                requestId: parseInt(id as string)
            }
        })

        res.status(200).json({
            success: true,
            data: deleteCustomProductRequest
        })
    } catch (error) {
        next(error);
    }
}

export const getCustomProductResponseByRequestId = async (req: Request, res: Response, next: NextFunction) => {
    const { requestId } = req.params;
    
    if (!requestId) {
        res.status(404).json({
            success: false,
            error: "Custom product response not found"
        })

        return;
    }
    
    try {
        const customProductResponse = await prisma.customProductResponse.findMany({
            where: {
                requestId: parseInt(requestId as string)
            }
        })

        res.status(200).json({
            success: true,
            data: customProductResponse
        })
    } catch (error) {
        next(error);
    }
}

export const getCustomProductResponseById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    
    if (!id) {
        res.status(404).json({
            success: false,
            error: "Custom product response not found"
        })

        return;
    }
    
    try {
        const customProductResponse = await prisma.customProductResponse.findUnique({
            where: {
                responseId: parseInt(id as string)
            }
        })

        if (!customProductResponse) {
            res.status(404).json({
                success: false,
                error: "Custom product response not found"
            })
            return;
        }

        res.status(200).json({
            success: true,
            data: customProductResponse
        })
    } catch (error) {
        next(error);
    }
}

export const addCustomProductResponse = async (req: Request, res: Response, next: NextFunction) => {
    const { requestId } = req.params;
    const { adminId, responseMessage, estimatedPrice, estimatedFinishDate, statusAfterResponse } = req.body;
    
    if (!requestId || !adminId || !responseMessage) {
        res.status(400).json({
            success: false,
            error: "Format required not fulfilled"
        })

        return;
    }
    
    try {
        const newCustomProductResponse = await prisma.$transaction(async (tx) => {
            const response = await tx.customProductResponse.create({
                data: {
                    requestId: parseInt(requestId as string),
                    adminId,
                    responseMessage,
                    estimatedPrice,
                    estimatedFinishDate: estimatedFinishDate ? new Date(estimatedFinishDate) : undefined,
                    statusAfterResponse
                }
            })

            if (statusAfterResponse) {
                await tx.customProductRequest.update({
                    where: { requestId: parseInt(requestId as string) },
                    data: { status: statusAfterResponse }
                })
            }

            return response;
        })

        res.status(201).json({
            success: true,
            data: newCustomProductResponse
        })
    } catch (error) {
        next(error);
    }
}

export const updateCustomProductResponse = async (req: Request, res: Response, next: NextFunction) => {
    const { id, requestId } = req.params;
    const { adminId, responseMessage, estimatedPrice, estimatedFinishDate, statusAfterResponse } = req.body;
    
    if (!id || !requestId || !adminId || !responseMessage) {
        res.status(400).json({
            success: false,
            error: "Format required not fulfilled"
        })

        return;
    }
    
    try {
        const updateData: any = {
            adminId,
            responseMessage,
            estimatedPrice,
            estimatedFinishDate: estimatedFinishDate ? new Date(estimatedFinishDate) : undefined,
            statusAfterResponse
        };
        
        const customProductResponse = await prisma.customProductResponse.findUnique({
            where: {
                responseId: parseInt(id as string)
            }
        })
        
        if (!customProductResponse) {
            res.status(404).json({
                success: false,
                error: "Custom product response not found"
            })
            
            return;
        }
        
        if (customProductResponse.requestId !== parseInt(requestId as string)) {
            res.status(403).json({
                success: false,
                error: "Forbidden"
            })
            
            return;
        }
        
        const updatedCustomProductResponse = await prisma.$transaction(async (tx) => {
            const response = await tx.customProductResponse.update({
                where: {
                    responseId: parseInt(id as string)
                },
                data: updateData
            })

            if (statusAfterResponse) {
                await tx.customProductRequest.update({
                    where: { requestId: parseInt(requestId as string) },
                    data: { status: statusAfterResponse }
                })
            }

            return response;
        })
        
        res.status(200).json({
            success: true,
            data: updatedCustomProductResponse
        })
    } catch (error) {
        next(error);
    }
}

export const deleteCustomProductResponse = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    
    try {
        if (!id) {
            res.status(404).json({
                success: false,
                error: "Custom product response not found"
            })

            return;
        }
        
        const customProductResponse = await prisma.customProductResponse.findUnique({
            where: {
                responseId: parseInt(id as string)
            }
        })
        
        if (!customProductResponse) {
            res.status(404).json({
                success: false,
                error: "Custom product response not found"
            })
            
            return;
        }
        
        const deletedCustomProductResponse = await prisma.customProductResponse.delete({
            where: {
                responseId: parseInt(id as string)
            }
        })
        
        res.status(200).json({
            success: true,
            data: deletedCustomProductResponse
        })
    } catch (error) {
        next(error);
    }
}